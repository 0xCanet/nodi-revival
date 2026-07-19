interface MetricProps {
  label: string
  value: string
  detail?: string
  accent?: boolean
}

export function Metric({ accent, detail, label, value }: MetricProps) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <strong className={accent ? 'metric__value metric__value--accent' : 'metric__value'}>{value}</strong>
      {detail ? <span className="metric__detail">{detail}</span> : null}
    </div>
  )
}
