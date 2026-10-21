import { requirePagePermission } from '@/server/admin/context'
import { PERMISSIONS, PERMISSION_DESCRIPTIONS, ALL_PERMISSION_KEYS } from '@/server/rbac/permissions'
import { ROLE_DEFINITIONS } from '@/server/rbac/roles'
import RolesView from '@/admin/views/RolesView'

const GROUPS = {
  dashboard: 'Overview', product: 'Catalog', inventory: 'Catalog', order: 'Sales', customer: 'Sales',
  content: 'Content', admin_user: 'Administration', role: 'Administration', audit: 'Administration', settings: 'Administration',
}

// Read-only role matrix, taken from the same definitions the RBAC seed uses.
export default async function AdminRolesPage() {
  await requirePagePermission(PERMISSIONS.ROLE_VIEW)
  const roles = Object.entries(ROLE_DEFINITIONS).map(([key, r]) => ({ id: key, name: r.name, description: r.description, permissions: r.permissions }))
  const permissions = ALL_PERMISSION_KEYS.map((key) => ({ key, group: GROUPS[key.split('.')[0]] || 'Other', label: PERMISSION_DESCRIPTIONS[key] || key }))
  return <RolesView roles={roles} permissions={permissions} />
}
