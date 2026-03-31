# Suggestion Markers + Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Figma-style numbered markers on elements with design system suggestions, and rename "Warnings" to "Suggestions" throughout.

**Architecture:** A new `SuggestionMarkerManager` renders numbered amber circles on flagged elements inside a Shadow DOM container. On hover, a card tooltip shows suggestion details. On click, the full inspection panel locks on the element. The rename touches types, analysis module, panel renderer, and tests.

**Tech Stack:** TypeScript, Shadow DOM, existing Pixel Linter architecture

**Spec:** `docs/superpowers/specs/2026-03-30-suggestion-markers-design.md`

---

## File Structure

```
Modified:
  src/shared/types.ts                          -- Warning→Suggestion, WarningType→SuggestionType
  src/shared/constants.ts                      -- add marker constants
  src/content/analysis/suggestions.ts          -- renamed from warnings.ts
  src/content/analysis/analyzer.ts             -- update imports + field names
  src/content/inspector/inspectionController.ts -- integrate marker manager
  src/content/inspector/panelRenderer.ts       -- section title + CSS class renames
  src/content/index.ts                         -- update field name reference
  tests/analysis/suggestions.test.ts           -- renamed from warnings.test.ts

Created:
  src/content/inspector/suggestionMarkerManager.ts -- new marker + tooltip system
```

---

## Task 1: Rename Warning → Suggestion in Types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Rename types in types.ts**

Replace the warning-related types:

```typescript
// In src/shared/types.ts

// Line 5-8: Change WarningType → SuggestionType
export type SuggestionType =
  | 'uncommon-font-size' | 'off-spacing-scale' | 'unusual-radius'
  | 'low-contrast' | 'small-tap-target' | 'uncommon-font-weight'
  | 'mixed-font-family';

// Line 80-85: Change Warning → Suggestion
export interface Suggestion {
  type: SuggestionType;
  severity: 'info' | 'warning';
  message: string;
  detail?: string;
}

// Line 87-91: Change showWarnings → showSuggestions
export interface StoredSettings {
  showSuggestions: boolean;
  compactPanel: boolean;
  enabledSites: string[];
}

// Line 120: Change warnings → suggestions in InspectionData
export interface InspectionData {
  // ... all other fields stay the same ...
  suggestions: Suggestion[];  // was: warnings: Warning[]
}
```

- [ ] **Step 2: Update constants.ts default settings**

In `src/shared/constants.ts`, change:
```typescript
export const DEFAULT_SETTINGS: import('./types').StoredSettings = {
  showSuggestions: true,   // was: showWarnings
  compactPanel: false,
  enabledSites: [],
};
```

Also add marker constants:
```typescript
export const MARKER_HOST_ID = 'pixel-linter-marker-host';
export const MARKER_SIZE = 24;
export const MARKER_COLOR = '#f59e0b';
export const MARKER_Z_INDEX = '2147483645';
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts src/shared/constants.ts
git commit -m "refactor: rename Warning→Suggestion in types and constants"
```

---

## Task 2: Rename warnings.ts → suggestions.ts

**Files:**
- Delete: `src/content/analysis/warnings.ts`
- Create: `src/content/analysis/suggestions.ts`
- Delete: `tests/analysis/warnings.test.ts`
- Create: `tests/analysis/suggestions.test.ts`

- [ ] **Step 1: Create suggestions.ts (renamed module)**

