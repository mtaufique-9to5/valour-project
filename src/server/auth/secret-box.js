// Encryption of TOTP secrets at rest (users.two_factor_secret, R3-2). Pure.
// AES-256-GCM with a key derived from the app secret; format "v1.<iv>.<tag>.<ciphertext>".
// A database dump alone therefore never reveals an administrator's TOTP secret.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { deriveKey } from './tokens.js'

const PURPOSE = 'totp-secret-encryption'

export function encryptSecret(plaintext, appSecret) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', deriveKey(appSecret, PURPOSE), iv)
  const ct = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.')
}

/** Returns the plaintext, or null if the value is missing, malformed or tampered with. */
export function decryptSecret(boxed, appSecret) {
  if (typeof boxed !== 'string') return null
  const [v, iv, tag, ct] = boxed.split('.')
  if (v !== 'v1' || !iv || !tag || !ct) return null
  try {
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(appSecret, PURPOSE), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
