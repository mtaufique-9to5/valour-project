// Admin auth cookies: HttpOnly, SameSite=Strict, Path=/, Secure in production
// (https). With Secure, names use the __Host- prefix, which browsers only accept
// from a secure origin, without Domain and with Path=/ — so a sibling subdomain
// cannot plant or overwrite them (session fixation).
import 'server-only'

const BASE = { session: 'valour_admin', 'mfa-pending': 'valour_admin_mfa', 'mfa-setup': 'valour_admin_setup' }

export const cookieName = (kind, secure) => (secure ? `__Host-${BASE[kind]}` : BASE[kind])

export function cookieOptions(secure, maxAge) {
  return { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge }
}

/** Set one auth cookie on a NextResponse and clear the other two (a new stage replaces the old). */
export function setAuthCookie(response, kind, token, { secure, maxAge }) {
  for (const k of Object.keys(BASE)) {
    if (k === kind) response.cookies.set(cookieName(k, secure), token, cookieOptions(secure, maxAge))
    else response.cookies.set(cookieName(k, secure), '', cookieOptions(secure, 0))
  }
}

export function clearAuthCookies(response, secure) {
  for (const k of Object.keys(BASE)) response.cookies.set(cookieName(k, secure), '', cookieOptions(secure, 0))
}