`src/content/analysis/suggestions.ts` — same logic, updated types:
```typescript
import type { DesignTokens, NormalizedElementData, Suggestion, TokenFrequency } from '@shared/types';
import { SPACING_TOLERANCE_PX, MIN_TAP_TARGET_PX } from '@shared/constants';

function isInTokenSet<T>(value: T, tokens: TokenFrequency<T>[]): boolean {
  return tokens.some((t) => t.value === value);
}

function isNearSpacingToken(value: number, tokens: TokenFrequency<number>[]): boolean {
  return tokens.some((t) => Math.abs(t.value - value) <= SPACING_TOLERANCE_PX);
}

function collectNonZeroSpacing(el: NormalizedElementData): number[] {
  const values: number[] = [];
  for (const v of [
    el.margins.top, el.margins.right, el.margins.bottom, el.margins.left,
    el.paddings.top, el.paddings.right, el.paddings.bottom, el.paddings.left,
  ]) {
    if (v > 0) values.push(v);
  }
  if (el.gap !== null && el.gap > 0) values.push(el.gap);
  return values;
}

export function generateSuggestions(
  el: NormalizedElementData,
  tokens: DesignTokens,
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  if (el.fontSize > 0 && !isInTokenSet(el.fontSize, tokens.fontSizes)) {
    const common = tokens.fontSizes.slice(0, 3).map((t) => `${t.value}px`).join(', ');
    suggestions.push({
      type: 'uncommon-font-size',
      severity: 'warning',
      message: 'Uncommon font size on this page',
      detail: `${el.fontSize}px — common sizes: ${common}`,
    });
  }

  const spacingValues = collectNonZeroSpacing(el);
  const offScaleValues = spacingValues.filter(
    (v) => !isNearSpacingToken(v, tokens.spacingValues),
  );
  if (offScaleValues.length > 0) {
    const uniqueOff = [...new Set(offScaleValues)];
    const common = tokens.spacingValues.slice(0, 4).map((t) => `${t.value}px`).join(', ');
    suggestions.push({
      type: 'off-spacing-scale',
      severity: 'warning',
      message: 'Spacing not aligned to page scale',
      detail: `${uniqueOff.map((v) => `${v}px`).join(', ')} — page scale: ${common}`,
    });
  }

  if (el.borderRadius > 0 && !isInTokenSet(el.borderRadius, tokens.borderRadii)) {
    const common = tokens.borderRadii.map((t) => `${t.value}px`).join(', ');
    suggestions.push({
      type: 'unusual-radius',
      severity: 'info',
      message: 'Border radius differs from page pattern',
      detail: `${el.borderRadius}px — common radii: ${common}`,
    });
  }

  if (el.isInteractive && el.height < MIN_TAP_TARGET_PX) {
    suggestions.push({
      type: 'small-tap-target',
      severity: 'warning',
      message: 'Smaller than typical interactive target',
      detail: `${el.height}px tall — recommended minimum: ${MIN_TAP_TARGET_PX}px`,
    });
  }

  if (!isInTokenSet(el.fontWeight, tokens.fontWeights)) {
    suggestions.push({
      type: 'uncommon-font-weight',
      severity: 'info',
      message: 'Uncommon font weight on this page',
      detail: `${el.fontWeight} — common weights: ${tokens.fontWeights.map((t) => t.value).join(', ')}`,
    });
  }

  if (
    tokens.fontFamilies.length > 0 &&
    el.fontFamily !== tokens.fontFamilies[0].value &&
    !isInTokenSet(el.fontFamily, tokens.fontFamilies)
  ) {
    suggestions.push({
      type: 'mixed-font-family',
      severity: 'info',
      message: 'Different font family than dominant',
      detail: `${el.fontFamily} — dominant: ${tokens.fontFamilies[0].value}`,
    });
  }

  return suggestions;
}
```

- [ ] **Step 2: Delete old warnings.ts**

```bash
rm src/content/analysis/warnings.ts
```

- [ ] **Step 3: Create suggestions.test.ts (renamed tests)**

