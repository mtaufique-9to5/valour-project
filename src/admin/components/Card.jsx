import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export function Card({ title, subtitle, actions, footer, flush = false, as: Tag = 'section', className = '', children, ...rest }) {
  return (
    <Tag className={`va-card ${className}`} {...rest}>
      {(title || actions) && (
        <div className="va-card-head">
          <div>
            {title && <h2 className="va-card-title">{title}</h2>}
            {subtitle && <p className="va-card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="va-row">{actions}</div>}
        </div>
      )}
      <div className={`va-card-body${flush ? ' va-flush' : ''}`}>{children}</div>
      {footer && <div className="va-card-foot">{footer}</div>}
    </Tag>
  )
}

// delta: percent number shown with an arrow; chart: optional node (e.g. <Sparkline />).
export function StatCard({ label, value, icon: Icon, delta, deltaLabel, chart, badge }) {
  const up = typeof delta === 'number' && delta >= 0
  return (
    <div className="va-card va-stat">
      <div className="va-stat-top">
        <span className="va-stat-label">{label}</span>
        {Icon && <span className="va-stat-icon" aria-hidden="true"><Icon size={17} /></span>}
      </div>
      <div className="va-stat-value">{value}</div>
      <div className="va-stat-foot">
        <span className="va-row" style={{ gap: 6 }}>
          {typeof delta === 'number' && (
            <span className={up ? 'va-delta-up' : 'va-delta-down'}>
              {up ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
              <span className="va-sr-only">{up ? 'Up' : 'Down'}</span> {Math.abs(delta)}%
            </span>
          )}
          {deltaLabel && <span>{deltaLabel}</span>}
          {badge}
        </span>
        {chart}
      </div>
    </div>
  )
}

export default Card
