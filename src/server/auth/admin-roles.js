// Which roles may enter the admin panel (owner decision, option A).
// Revision 3 `roles` has no access column, so the authorised role ids are kept in
// one protected general_settings row, key `admin_role_ids`, value a JSON array of
// role ids. It starts empty: a new role never gets admin access by itself, and
// the `Customer` role can never be added. Only the guarded role-management
// service changes it (the generic settings editor must skip RESERVED_SETTING_KEYS).
import { CommerceError as AuthError } from '../commerce/errors.js'

export const ADMIN_ROLE_SETTING = 'admin_role_ids'
export const CUSTOMER_ROLE = 'Customer'
export const RESERVED_SETTING_KEYS = Object.freeze([ADMIN_ROLE_SETTING])
export { AuthError }

/** Setting value -> Set of role id strings. Malformed values grant nothing. */
export function parseAdminRoleIds(value) {
  try {
    const list = JSON.parse(value ?? '[]')
    if (!Array.isArray(list)) return new Set()
    return new Set(list.map(String).filter((id) => /^[1-9]\d{0,19}$/.test(id)))
  } catch {
    return new Set()
  }
}

export const serializeAdminRoleIds = (ids) => JSON.stringify([...ids].map(String).sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1)))

export async function loadAdminRoleIds(client) {
  const row = await client.generalSetting.findUnique({ where: { key: ADMIN_ROLE_SETTING }, select: { value: true } })
  return parseAdminRoleIds(row?.value)
}

/**
 * Lock the setting row for the rest of the transaction; every change that can
 * add or remove admin access takes this lock first, so two concurrent changes
 * can never both remove "the last" administrator.
 */
export async function lockAdminRoleIds(tx) {
  const rows = await tx.$queryRaw`SELECT value FROM general_settings WHERE \`key\` = ${ADMIN_ROLE_SETTING} FOR UPDATE`
  if (!rows.length) throw new AuthError('admin_access_not_configured', 'Admin access is not configured. Run the first-admin setup.')
  return parseAdminRoleIds(rows[0].value)
}

export async function saveAdminRoleIds(tx, ids) {
  await tx.generalSetting.update({ where: { key: ADMIN_ROLE_SETTING }, data: { value: serializeAdminRoleIds(ids) } })
}

/** A user who can actually sign in to the admin: active, not deleted, password set, MFA on, admin role. */
export function isUsableAdmin(user, adminRoleIds) {
  return Boolean(user && user.status && !user.deletedAt && user.password && user.twoFactorEnabled && adminRoleIds.has(String(user.roleId)))
}

/** Number of usable admins, optionally pretending some change has happened (for "would this lock everyone out?"). */
export async function countUsableAdmins(tx, adminRoleIds, { excludeUserId } = {}) {
  if (!adminRoleIds.size) return 0
  return tx.user.count({
    where: {
      roleId: { in: [...adminRoleIds].map((id) => BigInt(id)) },
      status: true,
      deletedAt: null,
      twoFactorEnabled: true,
      password: { not: null },
      ...(excludeUserId != null ? { id: { not: BigInt(excludeUserId) } } : {}),
    },
  })
}