`tests/analysis/suggestions.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateSuggestions } from '../../src/content/analysis/suggestions';
import type { DesignTokens, NormalizedElementData, SpacingQuad } from '../../src/shared/types';

function makeTokens(overrides: Partial<DesignTokens> = {}): DesignTokens {
  return {
    fontFamilies: [{ value: 'Arial', count: 80, percentage: 80 }],
    fontSizes: [
      { value: 16, count: 60, percentage: 60 },
      { value: 14, count: 30, percentage: 30 },
    ],
    fontWeights: [{ value: 400, count: 70, percentage: 70 }],
    lineHeights: [{ value: 24, count: 50, percentage: 50 }],
    textColors: [{ value: '#000000', count: 90, percentage: 90 }],
    backgroundColors: [{ value: '#ffffff', count: 95, percentage: 95 }],
    spacingValues: [
      { value: 8, count: 40, percentage: 40 },
      { value: 16, count: 30, percentage: 30 },
      { value: 24, count: 20, percentage: 20 },
    ],
    borderRadii: [
      { value: 4, count: 60, percentage: 60 },
      { value: 8, count: 40, percentage: 40 },
    ],
    componentHeights: [{ value: 40, count: 80, percentage: 80 }],
    ...overrides,
  };
}

const zeroQuad: SpacingQuad = { top: 0, right: 0, bottom: 0, left: 0 };

function makeNormalized(overrides: Partial<NormalizedElementData> = {}): NormalizedElementData {
  return {
    element: {} as Element,
    elementType: 'button',
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 400,
    lineHeight: 24,
    letterSpacing: 0,
    textColor: '#000000',
    backgroundColor: '#ffffff',
    borderColor: null,
    margins: { ...zeroQuad },
    paddings: { ...zeroQuad },
    gap: null,
    borderRadius: 4,
    width: 120,
    height: 40,
    display: 'flex',
    position: 'static',
    isInteractive: true,
    ...overrides,
  };
}

describe('generateSuggestions', () => {
  it('returns no suggestions for on-system element', () => {
    const suggestions = generateSuggestions(makeNormalized(), makeTokens());
    expect(suggestions).toEqual([]);
  });

  it('suggests about uncommon font size', () => {
    const el = makeNormalized({ fontSize: 15 });
    const suggestions = generateSuggestions(el, makeTokens());
    const fontSuggestion = suggestions.find((s) => s.type === 'uncommon-font-size');
    expect(fontSuggestion).toBeDefined();
    expect(fontSuggestion!.severity).toBe('warning');
    expect(fontSuggestion!.message).toContain('Uncommon');
  });

  it('suggests about off-scale spacing', () => {
    const el = makeNormalized({
      paddings: { top: 13, right: 13, bottom: 13, left: 13 },
    });
    const suggestions = generateSuggestions(el, makeTokens());
    const spacingSuggestion = suggestions.find((s) => s.type === 'off-spacing-scale');
    expect(spacingSuggestion).toBeDefined();
  });

  it('does not suggest about spacing within tolerance', () => {
    const el = makeNormalized({
      paddings: { top: 15, right: 16, bottom: 17, left: 16 },
    });
    const suggestions = generateSuggestions(el, makeTokens());
    const spacingSuggestion = suggestions.find((s) => s.type === 'off-spacing-scale');
    expect(spacingSuggestion).toBeUndefined();
  });

  it('suggests about unusual border radius', () => {
    const el = makeNormalized({ borderRadius: 7 });
    const suggestions = generateSuggestions(el, makeTokens());
    const radiusSuggestion = suggestions.find((s) => s.type === 'unusual-radius');
    expect(radiusSuggestion).toBeDefined();
    expect(radiusSuggestion!.severity).toBe('info');
  });

  it('suggests about small tap target', () => {
    const el = makeNormalized({ isInteractive: true, height: 28 });
    const suggestions = generateSuggestions(el, makeTokens());
    const tapSuggestion = suggestions.find((s) => s.type === 'small-tap-target');
    expect(tapSuggestion).toBeDefined();
  });

  it('does not suggest about tap target for non-interactive elements', () => {
    const el = makeNormalized({ isInteractive: false, height: 12 });
    const suggestions = generateSuggestions(el, makeTokens());
    const tapSuggestion = suggestions.find((s) => s.type === 'small-tap-target');
    expect(tapSuggestion).toBeUndefined();
  });

  it('suggests about uncommon font weight', () => {
    const el = makeNormalized({ fontWeight: 500 });
    const suggestions = generateSuggestions(el, makeTokens());
    const weightSuggestion = suggestions.find((s) => s.type === 'uncommon-font-weight');
    expect(weightSuggestion).toBeDefined();
  });

  it('suggests about mixed font family', () => {
    const el = makeNormalized({ fontFamily: 'Roboto' });
    const suggestions = generateSuggestions(el, makeTokens());
    const familySuggestion = suggestions.find((s) => s.type === 'mixed-font-family');
    expect(familySuggestion).toBeDefined();
  });
});
```

