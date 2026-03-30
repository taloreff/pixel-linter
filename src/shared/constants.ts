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
