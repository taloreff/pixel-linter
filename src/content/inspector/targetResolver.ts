import { SHADOW_HOST_ID } from '@shared/constants';

const SEMANTIC_TAGS = new Set([
  'button', 'a', 'input', 'select', 'textarea',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'img', 'video', 'audio', 'canvas',
  'table', 'form', 'nav', 'main',
]);

const MAX_PROMOTION_LEVELS = 2;
const TINY_ELEMENT_PX = 8;

export function resolveTarget(element: Element): Element | null {
  if (isExtensionElement(element)) return null;

  let current = element;
  let promotions = 0;

  while (promotions < MAX_PROMOTION_LEVELS && current.parentElement) {
    if (SEMANTIC_TAGS.has(current.tagName.toLowerCase())) break;
    if (current.getAttribute('role')) break;

    const rect = current.getBoundingClientRect();

    if (rect.width < TINY_ELEMENT_PX || rect.height < TINY_ELEMENT_PX) {
      current = current.parentElement;
      promotions++;
      continue;
    }

    if (
      current.tagName.toLowerCase() === 'span' &&
      current.children.length === 0 &&
      current.parentElement.children.length === 1
    ) {
      current = current.parentElement;
      promotions++;
      continue;
    }

    break;
  }

  if (isExtensionElement(current)) return null;

  return current;
}

function isExtensionElement(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (current.id === SHADOW_HOST_ID || current.id === 'pixel-linter-highlight') {
      return true;
    }
    current = current.parentElement;
  }
  return false;
}
