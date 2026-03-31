# Suggestion Markers + Warnings→Suggestions Rename — Design Spec

## Context

Pixel Linter's core differentiator is design system mismatch detection. Currently, users must hover each element individually to discover suggestions. This spec adds Figma-style numbered markers that appear on all flagged elements when inspect mode is active, making issues immediately visible at a glance.

Additionally, "Warnings" is renamed to "Suggestions" throughout — friendlier language that matches the tool's advisory (not prescriptive) tone.

---

## Feature: Suggestion Markers

### Behavior

1. When the user enters inspect mode, after the initial page scan, markers appear on every element that has at least one suggestion
2. Markers are always visible while inspect mode is active
3. Hovering a marker shows a card tooltip listing all suggestions for that element
4. Clicking a marker locks the full inspection panel on that element (same as clicking during hover)
5. Markers update after mutation-triggered re-scans (debounced)
6. Markers disappear when inspect mode is deactivated

### Marker Appearance

- Numbered amber circle positioned on the top-right corner of the flagged element
- 24px diameter, `#f59e0b` background, white bold number (11px)
- `border-radius: 50%`, `box-shadow: 0 2px 4px rgba(0,0,0,0.2)`
- Number = count of suggestions on that element
- `position: fixed`, repositioned on scroll
- `pointer-events: auto` (must be hoverable and clickable)
- `z-index: 2147483645` (below highlight overlay and panel)

### Tooltip Appearance (on marker hover)

Card-style tooltip with element context:

```
┌─────────────────────────────────────┐
│  2 Suggestions for <button>         │  ← header: count + tag
│                                     │
│  ┌─────────────────────────────────┐│
│  │ ⚠️ Off-scale spacing            ││  ← suggestion card
│  │ 13px padding — try 8px or 16px  ││  ← detail with friendly hint
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ 💡 Uncommon font weight          ││
│  │ 500 — most elements use 400, 700││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

- Dark background: `rgba(15, 15, 15, 0.95)`, 8px border-radius
- Max width: 280px
- Header: 10px uppercase, `#888`, shows suggestion count + element tag
- Each suggestion in its own sub-card: `rgba(255,255,255,0.05)` background, 6px border-radius
- Icons: ⚠️ for `warning` severity (amber), 💡 for `info` severity (blue)
- Detail line: `#888`, 11px, monospace
- Shadow: `0 8px 24px rgba(0,0,0,0.3)`
- Positioned to the left of the marker by default, flips right if clipping viewport
- Appears on hover, disappears on mouseout

### Click Behavior

Clicking a marker:
1. Hides the tooltip
2. Triggers the same lock behavior as clicking an element during hover inspection
3. Shows the full inspection panel locked on that element
4. Highlight overlay appears on the element

---

## Rename: Warnings → Suggestions

### Code changes

| Before | After |
|--------|-------|
| `WarningType` | `SuggestionType` |
| `Warning` interface | `Suggestion` interface |
| `generateWarnings()` | `generateSuggestions()` |
| `warnings: Warning[]` in `InspectionData` | `suggestions: Suggestion[]` in `InspectionData` |
| `data.warnings` references | `data.suggestions` references |

### UI text changes

| Location | Before | After |
|----------|--------|-------|
| Panel section title | "WARNINGS" | "SUGGESTIONS" |
| Panel section title (when renamed) | "Observations" | "Suggestions" |
| Warning message style | "⚠" / "ℹ" | "⚠️" / "💡" |

### Internal severity field

`severity: 'info' | 'warning'` stays unchanged — it's an internal classification that drives icon/color choices, not user-facing language.

---

## Architecture

### New files

- `src/content/inspector/suggestionMarkerManager.ts` — manages marker lifecycle, positioning, tooltip rendering

### Modified files

- `src/shared/types.ts` — rename Warning→Suggestion, WarningType→SuggestionType
- `src/content/analysis/warnings.ts` → rename to `src/content/analysis/suggestions.ts`, rename function
- `src/content/analysis/analyzer.ts` — update imports, use `generateSuggestions`
- `src/content/inspector/inspectionController.ts` — integrate SuggestionMarkerManager, trigger on activate/deactivate/re-scan
- `src/content/inspector/panelRenderer.ts` — rename section title, update references
- `src/popup/App.tsx` — update any warning references in UI text
- `tests/analysis/warnings.test.ts` → rename to `tests/analysis/suggestions.test.ts`, update imports

### SuggestionMarkerManager

```typescript
class SuggestionMarkerManager {
  // Lifecycle
  show(elements: MarkerData[]): void    // Place markers on flagged elements
  hide(): void                          // Remove all markers
  destroy(): void                       // Full cleanup

  // Called by InspectionController
  onScroll(): void                      // Throttled repositioning
  onElementClick(callback): void        // Register click handler
}

interface MarkerData {
  element: Element;
  suggestions: Suggestion[];
  tag: string;
}
```

- All markers and tooltips live inside a single Shadow DOM host (separate from the panel host)
- Markers are `position: fixed` divs, repositioned on scroll using `getBoundingClientRect()`
- Scroll listener is throttled to 16ms (requestAnimationFrame)
- On re-scan: diff old vs new flagged elements, recycle existing markers where possible

### Integration with InspectionController

```
activate()
  → scan()
  → collect flagged elements (those with suggestions)
  → markerManager.show(flaggedElements)
  → attach scroll listener

deactivate()
  → markerManager.hide()
  → remove scroll listener

onMutationRescan()
  → scan()
  → markerManager.show(newFlaggedElements)  // replaces old markers
```

### Performance

- Only elements with ≥1 suggestion get markers (typically 10-30 per page)
- Scroll repositioning via `requestAnimationFrame` (no layout thrashing)
- Tooltip rendered on hover only (not pre-rendered for all markers)
- Re-scan recycles marker DOM nodes where element reference matches

---

## Testing

- Rename all test references from warning→suggestion
- No new tests needed for markers (DOM-dependent, tested manually)
- Existing suggestion generation tests continue to validate the core logic

---

## Non-goals

- Marker filtering by severity (show all or none — no per-type toggle)
- Marker animations or transitions
- Marker persistence across navigation
- Summary count in popup (future enhancement)
