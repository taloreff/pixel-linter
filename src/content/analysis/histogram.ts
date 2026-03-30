import type { NormalizedElementData, FrequencyMaps } from '@shared/types';

function increment<T>(map: Map<T, number>, value: T): void {
  map.set(value, (map.get(value) || 0) + 1);
}

function isValidColor(color: string): boolean {
  return color !== 'transparent' && color !== 'unknown' && color.startsWith('#');
}

export function buildFrequencyMaps(elements: NormalizedElementData[]): FrequencyMaps {
  const maps: FrequencyMaps = {
    fontFamilies: new Map(),
    fontSizes: new Map(),
    fontWeights: new Map(),
    lineHeights: new Map(),
    textColors: new Map(),
    backgroundColors: new Map(),
    spacingValues: new Map(),
    borderRadii: new Map(),
    componentHeights: new Map(),
  };

  for (const el of elements) {
    increment(maps.fontFamilies, el.fontFamily);
    increment(maps.fontSizes, el.fontSize);
    increment(maps.fontWeights, el.fontWeight);
    increment(maps.lineHeights, el.lineHeight);

    if (isValidColor(el.textColor)) {
      increment(maps.textColors, el.textColor);
    }
    if (isValidColor(el.backgroundColor)) {
      increment(maps.backgroundColors, el.backgroundColor);
    }

    const spacingValues = [
      el.margins.top, el.margins.right, el.margins.bottom, el.margins.left,
      el.paddings.top, el.paddings.right, el.paddings.bottom, el.paddings.left,
    ];
    if (el.gap !== null && el.gap > 0) spacingValues.push(el.gap);

    for (const v of spacingValues) {
      if (v > 0) increment(maps.spacingValues, v);
    }

    if (el.borderRadius > 0) {
      increment(maps.borderRadii, el.borderRadius);
    }

    if (el.isInteractive && el.height > 0) {
      increment(maps.componentHeights, el.height);
    }
  }

  return maps;
}
