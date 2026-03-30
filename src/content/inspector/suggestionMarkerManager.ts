import type { Suggestion } from '@shared/types';
import { MARKER_HOST_ID, MARKER_SIZE, MARKER_COLOR, MARKER_CRITICAL_COLOR, MARKER_Z_INDEX } from '@shared/constants';

export interface MarkerData {
  element: Element;
  suggestions: Suggestion[];
  tag: string;
}

const MARKER_STYLES = `
  :host {
    all: initial;
    position: fixed;
    top: 0;
    left: 0;
    z-index: ${MARKER_Z_INDEX};
    pointer-events: none;
  }

  .marker {
    position: fixed;
    width: ${MARKER_SIZE}px;
    height: ${MARKER_SIZE}px;
    border-radius: 50%;
    background: ${MARKER_COLOR};
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    pointer-events: auto;
    transition: transform 0.1s ease;
    user-select: none;
  }

  .marker:hover {
    transform: scale(1.15);
  }

  .marker.critical {
    background: ${MARKER_CRITICAL_COLOR};
  }

  .tooltip {
    position: fixed;
    background: rgba(15, 15, 15, 0.95);
    color: #e0e0e0;
    border-radius: 8px;
    padding: 12px 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    width: 280px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    pointer-events: none;
    z-index: 1;
    display: none;
  }

  .tooltip.visible {
    display: block;
  }

  .tooltip-header {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #888;
    margin-bottom: 8px;
  }

  .suggestion-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 6px;
  }

  .suggestion-card:last-child {
    margin-bottom: 0;
  }

  .suggestion-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .suggestion-card-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  .suggestion-card-message {
    font-weight: 500;
    font-size: 12px;
  }

  .suggestion-card-detail {
    color: #888;
    font-size: 11px;
    margin-top: 2px;
    font-family: 'SF Mono', Menlo, Monaco, monospace;
  }
`;

export class SuggestionMarkerManager {
  private host: HTMLDivElement | null = null;
  private shadow: ShadowRoot | null = null;
  private markers: HTMLDivElement[] = [];
  private tooltip: HTMLDivElement | null = null;
  private markerDataMap = new WeakMap<HTMLDivElement, MarkerData>();
  private elementRefs: { marker: HTMLDivElement; element: Element }[] = [];
  private onClickCallback: ((element: Element) => void) | null = null;
  private scrollCleanup: (() => void) | null = null;
  private scrollRAF: number | null = null;

  onElementClick(callback: (element: Element) => void): void {
    this.onClickCallback = callback;
  }

  show(items: MarkerData[]): void {
    this.clear();
    if (items.length === 0) return;

    const { shadow } = this.ensureHost();

    for (const item of items) {
      const marker = document.createElement('div');
      marker.className = 'marker';
      const hasCritical = item.suggestions.some(s => s.severity === 'critical');
      marker.textContent = hasCritical ? '!' : '💡';
      if (hasCritical) {
        marker.classList.add('critical');
      }
      this.markerDataMap.set(marker, item);

      const rect = item.element.getBoundingClientRect();
      marker.style.top = `${rect.top - MARKER_SIZE / 2}px`;
      marker.style.left = `${rect.right - MARKER_SIZE / 2}px`;

      marker.addEventListener('mouseenter', () => this.showTooltip(marker));
      marker.addEventListener('mouseleave', () => this.hideTooltip());
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideTooltip();
        const data = this.markerDataMap.get(marker);
        if (data && this.onClickCallback) {
          this.onClickCallback(data.element);
        }
      });

