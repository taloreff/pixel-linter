# Pixel Linter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-quality Chrome extension (Manifest V3) that lets users hover elements on any website to see a smart inspection panel comparing element styles against the page's inferred design system.

**Architecture:** Content-script pipeline with facade pattern. Analysis engine runs entirely in the content script as discrete pure-function modules (collector -> normalizer -> histogram -> tokenInferrer) behind a PageAnalyzer facade. Popup (React) communicates with content script via two-party chrome.tabs.sendMessage. Shadow DOM isolates the inspection panel from host page styles.

**Tech Stack:** TypeScript (strict), React 18 (popup only), Vite + @crxjs/vite-plugin, Manifest V3, Vitest, ESLint, Prettier

**Spec:** `docs/superpowers/specs/2026-03-30-pixel-linter-design.md`

---

## File Structure

```
pixel-linter/
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  vitest.config.ts
  .eslintrc.cjs
  .prettierrc
  manifest.json

  src/
    shared/
      types.ts              -- DesignTokens, Warning, FrequencyMaps, ElementType, etc.
      constants.ts          -- scan budget, debounce times, thresholds
      messaging.ts          -- Message/MessageResponse types + type guards
      storage.ts            -- typed chrome.storage.local wrapper

    content/
      index.ts              -- entry point, message handler, lifecycle
      analysis/
        collector.ts        -- DOM traversal, visible element filtering
        normalizer.ts       -- value normalization (px, hex, etc.)
        histogram.ts        -- frequency distribution building
        tokenInferrer.ts    -- dominant token extraction
        warnings.ts         -- element + tokens -> warnings
        analyzer.ts         -- PageAnalyzer facade
        contrast.ts         -- WCAG contrast ratio
        elementClassifier.ts -- tag/role/style -> ElementType
      inspector/
        inspectionController.ts -- hover/click/escape state machine
        highlightManager.ts     -- overlay positioning
        panelRenderer.ts        -- Shadow DOM panel
        targetResolver.ts       -- smart parent promotion
      observer.ts           -- MutationObserver setup + debounce
      utils/
        dom.ts              -- visibility checks, element filtering
        geometry.ts         -- viewport-aware positioning
        format.ts           -- human-readable value formatting

    background/
      index.ts              -- badge, onInstalled

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
      popup.css

  tests/
    analysis/
      normalizer.test.ts
      histogram.test.ts
      tokenInferrer.test.ts
      warnings.test.ts
      contrast.test.ts
      elementClassifier.test.ts
    shared/
      storage.test.ts
```

---

## Task 1: Project Scaffold + Build Pipeline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`
- Create: `manifest.json`
- Create: `src/shared/types.ts` (empty placeholder)
- Create: `src/content/index.ts` (minimal)
- Create: `src/background/index.ts` (minimal)
- Create: `src/popup/index.html`
- Create: `src/popup/main.tsx` (minimal)
- Create: `src/popup/App.tsx` (minimal)

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/who/Documents/GitHub/flow-rtl
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "pixel-linter",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext .ts,.tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,html}\""
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.28",
    "@types/chrome": "^0.0.287",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@typescript-eslint/eslint-plugin": "^8.16.0",
    "@typescript-eslint/parser": "^8.16.0",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^8.57.1",
    "prettier": "^3.4.2",
    "typescript": "^5.7.2",
    "vite": "^5.4.11",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@content/*": ["src/content/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Pixel Linter",
  "description": "Visual QA assistant — inspect live UI and detect design-system inconsistencies",
  "version": "0.1.0",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png"
    }
  },
  "background": {
    "service_worker": "src/background/index.ts"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ],
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["<all_urls>"]
}
```

- [ ] **Step 6: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@content': resolve(__dirname, 'src/content'),
    },
  },
});
```

- [ ] **Step 7: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@content': resolve(__dirname, 'src/content'),
    },
  },
});
```

- [ ] **Step 8: Create .eslintrc.cjs**

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
  ignorePatterns: ['dist/', 'node_modules/'],
};
```

- [ ] **Step 9: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 10: Create .gitignore**

```
node_modules/
dist/
.vite/
*.crx
*.pem
```

- [ ] **Step 11: Create minimal source files for build verification**

`src/shared/types.ts`:
```typescript
// Core types — will be populated in Task 2
export type ElementType =
  | 'heading' | 'paragraph' | 'button' | 'link' | 'input'
  | 'textarea' | 'image' | 'icon' | 'card' | 'nav-item' | 'generic';
```

`src/background/index.ts`:
```typescript
chrome.runtime.onInstalled.addListener(() => {
  console.log('Pixel Linter installed');
});
```

`src/content/index.ts`:
```typescript
console.log('Pixel Linter content script loaded');
```

`src/popup/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pixel Linter</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

`src/popup/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);
```

`src/popup/App.tsx`:
```tsx
export function App() {
  return <div style={{ width: 320, padding: 16 }}>
    <h1 style={{ fontSize: 16, margin: 0 }}>Pixel Linter</h1>
    <p style={{ fontSize: 12, color: '#666' }}>Visual QA assistant</p>
  </div>;
}
```

- [ ] **Step 12: Create placeholder icon files**

```bash
mkdir -p public/icons
# Create minimal 1x1 PNG placeholders (will be replaced with real icons later)
# For now, the build just needs the files to exist
```

Create `public/icons/` directory with placeholder PNGs. These will be simple colored squares generated via a script or manually created.

- [ ] **Step 13: Install dependencies and verify build**

```bash
npm install
npm run build
```

Expected: Build succeeds, `dist/` contains manifest.json, background service worker, content script, and popup HTML.

- [ ] **Step 14: Verify tests run**

```bash
npm run test
```

Expected: 0 tests found, exits cleanly.

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: scaffold project with Vite, React, MV3, TypeScript"
```

---

## Task 2: Shared Types, Constants, Storage, and Messaging

**Files:**
- Create: `src/shared/types.ts` (full)
- Create: `src/shared/constants.ts`
- Create: `src/shared/storage.ts`
- Create: `src/shared/messaging.ts`
- Create: `tests/shared/storage.test.ts`

- [ ] **Step 1: Write the full types file**

`src/shared/types.ts`:
```typescript
export type ElementType =
  | 'heading' | 'paragraph' | 'button' | 'link' | 'input'
  | 'textarea' | 'image' | 'icon' | 'card' | 'nav-item' | 'generic';

export type WarningType =
  | 'uncommon-font-size' | 'off-spacing-scale' | 'unusual-radius'
  | 'low-contrast' | 'small-tap-target' | 'uncommon-font-weight'
  | 'mixed-font-family';

export interface TokenFrequency<T> {
  value: T;
  count: number;
  percentage: number;
}

export interface DesignTokens {
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

export interface SpacingQuad {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface RawElementData {
  element: Element;
  tag: string;
  role: string | null;
  computedStyles: Record<string, string>;
  rect: DOMRect;
  isInteractive: boolean;
  hasText: boolean;
  childCount: number;
}

export interface NormalizedElementData {
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

export interface FrequencyMaps {
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

export interface Warning {
  type: WarningType;
  severity: 'info' | 'warning';
  message: string;
  detail?: string;
}

export interface StoredSettings {
  showWarnings: boolean;
  compactPanel: boolean;
  enabledSites: string[];
}

export interface InspectionData {
  elementType: ElementType;
  tag: string;
  classes: string;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: string;
  textTransform: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string | null;
  contrastRatio: number | null;
  contrastLevel: 'good' | 'borderline' | 'low' | 'unknown';
  margins: SpacingQuad;
  paddings: SpacingQuad;
  gap: number | null;
  borderRadius: number;
  borderWidth: number;
  borderStyle: string;
  boxShadow: string;
  display: string;
  position: string;
  warnings: Warning[];
}
```

- [ ] **Step 2: Write constants**

`src/shared/constants.ts`:
```typescript
export const SCAN_ELEMENT_BUDGET = 500;

export const MUTATION_DEBOUNCE_MS = 300;

export const TOKEN_MIN_PERCENTAGE = 3;
export const TOKEN_TOP_N = 5;

export const CONTRAST_GOOD_THRESHOLD = 4.5;
export const CONTRAST_BORDERLINE_THRESHOLD = 3.0;
export const CONTRAST_LARGE_TEXT_THRESHOLD = 3.0;
export const LARGE_TEXT_SIZE_PX = 18;
export const LARGE_TEXT_BOLD_SIZE_PX = 14;

export const MIN_TAP_TARGET_PX = 40;

export const SPACING_TOLERANCE_PX = 1;

export const PANEL_MAX_WIDTH = 320;
export const PANEL_MAX_HEIGHT = 480;
export const PANEL_OFFSET = 8;

export const HIGHLIGHT_COLOR = 'rgba(59, 130, 246, 0.15)';
export const HIGHLIGHT_OUTLINE_COLOR = 'rgba(59, 130, 246, 0.8)';
export const HIGHLIGHT_OUTLINE_WIDTH = 2;

export const SHADOW_HOST_ID = 'pixel-linter-shadow-host';
export const HIGHLIGHT_ID = 'pixel-linter-highlight';

export const DEFAULT_SETTINGS: import('./types').StoredSettings = {
  showWarnings: true,
  compactPanel: false,
  enabledSites: [],
};
```

- [ ] **Step 3: Write messaging types**

`src/shared/messaging.ts`:
```typescript
import type { StoredSettings, DesignTokens } from './types';

export type Message =
  | { type: 'GET_STATUS' }
  | { type: 'ACTIVATE_INSPECT' }
  | { type: 'DEACTIVATE_INSPECT' }
  | { type: 'REFRESH_ANALYSIS' }
  | { type: 'GET_TOKENS_SUMMARY' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<StoredSettings> };

export type MessageResponse =
  | { type: 'STATUS'; data: { active: boolean; analysisReady: boolean } }
  | { type: 'TOKENS_SUMMARY'; data: DesignTokens | null }
  | { type: 'OK' }
  | { type: 'ERROR'; message: string };

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Message).type === 'string'
  );
}
```

- [ ] **Step 4: Write storage wrapper**

`src/shared/storage.ts`:
```typescript
import type { StoredSettings } from './types';
import { DEFAULT_SETTINGS } from './constants';

const STORAGE_KEY = 'pixelLinterSettings';

export async function getSettings(): Promise<StoredSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY] as Partial<StoredSettings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Partial<StoredSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

export async function isSiteEnabled(hostname: string): Promise<boolean> {
  const settings = await getSettings();
  return settings.enabledSites.includes(hostname);
}

export async function toggleSite(hostname: string, enabled: boolean): Promise<void> {
  const settings = await getSettings();
  const sites = new Set(settings.enabledSites);
  if (enabled) {
    sites.add(hostname);
  } else {
    sites.delete(hostname);
  }
  await saveSettings({ enabledSites: [...sites] });
}

export function onSettingsChanged(
  callback: (settings: StoredSettings) => void,
): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[STORAGE_KEY]) {
      callback({ ...DEFAULT_SETTINGS, ...changes[STORAGE_KEY].newValue });
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
```

- [ ] **Step 5: Write storage tests**

`tests/shared/storage.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome.storage.local
const mockStorage: Record<string, unknown> = {};
const changeListeners: Array<(changes: Record<string, unknown>) => void> = [];

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items);
      }),
    },
    onChanged: {
      addListener: vi.fn((fn) => changeListeners.push(fn)),
      removeListener: vi.fn((fn) => {
        const idx = changeListeners.indexOf(fn);
        if (idx >= 0) changeListeners.splice(idx, 1);
      }),
    },
  },
});

import { getSettings, saveSettings, isSiteEnabled, toggleSite } from '../../src/shared/storage';
import { DEFAULT_SETTINGS } from '../../src/shared/constants';

describe('storage', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('returns defaults when storage is empty', async () => {
      const settings = await getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('merges stored values with defaults', async () => {
      mockStorage['pixelLinterSettings'] = { showWarnings: false };
      const settings = await getSettings();
      expect(settings.showWarnings).toBe(false);
      expect(settings.compactPanel).toBe(false);
      expect(settings.enabledSites).toEqual([]);
    });
  });

  describe('saveSettings', () => {
    it('persists partial settings merged with current', async () => {
      await saveSettings({ compactPanel: true });
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        pixelLinterSettings: { ...DEFAULT_SETTINGS, compactPanel: true },
      });
    });
  });

  describe('isSiteEnabled', () => {
    it('returns false for unknown sites', async () => {
      expect(await isSiteEnabled('example.com')).toBe(false);
    });

    it('returns true for enabled sites', async () => {
      mockStorage['pixelLinterSettings'] = { enabledSites: ['example.com'] };
      expect(await isSiteEnabled('example.com')).toBe(true);
    });
  });

  describe('toggleSite', () => {
    it('adds a site when enabling', async () => {
      await toggleSite('example.com', true);
      const call = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(call['pixelLinterSettings']).toMatchObject({
        enabledSites: ['example.com'],
      });
    });

    it('removes a site when disabling', async () => {
      mockStorage['pixelLinterSettings'] = {
        ...DEFAULT_SETTINGS,
        enabledSites: ['example.com', 'other.com'],
      };
      await toggleSite('example.com', false);
      const call = vi.mocked(chrome.storage.local.set).mock.calls[0][0];
      expect(call['pixelLinterSettings']).toMatchObject({
        enabledSites: ['other.com'],
      });
    });
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm run test
```

Expected: All storage tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add shared types, constants, storage wrapper, and messaging protocol"
```

---

## Task 3: Contrast Calculator

**Files:**
- Create: `src/content/analysis/contrast.ts`
- Create: `tests/analysis/contrast.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/analysis/contrast.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  parseColor,
  relativeLuminance,
  contrastRatio,
  interpretContrast,
} from '../../src/content/analysis/contrast';

describe('parseColor', () => {
  it('parses hex color', () => {
    expect(parseColor('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('parses short hex', () => {
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('parses rgb()', () => {
    expect(parseColor('rgb(255, 128, 0)')).toEqual({ r: 255, g: 128, b: 0, a: 1 });
  });

  it('parses rgba()', () => {
    expect(parseColor('rgba(255, 128, 0, 0.5)')).toEqual({ r: 255, g: 128, b: 0, a: 0.5 });
  });

  it('returns null for transparent', () => {
    expect(parseColor('rgba(0, 0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it('returns null for invalid color', () => {
    expect(parseColor('not-a-color')).toBeNull();
  });
});

describe('relativeLuminance', () => {
  it('returns 1 for white', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 4);
  });

  it('returns 0 for black', () => {
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 4);
  });

  it('returns ~0.2126 for pure red', () => {
    expect(relativeLuminance(255, 0, 0)).toBeCloseTo(0.2126, 3);
  });
});

describe('contrastRatio', () => {
  it('returns 21 for black on white', () => {
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 0);
  });

  it('returns 1 for same colors', () => {
    expect(contrastRatio(0.5, 0.5)).toBeCloseTo(1, 1);
  });

  it('is order-independent', () => {
    const ratio1 = contrastRatio(1, 0.2);
    const ratio2 = contrastRatio(0.2, 1);
    expect(ratio1).toBeCloseTo(ratio2, 4);
  });
});

describe('interpretContrast', () => {
  it('returns good for ratio >= 4.5', () => {
    expect(interpretContrast(5.0, 14, 400)).toBe('good');
  });

  it('returns borderline for ratio between 3.0 and 4.5', () => {
    expect(interpretContrast(3.5, 14, 400)).toBe('borderline');
  });

  it('returns low for ratio < 3.0', () => {
    expect(interpretContrast(2.0, 14, 400)).toBe('low');
  });

  it('uses large text threshold for text >= 18px', () => {
    // 3.5 would be borderline for normal text, but good for large text
    expect(interpretContrast(3.5, 18, 400)).toBe('good');
  });

  it('uses large text threshold for bold text >= 14px', () => {
    expect(interpretContrast(3.5, 14, 700)).toBe('good');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/analysis/contrast.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement contrast.ts**

`src/content/analysis/contrast.ts`:
```typescript
import {
  CONTRAST_GOOD_THRESHOLD,
  CONTRAST_BORDERLINE_THRESHOLD,
  LARGE_TEXT_SIZE_PX,
  LARGE_TEXT_BOLD_SIZE_PX,
} from '@shared/constants';

export interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(color: string): ParsedColor | null {
  // Handle hex
  const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1,
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16) / 255,
      };
    }
  }

  // Handle rgb/rgba
  const rgbMatch = color.match(
    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/,
  );
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const srgb = c / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(lum1: number, lum2: number): number {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function interpretContrast(
  ratio: number,
  fontSizePx: number,
  fontWeight: number,
): 'good' | 'borderline' | 'low' {
  const isLargeText =
    fontSizePx >= LARGE_TEXT_SIZE_PX ||
    (fontWeight >= 700 && fontSizePx >= LARGE_TEXT_BOLD_SIZE_PX);

  const goodThreshold = isLargeText ? CONTRAST_BORDERLINE_THRESHOLD : CONTRAST_GOOD_THRESHOLD;
  const borderlineThreshold = isLargeText ? CONTRAST_BORDERLINE_THRESHOLD : CONTRAST_BORDERLINE_THRESHOLD;

  if (ratio >= goodThreshold) return 'good';
  if (ratio >= borderlineThreshold) return 'borderline';
  return 'low';
}

/**
 * Compute contrast ratio between text color and effective background.
 * Walks up the DOM to find the first non-transparent background.
 */
