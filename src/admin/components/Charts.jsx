// Hand-written SVG charts. Each takes plain numbers plus a `label` that is
// exposed to assistive tech (the SVG is role="img").

export function Sparkline({ data = [], width = 96, height = 32, label, color = 'var(--va-gold)' }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const range = Math.max(...data) - min || 1
  const step = width / (data.length - 1)
  const line = data
    .map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(height - 2 - ((v - min) / range) * (height - 4)).toFixed(1)}`)
    .join(' ')
  return (
    <svg className="va-chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ width, flexShrink: 0 }}>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={color} opacity="0.12" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

// data = [{ label, value }]; formatValue formats each bar's tooltip.
export function MiniBarChart({ data = [], height = 180, label, formatValue = (v) => v, color = 'var(--va-gold)' }) {
  const width = 600
  const top = 8
  const bottom = 22
  const max = Math.max(1, ...data.map((d) => d.value))
  const slot = width / Math.max(1, data.length)
  const barW = Math.min(36, slot * 0.6)
  const inner = height - top - bottom
  return (
    <svg className="va-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      {[0.25, 0.5, 0.75, 1].map((g) => (
        <line key={g} x1="0" x2={width} y1={top + inner * (1 - g)} y2={top + inner * (1 - g)} stroke="var(--va-border)" strokeDasharray="3 4" />
      ))}
      {data.map((d, i) => {
        const h = (d.value / max) * inner
        const x = i * slot + (slot - barW) / 2
        return (
          <g key={d.label}>
            <rect x={x} y={top + inner - h} width={barW} height={Math.max(h, 1)} rx="4" fill={color} opacity={i === data.length - 1 ? 1 : 0.55}>
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            </rect>
            <text x={x + barW / 2} y={height - 6} textAnchor="middle" className="va-chart-axis">{d.label}</text>
          </g>
        )
      })}
    </svg>
  )
}
