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

  it('warns about uncommon font size', () => {
    const el = makeNormalized({ fontSize: 15 });
    const suggestions = generateSuggestions(el, makeTokens());
    const fontSuggestion = suggestions.find((w) => w.type === 'uncommon-font-size');
    expect(fontSuggestion).toBeDefined();
    expect(fontSuggestion!.severity).toBe('warning');
    expect(fontSuggestion!.message).toContain('Uncommon');
  });

  it('warns about off-scale spacing', () => {
    const el = makeNormalized({
      paddings: { top: 13, right: 13, bottom: 13, left: 13 },
    });
    const suggestions = generateSuggestions(el, makeTokens());
    const spacingSuggestion = suggestions.find((w) => w.type === 'off-spacing-scale');
    expect(spacingSuggestion).toBeDefined();
  });

  it('does not warn about spacing within tolerance', () => {
    const el = makeNormalized({
      paddings: { top: 15, right: 16, bottom: 17, left: 16 },
    });
    const suggestions = generateSuggestions(el, makeTokens());
    const spacingSuggestion = suggestions.find((w) => w.type === 'off-spacing-scale');
    expect(spacingSuggestion).toBeUndefined();
  });

  it('warns about unusual border radius', () => {
    const el = makeNormalized({ borderRadius: 7 });
    const suggestions = generateSuggestions(el, makeTokens());
    const radiusSuggestion = suggestions.find((w) => w.type === 'unusual-radius');
    expect(radiusSuggestion).toBeDefined();
    expect(radiusSuggestion!.severity).toBe('info');
  });

  it('warns about small tap target', () => {
    const el = makeNormalized({ isInteractive: true, height: 28 });
    const suggestions = generateSuggestions(el, makeTokens());
    const tapSuggestion = suggestions.find((w) => w.type === 'small-tap-target');
    expect(tapSuggestion).toBeDefined();
  });

  it('does not warn about tap target for non-interactive elements', () => {
    const el = makeNormalized({ isInteractive: false, height: 12 });
    const suggestions = generateSuggestions(el, makeTokens());
    const tapSuggestion = suggestions.find((w) => w.type === 'small-tap-target');
    expect(tapSuggestion).toBeUndefined();
  });

  it('warns about uncommon font weight', () => {
    const el = makeNormalized({ fontWeight: 500 });
    const suggestions = generateSuggestions(el, makeTokens());
    const weightSuggestion = suggestions.find((w) => w.type === 'uncommon-font-weight');
    expect(weightSuggestion).toBeDefined();
  });

  it('warns about mixed font family', () => {
    const el = makeNormalized({ fontFamily: 'Roboto' });
    const suggestions = generateSuggestions(el, makeTokens());
    const familySuggestion = suggestions.find((w) => w.type === 'mixed-font-family');
    expect(familySuggestion).toBeDefined();
  });
});
