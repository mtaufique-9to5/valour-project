'use client'

import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleX }

// Inline alert. tone: info | success | warning | danger (danger/warning announce as role="alert").
export function Alert({ tone = 'info', title, children, onClose, role }) {
  const Icon = ICONS[tone] ?? Info
  return (
    <div className={`va-alert va-alert-${tone}`} role={role ?? (tone === 'danger' || tone === 'warning' ? 'alert' : 'status')}>
      <Icon size={18} aria-hidden="true" />
      <div>
        {title && <div className="va-alert-title">{title}</div>}
        {children && <div>{children}</div>}
      </div>
      {onClose && (
        <button type="button" className="va-alert-close" onClick={onClose} aria-label="Dismiss">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// toasts = [{ id, tone, title, message }]; pair with hooks/useToasts.
export function ToastViewport({ toasts = [], onDismiss }) {
  return (
    <div className="va-toasts" aria-live="polite">
      {toasts.map((t) => (
        <Alert key={t.id} tone={t.tone} title={t.title} role="status" onClose={() => onDismiss?.(t.id)}>
          {t.message}
        </Alert>
      ))}
    </div>
  )
}

export default Alert
