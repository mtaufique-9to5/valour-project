// Small labels. tone: neutral | success | warning | danger | info | gold.
export function Badge({ tone = 'neutral', dot = false, className = '', children }) {
  const classes = ['va-badge', tone !== 'neutral' && `va-badge-${tone}`, dot && 'va-badge-dot', className].filter(Boolean).join(' ')
  return <span className={classes}>{children}</span>
}

// Maps a status string to a tone; unknown statuses render neutral.
const STATUS_TONES = {
  active: 'success', published: 'success', paid: 'success', fulfilled: 'success', delivered: 'success',
  'in stock': 'success', success: 'success', enabled: 'success',
  pending: 'warning', 'low stock': 'warning',
  processing: 'info', shipped: 'info', invited: 'info', scheduled: 'info',
  cancelled: 'danger', refunded: 'danger', failed: 'danger', 'out of stock': 'danger', suspended: 'danger', locked: 'danger',
}

export function StatusPill({ status, tone, children }) {
  return (
    <Badge tone={tone ?? STATUS_TONES[String(status).toLowerCase()] ?? 'neutral'} dot>
      {children ?? status}
    </Badge>
  )
}

// Marks anything rendered from src/admin/mock so it cannot be mistaken for real data.
export function SampleBadge({ label = 'Sample data' }) {
  return (
    <span className="va-badge va-badge-sample" title="Mock data for design only, not real business data">
      {label}
    </span>
  )
}

export default Badge
