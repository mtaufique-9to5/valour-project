export default function PageHeader({ eyebrow, title, description, actions, badge }) {
  return (
    <header className="va-page-header">
      <div className="va-page-header-text">
        {eyebrow && <p className="va-eyebrow">{eyebrow}</p>}
        <div className="va-row">
          <h1 className="va-page-title">{title}</h1>
          {badge}
        </div>
        {description && <p className="va-page-desc">{description}</p>}
      </div>
      {actions && <div className="va-page-actions">{actions}</div>}
    </header>
  )
}
