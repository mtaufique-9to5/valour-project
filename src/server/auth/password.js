// Argon2id password hashing (OWASP minimum: m=19 MiB, t=2, p=1).
// No server-only import so the first-admin CLI can use it.
import { hash, verify } from '@node-rs/argon2'

// @node-rs/argon2 Algorithm.Argon2id (const enum in its typings) = 2
const ARGON2ID = 2

export const ARGON2_OPTIONS = Object.freeze({
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
})

export function hashPassword(password) {
  return hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword({ hash: stored, password }) {
  if (typeof stored !== 'string' || !stored.startsWith('$argon2id$')) return false
  try {
    return await verify(stored, password)
  } catch {
    return false
  }
}
