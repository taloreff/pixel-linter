import {
  HIGHLIGHT_ID,
  HIGHLIGHT_COLOR,
  HIGHLIGHT_OUTLINE_COLOR,
  HIGHLIGHT_OUTLINE_WIDTH,
} from '@shared/constants';

export class HighlightManager {
  private overlay: HTMLDivElement | null = null;

  private ensureOverlay(): HTMLDivElement {
    if (this.overlay) return this.overlay;

    this.overlay = document.createElement('div');
    this.overlay.id = HIGHLIGHT_ID;
    Object.assign(this.overlay.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '2147483646',
      background: HIGHLIGHT_COLOR,
      outline: `${HIGHLIGHT_OUTLINE_WIDTH}px solid ${HIGHLIGHT_OUTLINE_COLOR}`,
      borderRadius: '2px',
      transition: 'all 0.05s ease-out',
      display: 'none',
    });
    document.body.appendChild(this.overlay);
    return this.overlay;
  }

  show(element: Element): void {
    const overlay = this.ensureOverlay();
    const rect = element.getBoundingClientRect();

    Object.assign(overlay.style, {
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      display: 'block',
    });
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
