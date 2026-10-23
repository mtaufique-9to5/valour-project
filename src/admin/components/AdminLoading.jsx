import { LoaderCircle } from 'lucide-react'

// Admin page loading state: a small spinner with "Loading...", centred in the
// page area (the sidebar and header stay visible). It fades in after a short CSS
// delay, so fast navigations never flash it; reduced-motion users get a static
// icon (see the prefers-reduced-motion rule in admin.css).
export default function AdminLoading({ label = 'Loading...' }) {
  return (
    <div className="va-page-loading" role="status" aria-live="polite">
      <LoaderCircle size={28} className="va-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
