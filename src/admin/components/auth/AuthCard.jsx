import '../../styles/admin.css'

// Centered card used by every auth screen. `wide` for the MFA setup flow.
export default function AuthCard({ title, subtitle, wide = false, children }) {
  return (
    <div className="va-admin">
      <main className="va-auth">
        <div className={`va-auth-card${wide ? ' va-wide' : ''}`}>
          <div className="va-auth-brand">
            <span className="va-brand-mark">VALOUR</span>
          </div>
          <h1 className="va-auth-title">{title}</h1>
          {subtitle && <p className="va-auth-sub">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}