- [ ] **Step 4: Delete old test file**

```bash
rm tests/analysis/warnings.test.ts
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- tests/analysis/suggestions.test.ts
```

Expected: 9/9 pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename warnings→suggestions (module, function, tests)"
```

---

## Task 3: Update All Consumers of the Rename

**Files:**
- Modify: `src/content/analysis/analyzer.ts`
- Modify: `src/content/inspector/panelRenderer.ts`
- Modify: `src/content/inspector/inspectionController.ts`
- Modify: `src/content/index.ts`
- Modify: `src/popup/App.tsx`
- Modify: `src/popup/components/SettingsPanel.tsx`
- Modify: `src/shared/storage.ts`
- Modify: `tests/shared/storage.test.ts`

- [ ] **Step 1: Update analyzer.ts**

In `src/content/analysis/analyzer.ts`:

Change line 1 import:
```typescript
import type { DesignTokens, NormalizedElementData, Suggestion, InspectionData } from '@shared/types';
```

Change line 6 import:
```typescript
import { generateSuggestions } from './suggestions';
```

Change line 81-83:
```typescript
    const suggestions: Suggestion[] = this.tokens
      ? generateSuggestions(normalized, this.tokens)
      : [];
```

Change line 87-93 (low contrast push):
```typescript
    if (contrast.level === 'low') {
      suggestions.push({
        type: 'low-contrast',
        severity: 'warning',
        message: 'Low color contrast',
        detail: `${contrast.ratio}:1 — may affect readability`,
      });
    }
```

Change line 123:
```typescript
      suggestions,  // was: warnings
```

- [ ] **Step 2: Update panelRenderer.ts**

In `src/content/inspector/panelRenderer.ts`:

Change the section title on line 440 from `"Warnings"` to `"Suggestions"`.

Change `data.warnings` to `data.suggestions` on line 420.

Change CSS class names: `warnings-list` → `suggestions-list`, `warning-item` → `suggestion-item`, `warning-icon` → `suggestion-icon`, `warning-text` → `suggestion-text`, `warning-message` → `suggestion-message`, `warning-detail` → `suggestion-detail`, `severity-warning` stays (it's the severity level, not the feature name).

Update the rendering code to use `data.suggestions` and the new class names.

- [ ] **Step 3: Update inspectionController.ts**

In `src/content/inspector/inspectionController.ts`:

Change line 125:
```typescript
      if (!this.settings.showSuggestions) {
        data.suggestions = [];
      }
```

- [ ] **Step 4: Update content/index.ts**

No changes needed — it doesn't reference warnings/suggestions directly, just passes through settings.

- [ ] **Step 5: Update popup components**

In `src/popup/components/SettingsPanel.tsx`, change the "Show warnings" label and field:
```tsx
<label className="setting-row">
  <span>Show suggestions</span>
  <input
    type="checkbox"
    checked={settings.showSuggestions}
    onChange={(e) => onUpdate({ showSuggestions: e.target.checked })}
  />
</label>
```

- [ ] **Step 6: Update storage.test.ts**

In `tests/shared/storage.test.ts`, change `showWarnings` references to `showSuggestions`.

- [ ] **Step 7: Run all tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 8: Verify build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: update all consumers for Warning→Suggestion rename"
```

---

## Task 4: SuggestionMarkerManager

**Files:**
- Create: `src/content/inspector/suggestionMarkerManager.ts`

This is the core new feature. Creates numbered markers on flagged elements with hover tooltips.

