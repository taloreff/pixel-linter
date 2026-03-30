interface StatusBadgeProps {
  status: 'inactive' | 'analyzing' | 'ready';
}

const STATUS_COLORS = {
  inactive: '#6b7280',
  analyzing: '#f59e0b',
  ready: '#10b981',
};

const STATUS_LABELS = {
  inactive: 'Inactive',
  analyzing: 'Analyzing...',
  ready: 'Ready',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <div className="status-badge" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: STATUS_COLORS[status], display: 'inline-block' }} />
      <span style={{ fontSize: 12, color: '#888' }}>{STATUS_LABELS[status]}</span>
    </div>
  );
}
