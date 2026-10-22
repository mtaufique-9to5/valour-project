import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { requireAdmin, ACCESS_DENIED_PATH } from '@/server/auth/guards'
import { ALL_PERMISSION_KEYS, isKnownPermission } from '@/server/rbac/permissions'

// The signed-in, MFA-complete administrator for this request. Cached per request
// so the layout and the page share one lookup. Redirects (via requireAdmin) when
// there is no valid session. Revision 3 has no per-role permissions: an
// authorised admin role grants every admin permission key.
export const getAdminContext = cache(async () => {
  const { user } = await requireAdmin()
  return {
    user: { id: user.id, name: user.name || user.email, email: user.email, role: user.roleName || 'Administrator' },
    permissions: [...ALL_PERMISSION_KEYS],
  }
})

// Page-level check (deny by default for unknown keys). Returns the admin context.
export async function requirePagePermission(key) {
  const ctx = await getAdminContext()
  if (!isKnownPermission(key) || !ctx.permissions.includes(key)) redirect(`${ACCESS_DENIED_PATH}?permission=${encodeURIComponent(key)}`)
  return ctx
}