- [ ] **Step 1: Create suggestionMarkerManager.ts**

`src/content/inspector/suggestionMarkerManager.ts`:
```typescript
import type { Suggestion } from '@shared/types';
import { MARKER_HOST_ID, MARKER_SIZE, MARKER_COLOR, MARKER_Z_INDEX } from '@shared/constants';

export interface MarkerData {
  element: Element;
  suggestions: Suggestion[];
  tag: string;
}

const MARKER_STYLES = `
  :host {
    all: initial;
    position: fixed;
    top: 0;
    left: 0;
    z-index: ${MARKER_Z_INDEX};
    pointer-events: none;
  }

  .marker {
    position: fixed;
    width: ${MARKER_SIZE}px;
    height: ${MARKER_SIZE}px;
    border-radius: 50%;
    background: ${MARKER_COLOR};
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    pointer-events: auto;
    transition: transform 0.1s ease;
    user-select: none;
  }

  .marker:hover {
    transform: scale(1.15);
  }

  .tooltip {
    position: fixed;
    background: rgba(15, 15, 15, 0.95);
    color: #e0e0e0;
    border-radius: 8px;
    padding: 12px 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    width: 280px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    z-index: 1;
    display: none;
  }

  .tooltip.visible {
    display: block;
  }

  .tooltip-header {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    margin-bottom: 8px;
  }

  .suggestion-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 6px;
  }

  .suggestion-card:last-child {
    margin-bottom: 0;
  }

  .suggestion-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .suggestion-card-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  .suggestion-card-message {
    font-weight: 500;
    font-size: 12px;
  }

  .suggestion-card-detail {
    color: #888;
    font-size: 11px;
    margin-top: 2px;
    font-family: 'SF Mono', Menlo, Monaco, monospace;
  }
