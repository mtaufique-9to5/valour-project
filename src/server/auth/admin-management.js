// Role and admin-user management (dynamic RBAC on Revision 3 `roles` / `users`).
// Server-side rules, enforced here and not just in the UI:
//  - new roles get no admin access; access is granted explicitly (admin_role_ids)
//  - the `Customer` role can never get admin access, be renamed or be deactivated
//  - an admin cannot change their own role, deactivate themselves, reset their own
//    MFA here, or remove admin access from their own role
//  - no change may leave zero usable admins (active, password set, MFA on, admin role)
// Every function runs inside the caller's transaction `tx`; the ones that can
// remove admin access lock the admin_role_ids row first (lockAdminRoleIds).
import { ADMIN_ROLE_SETTING, AuthError, CUSTOMER_ROLE, countUsableAdmins, isUsableAdmin, lockAdminRoleIds, parseAdminRoleIds, saveAdminRoleIds } from './admin-roles.js'
import { normalizeEmail } from './service.js'

const ROLE_NAME_RE = /^[\p{L}\p{N}][\p{L}\p{N} &_.-]{0,99}$/u
const isCustomer = (role) => role?.name === CUSTOMER_ROLE

function cleanRoleName(name) {
  const n = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : ''
  if (!ROLE_NAME_RE.test(n)) throw new AuthError('invalid_name', 'Use 1–100 letters, digits, spaces or & _ . -')
  return n
}

const uniqueError = (e, message) => (e?.code === 'P2002' ? new AuthError('duplicate', message) : e)

async function getRole(tx, id) {
  const role = await tx.role.findUnique({ where: { id: BigInt(id) }, select: { id: true, name: true, deletedAt: true } })
  if (!role) throw new AuthError('not_found', 'Role not found.')
  return role
}

async function getUser(tx, id) {
  const user = await tx.user.findUnique({
    where: { id: BigInt(id) },
    select: { id: true, email: true, roleId: true, status: true, deletedAt: true, password: true, twoFactorEnabled: true },
  })
  if (!user) throw new AuthError('not_found', 'User not found.')
  return user
}

const same = (a, b) => String(a) === String(b)

/** Throws unless at least one usable admin remains after removing `excludeUserId` (or with `ids`). */
async function assertAdminsRemain(tx, ids, excludeUserId) {
  if ((await countUsableAdmins(tx, ids, { excludeUserId })) < 1) {
    throw new AuthError('last_admin', 'This would leave no active administrator with two-factor authentication.')
  }
}

// ---- roles --------------------------------------------------------------

export async function listRoles(db) {
  const [roles, setting] = await Promise.all([
    db.role.findMany({ orderBy: { id: 'asc' }, select: { id: true, name: true, deletedAt: true, createdAt: true, _count: { select: { users: true } } } }),
    db.generalSetting.findUnique({ where: { key: ADMIN_ROLE_SETTING }, select: { value: true } }),
  ])
  const ids = parseAdminRoleIds(setting?.value)
  return roles.map((r) => ({
    id: String(r.id), name: r.name, active: !r.deletedAt, users: r._count.users,
    adminAccess: ids.has(String(r.id)), builtIn: r.name === CUSTOMER_ROLE, createdAt: r.createdAt.toISOString(),
  }))
}

/** New roles never get admin access. */
export async function createRole(tx, { name }) {
  const clean = cleanRoleName(name)
  try {
    const role = await tx.role.create({ data: { name: clean }, select: { id: true } })
    return String(role.id)
  } catch (e) {
    throw uniqueError(e, 'A role with this name already exists (including deactivated roles).')
  }
}

export async function renameRole(tx, id, { name }) {
  const role = await getRole(tx, id)
  if (isCustomer(role)) throw new AuthError('protected_role', 'The Customer role is built in and cannot be renamed.')
  const clean = cleanRoleName(name)
  if (clean === CUSTOMER_ROLE) throw new AuthError('protected_role', 'That name is reserved.')
  try {
    await tx.role.update({ where: { id: role.id }, data: { name: clean } })
  } catch (e) {
    throw uniqueError(e, 'A role with this name already exists (including deactivated roles).')
  }
}

export async function setRoleAdminAccess(tx, id, enabled, actor) {
  const ids = await lockAdminRoleIds(tx)
  const role = await getRole(tx, id)
  const key = String(role.id)
  if (enabled) {
    if (isCustomer(role)) throw new AuthError('protected_role', 'The Customer role can never have admin access.')
    if (role.deletedAt) throw new AuthError('inactive_role', 'Reactivate the role first.')
    if (ids.has(key)) return
    ids.add(key)
  } else {
    if (!ids.has(key)) return
    if (same(actor.roleId, role.id)) throw new AuthError('own_role', 'You cannot remove admin access from your own role. Ask another administrator.')
    ids.delete(key)
    await assertAdminsRemain(tx, ids)
  }
  await saveAdminRoleIds(tx, ids)
}

