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
