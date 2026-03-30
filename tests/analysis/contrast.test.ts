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
    expect(interpretContrast(3.5, 18, 400)).toBe('good');
  });

  it('uses large text threshold for bold text >= 14px', () => {
    expect(interpretContrast(3.5, 14, 700)).toBe('good');
  });
});
