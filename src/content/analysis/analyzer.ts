import type { DesignTokens, NormalizedElementData, Warning, InspectionData } from '@shared/types';
import { collectVisibleElements } from './collector';
import { normalizeAll, normalizeElement, parsePx, normalizeColor, normalizeFontFamily, resolveLineHeight } from './normalizer';
import { buildFrequencyMaps } from './histogram';
import { inferDesignTokens } from './tokenInferrer';
import { generateWarnings } from './warnings';
import { computeContrast } from './contrast';
import { classifyElement } from './elementClassifier';
import { isInteractive, hasTextContent } from '../utils/dom';
import { truncateClasses } from '../utils/format';

export class PageAnalyzer {
  private tokens: DesignTokens | null = null;
  private elementCount = 0;

  get isReady(): boolean {
    return this.tokens !== null;
  }

  get designTokens(): DesignTokens | null {
    return this.tokens;
  }

  scan(): DesignTokens {
    const raw = collectVisibleElements();
    const normalized = normalizeAll(raw);
    this.elementCount = normalized.length;
    const maps = buildFrequencyMaps(normalized);
    this.tokens = inferDesignTokens(maps, this.elementCount);
    return this.tokens;
  }

  inspectElement(element: Element): InspectionData {
    const computed = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const tag = element.tagName.toLowerCase();
    const role = element.getAttribute('role');
    const interactive = isInteractive(element);
    const hasText = hasTextContent(element);
    const fontSize = parsePx(computed.fontSize);

    const elementType = classifyElement(
      tag, role, hasText, interactive, rect.height, rect.width,
    );

    const textColor = normalizeColor(computed.color);
    const backgroundColor = normalizeColor(computed.backgroundColor);

    const normalized: NormalizedElementData = {
      element,
      elementType,
      fontSize,
      fontFamily: normalizeFontFamily(computed.fontFamily),
      fontWeight: parseInt(computed.fontWeight, 10) || 400,
      lineHeight: resolveLineHeight(computed.lineHeight, fontSize),
      letterSpacing: parsePx(computed.letterSpacing),
      textColor,
      backgroundColor,
      borderColor: computed.borderColor ? normalizeColor(computed.borderColor) : null,
      margins: {
        top: parsePx(computed.marginTop),
        right: parsePx(computed.marginRight),
        bottom: parsePx(computed.marginBottom),
        left: parsePx(computed.marginLeft),
      },
      paddings: {
        top: parsePx(computed.paddingTop),
        right: parsePx(computed.paddingRight),
        bottom: parsePx(computed.paddingBottom),
        left: parsePx(computed.paddingLeft),
      },
      gap: computed.gap ? parsePx(computed.gap) : null,
      borderRadius: parsePx(computed.borderRadius),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      display: computed.display,
      position: computed.position,
      isInteractive: interactive,
    };

    const warnings: Warning[] = this.tokens
      ? generateWarnings(normalized, this.tokens)
      : [];

    const contrast = computeContrast(computed.color, element);

    if (contrast.level === 'low') {
      warnings.push({
        type: 'low-contrast',
        severity: 'warning',
        message: 'Low color contrast',
        detail: `${contrast.ratio}:1 — may affect readability`,
      });
    }

    return {
      elementType,
      tag,
      classes: truncateClasses(element.className || ''),
      width: normalized.width,
      height: normalized.height,
      fontSize: normalized.fontSize,
      fontFamily: normalized.fontFamily,
      fontWeight: normalized.fontWeight,
      lineHeight: normalized.lineHeight,
      letterSpacing: normalized.letterSpacing,
      textAlign: computed.textAlign,
      textTransform: computed.textTransform,
      textColor,
      backgroundColor,
      borderColor: normalized.borderColor,
      contrastRatio: contrast.ratio || null,
      contrastLevel: contrast.level,
      margins: normalized.margins,
      paddings: normalized.paddings,
      gap: normalized.gap,
      borderRadius: normalized.borderRadius,
      borderWidth: parsePx(computed.borderWidth),
      borderStyle: computed.borderStyle,
      boxShadow: computed.boxShadow === 'none' ? '' : computed.boxShadow,
      display: normalized.display,
      position: normalized.position,
      warnings,
    };
  }
}
