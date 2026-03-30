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

  // For large text, WCAG AA requires 3:1 (CONTRAST_BORDERLINE_THRESHOLD).
  // For normal text, WCAG AA requires 4.5:1 (CONTRAST_GOOD_THRESHOLD),
  // with 3.0–4.5 being borderline.
  if (isLargeText) {
    if (ratio >= CONTRAST_BORDERLINE_THRESHOLD) return 'good';
    return 'low';
  }

  if (ratio >= CONTRAST_GOOD_THRESHOLD) return 'good';
  if (ratio >= CONTRAST_BORDERLINE_THRESHOLD) return 'borderline';
  return 'low';
}

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
  return 'rgb(255, 255, 255)';
}
