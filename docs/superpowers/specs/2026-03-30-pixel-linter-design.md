# Pixel Linter — Design Spec

## Context

Pixel Linter is a Chrome extension for visual QA of websites. It helps designers, PMs, QA engineers, and frontend developers inspect live UI implementations on staging sites and detect design-system inconsistencies — without requiring site integration or DevTools knowledge.

**Primary use case**: Internal staging site review before launch. Users hover elements to see a polished inspection panel with smart warnings like "uncommon font size" or "off spacing scale", comparing each element against the page's inferred design system.

**This is NOT** a DevTools clone or generic CSS inspector. It is an interpretation layer that explains values in human language and flags likely one-off inconsistencies.

---

## Architecture: Content-Script Pipeline with Facade

### Decision rationale

Three approaches were evaluated:
- **A (Monolith)**: Simplest but poor testability, grows into god-module
- **B (Background Worker Pipeline)**: Best testability but over-engineered — serializing data across IPC costs more than the ~20ms analysis
- **C (Content-Script Pipeline)**: Chosen — modular pure-function pipeline inside the content script, two-party messaging, best performance/testability balance

### System boundaries

```
Popup (React)  ──sendMessage──>  Content Script (Vanilla TS)
                                    ├── InspectionController (UI interaction)
                                    ├── PageAnalyzer (analysis facade)
                                    └── MutationObserver (SPA support)

Background Worker: icon badge + onInstalled only (minimal)
chrome.storage.local: user preferences + per-site enabled state
```

