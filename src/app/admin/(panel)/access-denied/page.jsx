import Link from 'next/link'
import AccessDeniedView from '@/admin/views/AccessDeniedView'
import { isKnownPermission } from '@/server/rbac/permissions'

// Signed-in (the panel layout guarantees it) but lacking a page's permission.
export default async function AdminAccessDeniedPage({ searchParams }) {
  const { permission } = await searchParams
  return <AccessDeniedView permission={isKnownPermission(permission) ? permission : undefined} homeHref="/admin" linkComponent={Link} />
}
