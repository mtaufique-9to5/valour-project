// Permission checks against the database (AdminUserRole -> Role ->
// RolePermission -> Permission). Deny by default: unknown keys, missing users,
// and database errors all deny.
import 'server-only'
import { isKnownPermission } from './permissions.js'

async function defaultClient() {
  return (await import('../db.js')).db
}

/**
 * Load the permission keys held by an admin user.
 * @param {string} userId
 * @param {object} [client] Prisma client or transaction (injected in tests)
 * @returns {Promise<Set<string>>}
 */
export async function getUserPermissions(userId, client) {
  if (typeof userId !== 'string' || userId === '') return new Set()
  const db = client ?? (await defaultClient())
  const rows = await db.adminUserRole.findMany({
    where: { userId },
    select: {
      role: { select: { permissions: { select: { permission: { select: { key: true } } } } } },
    },
  })
  const keys = new Set()
  for (const row of rows) {
    for (const rp of row.role?.permissions ?? []) {
      const key = rp.permission?.key
      if (isKnownPermission(key)) keys.add(key)
    }
  }
  return keys
}

/**
 * @param {string} userId
 * @param {string} key permission key from PERMISSIONS
 * @param {object} [client]
 * @returns {Promise<boolean>}
 */
export async function hasPermission(userId, key, client) {
  if (!isKnownPermission(key)) return false
  try {
    return (await getUserPermissions(userId, client)).has(key)
  } catch {
    return false
  }
}