**Key principles applied:**
- Boundaries at real differences: DOM access vs pure transforms vs UI rendering
- Data flows in a straight line: DOM → collector → normalizer → histogram → inferrer → tokens
- No premature distribution: analysis stays in content script (20ms workload doesn't justify IPC)
- Each module is independently testable and deletable

---

## Core Types

```typescript
interface DesignTokens {
  fontFamilies: TokenFrequency<string>[];
  fontSizes: TokenFrequency<number>[];
  fontWeights: TokenFrequency<number>[];
  lineHeights: TokenFrequency<number>[];
  textColors: TokenFrequency<string>[];
  backgroundColors: TokenFrequency<string>[];
  spacingValues: TokenFrequency<number>[];
  borderRadii: TokenFrequency<number>[];
  componentHeights: TokenFrequency<number>[];
}

interface TokenFrequency<T> {
  value: T;
  count: number;
  percentage: number;
}

interface RawElementData {
  element: Element;
  tag: string;
  role: string | null;
  computedStyles: Record<string, string>;
  rect: DOMRect;
  isInteractive: boolean;
  hasText: boolean;
  childCount: number;
}

interface NormalizedElementData {
  element: Element;
  elementType: ElementType;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textColor: string;
  backgroundColor: string;
  borderColor: string | null;
  margins: SpacingQuad;
  paddings: SpacingQuad;
  gap: number | null;
  borderRadius: number;
  width: number;
  height: number;
  display: string;
  position: string;
  isInteractive: boolean;
}

interface SpacingQuad {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Warning {
  type: WarningType;
  severity: 'info' | 'warning';
  message: string;
  detail?: string;
}

type ElementType =
  | 'heading' | 'paragraph' | 'button' | 'link' | 'input'
  | 'textarea' | 'image' | 'icon' | 'card' | 'nav-item' | 'generic';

type WarningType =
  | 'uncommon-font-size' | 'off-spacing-scale' | 'unusual-radius'
  | 'low-contrast' | 'small-tap-target' | 'uncommon-font-weight'
  | 'mixed-font-family';

interface FrequencyMaps {
  fontFamilies: Map<string, number>;
  fontSizes: Map<number, number>;
  fontWeights: Map<number, number>;
  lineHeights: Map<number, number>;
  textColors: Map<string, number>;
  backgroundColors: Map<string, number>;
  spacingValues: Map<number, number>;
  borderRadii: Map<number, number>;
  componentHeights: Map<number, number>;
}
```

---

## Analysis Engine

### Pipeline stages

Each stage is a separate module (~50-120 lines) with typed input/output:

**1. Collector** (`content/analysis/collector.ts`)
- Queries meaningful elements: headings, paragraphs, buttons, links, inputs, images, styled containers
- Filters: visible, non-zero size, not inside extension's Shadow DOM
- Budget: caps at 500 elements, prioritizing interactive + text elements
- Output: `RawElementData[]`

**2. Normalizer** (`content/analysis/normalizer.ts`)
- Converts computed style strings to typed numbers (e.g., `"15.5px"` → `16`)
- Resolves relative line-heights to px
- Normalizes colors to hex
- Classifies element type via `elementClassifier.ts`
- Output: `NormalizedElementData[]`

**3. Histogram Builder** (`content/analysis/histogram.ts`)
- Builds frequency maps for each property across all elements
- Groups values after rounding (sub-pixel noise removed by normalizer)
- Output: `FrequencyMaps` — `Map<value, count>` per property

**4. Token Inferrer** (`content/analysis/tokenInferrer.ts`)
- Extracts dominant values: >3% frequency OR top-5 most frequent, whichever captures more values
- Detects spacing scale patterns (multiples of 4, 8, etc.)
- Output: `DesignTokens`

### PageAnalyzer facade (`content/analysis/analyzer.ts`)
- Coordinates the pipeline: `scan()` calls stages sequentially, stores `DesignTokens` in memory
- Exposes `compareElement(el)` for hover-time: extracts + normalizes single element, generates warnings
- Results are ephemeral (page-scoped, lost on navigation — this is correct behavior)

### Warning rules (`content/analysis/warnings.ts`)

| Rule | Trigger | Severity |
|------|---------|----------|
| Uncommon font size | Not in top font size tokens | warning |
| Off spacing scale | Value not within ±1px of any spacing token | warning |
| Unusual border radius | Not in top radii tokens | info |
| Low contrast | Ratio < 4.5 (normal) or < 3.0 (large text) | warning |
| Small tap target | Interactive element height < 40px | warning |
| Uncommon font weight | Not in top weight tokens | info |
| Mixed font family | Not the dominant font family | info |

Warning language uses soft phrasing: "uncommon on this page", "worth reviewing", "likely off-scale".

### Contrast calculator (`content/analysis/contrast.ts`)
- WCAG relative luminance formula
- Walks up DOM for effective background color (first non-transparent ancestor)
- Returns ratio + interpretation: "good" (≥4.5), "borderline" (3.0-4.5), "low" (<3.0)
- Falls back to "background unclear" when background can't be determined

### Element classifier (`content/analysis/elementClassifier.ts`)
- Heuristic classification using tag name, ARIA role, computed styles, dimensions, text presence
- Maps to `ElementType` for better UX labels in the panel
- Not strict — classification is for display, not correctness

---

## Inspection UI

### Inspection Controller (`content/inspector/inspectionController.ts`)

State machine:
```
INACTIVE → HOVERING → LOCKED
   ↑          ↓         ↓
   ←──── Escape ←── Escape/click-outside
```

- `activate()`: attaches mouseover, mouseout, click, keydown on `document`
- Hover: resolve target → extract styles → compare against tokens → render panel
- Click: lock panel on current element
- Escape (locked): unlock, resume hovering
- Escape (unlocked): full deactivation + cleanup
- `deactivate()`: removes all listeners, disconnects observer, hides panel/highlight, nulls references

### Target Resolver (`content/inspector/targetResolver.ts`)
- Promotes past meaningless wrapper `<span>` elements with no unique styling
- Promotes past tiny elements (<8px)
- Never promotes past semantic elements (button, a, heading, input)
- Max 2 levels of promotion
- Skips extension's own Shadow DOM host

### Highlight Manager (`content/inspector/highlightManager.ts`)
- Single `<div>` with `position: fixed`, `pointer-events: none`
- Styled with `outline` (doesn't affect layout): semi-transparent blue fill + 2px solid outline
- Matches `getBoundingClientRect()` of hovered element
- Created once, shown/hidden thereafter

### Panel Renderer (`content/inspector/panelRenderer.ts`)
- Shadow DOM host `<div>` appended to `document.body`
- All styles scoped inside shadow root — zero leakage to/from host page
- Sections:
  1. **Header**: Element type badge + tag + truncated classes + dimensions
  2. **Typography**: font family, size, weight, line-height, letter-spacing, color
  3. **Colors**: text/bg/border colors, contrast ratio badge
  4. **Spacing**: margin/padding quads with on-scale/off-scale tags, gap
  5. **Shape**: border-radius, border, box-shadow, display, position
  6. **Warnings**: severity-icon list

**Positioning** (`content/utils/geometry.ts`):
- Default: below-right of element, 8px offset
- Flips above if clipping bottom, left if clipping right
- Max: 320px wide, 480px tall with overflow scroll

**Visual style**: dark semi-transparent background (`rgba(15,15,15,0.95)`), 8px border-radius, subtle shadow, monospace for values, system font for labels. Design-tool aesthetic, not DevTools.

---

## SPA / Dynamic Page Support

`content/observer.ts`:
- `MutationObserver` on `document.body` with `{ childList: true, subtree: true }`
- Does NOT observe `attributes` or `characterData` (too noisy on animated sites)
- Debounced at 300ms — triggers `PageAnalyzer.scan()` on significant DOM changes
- Connected on activation, disconnected on deactivation

---

## Popup

React app with four sections:

1. **Header**: "Pixel Linter" + status badge (Inactive / Analyzing / Ready)
2. **Controls**: Enable/Disable toggle, Inspect Mode button, Refresh Analysis button
3. **Settings**: Show warnings on/off, Compact panel on/off
4. **Token Summary** (when ready): dominant font, top 3 spacing values, dominant radii

### Components
- `App.tsx` — root, manages state via hooks
- `StatusBadge.tsx` — colored indicator
- `TokenSummary.tsx` — quick glance at detected tokens
- `SettingsPanel.tsx` — toggle switches

### Hooks
- `useTabMessaging.ts` — typed wrapper around `chrome.tabs.sendMessage`
- `useStorage.ts` — syncs React state with `chrome.storage.onChanged`

---

## Messaging Protocol

Two-party: Popup → Content Script via `chrome.tabs.sendMessage`, response via `sendResponse`.

```typescript
type Message =
  | { type: 'GET_STATUS' }
  | { type: 'ACTIVATE_INSPECT' }
  | { type: 'DEACTIVATE_INSPECT' }
  | { type: 'REFRESH_ANALYSIS' }
  | { type: 'GET_TOKENS_SUMMARY' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<StoredSettings> }

type MessageResponse =
  | { type: 'STATUS'; data: { active: boolean; analysisReady: boolean } }
  | { type: 'TOKENS_SUMMARY'; data: DesignTokens | null }
  | { type: 'OK' }
```

Background worker listens for status messages only to update the icon badge.

---

## Storage

`shared/storage.ts` — typed wrapper around `chrome.storage.local`:

```typescript
interface StoredSettings {
  showWarnings: boolean;     // default: true
  compactPanel: boolean;     // default: false
  enabledSites: string[];    // hostnames
}
```

Read/write helpers with defaults. No analysis results in storage — they are ephemeral.

---

## Project Structure

```
src/
  background/
    index.ts

  content/
    index.ts
    analysis/
      collector.ts
      normalizer.ts
      histogram.ts
      tokenInferrer.ts
      warnings.ts
      analyzer.ts
      contrast.ts
      elementClassifier.ts
    inspector/
      inspectionController.ts
      highlightManager.ts
      panelRenderer.ts
      targetResolver.ts
    observer.ts
    utils/
      dom.ts
      geometry.ts
      format.ts

  popup/
    index.html
    main.tsx
    App.tsx
    components/
      StatusBadge.tsx
      TokenSummary.tsx
      SettingsPanel.tsx
    hooks/
      useTabMessaging.ts
      useStorage.ts

  shared/
    types.ts
    constants.ts
    messaging.ts
    storage.ts
```

---

## Testing Strategy

Vitest (bundled with Vite).

| Module | Approach | Priority |
|--------|----------|----------|
| `normalizer.ts` | Pure function tests | High |
| `histogram.ts` | Pure function tests | High |
| `tokenInferrer.ts` | Pure function tests | High |
| `warnings.ts` | Pure function tests | High |
| `contrast.ts` | Pure function tests | High |
| `elementClassifier.ts` | Tag/role/style combos | Medium |
| `targetResolver.ts` | Minimal DOM (jsdom) | Medium |
| `storage.ts` | Mock chrome.storage | Low |

Target: ~80% coverage on analysis modules. No E2E for MVP.

---

## Error Handling

- If value cannot be inferred → display "unknown" or omit
- If analysis fails → inspection still works showing raw computed styles without warnings
- If contrast background undetermined → show "background unclear"
- Never crash page interaction
- Never interfere with forms or site functionality
- Reliable cleanup on disable: all listeners removed, observer disconnected, DOM elements removed

---

## Performance Budgets

- Initial scan: <50ms for 500 elements
- Hover comparison: <2ms (synchronous map lookups)
- Panel render: <5ms (simple DOM manipulation in Shadow DOM)
- Mutation re-analysis: debounced 300ms, same scan budget
- Memory: <5MB for analysis results of typical page

---

## Stack

- TypeScript (strict mode)
- React 18 (popup only)
- Vite (bundler, with chrome extension plugin)
- Manifest V3
- Vitest (testing)
- ESLint + Prettier
- Content script UI: Vanilla TS + Shadow DOM

---

## Non-goals (MVP)

- Figma integration
- Screenshot comparison
- Multi-page crawling/reporting
- AI-generated advice
- Automated fixing
- Full accessibility audit
- Cloud backend / authentication
- E2E testing
