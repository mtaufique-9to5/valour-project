// Signed, self-contained tokens (pure; no DB, no server-only import so tests and
// CLI scripts can load it). Format: base64url(JSON payload) "." base64url(HMAC).
// Every purpose ('session', 'mfa-pending', 'password-reset', ...) signs with its
// own key derived from the app secret, so a token for one purpose can never be
// replayed as another. Tokens are never stored anywhere.
import { createHmac, hkdfSync, timingSafeEqual } from 'node:crypto'

const keyCache = new Map()

/** 32-byte key for `purpose`, derived from the app secret with HKDF-SHA256. */
export function deriveKey(secret, purpose) {
  const id = `${purpose}\u0000${secret}`
  let key = keyCache.get(id)
  if (!key) {
    key = Buffer.from(hkdfSync('sha256', Buffer.from(secret, 'utf8'), Buffer.from('valour-auth-v1'), Buffer.from(purpose, 'utf8'), 32))
    keyCache.set(id, key)
  }
  return key
}

const b64 = (buf) => Buffer.from(buf).toString('base64url')

/** Sign `payload` (a JSON-serialisable object) for `purpose`. */
export function signToken(payload, { secret, purpose }) {
  const body = b64(JSON.stringify(payload))
  const mac = createHmac('sha256', deriveKey(secret, purpose)).update(body).digest()
  return `${body}.${b64(mac)}`
}

/**
 * Verify a token's signature and expiry (`exp`, seconds since epoch).
 * Returns the payload, or null for anything malformed, forged or expired.
 */
export function verifyToken(token, { secret, purpose, now = Date.now() }) {
  if (typeof token !== 'string' || token.length > 4096) return null
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null
  const expected = createHmac('sha256', deriveKey(secret, purpose)).update(parts[0]).digest()
  let given
  try {
    given = Buffer.from(parts[1], 'base64url')
  } catch {
    return null
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  let payload
  try {
    payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!payload || typeof payload !== 'object' || !Number.isInteger(payload.exp)) return null
  if (payload.exp * 1000 <= now) return null
  return payload
}

/** Constant-time comparison of two strings. */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

/**
 * Fingerprint of everything that decides whether a user may hold a session.
 * Changing the password, role, status, deletion or MFA state changes it, which
 * invalidates every session and every outstanding password-reset link at once.
 */
export function securityFingerprint(user, secret) {
  const parts = [
    String(user.id), user.password ?? '', String(user.roleId), user.status ? '1' : '0',
    user.deletedAt ? new Date(user.deletedAt).toISOString() : '', user.twoFactorEnabled ? '1' : '0', user.twoFactorSecret ?? '',
  ]
  return createHmac('sha256', deriveKey(secret, 'fingerprint')).update(parts.join('\u0000')).digest('base64url').slice(0, 32)
}
