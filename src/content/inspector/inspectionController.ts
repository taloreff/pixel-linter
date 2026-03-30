import type { StoredSettings } from '@shared/types';
import { PageAnalyzer } from '../analysis/analyzer';
import { HighlightManager } from './highlightManager';
import { PanelRenderer } from './panelRenderer';
import { resolveTarget } from './targetResolver';
import { setupMutationObserver } from '../observer';

type InspectionState = 'inactive' | 'hovering' | 'locked';

export class InspectionController {
  private state: InspectionState = 'inactive';
  private analyzer: PageAnalyzer;
  private highlight: HighlightManager;
  private panel: PanelRenderer;
  private lockedElement: Element | null = null;
  private hoveredElement: Element | null = null;
  private cleanupObserver: (() => void) | null = null;
  private settings: StoredSettings;

  private handleMouseOver: (e: MouseEvent) => void;
  private handleMouseOut: (e: MouseEvent) => void;
  private handleClick: (e: MouseEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(settings: StoredSettings) {
    this.analyzer = new PageAnalyzer();
    this.highlight = new HighlightManager();
    this.panel = new PanelRenderer();
    this.settings = settings;

    this.handleMouseOver = this.onMouseOver.bind(this);
    this.handleMouseOut = this.onMouseOut.bind(this);
    this.handleClick = this.onClick.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
  }

  get isActive(): boolean {
    return this.state !== 'inactive';
  }

  get isAnalysisReady(): boolean {
    return this.analyzer.isReady;
  }

  get designTokens() {
    return this.analyzer.designTokens;
  }

  updateSettings(settings: Partial<StoredSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.panel.setCompact(this.settings.compactPanel);
  }

  activate(): void {
    if (this.state !== 'inactive') return;

    try {
      this.analyzer.scan();
    } catch (err) {
      console.error('[Pixel Linter] Analysis scan failed:', err);
      // Continue anyway — inspection works without tokens, just no warnings
    }

    this.panel.setCompact(this.settings.compactPanel);

    document.addEventListener('mouseover', this.handleMouseOver, true);
    document.addEventListener('mouseout', this.handleMouseOut, true);
    document.addEventListener('click', this.handleClick, true);
    document.addEventListener('keydown', this.handleKeyDown, true);

    this.cleanupObserver = setupMutationObserver(() => {
      try {
        this.analyzer.scan();
      } catch (err) {
        console.error('[Pixel Linter] Re-scan failed:', err);
      }
    });

    this.state = 'hovering';
    console.log('[Pixel Linter] Inspect mode activated');
  }

  deactivate(): void {
    document.removeEventListener('mouseover', this.handleMouseOver, true);
    document.removeEventListener('mouseout', this.handleMouseOut, true);
    document.removeEventListener('click', this.handleClick, true);
    document.removeEventListener('keydown', this.handleKeyDown, true);

    if (this.cleanupObserver) {
      this.cleanupObserver();
      this.cleanupObserver = null;
    }

    this.highlight.hide();
    this.panel.hide();

    this.lockedElement = null;
    this.hoveredElement = null;
    this.state = 'inactive';
  }

  refreshAnalysis(): void {
    this.analyzer.scan();
  }

  destroy(): void {
    this.deactivate();
    this.highlight.destroy();
    this.panel.destroy();
  }

  private onMouseOver(e: MouseEvent): void {
    if (this.state === 'locked') return;

    const target = resolveTarget(e.target as Element);
    if (!target) return;
    if (target === this.hoveredElement) return;

    this.hoveredElement = target;
    this.highlight.show(target);

    try {
      const data = this.analyzer.inspectElement(target);

      if (!this.settings.showSuggestions) {
        data.suggestions = [];
      }

      const rect = target.getBoundingClientRect();
      this.panel.show(data, rect);
    } catch (err) {
      console.error('[Pixel Linter] Inspect element failed:', err);
    }
  }

  private onMouseOut(e: MouseEvent): void {
    if (this.state === 'locked') return;

    const related = e.relatedTarget as Element | null;
    if (related && this.hoveredElement?.contains(related)) return;

    this.hoveredElement = null;
    this.highlight.hide();
    this.panel.hide();
  }

  private onClick(e: MouseEvent): void {
    if (this.state === 'inactive') return;

    const target = resolveTarget(e.target as Element);

    if (this.state === 'locked') {
      if (target !== this.lockedElement) {
        this.state = 'hovering';
        this.lockedElement = null;
      }
      return;
    }

    if (this.state === 'hovering' && target) {
      e.preventDefault();
      e.stopPropagation();
      this.state = 'locked';
      this.lockedElement = target;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key !== 'Escape') return;

    if (this.state === 'locked') {
      this.state = 'hovering';
      this.lockedElement = null;
      this.highlight.hide();
      this.panel.hide();
    } else if (this.state === 'hovering') {
      this.deactivate();
    }
  }
}