      shadow.appendChild(marker);
      this.markers.push(marker);
      this.elementRefs.push({ marker, element: item.element });
    }

    this.startScrollTracking();
  }

  hide(): void {
    this.clear();
  }

  destroy(): void {
    this.clear();
    this.stopScrollTracking();
    if (this.host) {
      this.host.remove();
      this.host = null;
      this.shadow = null;
      this.tooltip = null;
    }
  }

  repositionAll(): void {
    for (const { marker, element } of this.elementRefs) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight ||
          rect.right < 0 || rect.left > window.innerWidth) {
        marker.style.display = 'none';
      } else {
        marker.style.display = 'flex';
        marker.style.top = `${rect.top - MARKER_SIZE / 2}px`;
        marker.style.left = `${rect.right - MARKER_SIZE / 2}px`;
      }
    }
  }

  private clear(): void {
    this.hideTooltip();
    this.stopScrollTracking();
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers = [];
    this.elementRefs = [];
  }

  private startScrollTracking(): void {
    const onScroll = () => {
      if (this.scrollRAF) cancelAnimationFrame(this.scrollRAF);
      this.scrollRAF = requestAnimationFrame(() => {
        this.repositionAll();
        this.scrollRAF = null;
      });
    };
    window.addEventListener('scroll', onScroll, true);
    this.scrollCleanup = () => {
      window.removeEventListener('scroll', onScroll, true);
      if (this.scrollRAF) cancelAnimationFrame(this.scrollRAF);
    };
  }

  private stopScrollTracking(): void {
    if (this.scrollCleanup) {
      this.scrollCleanup();
      this.scrollCleanup = null;
    }
  }

  private showTooltip(marker: HTMLDivElement): void {
    const data = this.markerDataMap.get(marker);
    if (!data) return;

    const tooltip = this.ensureTooltip();
    tooltip.innerHTML = this.renderTooltipContent(data);
    tooltip.classList.add('visible');

    const markerRect = marker.getBoundingClientRect();
    let left = markerRect.left - 280 - 8;
    let top = markerRect.top;

    if (left < 8) {
      left = markerRect.right + 8;
    }

    const tooltipHeight = 150;
    if (top + tooltipHeight > window.innerHeight) {
      top = window.innerHeight - tooltipHeight - 8;
    }
    if (top < 8) top = 8;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.classList.remove('visible');
    }
  }

  private renderTooltipContent(data: MarkerData): string {
    const critical = data.suggestions.filter(s => s.severity === 'critical');
    const nonCritical = data.suggestions.filter(s => s.severity !== 'critical');

    const parts: string[] = [];
    if (critical.length > 0) parts.push(`${critical.length} Issue${critical.length !== 1 ? 's' : ''}`);
    if (nonCritical.length > 0) parts.push(`${nonCritical.length} Suggestion${nonCritical.length !== 1 ? 's' : ''}`);
    const header = `${parts.join(', ')} for &lt;${data.tag}&gt;`;

    // Sort critical first
    const sorted = [...critical, ...nonCritical];

    const cards = sorted.map((s) => {
      const icon = s.severity === 'critical' ? '🔴' : (s.severity === 'warning' ? '⚠️' : '💡');
      const borderStyle = s.severity === 'critical' ? 'border-left: 3px solid #EF4444;' : '';
      const detail = s.detail
        ? `<div class="suggestion-card-detail">${this.escapeHtml(s.detail)}</div>`
        : '';
      return `
        <div class="suggestion-card" style="${borderStyle}">
          <div class="suggestion-card-header">
            <span class="suggestion-card-icon">${icon}</span>
            <span class="suggestion-card-message">${this.escapeHtml(s.message)}</span>
          </div>
          ${detail}
        </div>
      `;
    }).join('');

    return `<div class="tooltip-header">${header}</div>${cards}`;
  }

  private ensureHost(): { host: HTMLDivElement; shadow: ShadowRoot } {
    if (this.host && this.shadow) return { host: this.host, shadow: this.shadow };

    const existing = document.getElementById(MARKER_HOST_ID);
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = MARKER_HOST_ID;
    Object.assign(host.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: MARKER_Z_INDEX,
      pointerEvents: 'none',
    });
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = MARKER_STYLES;
    shadow.appendChild(style);

    this.host = host;
    this.shadow = shadow;

    return { host, shadow };
  }

  private ensureTooltip(): HTMLDivElement {
    if (this.tooltip) return this.tooltip;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    this.shadow!.appendChild(tooltip);
    this.tooltip = tooltip;
    return tooltip;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
