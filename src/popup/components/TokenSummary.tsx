import type { DesignTokens } from '@shared/types';

interface TokenSummaryProps {
  tokens: DesignTokens;
}

export function TokenSummary({ tokens }: TokenSummaryProps) {
  const topFont = tokens.fontFamilies[0]?.value ?? '—';
  const topSizes = tokens.fontSizes.slice(0, 3).map((t) => `${t.value}px`).join(', ') || '—';
  const topSpacing = tokens.spacingValues.slice(0, 4).map((t) => `${t.value}`).join(', ') || '—';
  const topRadii = tokens.borderRadii.map((t) => `${t.value}px`).join(', ') || '—';

  return (
    <div className="token-summary">
      <div className="token-row"><span className="token-label">Font</span><span className="token-value">{topFont}</span></div>
      <div className="token-row"><span className="token-label">Sizes</span><span className="token-value">{topSizes}</span></div>
      <div className="token-row"><span className="token-label">Spacing</span><span className="token-value">{topSpacing}</span></div>
      <div className="token-row"><span className="token-label">Radii</span><span className="token-value">{topRadii}</span></div>
    </div>
  );
}
