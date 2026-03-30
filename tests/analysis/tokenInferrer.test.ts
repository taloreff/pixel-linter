import { describe, it, expect } from 'vitest';
import { inferDesignTokens, extractDominantTokens } from '../../src/content/analysis/tokenInferrer';
import type { FrequencyMaps } from '../../src/shared/types';

describe('extractDominantTokens', () => {
  it('extracts values above percentage threshold', () => {
    const map = new Map<number, number>([
      [16, 50],
      [14, 30],
      [15, 2],
      [24, 18],
    ]);
    const total = 100;
    const tokens = extractDominantTokens(map, total);
    expect(tokens.map((t) => t.value)).toContain(16);
    expect(tokens.map((t) => t.value)).toContain(14);
    expect(tokens.map((t) => t.value)).toContain(24);
    expect(tokens.length).toBe(4);
  });

  it('always includes top-5 even if below percentage threshold', () => {
    const map = new Map<number, number>([
      [16, 80],
      [14, 5],
      [12, 4],
      [24, 3],
      [32, 2],
      [20, 1],
    ]);
    const total = 95;
    const tokens = extractDominantTokens(map, total);
    const values = tokens.map((t) => t.value);
    expect(values).toContain(32);
    expect(values).not.toContain(20);
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
