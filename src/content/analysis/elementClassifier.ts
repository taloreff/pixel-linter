import type { ElementType } from '@shared/types';

const HEADING_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const ICON_MAX_SIZE = 48;

export function classifyElement(
  tag: string,
  role: string | null,
  hasText: boolean,
  isInteractive: boolean,
  height: number,
  width: number,
): ElementType {
  const lowerTag = tag.toLowerCase();

  if (HEADING_TAGS.has(lowerTag) || role === 'heading') return 'heading';
  if (lowerTag === 'button' || role === 'button') return 'button';
  if (lowerTag === 'input' || lowerTag === 'select') return 'input';
  if (lowerTag === 'textarea') return 'textarea';
  if (lowerTag === 'a' || role === 'link') return 'link';
  if (lowerTag === 'img' || lowerTag === 'picture') return 'image';

  if (lowerTag === 'svg') {
    return Math.max(width, height) <= ICON_MAX_SIZE ? 'icon' : 'image';
  }

  if (lowerTag === 'p' || lowerTag === 'label' || lowerTag === 'blockquote') return 'paragraph';
  if ((lowerTag === 'span' || lowerTag === 'em' || lowerTag === 'strong') && hasText) {
    return 'paragraph';
  }

  if (lowerTag === 'li' || role === 'menuitem' || role === 'tab') return 'nav-item';

  if (
    (lowerTag === 'div' || lowerTag === 'section' || lowerTag === 'article') &&
    !hasText &&
    width > 100 &&
    height > 100
  ) {
    return 'card';
  }

  return 'generic';
}
