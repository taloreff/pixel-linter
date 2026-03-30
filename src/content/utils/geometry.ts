import { PANEL_OFFSET, PANEL_MAX_WIDTH, PANEL_MAX_HEIGHT } from '@shared/constants';

export interface PanelPosition {
  top: number;
  left: number;
}

export function computePanelPosition(
  elementRect: DOMRect,
  panelWidth: number,
  panelHeight: number,
): PanelPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const w = Math.min(panelWidth, PANEL_MAX_WIDTH);
  const h = Math.min(panelHeight, PANEL_MAX_HEIGHT);

  let top = elementRect.bottom + PANEL_OFFSET;
  let left = elementRect.right + PANEL_OFFSET;

  if (top + h > viewportHeight) {
    top = elementRect.top - h - PANEL_OFFSET;
  }

  if (top < 0) {
    top = PANEL_OFFSET;
  }

  if (left + w > viewportWidth) {
    left = elementRect.left - w - PANEL_OFFSET;
  }

  if (left < 0) {
    left = PANEL_OFFSET;
  }

  return { top, left };
}
