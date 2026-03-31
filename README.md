# Pixel Linter

A Chrome extension for visual QA. Hover any element on a website to see a smart inspection panel that compares its styles against the page's inferred design system.

## Why

Design QA on staging sites is tedious. You're looking for inconsistencies — a font size that's 15px instead of 16px, spacing that's 13px instead of the 8/16/24 scale, a border radius that doesn't match the rest of the page. Pixel Linter automates this detection by scanning the page, inferring what the design system probably is, and flagging anything that looks off.

## Features

- **Smart inspection panel**: Hover any element to see typography, colors, spacing, border radius, and dimensions
- **Design system inference**: Automatically detects dominant fonts, sizes, colors, spacing scales, and radii from the page
- **Heuristic warnings**: Flags uncommon font sizes, off-scale spacing, unusual radii, low contrast, and small tap targets
- **Shadow DOM isolation**: Panel styles never leak into the host page
- **SPA support**: MutationObserver with debounced re-analysis for dynamic content
- **Lock on click**: Click to freeze the inspection panel, Escape to unlock

## Architecture

```
Content Script (Vanilla TS)
├── Analysis Pipeline: collector → normalizer → histogram → tokenInferrer
├── PageAnalyzer facade (coordinates pipeline, stores tokens)
├── InspectionController (hover/lock/escape state machine)
├── PanelRenderer (Shadow DOM)
└── MutationObserver (debounced SPA support)

Popup (React)
├── Inspect mode controls
├── Settings (warnings, compact mode)
└── Detected tokens summary

Background Worker (minimal)
└── Badge updates + default settings
```

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Load in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist/` directory
6. Navigate to any website and click the Pixel Linter icon

## Testing

```bash
npm run test          # Run once
npm run test:watch    # Watch mode
```

## Permissions

- **storage**: Persist user settings (enabled sites, preferences)
- **activeTab**: Inspect the current tab's DOM when activated
- **host_permissions (<all_urls>)**: Content script needs to run on any site for inspection

## How It Works

1. **Scan**: On activation, the content script scans up to 500 visible elements, extracting computed styles
2. **Normalize**: Raw CSS values are converted to typed numbers (px, hex colors, etc.)
3. **Analyze**: Frequency histograms are built for each property (font size, spacing, radii, etc.)
4. **Infer**: Dominant values are extracted as "design tokens" — the page's likely design system
5. **Compare**: When you hover an element, its properties are compared against the inferred tokens
6. **Warn**: Any values that don't match the dominant patterns are flagged with human-readable warnings

## Known Limitations

- Analysis is heuristic — it infers patterns, not the "true" design system
- Background detection walks up the DOM but can't reliably handle gradients, images, or complex compositing
- Element scan is capped at 500 elements for performance
- No persistence of analysis across page loads
- Icons are placeholder SVGs

## Tech Stack

- TypeScript (strict mode)
- React 18 (popup only)
- Vite + @crxjs/vite-plugin
- Manifest V3
- Vitest
- ESLint + Prettier

## Privacy

Pixel Linter runs entirely in your browser. It does **not** collect, transmit, or store any personal data. All analysis happens locally on the page you're inspecting. The only data persisted is your preferences (show suggestions toggle, compact mode, enabled sites list), stored locally via `chrome.storage.local`. No analytics, no tracking, no external requests.

## Roadmap Ideas

- Figma integration for true design-system comparison
- Exportable reports (PDF/JSON)
- Custom design token configuration
- Page-wide audit mode (scan all elements at once)
- Color palette clustering
- Sibling consistency comparison
