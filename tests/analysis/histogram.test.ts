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
      makeElement({ textColor: '#111111', backgroundColor: 'unknown' }),
    ];
    const maps = buildFrequencyMaps(elements);
    // Element 1 textColor counted, element 3 textColor counted independently
    expect(maps.textColors.get('#000000')).toBe(1);
    expect(maps.textColors.get('#111111')).toBe(1);
    expect(maps.textColors.has('transparent')).toBe(false);
    expect(maps.backgroundColors.has('unknown')).toBe(false);
  });
});
