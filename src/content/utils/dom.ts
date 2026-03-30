import { SHADOW_HOST_ID } from '@shared/constants';

const INTERACTIVE_SELECTORS = 'a, button, input, select, textarea, [role="button"], [role="link"]';

const MEANINGFUL_SELECTORS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'label', 'blockquote',
  'a', 'button',
  'input', 'select', 'textarea',
  'img', 'svg', 'picture',
  'li',
  'div', 'section', 'article', 'main', 'aside', 'nav', 'header', 'footer',
].join(', ');

const IGNORED_TAGS = new Set([
  'script', 'style', 'meta', 'link', 'noscript', 'template', 'br', 'hr',
]);

export function isVisible(el: Element): boolean {
  if (IGNORED_TAGS.has(el.tagName.toLowerCase())) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  const styles = getComputedStyle(el);
  if (styles.display === 'none' || styles.visibility === 'hidden') return false;
  if (styles.opacity === '0') return false;

  return true;
}

export function isInsideExtension(el: Element): boolean {
  let current: Element | null = el;
  while (current) {
    if (current.id === SHADOW_HOST_ID) return true;
    current = current.parentElement;
  }
  return false;
}

export function isInteractive(el: Element): boolean {
  return el.matches(INTERACTIVE_SELECTORS);
}

export function hasTextContent(el: Element): boolean {
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      return true;
    }
  }
  return false;
}

export function queryMeaningfulElements(root: Element | Document): Element[] {
  return [...root.querySelectorAll(MEANINGFUL_SELECTORS)];
}

export { INTERACTIVE_SELECTORS, MEANINGFUL_SELECTORS };
