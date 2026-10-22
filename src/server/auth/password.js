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

export const MIN_PASSWORD_LENGTH = 12
export const MAX_PASSWORD_LENGTH = 128
const COMMON = new Set(['password1234', 'passwordpassword', '123456789012', 'qwertyuiopas', 'adminadmin12', 'valourvalour', 'welcome12345'])

/** Problems with a new admin password (empty array = acceptable). */
export function passwordProblems(password, { email } = {}) {
  const problems = []
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) problems.push(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  else if (password.length > MAX_PASSWORD_LENGTH) problems.push(`Use at most ${MAX_PASSWORD_LENGTH} characters.`)
  else {
    const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length
    if (classes < 3) problems.push('Mix at least three of: lower-case, upper-case, digits, symbols.')
    if (COMMON.has(password.toLowerCase()) || /^(.)\1+$/.test(password)) problems.push('This password is too common.')
    const local = typeof email === 'string' ? email.split('@')[0].toLowerCase() : ''
    if (local.length >= 4 && password.toLowerCase().includes(local)) problems.push('The password must not contain your email name.')
  }
  return problems
}