export function computeContrast(
  textColor: string,
  element: Element,
): { ratio: number; level: 'good' | 'borderline' | 'low' | 'unknown' } {
  const fg = parseColor(textColor);
  if (!fg) return { ratio: 0, level: 'unknown' };

  const bgColor = findEffectiveBackground(element);
  if (!bgColor) return { ratio: 0, level: 'unknown' };

  const bg = parseColor(bgColor);
  if (!bg || bg.a === 0) return { ratio: 0, level: 'unknown' };

  const fgLum = relativeLuminance(fg.r, fg.g, fg.b);
  const bgLum = relativeLuminance(bg.r, bg.g, bg.b);
  const ratio = contrastRatio(fgLum, bgLum);

  const styles = getComputedStyle(element);
  const fontSize = parseFloat(styles.fontSize);
  const fontWeight = parseInt(styles.fontWeight, 10) || 400;
  const level = interpretContrast(ratio, fontSize, fontWeight);

  return { ratio: Math.round(ratio * 100) / 100, level };
}

function findEffectiveBackground(element: Element): string | null {
  let current: Element | null = element;
  while (current) {
    const styles = getComputedStyle(current);
    const bg = styles.backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    current = current.parentElement;
  }
  // Default to white if we reach the root
  return 'rgb(255, 255, 255)';
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/analysis/contrast.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/analysis/contrast.ts tests/analysis/contrast.test.ts
git commit -m "feat: add WCAG contrast ratio calculator with DOM background walk"
```

---

## Task 4: Element Classifier

**Files:**
- Create: `src/content/analysis/elementClassifier.ts`
- Create: `tests/analysis/elementClassifier.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/analysis/elementClassifier.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { classifyElement } from '../../src/content/analysis/elementClassifier';

describe('classifyElement', () => {
  it('classifies h1-h6 as heading', () => {
    expect(classifyElement('h1', null, true, false, 32, 200)).toBe('heading');
    expect(classifyElement('h2', null, true, false, 24, 200)).toBe('heading');
    expect(classifyElement('h3', null, true, false, 20, 200)).toBe('heading');
  });

  it('classifies button tag as button', () => {
    expect(classifyElement('button', null, true, true, 40, 120)).toBe('button');
  });

  it('classifies role=button as button', () => {
    expect(classifyElement('div', 'button', true, true, 40, 120)).toBe('button');
  });

  it('classifies a tag as link', () => {
    expect(classifyElement('a', null, true, true, 16, 200)).toBe('link');
  });

  it('classifies input tag as input', () => {
    expect(classifyElement('input', null, false, true, 40, 300)).toBe('input');
  });

  it('classifies textarea tag as textarea', () => {
    expect(classifyElement('textarea', null, false, true, 100, 300)).toBe('textarea');
  });

  it('classifies img tag as image', () => {
    expect(classifyElement('img', null, false, false, 200, 300)).toBe('image');
  });

  it('classifies svg as icon when small', () => {
    expect(classifyElement('svg', null, false, false, 24, 24)).toBe('icon');
  });

  it('classifies svg as image when large', () => {
    expect(classifyElement('svg', null, false, false, 200, 200)).toBe('image');
  });

  it('classifies p as paragraph', () => {
    expect(classifyElement('p', null, true, false, 16, 600)).toBe('paragraph');
  });

  it('classifies span with text as paragraph', () => {
    expect(classifyElement('span', null, true, false, 14, 200)).toBe('paragraph');
  });

  it('classifies nav items', () => {
    expect(classifyElement('li', null, true, false, 40, 120)).toBe('nav-item');
  });

  it('classifies div without text as card', () => {
    expect(classifyElement('div', null, false, false, 300, 400)).toBe('card');
  });

  it('classifies unknown elements as generic', () => {
    expect(classifyElement('custom-element', null, false, false, 50, 50)).toBe('generic');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/analysis/elementClassifier.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement elementClassifier.ts**

`src/content/analysis/elementClassifier.ts`:
```typescript
import type { ElementType } from '@shared/types';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const INTERACTIVE_TAGS = new Set(['button', 'input', 'select', 'textarea']);
const ICON_MAX_SIZE = 48;

/**
 * Heuristic classification of an element into a semantic type.
 * Uses tag, ARIA role, text presence, interactivity, and dimensions.
 * Not strict — for display purposes only.
 */
export function classifyElement(
  tag: string,
  role: string | null,
  hasText: boolean,
  isInteractive: boolean,
  height: number,
  width: number,
): ElementType {
  const lowerTag = tag.toLowerCase();

  // Headings
  if (HEADING_TAGS.has(lowerTag) || role === 'heading') return 'heading';

  // Buttons
  if (lowerTag === 'button' || role === 'button') return 'button';

  // Inputs
  if (lowerTag === 'input' || lowerTag === 'select') return 'input';
  if (lowerTag === 'textarea') return 'textarea';

  // Links
  if (lowerTag === 'a' || role === 'link') return 'link';

  // Images
  if (lowerTag === 'img' || lowerTag === 'picture') return 'image';

  // SVG — icon if small, image if large
  if (lowerTag === 'svg') {
    return Math.max(width, height) <= ICON_MAX_SIZE ? 'icon' : 'image';
  }

  // Paragraph/text elements
  if (lowerTag === 'p' || lowerTag === 'label' || lowerTag === 'blockquote') return 'paragraph';
  if ((lowerTag === 'span' || lowerTag === 'em' || lowerTag === 'strong') && hasText) {
    return 'paragraph';
  }

  // Nav items
  if (lowerTag === 'li' || role === 'menuitem' || role === 'tab') return 'nav-item';

  // Card/container heuristic — larger non-text blocks
  if (
    (lowerTag === 'div' || lowerTag === 'section' || lowerTag === 'article') &&
    !hasText &&
    width > 100 &&
    height > 100
  ) {
    return 'card';
  }

  return 'generic';
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/analysis/elementClassifier.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/analysis/elementClassifier.ts tests/analysis/elementClassifier.test.ts
git commit -m "feat: add heuristic element classifier (tag, role, dimensions)"
```

---

## Task 5: Normalizer

**Files:**
- Create: `src/content/analysis/normalizer.ts`
- Create: `src/content/utils/format.ts`
- Create: `tests/analysis/normalizer.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/analysis/normalizer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  parsePx,
  normalizeColor,
  normalizeFontFamily,
  resolveLineHeight,
} from '../../src/content/analysis/normalizer';

describe('parsePx', () => {
  it('parses "16px" to 16', () => {
    expect(parsePx('16px')).toBe(16);
  });

  it('rounds "15.5px" to 16', () => {
    expect(parsePx('15.5px')).toBe(16);
  });

  it('parses "0px" to 0', () => {
    expect(parsePx('0px')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parsePx('')).toBe(0);
  });

  it('returns 0 for "normal"', () => {
    expect(parsePx('normal')).toBe(0);
  });

  it('returns 0 for "auto"', () => {
    expect(parsePx('auto')).toBe(0);
  });
});

describe('normalizeColor', () => {
  it('converts rgb to lowercase hex', () => {
    expect(normalizeColor('rgb(255, 0, 0)')).toBe('#ff0000');
  });

  it('converts rgba with full opacity to hex', () => {
    expect(normalizeColor('rgba(255, 0, 0, 1)')).toBe('#ff0000');
  });

  it('passes through hex unchanged', () => {
    expect(normalizeColor('#abcdef')).toBe('#abcdef');
  });

  it('expands short hex', () => {
    expect(normalizeColor('#abc')).toBe('#aabbcc');
  });

  it('returns transparent for rgba with 0 alpha', () => {
    expect(normalizeColor('rgba(0, 0, 0, 0)')).toBe('transparent');
  });

  it('returns "unknown" for unrecognized values', () => {
    expect(normalizeColor('not-a-color')).toBe('unknown');
  });
});

describe('normalizeFontFamily', () => {
  it('extracts first family from stack', () => {
    expect(normalizeFontFamily('"Helvetica Neue", Arial, sans-serif')).toBe('Helvetica Neue');
  });

  it('strips quotes', () => {
    expect(normalizeFontFamily("'Roboto'")).toBe('Roboto');
  });

  it('handles single unquoted family', () => {
    expect(normalizeFontFamily('Arial')).toBe('Arial');
  });
});

describe('resolveLineHeight', () => {
  it('resolves "normal" to fontSize * 1.2', () => {
    expect(resolveLineHeight('normal', 16)).toBe(19);
  });

  it('resolves px value directly', () => {
    expect(resolveLineHeight('24px', 16)).toBe(24);
  });

  it('resolves unitless multiplier', () => {
    expect(resolveLineHeight('1.5', 16)).toBe(24);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/analysis/normalizer.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement normalizer.ts**

`src/content/analysis/normalizer.ts`:
```typescript
import type { RawElementData, NormalizedElementData, SpacingQuad } from '@shared/types';
import { classifyElement } from './elementClassifier';
import { parseColor } from './contrast';

export function parsePx(value: string): number {
  if (!value || value === 'normal' || value === 'auto' || value === 'none') return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : Math.round(num);
}

export function normalizeColor(color: string): string {
  const parsed = parseColor(color);
  if (!parsed) return 'unknown';
  if (parsed.a === 0) return 'transparent';

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(parsed.r)}${toHex(parsed.g)}${toHex(parsed.b)}`;
}

export function normalizeFontFamily(fontFamily: string): string {
  const first = fontFamily.split(',')[0].trim();
  return first.replace(/^["']|["']$/g, '');
}

export function resolveLineHeight(lineHeight: string, fontSizePx: number): number {
  if (lineHeight === 'normal') return Math.round(fontSizePx * 1.2);
  if (lineHeight.endsWith('px')) return Math.round(parseFloat(lineHeight));
  // Unitless multiplier
  const multiplier = parseFloat(lineHeight);
  if (!isNaN(multiplier)) return Math.round(multiplier * fontSizePx);
  return Math.round(fontSizePx * 1.2);
}

function parseSpacingQuad(
  top: string,
  right: string,
  bottom: string,
  left: string,
): SpacingQuad {
  return {
    top: parsePx(top),
    right: parsePx(right),
    bottom: parsePx(bottom),
    left: parsePx(left),
  };
}

export function normalizeElement(raw: RawElementData): NormalizedElementData {
  const s = raw.computedStyles;
  const fontSize = parsePx(s.fontSize);

  return {
    element: raw.element,
    elementType: classifyElement(
      raw.tag,
      raw.role,
      raw.hasText,
      raw.isInteractive,
      raw.rect.height,
      raw.rect.width,
    ),
    fontSize,
    fontFamily: normalizeFontFamily(s.fontFamily || ''),
    fontWeight: parseInt(s.fontWeight, 10) || 400,
    lineHeight: resolveLineHeight(s.lineHeight, fontSize),
    letterSpacing: parsePx(s.letterSpacing),
    textColor: normalizeColor(s.color || ''),
    backgroundColor: normalizeColor(s.backgroundColor || ''),
    borderColor: s.borderColor ? normalizeColor(s.borderColor) : null,
    margins: parseSpacingQuad(
      s.marginTop, s.marginRight, s.marginBottom, s.marginLeft,
    ),
    paddings: parseSpacingQuad(
      s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft,
    ),
    gap: s.gap ? parsePx(s.gap) : null,
    borderRadius: parsePx(s.borderRadius),
    width: Math.round(raw.rect.width),
    height: Math.round(raw.rect.height),
    display: s.display || 'block',
    position: s.position || 'static',
    isInteractive: raw.isInteractive,
  };
}

export function normalizeAll(rawElements: RawElementData[]): NormalizedElementData[] {
  return rawElements.map(normalizeElement);
}
```

- [ ] **Step 4: Create format.ts utility**

`src/content/utils/format.ts`:
```typescript
export function formatPx(value: number): string {
  return `${value}px`;
}

export function formatColor(hex: string): string {
  if (hex === 'transparent' || hex === 'unknown') return hex;
  return hex.toUpperCase();
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}

export function truncateClasses(classes: string, maxLength = 60): string {
  if (classes.length <= maxLength) return classes;
  return classes.slice(0, maxLength - 3) + '...';
}

export function formatSpacingQuad(quad: { top: number; right: number; bottom: number; left: number }): string {
  const { top, right, bottom, left } = quad;
  if (top === right && right === bottom && bottom === left) return `${top}px`;
  if (top === bottom && left === right) return `${top}px ${right}px`;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}
```

- [ ] **Step 5: Run tests**

```bash
npm run test -- tests/analysis/normalizer.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/content/analysis/normalizer.ts src/content/utils/format.ts tests/analysis/normalizer.test.ts
git commit -m "feat: add style normalizer (px parsing, color normalization, line-height resolution)"
```

---

## Task 6: Histogram Builder

**Files:**
- Create: `src/content/analysis/histogram.ts`
- Create: `tests/analysis/histogram.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/analysis/histogram.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { buildFrequencyMaps } from '../../src/content/analysis/histogram';
import type { NormalizedElementData, SpacingQuad } from '../../src/shared/types';

function makeElement(overrides: Partial<NormalizedElementData> = {}): NormalizedElementData {
  const zeroQuad: SpacingQuad = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    element: {} as Element,
    elementType: 'paragraph',
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
    borderRadius: 0,
    width: 200,
    height: 40,
    display: 'block',
    position: 'static',
    isInteractive: false,
    ...overrides,
  };
}

describe('buildFrequencyMaps', () => {
  it('counts font sizes correctly', () => {
    const elements = [
      makeElement({ fontSize: 14 }),
      makeElement({ fontSize: 16 }),
      makeElement({ fontSize: 16 }),
      makeElement({ fontSize: 16 }),
      makeElement({ fontSize: 24 }),
    ];
    const maps = buildFrequencyMaps(elements);
    expect(maps.fontSizes.get(16)).toBe(3);
    expect(maps.fontSizes.get(14)).toBe(1);
    expect(maps.fontSizes.get(24)).toBe(1);
  });

  it('counts font families', () => {
    const elements = [
      makeElement({ fontFamily: 'Arial' }),
      makeElement({ fontFamily: 'Arial' }),
      makeElement({ fontFamily: 'Roboto' }),
    ];
    const maps = buildFrequencyMaps(elements);
    expect(maps.fontFamilies.get('Arial')).toBe(2);
    expect(maps.fontFamilies.get('Roboto')).toBe(1);
  });

  it('collects spacing values from margins and paddings', () => {
    const elements = [
      makeElement({
        margins: { top: 8, right: 0, bottom: 16, left: 0 },
        paddings: { top: 8, right: 16, bottom: 8, left: 16 },
      }),
    ];
    const maps = buildFrequencyMaps(elements);
    // 8 appears 3 times (marginTop, paddingTop, paddingBottom)
    // 16 appears 3 times (marginBottom, paddingRight, paddingLeft)
    // 0 values should be excluded
    expect(maps.spacingValues.get(8)).toBe(3);
    expect(maps.spacingValues.get(16)).toBe(3);
    expect(maps.spacingValues.has(0)).toBe(false);
  });

  it('collects gap values', () => {
    const elements = [
      makeElement({ gap: 8 }),
      makeElement({ gap: 8 }),
      makeElement({ gap: 16 }),
    ];
    const maps = buildFrequencyMaps(elements);
    expect(maps.spacingValues.get(8)).toBe(2);
    expect(maps.spacingValues.get(16)).toBe(1);
  });

  it('only counts component heights for interactive elements', () => {
    const elements = [
      makeElement({ isInteractive: true, height: 40 }),
      makeElement({ isInteractive: true, height: 40 }),
      makeElement({ isInteractive: false, height: 200 }),
    ];
    const maps = buildFrequencyMaps(elements);
    expect(maps.componentHeights.get(40)).toBe(2);
    expect(maps.componentHeights.has(200)).toBe(false);
  });

  it('excludes zero border radius', () => {
    const elements = [
      makeElement({ borderRadius: 0 }),
      makeElement({ borderRadius: 4 }),
      makeElement({ borderRadius: 8 }),
    ];
    const maps = buildFrequencyMaps(elements);
    expect(maps.borderRadii.has(0)).toBe(false);
    expect(maps.borderRadii.get(4)).toBe(1);
  });

  it('excludes transparent and unknown colors', () => {
    const elements = [
      makeElement({ textColor: '#000000' }),
      makeElement({ textColor: 'transparent' }),
      makeElement({ backgroundColor: 'unknown' }),
    ];
    const maps = buildFrequencyMaps(elements);
    expect(maps.textColors.get('#000000')).toBe(1);
    expect(maps.textColors.has('transparent')).toBe(false);
    expect(maps.backgroundColors.has('unknown')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/analysis/histogram.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement histogram.ts**

`src/content/analysis/histogram.ts`:
```typescript
import type { NormalizedElementData, FrequencyMaps } from '@shared/types';

function increment<T>(map: Map<T, number>, value: T): void {
  map.set(value, (map.get(value) || 0) + 1);
}

function isValidColor(color: string): boolean {
  return color !== 'transparent' && color !== 'unknown' && color.startsWith('#');
}

export function buildFrequencyMaps(elements: NormalizedElementData[]): FrequencyMaps {
  const maps: FrequencyMaps = {
    fontFamilies: new Map(),
    fontSizes: new Map(),
    fontWeights: new Map(),
    lineHeights: new Map(),
    textColors: new Map(),
    backgroundColors: new Map(),
    spacingValues: new Map(),
    borderRadii: new Map(),
    componentHeights: new Map(),
  };

  for (const el of elements) {
    increment(maps.fontFamilies, el.fontFamily);
    increment(maps.fontSizes, el.fontSize);
    increment(maps.fontWeights, el.fontWeight);
    increment(maps.lineHeights, el.lineHeight);

    if (isValidColor(el.textColor)) {
      increment(maps.textColors, el.textColor);
    }
    if (isValidColor(el.backgroundColor)) {
      increment(maps.backgroundColors, el.backgroundColor);
    }

    // Collect non-zero spacing from margins, paddings, and gap
    const spacingValues = [
      el.margins.top, el.margins.right, el.margins.bottom, el.margins.left,
      el.paddings.top, el.paddings.right, el.paddings.bottom, el.paddings.left,
    ];
    if (el.gap !== null && el.gap > 0) spacingValues.push(el.gap);

    for (const v of spacingValues) {
      if (v > 0) increment(maps.spacingValues, v);
    }

    // Non-zero radii only
    if (el.borderRadius > 0) {
      increment(maps.borderRadii, el.borderRadius);
    }

    // Component heights only for interactive elements
    if (el.isInteractive && el.height > 0) {
      increment(maps.componentHeights, el.height);
    }
  }

  return maps;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/analysis/histogram.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/analysis/histogram.ts tests/analysis/histogram.test.ts
git commit -m "feat: add frequency histogram builder for design token extraction"
```

---

## Task 7: Token Inferrer

**Files:**
- Create: `src/content/analysis/tokenInferrer.ts`
- Create: `tests/analysis/tokenInferrer.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/analysis/tokenInferrer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { inferDesignTokens, extractDominantTokens } from '../../src/content/analysis/tokenInferrer';
import type { FrequencyMaps } from '../../src/shared/types';

describe('extractDominantTokens', () => {
  it('extracts values above percentage threshold', () => {
    const map = new Map<number, number>([
      [16, 50], // 50%
      [14, 30], // 30%
      [15, 2],  // 2% — below 3% threshold
      [24, 18], // 18%
    ]);
    const total = 100;
    const tokens = extractDominantTokens(map, total);
    expect(tokens.map((t) => t.value)).toContain(16);
    expect(tokens.map((t) => t.value)).toContain(14);
    expect(tokens.map((t) => t.value)).toContain(24);
    // 15 has 2% < 3% but might be top-5, so it could be included
    // With only 4 unique values and top-5 threshold, all are included
    expect(tokens.length).toBe(4);
  });

  it('always includes top-5 even if below percentage threshold', () => {
    const map = new Map<number, number>([
      [16, 80],
      [14, 5],
      [12, 4],
      [24, 3],
      [32, 2], // only 2/100 = 2%, below 3% but in top-5
      [20, 1], // 1%, 6th place — excluded
    ]);
    const total = 95; // sum of all counts
    const tokens = extractDominantTokens(map, total);
    const values = tokens.map((t) => t.value);
    expect(values).toContain(32); // top-5
    expect(values).not.toContain(20); // 6th
  });

  it('sorts by count descending', () => {
    const map = new Map<number, number>([
      [16, 10],
      [14, 50],
      [24, 30],
    ]);
    const tokens = extractDominantTokens(map, 90);
    expect(tokens[0].value).toBe(14);
    expect(tokens[1].value).toBe(24);
    expect(tokens[2].value).toBe(16);
  });

  it('computes percentages correctly', () => {
    const map = new Map<number, number>([
      [16, 50],
    ]);
    const tokens = extractDominantTokens(map, 100);
    expect(tokens[0].percentage).toBe(50);
  });
});

describe('inferDesignTokens', () => {
  it('produces DesignTokens from frequency maps', () => {
    const maps: FrequencyMaps = {
      fontFamilies: new Map([['Arial', 80], ['Roboto', 20]]),
      fontSizes: new Map([[16, 60], [14, 30], [24, 10]]),
      fontWeights: new Map([[400, 70], [700, 30]]),
      lineHeights: new Map([[24, 50], [20, 50]]),
      textColors: new Map([['#000000', 90], ['#333333', 10]]),
      backgroundColors: new Map([['#ffffff', 95], ['#f5f5f5', 5]]),
      spacingValues: new Map([[8, 40], [16, 30], [24, 20], [32, 10]]),
      borderRadii: new Map([[4, 60], [8, 40]]),
      componentHeights: new Map([[40, 80], [32, 20]]),
    };

    const tokens = inferDesignTokens(maps, 100);

    expect(tokens.fontFamilies[0].value).toBe('Arial');
    expect(tokens.fontSizes.length).toBeGreaterThanOrEqual(2);
    expect(tokens.spacingValues.length).toBeGreaterThanOrEqual(3);
    expect(tokens.borderRadii.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/analysis/tokenInferrer.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement tokenInferrer.ts**

`src/content/analysis/tokenInferrer.ts`:
```typescript
import type { DesignTokens, FrequencyMaps, TokenFrequency } from '@shared/types';
import { TOKEN_MIN_PERCENTAGE, TOKEN_TOP_N } from '@shared/constants';

export function extractDominantTokens<T>(
  map: Map<T, number>,
  totalElements: number,
): TokenFrequency<T>[] {
  const entries = [...map.entries()]
    .map(([value, count]) => ({
      value,
      count,
      percentage: Math.round((count / totalElements) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Include values above percentage threshold OR in top-N
  const topN = entries.slice(0, TOKEN_TOP_N);
  const aboveThreshold = entries.filter((e) => e.percentage >= TOKEN_MIN_PERCENTAGE);

  // Union of both sets
  const included = new Set<T>();
  const result: TokenFrequency<T>[] = [];

  for (const entry of [...topN, ...aboveThreshold]) {
    if (!included.has(entry.value)) {
      included.add(entry.value);
      result.push(entry);
    }
  }

  return result.sort((a, b) => b.count - a.count);
}

export function inferDesignTokens(maps: FrequencyMaps, totalElements: number): DesignTokens {
  return {
    fontFamilies: extractDominantTokens(maps.fontFamilies, totalElements),
    fontSizes: extractDominantTokens(maps.fontSizes, totalElements),
    fontWeights: extractDominantTokens(maps.fontWeights, totalElements),
    lineHeights: extractDominantTokens(maps.lineHeights, totalElements),
    textColors: extractDominantTokens(maps.textColors, totalElements),
    backgroundColors: extractDominantTokens(maps.backgroundColors, totalElements),
    spacingValues: extractDominantTokens(maps.spacingValues, totalElements),
    borderRadii: extractDominantTokens(maps.borderRadii, totalElements),
    componentHeights: extractDominantTokens(maps.componentHeights, totalElements),
  };
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/analysis/tokenInferrer.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/analysis/tokenInferrer.ts tests/analysis/tokenInferrer.test.ts
git commit -m "feat: add design token inferrer (dominant value extraction from histograms)"
```

---

## Task 8: Warning Generator

**Files:**
- Create: `src/content/analysis/warnings.ts`
- Create: `tests/analysis/warnings.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/analysis/warnings.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateWarnings } from '../../src/content/analysis/warnings';
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

describe('generateWarnings', () => {
  it('returns no warnings for on-system element', () => {
    const warnings = generateWarnings(makeNormalized(), makeTokens());
    expect(warnings).toEqual([]);
  });

  it('warns about uncommon font size', () => {
    const el = makeNormalized({ fontSize: 15 });
    const warnings = generateWarnings(el, makeTokens());
    const fontWarning = warnings.find((w) => w.type === 'uncommon-font-size');
    expect(fontWarning).toBeDefined();
    expect(fontWarning!.severity).toBe('warning');
    expect(fontWarning!.message).toContain('Uncommon');
  });

  it('warns about off-scale spacing', () => {
    const el = makeNormalized({
      paddings: { top: 13, right: 13, bottom: 13, left: 13 },
    });
    const warnings = generateWarnings(el, makeTokens());
    const spacingWarning = warnings.find((w) => w.type === 'off-spacing-scale');
    expect(spacingWarning).toBeDefined();
  });

  it('does not warn about spacing within tolerance', () => {
    const el = makeNormalized({
      paddings: { top: 15, right: 16, bottom: 17, left: 16 },
    });
    const warnings = generateWarnings(el, makeTokens());
    const spacingWarning = warnings.find((w) => w.type === 'off-spacing-scale');
    // 15 is within ±1 of 16, 17 is within ±1 of 16 — all close enough
    expect(spacingWarning).toBeUndefined();
  });

  it('warns about unusual border radius', () => {
    const el = makeNormalized({ borderRadius: 7 });
    const warnings = generateWarnings(el, makeTokens());
    const radiusWarning = warnings.find((w) => w.type === 'unusual-radius');
    expect(radiusWarning).toBeDefined();
    expect(radiusWarning!.severity).toBe('info');
  });

  it('warns about small tap target', () => {
    const el = makeNormalized({ isInteractive: true, height: 28 });
    const warnings = generateWarnings(el, makeTokens());
    const tapWarning = warnings.find((w) => w.type === 'small-tap-target');
    expect(tapWarning).toBeDefined();
  });

  it('does not warn about tap target for non-interactive elements', () => {
    const el = makeNormalized({ isInteractive: false, height: 12 });
    const warnings = generateWarnings(el, makeTokens());
    const tapWarning = warnings.find((w) => w.type === 'small-tap-target');
    expect(tapWarning).toBeUndefined();
  });

  it('warns about uncommon font weight', () => {
    const el = makeNormalized({ fontWeight: 500 });
    const warnings = generateWarnings(el, makeTokens());
    const weightWarning = warnings.find((w) => w.type === 'uncommon-font-weight');
    expect(weightWarning).toBeDefined();
  });

  it('warns about mixed font family', () => {
    const el = makeNormalized({ fontFamily: 'Roboto' });
    const warnings = generateWarnings(el, makeTokens());
    const familyWarning = warnings.find((w) => w.type === 'mixed-font-family');
    expect(familyWarning).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test -- tests/analysis/warnings.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement warnings.ts**

`src/content/analysis/warnings.ts`:
```typescript
import type { DesignTokens, NormalizedElementData, Warning, TokenFrequency } from '@shared/types';
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

export function generateWarnings(
  el: NormalizedElementData,
  tokens: DesignTokens,
): Warning[] {
  const warnings: Warning[] = [];

  // Uncommon font size
  if (el.fontSize > 0 && !isInTokenSet(el.fontSize, tokens.fontSizes)) {
    const common = tokens.fontSizes.slice(0, 3).map((t) => `${t.value}px`).join(', ');
    warnings.push({
      type: 'uncommon-font-size',
      severity: 'warning',
      message: 'Uncommon font size on this page',
      detail: `${el.fontSize}px — common sizes: ${common}`,
    });
  }

  // Off spacing scale
  const spacingValues = collectNonZeroSpacing(el);
  const offScaleValues = spacingValues.filter(
    (v) => !isNearSpacingToken(v, tokens.spacingValues),
  );
  if (offScaleValues.length > 0) {
    const uniqueOff = [...new Set(offScaleValues)];
    const common = tokens.spacingValues.slice(0, 4).map((t) => `${t.value}px`).join(', ');
    warnings.push({
      type: 'off-spacing-scale',
      severity: 'warning',
      message: 'Spacing not aligned to page scale',
      detail: `${uniqueOff.map((v) => `${v}px`).join(', ')} — page scale: ${common}`,
    });
  }

  // Unusual border radius
  if (el.borderRadius > 0 && !isInTokenSet(el.borderRadius, tokens.borderRadii)) {
    const common = tokens.borderRadii.map((t) => `${t.value}px`).join(', ');
    warnings.push({
      type: 'unusual-radius',
      severity: 'info',
      message: 'Border radius differs from page pattern',
      detail: `${el.borderRadius}px — common radii: ${common}`,
    });
  }

  // Small tap target (interactive only)
  if (el.isInteractive && el.height < MIN_TAP_TARGET_PX) {
    warnings.push({
      type: 'small-tap-target',
      severity: 'warning',
      message: 'Smaller than typical interactive target',
      detail: `${el.height}px tall — recommended minimum: ${MIN_TAP_TARGET_PX}px`,
    });
  }

  // Uncommon font weight
  if (!isInTokenSet(el.fontWeight, tokens.fontWeights)) {
    warnings.push({
      type: 'uncommon-font-weight',
      severity: 'info',
      message: 'Uncommon font weight on this page',
      detail: `${el.fontWeight} — common weights: ${tokens.fontWeights.map((t) => t.value).join(', ')}`,
    });
  }

  // Mixed font family
  if (
    tokens.fontFamilies.length > 0 &&
    el.fontFamily !== tokens.fontFamilies[0].value &&
    !isInTokenSet(el.fontFamily, tokens.fontFamilies)
  ) {
    warnings.push({
      type: 'mixed-font-family',
      severity: 'info',
      message: 'Different font family than dominant',
      detail: `${el.fontFamily} — dominant: ${tokens.fontFamilies[0].value}`,
    });
  }

  return warnings;
}
```

- [ ] **Step 4: Run tests**

```bash
npm run test -- tests/analysis/warnings.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/analysis/warnings.ts tests/analysis/warnings.test.ts
git commit -m "feat: add warning generator (font, spacing, radius, tap target heuristics)"
```

---

## Task 9: Collector + DOM Utilities

**Files:**
- Create: `src/content/analysis/collector.ts`
- Create: `src/content/utils/dom.ts`

- [ ] **Step 1: Implement dom.ts utilities**

`src/content/utils/dom.ts`:
```typescript
import { SHADOW_HOST_ID } from '@shared/constants';

const INTERACTIVE_SELECTORS = 'a, button, input, select, textarea, [role="button"], [role="link"]';

const MEANINGFUL_SELECTORS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'label', 'blockquote',
  'a', 'button',
  'input', 'select', 'textarea',
  'img', 'svg', 'picture',
  'li',
  'div', 'section', 'article', 'main', 'aside', 'nav', 'header', 'footer',
].join(', ');

const IGNORED_TAGS = new Set([
  'script', 'style', 'meta', 'link', 'noscript', 'template', 'br', 'hr',
]);

export function isVisible(el: Element): boolean {
  if (IGNORED_TAGS.has(el.tagName.toLowerCase())) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  const styles = getComputedStyle(el);
  if (styles.display === 'none' || styles.visibility === 'hidden') return false;
  if (styles.opacity === '0') return false;

  return true;
}

export function isInsideExtension(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (current.id === SHADOW_HOST_ID) return true;
    current = current.parentElement;
  }
  return false;
}

export function isInteractive(el: Element): boolean {
  return el.matches(INTERACTIVE_SELECTORS);
}

export function hasTextContent(el: Element): boolean {
  // Check direct text nodes only (not nested element text)
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return true;
    }
  }
  return false;
}

export function queryMeaningfulElements(root: Element | Document): Element[] {
  return [...root.querySelectorAll(MEANINGFUL_SELECTORS)];
}

export { INTERACTIVE_SELECTORS, MEANINGFUL_SELECTORS };
```

- [ ] **Step 2: Implement collector.ts**

`src/content/analysis/collector.ts`:
```typescript
import type { RawElementData } from '@shared/types';
import { SCAN_ELEMENT_BUDGET } from '@shared/constants';
import {
  isVisible,
  isInsideExtension,
  isInteractive,
  hasTextContent,
  queryMeaningfulElements,
} from '../utils/dom';

const STYLE_PROPERTIES = [
  'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing',
  'color', 'backgroundColor', 'borderColor',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'gap', 'borderRadius', 'borderWidth', 'borderStyle',
  'boxShadow', 'display', 'position', 'textAlign', 'textTransform',
] as const;

function extractComputedStyles(el: Element): Record<string, string> {
  const computed = getComputedStyle(el);
  const result: Record<string, string> = {};
  for (const prop of STYLE_PROPERTIES) {
    result[prop] = computed.getPropertyValue(
      prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
    );
  }
  return result;
}

/**
 * Collects visible, meaningful elements from the page.
 * Prioritizes interactive and text elements, caps at SCAN_ELEMENT_BUDGET.
 */
export function collectVisibleElements(
  root: Element | Document = document,
): RawElementData[] {
  const candidates = queryMeaningfulElements(root);

  // Partition into priority (interactive/text) and secondary
  const priority: Element[] = [];
  const secondary: Element[] = [];

  for (const el of candidates) {
    if (isInsideExtension(el)) continue;
    if (!isVisible(el)) continue;

    if (isInteractive(el) || hasTextContent(el)) {
      priority.push(el);
    } else {
      secondary.push(el);
    }
  }

  // Take all priority elements first, then fill with secondary up to budget
  const selected = [
    ...priority.slice(0, SCAN_ELEMENT_BUDGET),
    ...secondary.slice(0, Math.max(0, SCAN_ELEMENT_BUDGET - priority.length)),
  ];

  return selected.map((el) => ({
    element: el,
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    computedStyles: extractComputedStyles(el),
    rect: el.getBoundingClientRect(),
    isInteractive: isInteractive(el),
    hasText: hasTextContent(el),
    childCount: el.children.length,
  }));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/content/analysis/collector.ts src/content/utils/dom.ts
git commit -m "feat: add DOM collector and visibility/interactivity utilities"
```

---

## Task 10: PageAnalyzer Facade

**Files:**
- Create: `src/content/analysis/analyzer.ts`

- [ ] **Step 1: Implement analyzer.ts**

`src/content/analysis/analyzer.ts`:
```typescript
import type { DesignTokens, NormalizedElementData, Warning, InspectionData } from '@shared/types';
import { collectVisibleElements } from './collector';
import { normalizeAll, normalizeElement, parsePx, normalizeColor, normalizeFontFamily, resolveLineHeight } from './normalizer';
import { buildFrequencyMaps } from './histogram';
import { inferDesignTokens } from './tokenInferrer';
import { generateWarnings } from './warnings';
import { computeContrast } from './contrast';
import { classifyElement } from './elementClassifier';
import { isInteractive, hasTextContent } from '../utils/dom';
import { truncateClasses } from '../utils/format';

export class PageAnalyzer {
  private tokens: DesignTokens | null = null;
  private elementCount = 0;

  get isReady(): boolean {
    return this.tokens !== null;
  }

  get designTokens(): DesignTokens | null {
    return this.tokens;
  }

  scan(): DesignTokens {
    const raw = collectVisibleElements();
    const normalized = normalizeAll(raw);
    this.elementCount = normalized.length;
    const maps = buildFrequencyMaps(normalized);
    this.tokens = inferDesignTokens(maps, this.elementCount);
    return this.tokens;
  }

  /**
   * Inspect a single element: extract styles, generate warnings,
   * and return a complete InspectionData for the panel.
   */
  inspectElement(element: Element): InspectionData {
    const computed = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const interactive = isInteractive(element);
    const hasText = hasTextContent(element);
    const fontSize = parsePx(computed.fontSize);

    const elementType = classifyElement(
      tag, role, hasText, interactive, rect.height, rect.width,
    );

    const textColor = normalizeColor(computed.color);
    const backgroundColor = normalizeColor(computed.backgroundColor);

    // Build a NormalizedElementData for warning generation
    const normalized: NormalizedElementData = {
      element,
      elementType,
      fontSize,
      fontFamily: normalizeFontFamily(computed.fontFamily),
      fontWeight: parseInt(computed.fontWeight, 10) || 400,
      lineHeight: resolveLineHeight(computed.lineHeight, fontSize),
      letterSpacing: parsePx(computed.letterSpacing),
      textColor,
      backgroundColor,
      borderColor: computed.borderColor ? normalizeColor(computed.borderColor) : null,
      margins: {
        top: parsePx(computed.marginTop),
        right: parsePx(computed.marginRight),
        bottom: parsePx(computed.marginBottom),
        left: parsePx(computed.marginLeft),
      },
      paddings: {
        top: parsePx(computed.paddingTop),
        right: parsePx(computed.paddingRight),
        bottom: parsePx(computed.paddingBottom),
        left: parsePx(computed.paddingLeft),
      },
      gap: computed.gap ? parsePx(computed.gap) : null,
      borderRadius: parsePx(computed.borderRadius),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      display: computed.display,
      position: computed.position,
      isInteractive: interactive,
    };

    // Generate warnings if tokens available
    const warnings: Warning[] = this.tokens
      ? generateWarnings(normalized, this.tokens)
      : [];

    // Compute contrast
    const contrast = computeContrast(computed.color, element);

    // Add low contrast warning
    if (contrast.level === 'low') {
      warnings.push({
        type: 'low-contrast',
        severity: 'warning',
        message: 'Low color contrast',
        detail: `${contrast.ratio}:1 — may affect readability`,
      });
    }

    return {
      elementType,
      tag,
      classes: truncateClasses(element.className || ''),
      width: normalized.width,
      height: normalized.height,
      fontSize: normalized.fontSize,
      fontFamily: normalized.fontFamily,
      fontWeight: normalized.fontWeight,
      lineHeight: normalized.lineHeight,
      letterSpacing: normalized.letterSpacing,
      textAlign: computed.textAlign,
      textTransform: computed.textTransform,
      textColor,
      backgroundColor,
      borderColor: normalized.borderColor,
      contrastRatio: contrast.ratio || null,
      contrastLevel: contrast.level,
      margins: normalized.margins,
      paddings: normalized.paddings,
      gap: normalized.gap,
      borderRadius: normalized.borderRadius,
      borderWidth: parsePx(computed.borderWidth),
      borderStyle: computed.borderStyle,
      boxShadow: computed.boxShadow === 'none' ? '' : computed.boxShadow,
      display: normalized.display,
      position: normalized.position,
      warnings,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content/analysis/analyzer.ts
git commit -m "feat: add PageAnalyzer facade (scan pipeline + single-element inspection)"
```

---

## Task 11: Target Resolver + Highlight Manager

**Files:**
- Create: `src/content/inspector/targetResolver.ts`
- Create: `src/content/inspector/highlightManager.ts`

- [ ] **Step 1: Implement targetResolver.ts**

`src/content/inspector/targetResolver.ts`:
```typescript
import { SHADOW_HOST_ID } from '@shared/constants';

const SEMANTIC_TAGS = new Set([
  'button', 'a', 'input', 'select', 'textarea',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'img', 'video', 'audio', 'canvas',
  'table', 'form', 'nav', 'main',
]);

const MAX_PROMOTION_LEVELS = 2;
const TINY_ELEMENT_PX = 8;

/**
 * Resolves the most meaningful element to inspect from a hover target.
 * Promotes past meaningless wrappers (tiny spans, unstyled divs)
 * but never past semantic elements.
 */
export function resolveTarget(element: Element): Element | null {
  // Never inspect extension's own UI
  if (isExtensionElement(element)) return null;

  let current = element;
  let promotions = 0;

  while (promotions < MAX_PROMOTION_LEVELS && current.parentElement) {
    // Stop if current element is semantically meaningful
    if (SEMANTIC_TAGS.has(current.tagName.toLowerCase())) break;
    if (current.getAttribute('role')) break;

    const rect = current.getBoundingClientRect();

    // Promote if element is tiny
    if (rect.width < TINY_ELEMENT_PX || rect.height < TINY_ELEMENT_PX) {
      current = current.parentElement;
      promotions++;
      continue;
    }

    // Promote inline spans that are just wrappers
    if (
      current.tagName.toLowerCase() === 'span' &&
      current.children.length === 0 &&
      current.parentElement.children.length === 1
    ) {
      current = current.parentElement;
      promotions++;
      continue;
    }

    break;
  }

  // Final check: don't return extension elements
  if (isExtensionElement(current)) return null;

  return current;
}

function isExtensionElement(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (current.id === SHADOW_HOST_ID || current.id === 'pixel-linter-highlight') {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}
```

- [ ] **Step 2: Implement highlightManager.ts**

`src/content/inspector/highlightManager.ts`:
```typescript
import {
  HIGHLIGHT_ID,
  HIGHLIGHT_COLOR,
  HIGHLIGHT_OUTLINE_COLOR,
  HIGHLIGHT_OUTLINE_WIDTH,
} from '@shared/constants';

export class HighlightManager {
  private overlay: HTMLDivElement | null = null;

  private ensureOverlay(): HTMLDivElement {
    if (this.overlay) return this.overlay;

    this.overlay = document.createElement('div');
    this.overlay.id = HIGHLIGHT_ID;
    Object.assign(this.overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483646',
      background: HIGHLIGHT_COLOR,
      outline: `${HIGHLIGHT_OUTLINE_WIDTH}px solid ${HIGHLIGHT_OUTLINE_COLOR}`,
      borderRadius: '2px',
      transition: 'all 0.05s ease-out',
      display: 'none',
    });
    document.body.appendChild(this.overlay);
    return this.overlay;
  }

  show(element: Element): void {
    const overlay = this.ensureOverlay();
    const rect = element.getBoundingClientRect();

    Object.assign(overlay.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: 'block',
    });
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/content/inspector/targetResolver.ts src/content/inspector/highlightManager.ts
git commit -m "feat: add target resolver (smart parent promotion) and highlight overlay"
```

---

## Task 12: Panel Renderer (Shadow DOM)

**Files:**
- Create: `src/content/inspector/panelRenderer.ts`
- Create: `src/content/utils/geometry.ts`

- [ ] **Step 1: Implement geometry.ts**

`src/content/utils/geometry.ts`:
```typescript
import { PANEL_OFFSET, PANEL_MAX_WIDTH, PANEL_MAX_HEIGHT } from '@shared/constants';

export interface PanelPosition {
  top: number;
  left: number;
}

/**
 * Compute panel position to keep it in the viewport.
 * Default: below-right of element. Flips if clipping.
 */
export function computePanelPosition(
  elementRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
): PanelPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const w = Math.min(panelWidth, PANEL_MAX_WIDTH);
  const h = Math.min(panelHeight, PANEL_MAX_HEIGHT);

  // Default: below-right
  let top = elementRect.bottom + PANEL_OFFSET;
  let left = elementRect.right + PANEL_OFFSET;

  // Flip up if clipping bottom
  if (top + h > viewportHeight) {
    top = elementRect.top - h - PANEL_OFFSET;
  }

  // If still clipping top, just pin to top
  if (top < 0) {
    top = PANEL_OFFSET;
  }

  // Flip left if clipping right
  if (left + w > viewportWidth) {
    left = elementRect.left - w - PANEL_OFFSET;
  }

  // If still clipping left, pin to left
  if (left < 0) {
    left = PANEL_OFFSET;
  }

  return { top, left };
}
```

- [ ] **Step 2: Implement panelRenderer.ts**

`src/content/inspector/panelRenderer.ts`:
```typescript
import type { InspectionData } from '@shared/types';
import { SHADOW_HOST_ID, PANEL_MAX_WIDTH, PANEL_MAX_HEIGHT } from '@shared/constants';
import { formatPx, formatColor, formatRatio, formatSpacingQuad } from '../utils/format';
import { computePanelPosition } from '../utils/geometry';

const PANEL_STYLES = `
  :host {
    all: initial;
    position: fixed;
    z-index: 2147483647;
    pointer-events: none;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  }

  .panel {
    background: rgba(15, 15, 15, 0.95);
    color: #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
    padding: 12px;
    max-width: ${PANEL_MAX_WIDTH}px;
    max-height: ${PANEL_MAX_HEIGHT}px;
    overflow-y: auto;
    font-size: 12px;
    line-height: 1.5;
    pointer-events: auto;
    scrollbar-width: thin;
    scrollbar-color: #444 transparent;
  }

  .panel::-webkit-scrollbar { width: 4px; }
  .panel::-webkit-scrollbar-thumb { background: #444; border-radius: 2px; }

  .header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
  }

  .badge {
    background: #3b82f6;
    color: white;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .tag {
    color: #888;
    font-family: 'SF Mono', Menlo, Monaco, monospace;
    font-size: 11px;
  }

  .dims {
    margin-left: auto;
    color: #888;
    font-family: 'SF Mono', Menlo, Monaco, monospace;
    font-size: 11px;
    flex-shrink: 0;
  }

  .section {
    margin-bottom: 8px;
  }

  .section-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    margin-bottom: 4px;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1px 0;
  }

  .label {
    color: #999;
    font-size: 11px;
  }

  .value {
    font-family: 'SF Mono', Menlo, Monaco, monospace;
    font-size: 11px;
    color: #e0e0e0;
  }

  .color-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    border: 1px solid #555;
    vertical-align: middle;
    margin-right: 4px;
  }

  .contrast-good { color: #4ade80; }
  .contrast-borderline { color: #fbbf24; }
  .contrast-low { color: #f87171; }
  .contrast-unknown { color: #888; }

  .on-scale { color: #4ade80; font-size: 10px; }
  .off-scale { color: #fbbf24; font-size: 10px; }

  .warnings {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #333;
  }

  .warning {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 4px 0;
    font-size: 11px;
  }

  .warning-icon {
    flex-shrink: 0;
    font-size: 12px;
    line-height: 1;
    margin-top: 2px;
  }

  .warning-text {
    color: #e0e0e0;
  }

  .warning-detail {
    color: #888;
    font-size: 10px;
    margin-top: 1px;
    font-family: 'SF Mono', Menlo, Monaco, monospace;
  }

  .severity-warning .warning-icon { color: #fbbf24; }
  .severity-info .warning-icon { color: #60a5fa; }

  .classes {
    color: #666;
    font-family: 'SF Mono', Menlo, Monaco, monospace;
    font-size: 10px;
    margin-top: 2px;
    word-break: break-all;
  }

  .compact .section { margin-bottom: 4px; }
  .compact .row { padding: 0; }
`;

export class PanelRenderer {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private panel: HTMLDivElement | null = null;
  private compact = false;

  setCompact(compact: boolean): void {
    this.compact = compact;
  }

  show(data: InspectionData, elementRect: DOMRect): void {
    this.ensureHost();
    this.panel!.className = this.compact ? 'panel compact' : 'panel';
    this.panel!.innerHTML = this.renderContent(data);

    // Position after content is rendered to get actual dimensions
    requestAnimationFrame(() => {
      if (!this.panel || !this.host) return;
      const panelRect = this.panel.getBoundingClientRect();
      const pos = computePanelPosition(elementRect, panelRect.width, panelRect.height);
      this.host.style.top = `${pos.top}px`;
      this.host.style.left = `${pos.left}px`;
      this.host.style.display = 'block';
    });
  }

  hide(): void {
    if (this.host) {
      this.host.style.display = 'none';
    }
  }

  destroy(): void {
    if (this.host) {
      this.host.remove();
      this.host = null;
      this.shadow = null;
      this.panel = null;
    }
  }

  private ensureHost(): void {
    if (this.host) return;

    this.host = document.createElement('div');
    this.host.id = SHADOW_HOST_ID;
    this.host.style.display = 'none';
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = PANEL_STYLES;
    this.shadow.appendChild(style);

    this.panel = document.createElement('div');
    this.panel.className = 'panel';
    this.shadow.appendChild(this.panel);

    document.body.appendChild(this.host);
  }

  private renderContent(data: InspectionData): string {
    const sections: string[] = [];

    // Header
    sections.push(`
      <div class="header">
        <span class="badge">${data.elementType}</span>
        <span class="tag">&lt;${data.tag}&gt;</span>
        <span class="dims">${data.width} × ${data.height}</span>
      </div>
      ${data.classes ? `<div class="classes">.${data.classes.replace(/\s+/g, ' .')}</div>` : ''}
    `);

    // Typography
    sections.push(`
      <div class="section">
        <div class="section-title">Typography</div>
        ${this.row('Font', data.fontFamily)}
        ${this.row('Size', formatPx(data.fontSize))}
        ${this.row('Weight', String(data.fontWeight))}
        ${this.row('Line height', formatPx(data.lineHeight))}
        ${data.letterSpacing ? this.row('Letter spacing', formatPx(data.letterSpacing)) : ''}
        ${data.textAlign !== 'start' ? this.row('Align', data.textAlign) : ''}
        ${data.textTransform !== 'none' ? this.row('Transform', data.textTransform) : ''}
      </div>
    `);

    // Colors
    const contrastClass = `contrast-${data.contrastLevel}`;
    sections.push(`
      <div class="section">
        <div class="section-title">Colors</div>
        ${this.colorRow('Text', data.textColor)}
        ${this.colorRow('Background', data.backgroundColor)}
        ${data.borderColor ? this.colorRow('Border', data.borderColor) : ''}
        ${data.contrastRatio
          ? this.row('Contrast', `<span class="${contrastClass}">${formatRatio(data.contrastRatio)} (${data.contrastLevel})</span>`)
          : this.row('Contrast', '<span class="contrast-unknown">background unclear</span>')
        }
      </div>
    `);

    // Spacing
    const hasSpacing = Object.values(data.margins).some((v) => v > 0) ||
                       Object.values(data.paddings).some((v) => v > 0) ||
                       (data.gap !== null && data.gap > 0);
    if (hasSpacing) {
      sections.push(`
        <div class="section">
          <div class="section-title">Spacing</div>
          ${Object.values(data.margins).some((v) => v > 0)
            ? this.row('Margin', formatSpacingQuad(data.margins))
            : ''}
          ${Object.values(data.paddings).some((v) => v > 0)
            ? this.row('Padding', formatSpacingQuad(data.paddings))
            : ''}
          ${data.gap !== null && data.gap > 0 ? this.row('Gap', formatPx(data.gap)) : ''}
        </div>
      `);
    }

    // Shape
    const hasShape = data.borderRadius > 0 || data.borderWidth > 0 || data.boxShadow;
    if (hasShape) {
      sections.push(`
        <div class="section">
          <div class="section-title">Shape</div>
          ${data.borderRadius > 0 ? this.row('Radius', formatPx(data.borderRadius)) : ''}
          ${data.borderWidth > 0 ? this.row('Border', `${formatPx(data.borderWidth)} ${data.borderStyle}`) : ''}
          ${data.boxShadow ? this.row('Shadow', 'present') : ''}
          ${this.row('Display', data.display)}
          ${data.position !== 'static' ? this.row('Position', data.position) : ''}
        </div>
      `);
    }

    // Warnings
    if (data.warnings.length > 0) {
      const warningHtml = data.warnings.map((w) => `
        <div class="warning severity-${w.severity}">
          <span class="warning-icon">${w.severity === 'warning' ? '⚠' : 'ℹ'}</span>
          <div>
            <div class="warning-text">${w.message}</div>
            ${w.detail ? `<div class="warning-detail">${w.detail}</div>` : ''}
          </div>
        </div>
      `).join('');

      sections.push(`
        <div class="warnings">
          <div class="section-title">Observations</div>
          ${warningHtml}
        </div>
      `);
    }

    return sections.join('');
  }

  private row(label: string, value: string): string {
    return `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
  }

  private colorRow(label: string, color: string): string {
    if (color === 'transparent' || color === 'unknown') {
      return this.row(label, color);
    }
    return `<div class="row">
      <span class="label">${label}</span>
      <span class="value"><span class="color-swatch" style="background:${color}"></span>${formatColor(color)}</span>
    </div>`;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/content/inspector/panelRenderer.ts src/content/utils/geometry.ts
git commit -m "feat: add Shadow DOM panel renderer with viewport-aware positioning"
```

---

## Task 13: Inspection Controller + MutationObserver

**Files:**
- Create: `src/content/inspector/inspectionController.ts`
- Create: `src/content/observer.ts`

- [ ] **Step 1: Implement inspectionController.ts**

`src/content/inspector/inspectionController.ts`:
```typescript
import type { StoredSettings } from '@shared/types';
import { PageAnalyzer } from '../analysis/analyzer';
import { HighlightManager } from './highlightManager';
import { PanelRenderer } from './panelRenderer';
import { resolveTarget } from './targetResolver';
import { setupMutationObserver } from '../observer';

type InspectionState = 'inactive' | 'hovering' | 'locked';

export class InspectionController {
  private state: InspectionState = 'inactive';
  private analyzer: PageAnalyzer;
  private highlight: HighlightManager;
  private panel: PanelRenderer;
  private lockedElement: Element | null = null;
  private hoveredElement: Element | null = null;
  private cleanupObserver: (() => void) | null = null;
  private settings: StoredSettings;

  // Bound handlers for add/removeEventListener
  private handleMouseOver: (e: MouseEvent) => void;
  private handleMouseOut: (e: MouseEvent) => void;
  private handleClick: (e: MouseEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(settings: StoredSettings) {
    this.analyzer = new PageAnalyzer();
    this.highlight = new HighlightManager();
    this.panel = new PanelRenderer();
    this.settings = settings;

    this.handleMouseOver = this.onMouseOver.bind(this);
    this.handleMouseOut = this.onMouseOut.bind(this);
    this.handleClick = this.onClick.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
  }

  get isActive(): boolean {
    return this.state !== 'inactive';
  }

  get isAnalysisReady(): boolean {
    return this.analyzer.isReady;
  }

  get designTokens() {
    return this.analyzer.designTokens;
  }

  updateSettings(settings: Partial<StoredSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.panel.setCompact(this.settings.compactPanel);
  }

  activate(): void {
    if (this.state !== 'inactive') return;

    // Run initial analysis
    this.analyzer.scan();

    this.panel.setCompact(this.settings.compactPanel);

    // Attach listeners
    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('mouseout', this.handleMouseOut, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);

    // Setup mutation observer for SPA support
    this.cleanupObserver = setupMutationObserver(() => {
      this.analyzer.scan();
    });

    this.state = 'hovering';
  }

  deactivate(): void {
    // Remove listeners
    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('mouseout', this.handleMouseOut, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);

    // Cleanup observer
    if (this.cleanupObserver) {
      this.cleanupObserver();
      this.cleanupObserver = null;
    }

    // Hide UI
    this.highlight.hide();
    this.panel.hide();

    // Reset state
    this.lockedElement = null;
    this.hoveredElement = null;
    this.state = 'inactive';
  }

  refreshAnalysis(): void {
    this.analyzer.scan();
  }

  destroy(): void {
    this.deactivate();
    this.highlight.destroy();
    this.panel.destroy();
  }

  private onMouseOver(e: MouseEvent): void {
    if (this.state === 'locked') return;

    const target = resolveTarget(e.target as Element);
    if (!target) return;
    if (target === this.hoveredElement) return;

    this.hoveredElement = target;
    this.highlight.show(target);

    const data = this.analyzer.inspectElement(target);

    if (!this.settings.showWarnings) {
      data.warnings = [];
    }

    const rect = target.getBoundingClientRect();
    this.panel.show(data, rect);
  }

  private onMouseOut(e: MouseEvent): void {
    if (this.state === 'locked') return;

    // Only hide if we're actually leaving the element (not entering a child)
    const related = e.relatedTarget as Element | null;
    if (related && this.hoveredElement?.contains(related)) return;

    this.hoveredElement = null;
    this.highlight.hide();
    this.panel.hide();
  }

  private onClick(e: MouseEvent): void {
    if (this.state === 'inactive') return;

    const target = resolveTarget(e.target as Element);

    if (this.state === 'locked') {
      // Click outside the locked element → unlock
      if (target !== this.lockedElement) {
        this.state = 'hovering';
        this.lockedElement = null;
        // Let mouseOver handle the new element
      }
      return;
    }

    if (this.state === 'hovering' && target) {
      // Lock on current element
      e.preventDefault();
      e.stopPropagation();
      this.state = 'locked';
      this.lockedElement = target;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;

    if (this.state === 'locked') {
      // Unlock → resume hovering
      this.state = 'hovering';
      this.lockedElement = null;
      this.highlight.hide();
      this.panel.hide();
    } else if (this.state === 'hovering') {
      // Deactivate entirely
      this.deactivate();
    }
  }
}
```

- [ ] **Step 2: Implement observer.ts**

`src/content/observer.ts`:
```typescript
import { MUTATION_DEBOUNCE_MS } from '@shared/constants';

/**
 * Sets up a MutationObserver on document.body that calls the callback
 * on significant DOM changes (debounced).
 * Returns a cleanup function to disconnect the observer.
 */
export function setupMutationObserver(onMutation: () => void): () => void {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onMutation, MUTATION_DEBOUNCE_MS);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    // Do NOT observe attributes or characterData — too noisy on animated sites
  });

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    observer.disconnect();
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/content/inspector/inspectionController.ts src/content/observer.ts
git commit -m "feat: add inspection controller (hover/lock/escape state machine) and mutation observer"
```

---

## Task 14: Content Script Entry Point

**Files:**
- Modify: `src/content/index.ts`

- [ ] **Step 1: Implement content script entry point**

`src/content/index.ts`:
```typescript
import type { StoredSettings } from '@shared/types';
import { isMessage } from '@shared/messaging';
import { getSettings, onSettingsChanged } from '@shared/storage';
import { InspectionController } from './inspector/inspectionController';

let controller: InspectionController | null = null;

async function initialize(): Promise<void> {
  const settings = await getSettings();
  controller = new InspectionController(settings);

  // Listen for settings changes
  onSettingsChanged((newSettings: StoredSettings) => {
    controller?.updateSettings(newSettings);
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isMessage(message)) return;

  switch (message.type) {
    case 'GET_STATUS':
      sendResponse({
        type: 'STATUS',
        data: {
          active: controller?.isActive ?? false,
          analysisReady: controller?.isAnalysisReady ?? false,
        },
      });
      break;

    case 'ACTIVATE_INSPECT':
      controller?.activate();
      sendResponse({ type: 'OK' });
      break;

    case 'DEACTIVATE_INSPECT':
      controller?.deactivate();
      sendResponse({ type: 'OK' });
      break;

    case 'REFRESH_ANALYSIS':
      controller?.refreshAnalysis();
      sendResponse({ type: 'OK' });
      break;

    case 'GET_TOKENS_SUMMARY':
      sendResponse({
        type: 'TOKENS_SUMMARY',
        data: controller?.designTokens ?? null,
      });
      break;

    case 'UPDATE_SETTINGS':
      controller?.updateSettings(message.settings);
      sendResponse({ type: 'OK' });
      break;

    default:
      sendResponse({ type: 'ERROR', message: 'Unknown message type' });
  }

  // Return true to indicate we'll respond asynchronously if needed
  return true;
});

// Initialize on load
initialize();
```

- [ ] **Step 2: Commit**

```bash
git add src/content/index.ts
git commit -m "feat: add content script entry point with message handler and lifecycle"
```

---

## Task 15: Popup UI

**Files:**
- Modify: `src/popup/App.tsx`
- Create: `src/popup/components/StatusBadge.tsx`
- Create: `src/popup/components/SettingsPanel.tsx`
- Create: `src/popup/components/TokenSummary.tsx`
- Create: `src/popup/hooks/useTabMessaging.ts`
- Create: `src/popup/hooks/useStorage.ts`
- Create: `src/popup/popup.css`

- [ ] **Step 1: Implement useTabMessaging hook**

`src/popup/hooks/useTabMessaging.ts`:
```typescript
import { useCallback } from 'react';
import type { Message, MessageResponse } from '@shared/messaging';

async function getCurrentTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

export function useTabMessaging() {
  const sendMessage = useCallback(async (message: Message): Promise<MessageResponse | null> => {
    const tabId = await getCurrentTabId();
    if (tabId === null) return null;

    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch {
      return null;
    }
  }, []);

  return { sendMessage };
}
```

- [ ] **Step 2: Implement useStorage hook**

`src/popup/hooks/useStorage.ts`:
```typescript
import { useState, useEffect } from 'react';
import type { StoredSettings } from '@shared/types';
import { getSettings, saveSettings, onSettingsChanged } from '@shared/storage';

export function useStorage() {
  const [settings, setSettings] = useState<StoredSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
    const cleanup = onSettingsChanged(setSettings);
    return cleanup;
  }, []);

  const updateSettings = async (update: Partial<StoredSettings>) => {
    await saveSettings(update);
  };

  return { settings, updateSettings };
}
```

- [ ] **Step 3: Implement StatusBadge**

`src/popup/components/StatusBadge.tsx`:
```tsx
interface StatusBadgeProps {
  status: 'inactive' | 'analyzing' | 'ready';
}

const STATUS_COLORS = {
  inactive: '#6b7280',
  analyzing: '#f59e0b',
  ready: '#10b981',
};

const STATUS_LABELS = {
  inactive: 'Inactive',
  analyzing: 'Analyzing...',
  ready: 'Ready',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: STATUS_COLORS[status],
          display: 'inline-block',
        }}
      />
      <span style={{ fontSize: 12, color: '#888' }}>{STATUS_LABELS[status]}</span>
    </div>
  );
}
```

- [ ] **Step 4: Implement SettingsPanel**

`src/popup/components/SettingsPanel.tsx`:
```tsx
import type { StoredSettings } from '@shared/types';

interface SettingsPanelProps {
  settings: StoredSettings;
  onUpdate: (update: Partial<StoredSettings>) => void;
}

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  return (
    <div className="settings">
      <label className="setting-row">
        <span>Show warnings</span>
        <input
          type="checkbox"
          checked={settings.showWarnings}
          onChange={(e) => onUpdate({ showWarnings: e.target.checked })}
        />
      </label>
      <label className="setting-row">
        <span>Compact panel</span>
        <input
          type="checkbox"
          checked={settings.compactPanel}
          onChange={(e) => onUpdate({ compactPanel: e.target.checked })}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 5: Implement TokenSummary**

`src/popup/components/TokenSummary.tsx`:
```tsx
import type { DesignTokens } from '@shared/types';

interface TokenSummaryProps {
  tokens: DesignTokens;
}

export function TokenSummary({ tokens }: TokenSummaryProps) {
  const topFont = tokens.fontFamilies[0]?.value ?? '—';
  const topSizes = tokens.fontSizes.slice(0, 3).map((t) => `${t.value}px`).join(', ') || '—';
  const topSpacing = tokens.spacingValues.slice(0, 4).map((t) => `${t.value}`).join(', ') || '—';
  const topRadii = tokens.borderRadii.map((t) => `${t.value}px`).join(', ') || '—';

  return (
    <div className="token-summary">
      <div className="token-row">
        <span className="token-label">Font</span>
        <span className="token-value">{topFont}</span>
      </div>
      <div className="token-row">
        <span className="token-label">Sizes</span>
        <span className="token-value">{topSizes}</span>
      </div>
      <div className="token-row">
        <span className="token-label">Spacing</span>
        <span className="token-value">{topSpacing}</span>
      </div>
      <div className="token-row">
        <span className="token-label">Radii</span>
        <span className="token-value">{topRadii}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Implement popup.css**

`src/popup/popup.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: #1a1a1a;
  color: #e0e0e0;
  width: 320px;
  min-height: 200px;
}

.popup {
  padding: 16px;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.popup-title {
  font-size: 15px;
  font-weight: 600;
  color: #ffffff;
}

.popup-subtitle {
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}

.controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.btn {
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn:hover {
  background: #1d4ed8;
}

.btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}

.btn-secondary {
  background: #333;
  color: #ccc;
}

.btn-secondary:hover {
  background: #444;
}

.btn-danger {
  background: #dc2626;
}

.btn-danger:hover {
  background: #b91c1c;
}

.settings {
  margin-bottom: 16px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: #ccc;
  cursor: pointer;
}

.setting-row input[type="checkbox"] {
  accent-color: #2563eb;
}

.divider {
  height: 1px;
  background: #333;
  margin: 12px 0;
}

.token-summary {
  background: #222;
  border-radius: 6px;
  padding: 10px;
}

.token-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 11px;
}

.token-label {
  color: #888;
}

.token-value {
  color: #ccc;
  font-family: 'SF Mono', Menlo, Monaco, monospace;
  font-size: 11px;
}

.section-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #666;
  margin-bottom: 6px;
}
```

- [ ] **Step 7: Implement App.tsx**

`src/popup/App.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react';
import type { DesignTokens } from '@shared/types';
import type { MessageResponse } from '@shared/messaging';
import { useTabMessaging } from './hooks/useTabMessaging';
import { useStorage } from './hooks/useStorage';
import { StatusBadge } from './components/StatusBadge';
import { SettingsPanel } from './components/SettingsPanel';
import { TokenSummary } from './components/TokenSummary';
import './popup.css';

type AppStatus = 'inactive' | 'analyzing' | 'ready';

export function App() {
  const { sendMessage } = useTabMessaging();
  const { settings, updateSettings } = useStorage();
  const [status, setStatus] = useState<AppStatus>('inactive');
  const [inspecting, setInspecting] = useState(false);
  const [tokens, setTokens] = useState<DesignTokens | null>(null);

  const refreshStatus = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_STATUS' });
    if (response?.type === 'STATUS') {
      setInspecting(response.data.active);
      setStatus(response.data.analysisReady ? 'ready' : (response.data.active ? 'analyzing' : 'inactive'));
    }

    const tokenResp = await sendMessage({ type: 'GET_TOKENS_SUMMARY' });
    if (tokenResp?.type === 'TOKENS_SUMMARY') {
      setTokens(tokenResp.data);
    }
  }, [sendMessage]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleToggleInspect = async () => {
    if (inspecting) {
      await sendMessage({ type: 'DEACTIVATE_INSPECT' });
    } else {
      await sendMessage({ type: 'ACTIVATE_INSPECT' });
    }
    // Small delay to let content script update state
    setTimeout(refreshStatus, 100);
  };

  const handleRefresh = async () => {
    setStatus('analyzing');
    await sendMessage({ type: 'REFRESH_ANALYSIS' });
    setTimeout(refreshStatus, 200);
  };

  if (!settings) return null;

  return (
    <div className="popup">
      <div className="popup-header">
        <div>
          <div className="popup-title">Pixel Linter</div>
          <div className="popup-subtitle">Visual QA assistant</div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="controls">
        <button
          className={`btn ${inspecting ? 'btn-danger' : ''}`}
          onClick={handleToggleInspect}
        >
          {inspecting ? 'Exit Inspect Mode' : 'Enter Inspect Mode'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={!inspecting}
        >
          Refresh Analysis
        </button>
      </div>

      <div className="divider" />

      <div className="section-label">Settings</div>
      <SettingsPanel settings={settings} onUpdate={updateSettings} />

      {tokens && (
        <>
          <div className="divider" />
          <div className="section-label">Detected Tokens</div>
          <TokenSummary tokens={tokens} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Update main.tsx to import CSS**

`src/popup/main.tsx`:
```tsx
import { createRoot } from 'react-dom/client';
import { App } from './App';

const root = document.getElementById('root')!;
createRoot(root).render(<App />);
```

- [ ] **Step 9: Build and verify**

```bash
npm run build
```

Expected: Build succeeds with popup, content script, and background worker.

- [ ] **Step 10: Commit**

```bash
git add src/popup/ src/popup/components/ src/popup/hooks/
git commit -m "feat: add React popup UI with inspect controls, settings, and token summary"
```

---

## Task 16: Background Service Worker

**Files:**
- Modify: `src/background/index.ts`

- [ ] **Step 1: Implement background worker**

`src/background/index.ts`:
```typescript
import { DEFAULT_SETTINGS } from '@shared/constants';

// Set default settings on install
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('pixelLinterSettings');
  if (!result['pixelLinterSettings']) {
    await chrome.storage.local.set({ pixelLinterSettings: DEFAULT_SETTINGS });
  }
});

// Update badge when inspection state changes
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'STATUS' && sender.tab?.id) {
    const active = message.data?.active ?? false;
    chrome.action.setBadgeText({
      text: active ? 'ON' : '',
      tabId: sender.tab.id,
    });
    chrome.action.setBadgeBackgroundColor({
      color: '#10b981',
      tabId: sender.tab.id,
    });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add src/background/index.ts
git commit -m "feat: add background worker (default settings, badge updates)"
```

---

## Task 17: Icon Generation + Final Build

**Files:**
- Create: `scripts/generate-icons.ts`
- Create: `public/icons/` (generated PNGs)

- [ ] **Step 1: Create a simple icon generation script**

`scripts/generate-icons.ts`:
```typescript
// Simple script to generate placeholder SVG icons converted to data URLs
// In production, replace these with designed icons

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const sizes = [16, 48, 128];
const outDir = join(process.cwd(), 'public', 'icons');

mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="#2563eb"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
          fill="white" font-family="system-ui" font-weight="700"
          font-size="${Math.round(size * 0.5)}px">P</text>
  </svg>`;

  writeFileSync(join(outDir, `icon-${size}.svg`), svg);
}

console.log('Icons generated');
```

Note: Since Chrome requires PNG icons, you will need to either:
1. Use SVG icons in manifest (Chrome supports this in recent versions), or
2. Manually create simple PNG files, or
3. Use a canvas-based approach

For the MVP, update the manifest to reference SVG directly or use a simple PNG creation approach:

- [ ] **Step 2: Update manifest for SVG icons or create simple PNGs**

If using the simplest approach, create static SVG files in `public/icons/` and update the manifest to reference them. Modern Chrome supports SVG in the `icons` field.

Update `manifest.json` icon paths:
```json
{
  "icons": {
    "16": "icons/icon-16.svg",
    "48": "icons/icon-48.svg",
    "128": "icons/icon-128.svg"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon-16.svg",
      "48": "icons/icon-48.svg"
    }
  }
}
```

- [ ] **Step 3: Full build and verify**

```bash
npm run build
```

Expected: Clean build with all source files compiled.

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: All tests pass (storage, contrast, normalizer, histogram, tokenInferrer, warnings, elementClassifier).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add icons and verify full build"
```

---

## Task 18: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

`README.md`:
```markdown
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

## Roadmap Ideas

- Figma integration for true design-system comparison
- Exportable reports (PDF/JSON)
- Custom design token configuration
- Page-wide audit mode (scan all elements at once)
- Color palette clustering
- Sibling consistency comparison
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with architecture, setup, and usage guide"
```

---

## Task 19: Final Integration Test (Manual)

- [ ] **Step 1: Build the extension**

```bash
npm run build
```

- [ ] **Step 2: Load in Chrome**

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `dist/`

- [ ] **Step 3: Test on a real website**

Navigate to a staging site or any website (e.g., github.com). Verify:
- [ ] Clicking the extension icon opens the popup
- [ ] Popup shows "Pixel Linter" with Inactive status
- [ ] Clicking "Enter Inspect Mode" activates inspection
- [ ] Hovering elements shows a blue highlight
- [ ] A floating panel appears with typography, colors, spacing, shape data
- [ ] Warnings appear for off-system values
- [ ] Clicking an element locks the panel
- [ ] Escape unlocks; another Escape deactivates
- [ ] "Refresh Analysis" button works
- [ ] Settings toggles (show warnings, compact panel) work
- [ ] Token summary shows detected values
- [ ] Extension doesn't break page functionality

- [ ] **Step 4: Run all tests**

```bash
npm run test
npm run lint
```

Expected: All pass.

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: integration test fixes"
```
