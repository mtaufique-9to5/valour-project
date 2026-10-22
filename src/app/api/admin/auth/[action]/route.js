// POST /api/admin/auth/{action} — admin sign-in, MFA, sign-out and password reset.
// CSRF: same-origin check against APP_URL + JSON body required + SameSite=Strict
// cookies. Responses never reveal whether an email exists. No secret, token or
// password is ever logged or returned except the one-time enrolment data the
// signed-in user needs to set up their authenticator.
import { NextResponse, after } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/server/db.js'
import { getAuthConfig } from '@/server/auth/env.js'
import { cookieName, setAuthCookie, clearAuthCookies } from '@/server/auth/cookies.js'
import { isSameOriginRequest } from '@/server/catalog/image-rules.js'
import { isCommerceError as isAuthError } from '@/server/commerce/errors.js'
import {
  login, verifyMfa, startMfaSetup, confirmMfaSetup, createPasswordReset, resetPassword, RESET_TTL_S,
} from '@/server/auth/service.js'
import { sendMail, passwordResetMessage } from '@/server/auth/mailer.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }
const json = (body, status = 200) => NextResponse.json(body, { status, headers: NO_STORE })
const STATUS = { rate_limited: 429, locked: 429, invalid_credentials: 401, invalid_code: 401, expired: 401, invalid_link: 400, weak_password: 422 }
const FORGOT_MESSAGE = 'If that address belongs to an administrator, a reset link has been sent. It expires in 15 minutes.'

const clientIp = (request) => request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'local'

export async function POST(request, { params }) {
  const config = getAuthConfig()
  if (!isSameOriginRequest(request.headers, config.appUrl)) return json({ error: 'Forbidden' }, 403)
  if (!String(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return json({ error: 'Expected JSON' }, 415)
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request' }, 400)
  }
  const { action } = await params
  const jar = await cookies()
  const cookie = (kind) => jar.get(cookieName(kind, config.secure))?.value

  try {
    switch (action) {
      case 'login': {
        const r = await login(db, { email: body.email, password: body.password, ip: clientIp(request) }, config)
        const res = json({ ok: true, next: r.next === 'mfa-verify' ? '/admin/mfa-verify' : '/admin/mfa-setup' })
        setAuthCookie(res, r.next === 'mfa-verify' ? 'mfa-pending' : 'mfa-setup', r.token, { secure: config.secure, maxAge: r.ttl })
        return res
      }
      case 'mfa-verify': {
        const r = await verifyMfa(db, { pendingToken: cookie('mfa-pending'), code: body.code }, config)
        const res = json({ ok: true, next: '/admin' })
        setAuthCookie(res, 'session', r.token, { secure: config.secure, maxAge: r.ttl })
        return res
      }
      case 'mfa-setup-start': {
        const r = await startMfaSetup(db, { setupToken: cookie('mfa-setup') }, config)
        return json({ ok: true, otpauthUri: r.otpauthUri, secret: r.secret, enrolment: r.enrolment })
      }
      case 'mfa-setup-confirm': {
        const r = await confirmMfaSetup(db, { setupToken: cookie('mfa-setup'), enrolment: body.enrolment, code: body.code }, config)
        const res = json({ ok: true, next: '/admin' })
        setAuthCookie(res, 'session', r.token, { secure: config.secure, maxAge: r.ttl })
        return res
      }
      case 'logout': {
        const res = json({ ok: true, next: '/admin/login' })
        clearAuthCookies(res, config.secure)
        return res
      }
      case 'forgot-password': {
        const r = await createPasswordReset(db, { email: body.email, ip: clientIp(request) }, config)
        if (r) {
          const msg = passwordResetMessage({ firstName: r.user.firstName, link: r.link, minutes: RESET_TTL_S / 60 })
          // Sent after the response so its timing never reveals that the address exists.
          after(() => sendMail({ to: r.user.email, ...msg }))
        }
        return json({ ok: true, message: FORGOT_MESSAGE })
      }
      case 'reset-password': {
        await resetPassword(db, { token: body.token, password: body.password }, config)
        const res = json({ ok: true, next: '/admin/login', message: 'Your password has been changed. Sign in with the new password and your authenticator code.' })
        clearAuthCookies(res, config.secure)
        return res
      }
      default:
        return json({ error: 'Not found' }, 404)
    }
  } catch (e) {
    if (isAuthError(e)) return json({ error: e.message, code: e.code }, STATUS[e.code] ?? 400)
    console.error(`[auth] ${action} failed`)
    return json({ error: 'Something went wrong. Please try again.' }, 500)
  }
}
