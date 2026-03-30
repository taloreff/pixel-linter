import type { InspectionData } from '@shared/types';
import { SHADOW_HOST_ID } from '@shared/constants';
import {
  formatPx,
  formatColor,
  formatRatio,
  formatSpacingQuad,
  truncateClasses,
} from '../utils/format';
import { computePanelPosition } from '../utils/geometry';

const PANEL_STYLES = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  #panel {
    background: rgba(15, 15, 15, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4);
    color: #e8e8e8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 11px;
    line-height: 1.4;
    max-width: 320px;
    max-height: 480px;
    overflow-y: auto;
    overflow-x: hidden;
    pointer-events: auto;
    user-select: none;
  }

  #panel.compact .section {
    padding: 4px 8px;
  }

  #panel.compact .section-title {
    margin-bottom: 2px;
  }

  #panel.compact .row {
    margin-bottom: 1px;
  }

  .section {
    padding: 7px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .section:last-child {
    border-bottom: none;
  }

  .section-title {
    color: #888;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 5px;
  }

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 3px;
  }

  .row:last-child {
    margin-bottom: 0;
  }

  .label {
    color: #888;
    flex-shrink: 0;
    font-size: 10px;
  }

  .value {
    color: #e8e8e8;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
    font-size: 11px;
    text-align: right;
    word-break: break-all;
  }

  .header-section {
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .header-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }

  .element-type-badge {
    background: rgba(59, 130, 246, 0.25);
    border: 1px solid rgba(59, 130, 246, 0.4);
    border-radius: 3px;
    color: #7fb3f5;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 1px 5px;
    text-transform: uppercase;
    flex-shrink: 0;
  }

  .header-tag {
    color: #e8e8e8;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
    font-size: 11px;
    font-weight: 600;
  }

  .header-dims {
    color: #666;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
    font-size: 10px;
    margin-left: auto;
    flex-shrink: 0;
  }

  .header-classes {
    color: #aaa;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
    font-size: 10px;
    word-break: break-all;
  }

  .color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 3px;
  }

  .color-row:last-child {
    margin-bottom: 0;
  }

  .color-value-group {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .swatch {
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    display: inline-block;
    flex-shrink: 0;
    height: 10px;
    width: 10px;
  }

  .contrast-badge {
    border-radius: 3px;
    font-size: 9px;
    font-weight: 600;
    padding: 1px 4px;
  }

  .contrast-good {
    background: rgba(34, 197, 94, 0.2);
    border: 1px solid rgba(34, 197, 94, 0.4);
    color: #4ade80;
  }

  .contrast-borderline {
    background: rgba(234, 179, 8, 0.2);
    border: 1px solid rgba(234, 179, 8, 0.4);
    color: #facc15;
  }

  .contrast-low {
    background: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.4);
    color: #f87171;
  }

  .warnings-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .warning-item {
    display: flex;
    align-items: flex-start;
    gap: 5px;
  }

  .warning-icon {
    flex-shrink: 0;
    font-size: 11px;
    line-height: 1.4;
  }

  .warning-icon.severity-warning {
    color: #facc15;
  }

  .warning-icon.severity-info {
    color: #60a5fa;
  }

  .warning-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .warning-message {
    color: #e8e8e8;
    font-size: 11px;
  }

  .warning-detail {
    color: #888;
    font-size: 10px;
  }

  #panel::-webkit-scrollbar {
    width: 4px;
  }

  #panel::-webkit-scrollbar-track {
    background: transparent;
  }

  #panel::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }
`;

export class PanelRenderer {
  private host: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private panel: HTMLDivElement | null = null;
  private compact = false;

  setCompact(compact: boolean): void {
    this.compact = compact;
    if (this.panel) {
      this.panel.classList.toggle('compact', compact);
    }
  }

  show(data: InspectionData, elementRect: DOMRect): void {
    const { panel } = this.ensureHost();
    panel.innerHTML = this.renderContent(data);
    panel.classList.toggle('compact', this.compact);
    this.host!.style.display = 'block';

    requestAnimationFrame(() => {
      if (!this.panel || !this.host) return;
      const panelRect = this.panel.getBoundingClientRect();
      const pos = computePanelPosition(elementRect, panelRect.width, panelRect.height);
      this.host.style.top = `${pos.top}px`;
      this.host.style.left = `${pos.left}px`;
    });
  }

  hide(): void {
    if (this.host) {
      this.host.style.display = 'none';
    }
  }

  destroy(): void {
    if (this.host) {
      this.host.remove();
      this.host = null;
      this.shadowRoot = null;
      this.panel = null;
    }
  }

  private ensureHost(): { host: HTMLDivElement; panel: HTMLDivElement } {
    if (this.host && this.panel) {
      return { host: this.host, panel: this.panel };
    }

    // Remove any stale host from a previous session
    const existing = document.getElementById(SHADOW_HOST_ID);
    if (existing) existing.remove();

    const host = document.createElement('div');
    host.id = SHADOW_HOST_ID;
    Object.assign(host.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '2147483647',
      pointerEvents: 'none',
      display: 'none',
    });
    document.documentElement.appendChild(host);

    const shadowRoot = host.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = PANEL_STYLES;
    shadowRoot.appendChild(styleEl);

    const panel = document.createElement('div');
    panel.id = 'panel';
    shadowRoot.appendChild(panel);

    this.host = host;
    this.shadowRoot = shadowRoot;
    this.panel = panel;

    return { host, panel };
  }

  private renderContent(data: InspectionData): string {
    const sections: string[] = [];

    // Header: element type badge + tag + classes + dimensions
    const classes = data.classes ? truncateClasses(data.classes) : '';
    const classesHtml = classes
      ? `<div class="header-classes">.${this.escapeHtml(classes.replace(/\s+/g, ' .'))}</div>`
      : '';
    sections.push(
      `<div class="header-section">` +
        `<div class="header-top">` +
          `<span class="element-type-badge">${this.escapeHtml(data.elementType)}</span>` +
          `<span class="header-tag">&lt;${this.escapeHtml(data.tag)}&gt;</span>` +
          `<span class="header-dims">${Math.round(data.width)}&times;${Math.round(data.height)}</span>` +
        `</div>` +
        classesHtml +
      `</div>`,
    );

    // Typography
    const typoRows = [
      this.row('Font', data.fontFamily),
      this.row('Size', formatPx(data.fontSize)),
      this.row('Weight', String(data.fontWeight)),
      this.row('Line height', formatPx(data.lineHeight)),
      data.letterSpacing !== 0 ? this.row('Letter spacing', formatPx(data.letterSpacing)) : '',
      data.textAlign !== 'start' && data.textAlign !== 'left'
        ? this.row('Text align', data.textAlign)
        : '',
      data.textTransform !== 'none' ? this.row('Transform', data.textTransform) : '',
    ].join('');
    sections.push(
      `<div class="section"><div class="section-title">Typography</div>${typoRows}</div>`,
    );

    // Colors
    const contrastBadge = this.renderContrastBadge(data);
    const colorRows = [
      this.colorRow('Text', data.textColor),
      this.colorRow('Background', data.backgroundColor),
      data.borderColor ? this.colorRow('Border', data.borderColor) : '',
      contrastBadge
        ? `<div class="row"><span class="label">Contrast</span><span class="value">${contrastBadge}</span></div>`
        : '',
    ].join('');
    sections.push(
      `<div class="section"><div class="section-title">Colors</div>${colorRows}</div>`,
    );

    // Spacing
    const hasMargin =
      data.margins.top !== 0 ||
      data.margins.right !== 0 ||
      data.margins.bottom !== 0 ||
      data.margins.left !== 0;
    const hasPadding =
      data.paddings.top !== 0 ||
      data.paddings.right !== 0 ||
      data.paddings.bottom !== 0 ||
      data.paddings.left !== 0;
    const hasGap = data.gap !== null && data.gap !== 0;
    const spacingRows = [
      this.row('Margin', hasMargin ? formatSpacingQuad(data.margins) : '0'),
      this.row('Padding', hasPadding ? formatSpacingQuad(data.paddings) : '0'),
      hasGap ? this.row('Gap', formatPx(data.gap!)) : '',
    ].join('');
    sections.push(
      `<div class="section"><div class="section-title">Spacing</div>${spacingRows}</div>`,
    );

    // Shape — only if relevant
    const hasBorderRadius = data.borderRadius !== 0;
    const hasBorder = data.borderWidth > 0 && data.borderStyle !== 'none';
    const hasBoxShadow = data.boxShadow !== 'none' && data.boxShadow !== '';
    const hasNonDefaultDisplay = data.display !== 'inline' && data.display !== 'block';
    const hasNonDefaultPosition = data.position !== 'static';

    if (hasBorderRadius || hasBorder || hasBoxShadow || hasNonDefaultDisplay || hasNonDefaultPosition) {
      const shapeRows = [
        hasBorderRadius ? this.row('Radius', formatPx(data.borderRadius)) : '',
        hasBorder ? this.row('Border', `${formatPx(data.borderWidth)} ${data.borderStyle}`) : '',
        hasBoxShadow ? this.row('Shadow', data.boxShadow) : '',
        hasNonDefaultDisplay ? this.row('Display', data.display) : '',
        hasNonDefaultPosition ? this.row('Position', data.position) : '',
      ].join('');
      sections.push(
        `<div class="section"><div class="section-title">Shape</div>${shapeRows}</div>`,
      );
    }

    // Warnings
    if (data.warnings.length > 0) {
      const warningItems = data.warnings
        .map(w => {
          const iconClass = w.severity === 'warning' ? 'severity-warning' : 'severity-info';
          const icon = w.severity === 'warning' ? '⚠' : 'ℹ';
          const detail = w.detail
            ? `<span class="warning-detail">${this.escapeHtml(w.detail)}</span>`
            : '';
          return (
            `<div class="warning-item">` +
              `<span class="warning-icon ${iconClass}">${icon}</span>` +
              `<div class="warning-text">` +
                `<span class="warning-message">${this.escapeHtml(w.message)}</span>` +
                detail +
              `</div>` +
            `</div>`
          );
        })
        .join('');
      sections.push(
        `<div class="section"><div class="section-title">Warnings</div>` +
          `<div class="warnings-list">${warningItems}</div></div>`,
      );
    }

    return sections.join('');
  }

  private row(label: string, value: string): string {
    if (!value) return '';
    return (
      `<div class="row">` +
        `<span class="label">${this.escapeHtml(label)}</span>` +
        `<span class="value">${this.escapeHtml(value)}</span>` +
      `</div>`
    );
  }

  private colorRow(label: string, color: string): string {
    const formatted = formatColor(color);
    const isReal = formatted !== 'transparent' && formatted !== 'unknown';
    const swatch = isReal
      ? `<span class="swatch" style="background:${this.escapeHtml(color)}"></span>`
      : '';
    return (
      `<div class="color-row">` +
        `<span class="label">${this.escapeHtml(label)}</span>` +
        `<span class="color-value-group">` +
          swatch +
          `<span class="value">${this.escapeHtml(formatted)}</span>` +
        `</span>` +
      `</div>`
    );
  }

  private renderContrastBadge(data: InspectionData): string {
    if (data.contrastLevel === 'unknown' || data.contrastRatio === null) return '';
    const ratio = formatRatio(data.contrastRatio);
    const cls = `contrast-${data.contrastLevel}`;
    return `<span class="contrast-badge ${cls}">${this.escapeHtml(ratio)}</span>`;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