`;

export class SuggestionMarkerManager {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private markers: HTMLDivElement[] = [];
  private tooltip: HTMLDivElement | null = null;
  private markerDataMap = new WeakMap<HTMLDivElement, MarkerData>();
  private scrollRAF: number | null = null;
  private elementRefs: { marker: HTMLDivElement; element: Element }[] = [];
  private onClickCallback: ((element: Element) => void) | null = null;

  onElementClick(callback: (element: Element) => void): void {
    this.onClickCallback = callback;
  }

  show(items: MarkerData[]): void {
    this.clear();
    if (items.length === 0) return;

    const { shadow } = this.ensureHost();

    items.forEach((item, index) => {
      const marker = document.createElement('div');
      marker.className = 'marker';
      marker.textContent = String(item.suggestions.length);
      this.markerDataMap.set(marker, item);

      const rect = item.element.getBoundingClientRect();
      marker.style.top = `${rect.top - MARKER_SIZE / 2}px`;
      marker.style.left = `${rect.right - MARKER_SIZE / 2}px`;

      marker.addEventListener('mouseenter', () => this.showTooltip(marker));
      marker.addEventListener('mouseleave', () => this.hideTooltip());
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideTooltip();
        const data = this.markerDataMap.get(marker);
        if (data && this.onClickCallback) {
          this.onClickCallback(data.element);
        }
      });

      shadow.appendChild(marker);
      this.markers.push(marker);
      this.elementRefs.push({ marker, element: item.element });
    });

    this.startScrollTracking();
  }

  hide(): void {
    this.clear();
  }

  destroy(): void {
    this.clear();
    this.stopScrollTracking();
    if (this.host) {
      this.host.remove();
      this.host = null;
      this.shadow = null;
      this.tooltip = null;
    }
  }

  private clear(): void {
    this.hideTooltip();
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers = [];
    this.elementRefs = [];
  }

  repositionAll(): void {
    for (const { marker, element } of this.elementRefs) {
      const rect = element.getBoundingClientRect();
      // Hide markers for off-screen elements
      if (rect.bottom < 0 || rect.top > window.innerHeight ||
          rect.right < 0 || rect.left > window.innerWidth) {
        marker.style.display = 'none';
      } else {
        marker.style.display = 'flex';
        marker.style.top = `${rect.top - MARKER_SIZE / 2}px`;
        marker.style.left = `${rect.right - MARKER_SIZE / 2}px`;
      }
    }
  }

  private startScrollTracking(): void {
    const onScroll = () => {
      if (this.scrollRAF) cancelAnimationFrame(this.scrollRAF);
      this.scrollRAF = requestAnimationFrame(() => {
        this.repositionAll();
        this.scrollRAF = null;
      });
    };
    window.addEventListener('scroll', onScroll, true);
    // Store cleanup reference
    (this as any)._scrollCleanup = () => {
      window.removeEventListener('scroll', onScroll, true);
      if (this.scrollRAF) cancelAnimationFrame(this.scrollRAF);
    };
  }

  private stopScrollTracking(): void {
    if ((this as any)._scrollCleanup) {
      (this as any)._scrollCleanup();
      (this as any)._scrollCleanup = null;
    }
  }

  private showTooltip(marker: HTMLDivElement): void {
    const data = this.markerDataMap.get(marker);
    if (!data) return;

    const tooltip = this.ensureTooltip();
    tooltip.innerHTML = this.renderTooltipContent(data);
    tooltip.classList.add('visible');

    // Position tooltip to the left of the marker
    const markerRect = marker.getBoundingClientRect();
    let left = markerRect.left - 280 - 8;
    let top = markerRect.top;

    // Flip right if clipping left edge
    if (left < 8) {
      left = markerRect.right + 8;
    }

    // Keep in viewport vertically
    const tooltipHeight = 150; // estimated
    if (top + tooltipHeight > window.innerHeight) {
      top = window.innerHeight - tooltipHeight - 8;
    }
    if (top < 8) top = 8;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
  }

  private renderTooltipContent(data: MarkerData): string {
    const count = data.suggestions.length;
    const header = `${count} Suggestion${count !== 1 ? 's' : ''} for &lt;${data.tag}&gt;`;

    const cards = data.suggestions.map((s) => {
      const icon = s.severity === 'warning' ? '⚠️' : '💡';
      const detail = s.detail
        ? `<div class="suggestion-card-detail">${this.escapeHtml(s.detail)}</div>`
        : '';
      return `
        <div class="suggestion-card">
          <div class="suggestion-card-header">
            <span class="suggestion-card-icon">${icon}</span>
            <span class="suggestion-card-message">${this.escapeHtml(s.message)}</span>
          </div>
          ${detail}
        </div>
      `;
    }).join('');

    return `<div class="tooltip-header">${header}</div>${cards}`;
  }

  private ensureHost(): { host: HTMLDivElement; shadow: ShadowRoot } {
    if (this.host && this.shadow) return { host: this.host, shadow: this.shadow };

    const existing = document.getElementById(MARKER_HOST_ID);
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = MARKER_HOST_ID;
    Object.assign(host.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: MARKER_Z_INDEX,
      pointerEvents: 'none',
    });
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = MARKER_STYLES;
    shadow.appendChild(style);

    this.host = host;
    this.shadow = shadow;

    return { host, shadow };
  }

  private ensureTooltip(): HTMLDivElement {
    if (this.tooltip) return this.tooltip;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    this.shadow!.appendChild(tooltip);
    this.tooltip = tooltip;
    return tooltip;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/content/inspector/suggestionMarkerManager.ts
git commit -m "feat: add SuggestionMarkerManager with numbered markers and card tooltips"
```

---

## Task 5: Integrate Markers into InspectionController

**Files:**
- Modify: `src/content/inspector/inspectionController.ts`
- Modify: `src/content/analysis/analyzer.ts` (add method to get flagged elements)

- [ ] **Step 1: Add getFlaggedElements to PageAnalyzer**

Add this method to `src/content/analysis/analyzer.ts` after the `inspectElement` method:

