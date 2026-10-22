// Session guards for admin server components, server actions and route handlers.
// Every admin page must call requireAdmin()/requirePermission(); the MFA pages use
// getPendingMfa()/getMfaSetup(). The session is a signed cookie re-checked against
// the database on every request: user active and not deleted, role authorised in
// admin_role_ids, MFA enabled, and security fingerprint unchanged.
import 'server-only'
import { cookies as nextCookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { db } from '../db.js'
import { getAuthConfig } from './env.js'
import { cookieName } from './cookies.js'
import { resolveToken } from './service.js'
import { isKnownPermission } from '../rbac/permissions.js'

export const LOGIN_PATH = '/admin/login'
export const MFA_SETUP_PATH = '/admin/mfa-setup'
export const MFA_VERIFY_PATH = '/admin/mfa-verify'
export const ACCESS_DENIED_PATH = '/admin/access-denied'

const toUser = (u) => ({
  id: String(u.id),
  email: u.email,
  name: [u.firstName, u.lastName].filter(Boolean).join(' '),
  roleId: String(u.roleId),
  roleName: u.role?.name ?? '',
  twoFactorEnabled: u.twoFactorEnabled,
})

function cookieFrom(source, name) {
  if (source?.get) return source.get(name)?.value // next/headers cookies() or request.cookies
  const header = source?.headers?.get?.('cookie') ?? ''
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim())
  }
  return undefined
}

async function resolve(kind, requireMfa, source) {
  const config = getAuthConfig()
  const jar = source ?? (await nextCookies())
  const token = cookieFrom(jar, cookieName(kind, config.secure))
  if (!token) return null
  try {
    const found = await resolveToken(db, token, kind, config, { requireMfa })
    return found ? { user: toUser(found.user) } : null
  } catch {
    return null
  }
}

/** Fully signed-in admin (MFA complete) or null. Pass a Request in route handlers. */
export const getAdminSession = (request) => resolve('session', true, request)
/** Password accepted, waiting for the TOTP code. */
export const getPendingMfa = () => resolve('mfa-pending', true)
/** Password accepted, MFA not yet enrolled. */
export const getMfaSetup = () => resolve('mfa-setup', false)

/** Signed-in admin with MFA enabled; redirects to the login page otherwise. */
export async function requireAdmin() {
  const result = await getAdminSession()
  if (!result) redirect(LOGIN_PATH)
  return result
}

/**
 * requireAdmin() plus a known permission key. Revision 3 has no per-role
 * permissions: every authorised admin role has full admin access, so the key is
 * only validated (unknown keys are denied by default).
 */
export async function requirePermission(key) {
  const result = await requireAdmin()
  if (!isKnownPermission(key)) redirect(ACCESS_DENIED_PATH)
  return result
}

/**
 * Route-handler variant: never redirects.
 * @returns {Promise<{ ok: true, user: object } | { ok: false, response: Response }>}
 */
export async function requireAdminApi(request, permissionKey) {
  const result = await getAdminSession(request)
  if (!result) return deny(401, 'Unauthorized')
  if (permissionKey !== undefined && !isKnownPermission(permissionKey)) return deny(403, 'Forbidden')
  return { ok: true, user: result.user }
}

function deny(status, error) {
  return {
    ok: false,
    response: Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } }),
  }
}
