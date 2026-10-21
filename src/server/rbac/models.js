// Prisma delegates for the admin RBAC tables, across the SC-1 rename cutover.
// Before the replacement migration the models are Role / Permission /
// RolePermission (tables roles, permissions, role_permissions). After it they
// are AdminRole / AdminPermission / AdminRolePermission (admin_* tables), and
// `db.role` becomes the WEBSITE roles table, so the admin delegate is always
// preferred when it exists. Remove this module once the cutover is final.
// Pure module (no server-only import) so CLI scripts and tests can load it.

function pick(client, adminName, legacyName) {
  const delegate = client[adminName] ?? client[legacyName]
  if (!delegate) throw new Error(`Prisma client has neither ${adminName} nor ${legacyName}`)
  return delegate
}

export const adminRoleModel = (client) => pick(client, 'adminRole', 'role')
export const adminPermissionModel = (client) => pick(client, 'adminPermission', 'permission')
export const adminRolePermissionModel = (client) => pick(client, 'adminRolePermission', 'rolePermission')
