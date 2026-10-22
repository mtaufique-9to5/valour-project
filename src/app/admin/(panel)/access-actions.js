'use server'
// Server actions for role and admin-user management. Next.js rejects
// cross-origin server-action calls; each action also re-checks the admin session
// itself (never trusting the page that rendered the form) and runs the guarded
// service inside one transaction. Results are { ok, error } for the UI.
import { revalidatePath } from 'next/cache'
import { db } from '@/server/db'
import { getAdminSession } from '@/server/auth/guards'
import { getAuthConfig } from '@/server/auth/env'
import { isCommerceError as isAuthError } from '@/server/commerce/errors'
import { createPasswordReset, RESET_TTL_S } from '@/server/auth/service'
import { sendMail, passwordResetMessage } from '@/server/auth/mailer'
import {
  createRole, renameRole, setRoleAdminAccess, deactivateRole, reactivateRole,
  createAdminUser, changeUserRole, setUserActive, resetUserMfa,
} from '@/server/auth/admin-management'

async function guarded(fn, paths) {
  const session = await getAdminSession()
  if (!session) return { ok: false, error: 'Your session has ended. Please sign in again.' }
  try {
    const value = await db.$transaction((tx) => fn(tx, session.user), { timeout: 15_000 })
    for (const p of paths) revalidatePath(p)
    return { ok: true, value }
  } catch (e) {
    if (isAuthError(e)) return { ok: false, error: e.message }
    console.error('[access] action failed')
    return { ok: false, error: 'Something went wrong. Please try again.' }
  }
}

const ROLES = ['/admin/roles', '/admin/users']
const USERS = ['/admin/users']

export const createRoleAction = async (name) => guarded((tx) => createRole(tx, { name }), ROLES)
export const renameRoleAction = async (id, name) => guarded((tx) => renameRole(tx, id, { name }), ROLES)
export const setRoleAdminAccessAction = async (id, enabled) => guarded((tx, me) => setRoleAdminAccess(tx, id, Boolean(enabled), me), ROLES)
export const deactivateRoleAction = async (id) => guarded((tx, me) => deactivateRole(tx, id, me), ROLES)
export const reactivateRoleAction = async (id) => guarded((tx) => reactivateRole(tx, id), ROLES)

export const changeUserRoleAction = async (userId, roleId) => guarded((tx, me) => changeUserRole(tx, userId, roleId, me), USERS)
export const setUserActiveAction = async (userId, active) => guarded((tx, me) => setUserActive(tx, userId, Boolean(active), me), USERS)
export const resetUserMfaAction = async (userId) => guarded((tx, me) => resetUserMfa(tx, userId, me), USERS)

/** Invite: create the user without a password, then email a set-password link (15 minutes). */
export async function inviteAdminAction({ name, email, roleId }) {
  const [firstName, ...rest] = String(name ?? '').trim().split(/\s+/)
  const result = await guarded((tx) => createAdminUser(tx, { firstName: firstName || String(email ?? '').split('@')[0], lastName: rest.join(' '), email, roleId }), USERS)
  if (!result.ok) return result
  const reset = await createPasswordReset(db, { email, ip: 'admin-invite' }, getAuthConfig()).catch(() => null)
  const sent = reset ? await sendMail({ to: reset.user.email, ...passwordResetMessage({ firstName: reset.user.firstName, link: reset.link, minutes: RESET_TTL_S / 60 }) }) : false
  return { ok: true, emailSent: sent }
}
