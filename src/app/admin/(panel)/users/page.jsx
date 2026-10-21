import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { adminRoleModel } from '@/server/rbac/models'
import AdminUsersView from '@/admin/views/AdminUsersView'

const fmt = (d) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : null)

// Read-only list. Inviting, suspending and MFA resets come with admin_user.manage
// actions (server-side, audit-logged) in a later batch.
export default async function AdminUsersPage() {
  await requirePagePermission(PERMISSIONS.ADMIN_USER_VIEW)
  const [users, roles] = await Promise.all([
    db.adminUser.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, status: true, twoFactorEnabled: true,
        roles: { select: { role: { select: { name: true } } } },
        sessions: { select: { createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    adminRoleModel(db).findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true } }),
  ])
  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.roles.map((r) => r.role.name).join(', ') || 'No role',
    status: u.status === 'ACTIVE' ? 'Active' : 'Suspended',
    mfa: u.twoFactorEnabled === true,
    lastLogin: fmt(u.sessions[0]?.createdAt),
  }))
  return <AdminUsersView users={rows} roles={roles} />
}
