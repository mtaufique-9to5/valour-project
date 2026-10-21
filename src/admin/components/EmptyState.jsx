import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="va-empty">
      <span className="va-empty-icon" aria-hidden="true"><Icon size={24} /></span>
      <h3 className="va-empty-title">{title}</h3>
      {description && <p className="va-empty-desc">{description}</p>}
      {action}
    </div>
  )
}