/** Deactivate = soft delete; blocked while any user still has the role (schema rule). */
export async function deactivateRole(tx, id, actor) {
  const ids = await lockAdminRoleIds(tx)
  const role = await getRole(tx, id)
  if (isCustomer(role)) throw new AuthError('protected_role', 'The Customer role is built in and cannot be deactivated.')
  if (role.deletedAt) return
  if (same(actor.roleId, role.id)) throw new AuthError('own_role', 'You cannot deactivate your own role.')
  if ((await tx.user.count({ where: { roleId: role.id } })) > 0) throw new AuthError('in_use', 'Move the users of this role to another role first.')
  ids.delete(String(role.id))
  await saveAdminRoleIds(tx, ids)
  await tx.role.update({ where: { id: role.id }, data: { deletedAt: new Date() } })
}

/** Reactivated roles come back WITHOUT admin access. */
export async function reactivateRole(tx, id) {
  const role = await getRole(tx, id)
  if (!role.deletedAt) return
  await tx.role.update({ where: { id: role.id }, data: { deletedAt: null } })
}

// ---- admin users --------------------------------------------------------

export async function listAdminUsers(db, adminRoleIds) {
  const users = await db.user.findMany({
    where: { roleId: { in: [...adminRoleIds].map((x) => BigInt(x)) } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, firstName: true, lastName: true, email: true, status: true, deletedAt: true, twoFactorEnabled: true, password: true, createdAt: true, role: { select: { id: true, name: true } } },
  })
  return users.map((u) => ({
    id: String(u.id), name: [u.firstName, u.lastName].filter(Boolean).join(' '), email: u.email,
    roleId: String(u.role.id), role: u.role.name, active: u.status && !u.deletedAt, mfa: u.twoFactorEnabled,
    passwordSet: Boolean(u.password), createdAt: u.createdAt.toISOString(),
  }))
}

/**
 * Invite an administrator: creates the user without a password; the caller then
 * emails a set-password link. An email that already belongs to a customer is
 * refused rather than silently promoted.
 */
export async function createAdminUser(tx, { firstName, lastName, email, roleId }) {
  const ids = await lockAdminRoleIds(tx)
  const role = await getRole(tx, roleId)
  if (!ids.has(String(role.id)) || role.deletedAt) throw new AuthError('not_admin_role', 'Choose an active role that has admin access.')
  const addr = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) || addr.length > 255) throw new AuthError('invalid_email', 'Enter a valid email address.')
  const first = String(firstName ?? '').trim()
  if (!first || first.length > 100) throw new AuthError('invalid_name', 'Enter a first name (up to 100 characters).')
  const last = String(lastName ?? '').trim().slice(0, 100) || null
  try {
    const user = await tx.user.create({ data: { email: addr, firstName: first, lastName: last, roleId: role.id, password: null, status: true }, select: { id: true } })
    return String(user.id)
  } catch (e) {
    throw uniqueError(e, 'This email is already used by another account.')
  }
}

export async function changeUserRole(tx, userId, roleId, actor) {
  if (same(actor.id, userId)) throw new AuthError('self', 'You cannot change your own role.')
  const ids = await lockAdminRoleIds(tx)
  const user = await getUser(tx, userId)
  const role = await getRole(tx, roleId)
  if (role.deletedAt) throw new AuthError('inactive_role', 'Choose an active role.')
  if (same(user.roleId, role.id)) return
  if (isUsableAdmin(user, ids) && !ids.has(String(role.id))) await assertAdminsRemain(tx, ids, user.id)
  await tx.user.update({ where: { id: user.id }, data: { roleId: role.id } })
}

export async function setUserActive(tx, userId, active, actor) {
  if (!active && same(actor.id, userId)) throw new AuthError('self', 'You cannot deactivate your own account.')
  const ids = await lockAdminRoleIds(tx)
  const user = await getUser(tx, userId)
  if (!active && isUsableAdmin(user, ids)) await assertAdminsRemain(tx, ids, user.id)
  await tx.user.update({ where: { id: user.id }, data: { status: Boolean(active) } })
}

/** Another admin clears a user's MFA; they must enrol again at next sign-in. */
export async function resetUserMfa(tx, userId, actor) {
  if (same(actor.id, userId)) throw new AuthError('self', 'Use account recovery to reset your own two-factor authentication.')
  const ids = await lockAdminRoleIds(tx)
  const user = await getUser(tx, userId)
  if (isUsableAdmin(user, ids)) await assertAdminsRemain(tx, ids, user.id)
  await tx.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } })
}
