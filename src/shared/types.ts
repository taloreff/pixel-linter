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
