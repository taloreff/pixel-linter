import { describe, it, expect } from 'vitest';
import { classifyElement } from '../../src/content/analysis/elementClassifier';

describe('classifyElement', () => {
  it('classifies h1-h6 as heading', () => {
    expect(classifyElement('h1', null, true, false, 32, 200)).toBe('heading');
    expect(classifyElement('h2', null, true, false, 24, 200)).toBe('heading');
    expect(classifyElement('h3', null, true, false, 20, 200)).toBe('heading');
  });

  it('classifies button tag as button', () => {
    expect(classifyElement('button', null, true, true, 40, 120)).toBe('button');
  });

  it('classifies role=button as button', () => {
    expect(classifyElement('div', 'button', true, true, 40, 120)).toBe('button');
  });

  it('classifies a tag as link', () => {
    expect(classifyElement('a', null, true, true, 16, 200)).toBe('link');
  });

  it('classifies input tag as input', () => {
    expect(classifyElement('input', null, false, true, 40, 300)).toBe('input');
  });

  it('classifies textarea tag as textarea', () => {
    expect(classifyElement('textarea', null, false, true, 100, 300)).toBe('textarea');
  });

  it('classifies img tag as image', () => {
    expect(classifyElement('img', null, false, false, 200, 300)).toBe('image');
  });

  it('classifies svg as icon when small', () => {
    expect(classifyElement('svg', null, false, false, 24, 24)).toBe('icon');
  });

  it('classifies svg as image when large', () => {
    expect(classifyElement('svg', null, false, false, 200, 200)).toBe('image');
  });

  it('classifies p as paragraph', () => {
    expect(classifyElement('p', null, true, false, 16, 600)).toBe('paragraph');
  });

  it('classifies span with text as paragraph', () => {
    expect(classifyElement('span', null, true, false, 14, 200)).toBe('paragraph');
  });

  it('classifies nav items', () => {
    expect(classifyElement('li', null, true, false, 40, 120)).toBe('nav-item');
  });

  it('classifies div without text as card', () => {
    expect(classifyElement('div', null, false, false, 300, 400)).toBe('card');
  });

  it('classifies unknown elements as generic', () => {
    expect(classifyElement('custom-element', null, false, false, 50, 50)).toBe('generic');
  });
});
