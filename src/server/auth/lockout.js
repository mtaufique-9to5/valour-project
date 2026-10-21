// Password lockout policy (pure; no database access).

export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000

/** One message for every sign-in refusal, so responses never reveal whether an account exists. */
export const GENERIC_SIGN_IN_ERROR = 'Invalid email or password'

function toTime(value) {
  if (!value) return null
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime()
  return Number.isFinite(t) ? t : null
}

/** Is the account currently locked? */
export function isLocked(user, now = new Date()) {
  const until = toTime(user?.lockedUntil)
  return until !== null && until > now.getTime()
}

/**
 * Should a sign-in attempt be refused before the password is checked?
 * Unknown users are not blocked here (Better Auth returns the same generic error).
 * @returns {{ blocked: boolean, reason: 'disabled'|'locked'|null }}
 */
export function evaluateSignInAttempt(user, now = new Date()) {
  if (!user) return { blocked: false, reason: null }
  if (user.status !== 'ACTIVE') return { blocked: true, reason: 'disabled' }
  if (isLocked(user, now)) return { blocked: true, reason: 'locked' }
  return { blocked: false, reason: null }
}

/**
 * New counter state after a failed password. An expired lock starts a fresh count.
 * @returns {{ failedLoginCount: number, lockedUntil: Date|null, lockedNow: boolean }}
 */
export function nextFailureState(user, now = new Date()) {
  const until = toTime(user?.lockedUntil)
  const expired = until !== null && until <= now.getTime()
  const prev = expired ? 0 : Math.max(0, Number(user?.failedLoginCount) || 0)
  const failedLoginCount = prev + 1
  if (failedLoginCount >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginCount,
      lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS),
      lockedNow: true,
    }
  }
  return { failedLoginCount, lockedUntil: null, lockedNow: false }
}

/** Counter state after a correct password. */
export function successState() {
  return { failedLoginCount: 0, lockedUntil: null }
}

/** Normalise an email from a request body for lookups. */
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}
