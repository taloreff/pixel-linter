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
