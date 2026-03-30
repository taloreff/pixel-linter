import type { DesignTokens, FrequencyMaps, TokenFrequency } from '@shared/types';
import { TOKEN_MIN_PERCENTAGE, TOKEN_TOP_N } from '@shared/constants';

export function extractDominantTokens<T>(
  map: Map<T, number>,
  totalElements: number,
): TokenFrequency<T>[] {
  const entries = [...map.entries()]
    .map(([value, count]) => ({
      value,
      count,
      percentage: Math.round((count / totalElements) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const topN = entries.slice(0, TOKEN_TOP_N);
  const aboveThreshold = entries.filter((e) => e.percentage >= TOKEN_MIN_PERCENTAGE);

  const included = new Set<T>();
  const result: TokenFrequency<T>[] = [];

  for (const entry of [...topN, ...aboveThreshold]) {
    if (!included.has(entry.value)) {
      included.add(entry.value);
      result.push(entry);
    }
  }

  return result.sort((a, b) => b.count - a.count);
}

export function inferDesignTokens(maps: FrequencyMaps, totalElements: number): DesignTokens {
  return {
    fontFamilies: extractDominantTokens(maps.fontFamilies, totalElements),
    fontSizes: extractDominantTokens(maps.fontSizes, totalElements),
    fontWeights: extractDominantTokens(maps.fontWeights, totalElements),
    lineHeights: extractDominantTokens(maps.lineHeights, totalElements),
    textColors: extractDominantTokens(maps.textColors, totalElements),
    backgroundColors: extractDominantTokens(maps.backgroundColors, totalElements),
    spacingValues: extractDominantTokens(maps.spacingValues, totalElements),
    borderRadii: extractDominantTokens(maps.borderRadii, totalElements),
    componentHeights: extractDominantTokens(maps.componentHeights, totalElements),
  };
}
