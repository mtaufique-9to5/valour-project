import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { db } from '@/server/db'
import { requireAdmin, ACCESS_DENIED_PATH } from '@/server/auth/guards'
import { getUserPermissions } from '@/server/rbac/check'
import { isKnownPermission } from '@/server/rbac/permissions'

// The signed-in, MFA-complete administrator for this request, with their
// permission keys and role names. Cached per request so the layout and the page
// share one lookup. Redirects (via requireAdmin) when there is no valid session.
export const getAdminContext = cache(async () => {
  const { user } = await requireAdmin()
  const [permissions, assignments] = await Promise.all([
    getUserPermissions(user.id),
    db.adminUserRole.findMany({ where: { userId: user.id }, select: { role: { select: { name: true } } } }),
  ])
  return {
    user: { id: user.id, name: user.name, email: user.email, role: assignments.map((a) => a.role.name).join(', ') || 'No role' },
    permissions: [...permissions],
  }
})

// Page-level permission check (deny by default). Returns the admin context.
export async function requirePagePermission(key) {
  const ctx = await getAdminContext()
  if (!isKnownPermission(key) || !ctx.permissions.includes(key)) redirect(`${ACCESS_DENIED_PATH}?permission=${encodeURIComponent(key)}`)
  return ctx
}
