export function formatPx(value: number): string {
  return `${value}px`;
}

export function formatColor(hex: string): string {
  if (hex === 'transparent' || hex === 'unknown') return hex;
  return hex.toUpperCase();
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}:1`;
}

export function truncateClasses(classes: string, maxLength = 60): string {
  if (classes.length <= maxLength) return classes;
  return classes.slice(0, maxLength - 3) + '...';
}

export function formatSpacingQuad(quad: { top: number; right: number; bottom: number; left: number }): string {
  const { top, right, bottom, left } = quad;
  if (top === right && right === bottom && bottom === left) return `${top}px`;
  if (top === bottom && left === right) return `${top}px ${right}px`;
  return `${top}px ${right}px ${bottom}px ${left}px`;
}
