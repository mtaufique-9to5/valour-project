import { requirePagePermission } from '@/server/admin/context'
import { requireAdmin } from '@/server/auth/guards'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { loadAdminRoleIds } from '@/server/auth/admin-roles'
import { listAdminUsers } from '@/server/auth/admin-management'
import AdminUsersClient from '@/admin/client/AdminUsersClient'

// Staff = users whose role has admin access. Invited users have no password
// until they use their set-password link; MFA is enrolled at first sign-in.
export default async function AdminUsersPage() {
  await requirePagePermission(PERMISSIONS.ADMIN_USER_VIEW)
  const { user } = await requireAdmin()
  const ids = await loadAdminRoleIds(db)
  const [users, roles] = await Promise.all([
    listAdminUsers(db, ids),
    db.role.findMany({ where: { deletedAt: null }, orderBy: { id: 'asc' }, select: { id: true, name: true } }),
  ])
  const rows = users.map((u) => ({
    ...u,
    status: !u.active ? 'Suspended' : !u.passwordSet ? 'Invited' : 'Active',
    lastLogin: 'Not recorded',
  }))
  const roleOptions = roles.map((r) => ({ id: String(r.id), name: ids.has(String(r.id)) ? `${r.name} (admin)` : r.name }))
  return <AdminUsersClient users={rows} roles={roleOptions} selfId={user.id} />
}
