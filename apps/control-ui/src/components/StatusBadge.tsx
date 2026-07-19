interface StatusBadgeProps {
  label: string
  tone: 'danger' | 'healthy' | 'muted' | 'pending'
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>
}
