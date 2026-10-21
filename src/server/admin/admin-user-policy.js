// Who may change which administrator. Pure module: every admin-user action
// (update, suspend, MFA reset, role change, delete) must call
// assertAdminUserChange before writing, inside the same transaction that loads
// the counts, so the decision and the write see the same data.
//
// Rules:
// 1. The actor needs admin_user.manage.
// 2. Only a SUPER_ADMIN may act on an account that holds SUPER_ADMIN, or grant
//    or remove the SUPER_ADMIN role.
// 3. The last ACTIVE SUPER_ADMIN can never be disabled, deleted or lose the
//    SUPER_ADMIN role (whoever asks, including themselves).

export const ADMIN_USER_ACTIONS = Object.freeze({
  UPDATE: 'update',
  SUSPEND: 'suspend',
  RESET_MFA: 'reset_mfa',
  DELETE: 'delete',
  SET_ROLES: 'set_roles',
})

const SUPER = 'SUPER_ADMIN'
const REMOVES_ACTIVE_SUPER = new Set([ADMIN_USER_ACTIONS.SUSPEND, ADMIN_USER_ACTIONS.DELETE])

/**
 * @param {object} p
 * @param {{ permissions: string[], roles: string[] }} p.actor
 * @param {{ roles: string[], status: string }} p.target
 * @param {string} p.action one of ADMIN_USER_ACTIONS
 * @param {string[]} [p.newRoles] for SET_ROLES: the target's complete new role list
 * @param {number} p.activeSuperAdminCount ACTIVE accounts holding SUPER_ADMIN (including target)
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function checkAdminUserChange({ actor, target, action, newRoles, activeSuperAdminCount }) {
  if (!Object.values(ADMIN_USER_ACTIONS).includes(action)) return { ok: false, reason: 'unknown_action' }
  if (!actor?.permissions?.includes('admin_user.manage')) return { ok: false, reason: 'forbidden' }

  const actorIsSuper = actor.roles?.includes(SUPER) === true
  const targetIsSuper = target?.roles?.includes(SUPER) === true
  const grantsSuper = action === ADMIN_USER_ACTIONS.SET_ROLES && newRoles?.includes(SUPER) === true

  if ((targetIsSuper || grantsSuper) && !actorIsSuper) return { ok: false, reason: 'super_admin_only' }

  if (targetIsSuper && target.status === 'ACTIVE' && activeSuperAdminCount <= 1) {
    const losesSuper = action === ADMIN_USER_ACTIONS.SET_ROLES && !(newRoles ?? []).includes(SUPER)
    if (REMOVES_ACTIVE_SUPER.has(action) || losesSuper) return { ok: false, reason: 'last_super_admin' }
  }
  return { ok: true }
}

export const ADMIN_USER_CHANGE_MESSAGES = Object.freeze({
  forbidden: 'You do not have permission to manage administrators.',
  super_admin_only: 'Only a super administrator can change a super administrator.',
  last_super_admin: 'The last active super administrator cannot be disabled, deleted or lose that role.',
  unknown_action: 'This action is not available.',
})
