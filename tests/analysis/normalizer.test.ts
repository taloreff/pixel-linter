import { describe, it, expect } from 'vitest';
import {
  parsePx,
  normalizeColor,
  normalizeFontFamily,
  resolveLineHeight,
} from '../../src/content/analysis/normalizer';

describe('parsePx', () => {
  it('parses "16px" to 16', () => {
    expect(parsePx('16px')).toBe(16);
  });

  it('rounds "15.5px" to 16', () => {
    expect(parsePx('15.5px')).toBe(16);
  });

  it('parses "0px" to 0', () => {
    expect(parsePx('0px')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parsePx('')).toBe(0);
  });

  it('returns 0 for "normal"', () => {
    expect(parsePx('normal')).toBe(0);
  });

  it('returns 0 for "auto"', () => {
    expect(parsePx('auto')).toBe(0);
  });
});

describe('normalizeColor', () => {
  it('converts rgb to lowercase hex', () => {
    expect(normalizeColor('rgb(255, 0, 0)')).toBe('#ff0000');
  });

  it('converts rgba with full opacity to hex', () => {
    expect(normalizeColor('rgba(255, 0, 0, 1)')).toBe('#ff0000');
  });

  it('passes through hex unchanged', () => {
    expect(normalizeColor('#abcdef')).toBe('#abcdef');
  });

  it('expands short hex', () => {
    expect(normalizeColor('#abc')).toBe('#aabbcc');
  });

  it('returns transparent for rgba with 0 alpha', () => {
    expect(normalizeColor('rgba(0, 0, 0, 0)')).toBe('transparent');
  });

  it('returns "unknown" for unrecognized values', () => {
    expect(normalizeColor('not-a-color')).toBe('unknown');
  });
});

describe('normalizeFontFamily', () => {
  it('extracts first family from stack', () => {
    expect(normalizeFontFamily('"Helvetica Neue", Arial, sans-serif')).toBe('Helvetica Neue');
  });

  it('strips quotes', () => {
    expect(normalizeFontFamily("'Roboto'")).toBe('Roboto');
  });

  it('handles single unquoted family', () => {
    expect(normalizeFontFamily('Arial')).toBe('Arial');
  });
});

describe('resolveLineHeight', () => {
  it('resolves "normal" to fontSize * 1.2', () => {
    expect(resolveLineHeight('normal', 16)).toBe(19);
  });

  it('resolves px value directly', () => {
    expect(resolveLineHeight('24px', 16)).toBe(24);
  });

  it('resolves unitless multiplier', () => {
    expect(resolveLineHeight('1.5', 16)).toBe(24);
  });
});
