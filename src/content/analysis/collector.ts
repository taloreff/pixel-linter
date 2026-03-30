import type { RawElementData } from '@shared/types';
import { SCAN_ELEMENT_BUDGET } from '@shared/constants';
import {
  isVisible,
  isInsideExtension,
  isInteractive,
  hasTextContent,
  queryMeaningfulElements,
} from '../utils/dom';

const STYLE_PROPERTIES = [
  'fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing',
  'color', 'backgroundColor', 'borderColor',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'gap', 'borderRadius', 'borderWidth', 'borderStyle',
  'boxShadow', 'display', 'position', 'textAlign', 'textTransform',
] as const;

function extractComputedStyles(el: Element): Record<string, string> {
  const computed = getComputedStyle(el);
  const result: Record<string, string> = {};
  for (const prop of STYLE_PROPERTIES) {
    result[prop] = computed.getPropertyValue(
      prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`),
    );
  }
  return result;
}

export function collectVisibleElements(
  root: Element | Document = document,
): RawElementData[] {
  const candidates = queryMeaningfulElements(root);

  const priority: Element[] = [];
  const secondary: Element[] = [];

  for (const el of candidates) {
    if (isInsideExtension(el)) continue;
    if (!isVisible(el)) continue;

    if (isInteractive(el) || hasTextContent(el)) {
      priority.push(el);
    } else {
      secondary.push(el);
    }
  }

  const selected = [
    ...priority.slice(0, SCAN_ELEMENT_BUDGET),
    ...secondary.slice(0, Math.max(0, SCAN_ELEMENT_BUDGET - priority.length)),
  ];

  return selected.map((el) => ({
    element: el,
    tag: el.tagName.toLowerCase(),
    role: el.getAttribute('role'),
    computedStyles: extractComputedStyles(el),
    rect: el.getBoundingClientRect(),
    isInteractive: isInteractive(el),
    hasText: hasTextContent(el),
    childCount: el.children.length,
  }));
}
