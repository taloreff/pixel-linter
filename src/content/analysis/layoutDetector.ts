import type { Suggestion } from '@shared/types';

/**
 * Detects horizontal overflow — content wider than its container.
 * Skips elements that intentionally scroll (overflow-x: auto/scroll).
 */
export function detectHorizontalOverflow(el: Element): Suggestion | null {
  const htmlEl = el as HTMLElement;
  if (htmlEl.scrollWidth <= htmlEl.clientWidth) return null;

  const styles = getComputedStyle(el);
  const overflowX = styles.overflowX;
  if (overflowX === 'auto' || overflowX === 'scroll') return null;

  const overflow = htmlEl.scrollWidth - htmlEl.clientWidth;
  return {
    type: 'horizontal-overflow',
    severity: 'critical',
    message: 'Content overflows container',
    detail: `${overflow}px wider than container — may cause horizontal scroll`,
  };
}

/**
 * Detects elements extending beyond the viewport width.
 */
export function detectViewportOverflow(el: Element): Suggestion | null {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const overflow = Math.round(rect.right - window.innerWidth);
  if (overflow <= 1) return null; // 1px tolerance

  return {
    type: 'viewport-overflow',
    severity: 'critical',
    message: 'Element extends beyond viewport',
    detail: `${overflow}px past right edge of viewport`,
  };
}

/**
 * Detects text being clipped by overflow:hidden without text-overflow:ellipsis.
 */
export function detectTextClipping(el: Element): Suggestion | null {
  const htmlEl = el as HTMLElement;
  const styles = getComputedStyle(el);

  if (styles.overflow !== 'hidden' && styles.overflowY !== 'hidden') return null;
  if (htmlEl.scrollHeight <= htmlEl.clientHeight) return null;
  if (styles.textOverflow === 'ellipsis') return null;

  const clipped = htmlEl.scrollHeight - htmlEl.clientHeight;
  return {
    type: 'text-clipped',
    severity: 'critical',
    message: 'Text appears clipped',
    detail: `${clipped}px of content hidden by overflow`,
  };
}

/**
 * Detects overlapping siblings — two visible siblings whose bounding rects
 * overlap by more than 50% of the smaller element's area.
 */
export function detectSiblingOverlap(el: Element): Suggestion | null {
  const parent = el.parentElement;
  if (!parent) return null;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const siblings = parent.children;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === el) continue;

    const sibRect = sibling.getBoundingClientRect();
    if (sibRect.width === 0 || sibRect.height === 0) continue;

    // Calculate overlap area
    const overlapX = Math.max(0, Math.min(rect.right, sibRect.right) - Math.max(rect.left, sibRect.left));
    const overlapY = Math.max(0, Math.min(rect.bottom, sibRect.bottom) - Math.max(rect.top, sibRect.top));
    const overlapArea = overlapX * overlapY;

    if (overlapArea === 0) continue;

    const smallerArea = Math.min(rect.width * rect.height, sibRect.width * sibRect.height);
    if (overlapArea / smallerArea > 0.5) {
      return {
        type: 'sibling-overlap',
        severity: 'critical',
        message: 'Element overlaps with sibling',
        detail: `${Math.round((overlapArea / smallerArea) * 100)}% overlap detected`,
      };
    }
  }

  return null;
}

/**
 * Runs all layout checks on an element and returns any issues found.
 */
export function detectLayoutIssues(el: Element): Suggestion[] {
  const issues: Suggestion[] = [];

  const horizontal = detectHorizontalOverflow(el);
  if (horizontal) issues.push(horizontal);

  const viewport = detectViewportOverflow(el);
  if (viewport) issues.push(viewport);

  const clipping = detectTextClipping(el);
  if (clipping) issues.push(clipping);

  const overlap = detectSiblingOverlap(el);
  if (overlap) issues.push(overlap);

  return issues;
}