```typescript
  /**
   * Returns elements that have at least one suggestion.
   * Used by SuggestionMarkerManager to place markers.
   */
  getFlaggedElements(): { element: Element; suggestions: Suggestion[]; tag: string }[] {
    if (!this.tokens) return [];

    const raw = collectVisibleElements();
    const normalized = normalizeAll(raw);
    const flagged: { element: Element; suggestions: Suggestion[]; tag: string }[] = [];

    for (const el of normalized) {
      const suggestions = generateSuggestions(el, this.tokens);
      // Also check contrast
      const contrast = computeContrast(
        getComputedStyle(el.element).color,
        el.element,
      );
      if (contrast.level === 'low') {
        suggestions.push({
          type: 'low-contrast',
          severity: 'warning',
          message: 'Low color contrast',
          detail: `${contrast.ratio}:1 — may affect readability`,
        });
      }

      if (suggestions.length > 0) {
        flagged.push({
          element: el.element,
          suggestions,
          tag: el.element.tagName.toLowerCase(),
        });
      }
    }

    return flagged;
  }
```

Also add `Suggestion` to the type import on line 1.

- [ ] **Step 2: Integrate SuggestionMarkerManager into InspectionController**

In `src/content/inspector/inspectionController.ts`:

Add import:
```typescript
import { SuggestionMarkerManager } from './suggestionMarkerManager';
```

Add field in the class:
```typescript
  private markerManager: SuggestionMarkerManager;
```

In constructor, after `this.panel = new PanelRenderer();`:
```typescript
    this.markerManager = new SuggestionMarkerManager();
    this.markerManager.onElementClick((element) => {
      this.lockOnElement(element);
    });
```

Add a `lockOnElement` method:
```typescript
  private lockOnElement(element: Element): void {
    this.hoveredElement = element;
    this.highlight.show(element);

    try {
      const data = this.analyzer.inspectElement(element);
      if (!this.settings.showSuggestions) {
        data.suggestions = [];
      }
      const rect = element.getBoundingClientRect();
      this.panel.show(data, rect);
    } catch (err) {
      console.error('[Pixel Linter] Inspect element failed:', err);
    }

    this.state = 'locked';
    this.lockedElement = element;
  }
```

In `activate()`, after `this.state = 'hovering';` add:
```typescript
    this.showMarkers();
```

Add `showMarkers` method:
```typescript
  private showMarkers(): void {
    if (!this.settings.showSuggestions) return;
    try {
      const flagged = this.analyzer.getFlaggedElements();
      this.markerManager.show(flagged);
    } catch (err) {
      console.error('[Pixel Linter] Failed to show markers:', err);
    }
  }
```

In `deactivate()`, before `this.state = 'inactive';`:
```typescript
    this.markerManager.hide();
```

In `destroy()`, after `this.panel.destroy();`:
```typescript
    this.markerManager.destroy();
```

In `refreshAnalysis()`, after `this.analyzer.scan();`:
```typescript
    this.showMarkers();
```

In the mutation observer callback inside `activate()`, after the scan:
```typescript
    this.cleanupObserver = setupMutationObserver(() => {
      try {
        this.analyzer.scan();
        this.showMarkers();
      } catch (err) {
        console.error('[Pixel Linter] Re-scan failed:', err);
      }
    });
```

- [ ] **Step 3: Run all tests**

```bash
npm run test
```

Expected: All tests pass.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: integrate suggestion markers into inspection controller"
```

---

## Task 6: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test
```

Expected: All tests pass (same count as before, just renamed test file).

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 3: Manual testing**

1. Reload extension in `chrome://extensions`
2. Reload test page
3. Click "Enter Inspect Mode"
4. Verify: numbered amber markers appear on elements with suggestions
5. Verify: hovering a marker shows card tooltip with suggestion details
6. Verify: clicking a marker locks the full inspection panel
7. Verify: panel section now says "Suggestions" not "Warnings"
8. Verify: popup settings say "Show suggestions" not "Show warnings"
9. Verify: Escape deactivation removes all markers
10. Verify: markers reposition on scroll

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: final integration fixes for suggestion markers"
```
