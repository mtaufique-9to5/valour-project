// Session guards for admin server components, server actions and route handlers.
// Every admin page must call requireAdmin()/requirePermission(); the MFA setup
// page alone uses requireAdminAllowingMfaSetup().
import 'server-only'
import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from './auth.js'
import { db } from '../db.js'
import { hasPermission } from '../rbac/check.js'
import { isKnownPermission } from '../rbac/permissions.js'

export const LOGIN_PATH = '/admin/login'
export const MFA_SETUP_PATH = '/admin/mfa-setup'
export const ACCESS_DENIED_PATH = '/admin/access-denied'

/**
 * Current admin session or null. Pass request headers in route handlers;
 * defaults to next/headers.
 * @returns {Promise<{ session: object, user: object } | null>}
 */
export async function getAdminSession(requestHeaders) {
  const h = requestHeaders ?? (await nextHeaders())
  try {
    return (await auth.api.getSession({ headers: h })) ?? null
  } catch {
    return null
  }
}

// Revoke every session of a disabled account.
async function revokeAllSessions(userId) {
  try {
    await db.adminSession.deleteMany({ where: { userId } })
  } catch {
    console.error('[auth] failed to revoke sessions of a disabled admin')
  }
}

/** 'ok' | 'none' | 'disabled' | 'mfa_required' */
function sessionState(result) {
  if (!result?.user || !result?.session) return 'none'
  if (result.user.status !== 'ACTIVE') return 'disabled'
  if (result.user.twoFactorEnabled !== true) return 'mfa_required'
  return 'ok'
}

/** Signed-in admin with MFA enabled; redirects otherwise. */
export async function requireAdmin() {
  const result = await getAdminSession()
  const state = sessionState(result)
  if (state === 'none') redirect(LOGIN_PATH)
  if (state === 'disabled') {
    await revokeAllSessions(result.user.id)
    redirect(LOGIN_PATH)
  }
  if (state === 'mfa_required') redirect(MFA_SETUP_PATH)
  return result
}

/** For the MFA setup page only: signed in and active, MFA not yet required. */
export async function requireAdminAllowingMfaSetup() {
  const result = await getAdminSession()
  const state = sessionState(result)
  if (state === 'none') redirect(LOGIN_PATH)
  if (state === 'disabled') {
    await revokeAllSessions(result.user.id)
    redirect(LOGIN_PATH)
  }
  return result
}

/** requireAdmin() plus a permission check (deny by default). */
export async function requirePermission(key) {
  const result = await requireAdmin()
  if (!isKnownPermission(key) || !(await hasPermission(result.user.id, key))) {
    redirect(ACCESS_DENIED_PATH)
  }
  return result
}

/**
 * Route-handler variant: never redirects.
 * @param {Request} request
 * @param {string} [permissionKey]
 * @returns {Promise<{ ok: true, session: object, user: object } | { ok: false, response: Response }>}
 */
export async function requireAdminApi(request, permissionKey) {
  const result = await getAdminSession(request?.headers)
  const state = sessionState(result)
  if (state === 'none') return deny(401, 'Unauthorized')
  if (state === 'disabled') {
    await revokeAllSessions(result.user.id)
    return deny(401, 'Unauthorized')
  }
  if (state === 'mfa_required') return deny(403, 'MFA enrollment required')
  if (permissionKey !== undefined) {
    if (!isKnownPermission(permissionKey) || !(await hasPermission(result.user.id, permissionKey))) {
      return deny(403, 'Forbidden')
    }
  }
  return { ok: true, session: result.session, user: result.user }
}

function deny(status, error) {
  return {
    ok: false,
    response: Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } }),
  }
}
