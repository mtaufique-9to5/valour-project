// TOTP (RFC 6238: HMAC-SHA1, 6 digits, 30-second steps) — compatible with
// Google Authenticator, Microsoft Authenticator, 1Password, Authy. Pure.
import { createHmac, randomBytes } from 'node:crypto'
import { safeEqual } from './tokens.js'

export const STEP_SECONDS = 30
export const DIGITS = 6
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf) {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(str) {
  const clean = String(str).toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  let bits = 0
  let value = 0
  const out = []
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch)
    if (idx === -1) throw new RangeError('invalid base32')
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

/** New random secret: 20 bytes (160 bits, RFC 4226 recommendation), base32. */
export function generateTotpSecret() {
  return base32Encode(randomBytes(20))
}

export function stepAt(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / STEP_SECONDS)
}

export function totpCode(secretBase32, step) {
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(step))
  const mac = createHmac('sha1', base32Decode(secretBase32)).update(counter).digest()
  const offset = mac[mac.length - 1] & 0x0f
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]
  return String(bin % 10 ** DIGITS).padStart(DIGITS, '0')
}

/**
 * Check `code` against the current step and one step either side (clock drift).
 * Returns the matching step number (for replay protection) or null.
 */
export function verifyTotp(secretBase32, code, { now = Date.now(), window = 1 } = {}) {
  const c = String(code ?? '').replace(/\s+/g, '')
  if (!/^\d{6}$/.test(c)) return null
  const current = stepAt(now)
  let matched = null
  // Check every candidate (no early exit) so timing does not reveal which step matched.
  for (let s = current - window; s <= current + window; s++) {
    if (safeEqual(totpCode(secretBase32, s), c) && matched === null) matched = s
  }
  return matched
}

export function otpauthUri({ issuer, account, secret }) {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const q = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: String(DIGITS), period: String(STEP_SECONDS) })
  return `otpauth://totp/${label}?${q}`
}
