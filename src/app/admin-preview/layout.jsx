import { notFound } from 'next/navigation'

// Development-only design preview of the admin UI (mock data, no API/DB).
// Delete this whole folder at milestone M2.
export default function AdminPreviewLayout({ children }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <title>Admin design preview</title>
      {children}
    </>
  )
}
