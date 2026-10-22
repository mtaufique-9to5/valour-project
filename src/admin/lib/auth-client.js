'use client'
// Browser client for the admin auth endpoints (POST /api/admin/auth/{action}/).
// The trailing slash matches next.config.mjs (trailingSlash: true), so no redirect happens.
// Cookies are HttpOnly and set by the server; this module never sees a token.
// Every call resolves to { ok, status, data } and never throws.

async function call(action, body = {}) {
  try {
    const res = await fetch(`/api/admin/auth/${action}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      body: JSON.stringify(body),
    })
    let data = {}
    try { data = await res.json() } catch { /* empty body */ }
    return { ok: res.ok, status: res.status, data }
  } catch {
    return { ok: false, status: 0, data: { error: 'The server could not be reached. Please try again.' } }
  }
}

export const signIn = ({ email, password }) => call('login', { email, password })
export const verifyTotp = ({ code }) => call('mfa-verify', { code })
export const startMfaSetup = () => call('mfa-setup-start')
export const confirmMfaSetup = ({ enrolment, code }) => call('mfa-setup-confirm', { enrolment, code })
export const signOut = () => call('logout')
export const requestPasswordReset = ({ email }) => call('forgot-password', { email })
export const resetPassword = ({ token, password }) => call('reset-password', { token, password })
