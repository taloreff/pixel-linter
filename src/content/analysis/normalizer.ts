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
