import { requirePagePermission } from '@/server/admin/context'
import { requireAdmin } from '@/server/auth/guards'
import { PERMISSIONS } from '@/server/rbac/permissions'
import { db } from '@/server/db'
import { listRoles } from '@/server/auth/admin-management'
import RolesClient from '@/admin/client/RolesClient'

export default async function AdminRolesPage() {
  await requirePagePermission(PERMISSIONS.ROLE_VIEW)
  const { user } = await requireAdmin()
  return <RolesClient roles={await listRoles(db)} ownRoleId={user.roleId} />
}
