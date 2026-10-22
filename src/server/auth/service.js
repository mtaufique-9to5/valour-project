// Admin authentication flows on Revision 3 `users` / `roles` (no session table).
// Every function takes the Prisma client `db` and the auth config, so it can be
// unit-tested with a fake client. No function logs or returns secrets.
//
// Flow:
//   password ok, MFA on   -> 'mfa-pending' token (5 min)  -> verifyMfa -> session
//   password ok, MFA off  -> 'mfa-setup' token (30 min)   -> startMfaSetup / confirmMfaSetup -> session
// A session token carries the user's security fingerprint; changing password,
// role, status, deletion or MFA invalidates every session and reset link.
import { createHash, randomBytes } from 'node:crypto'
import { hashPassword, passwordProblems, verifyPassword } from './password.js'
import { signToken, verifyToken, securityFingerprint } from './tokens.js'
import { encryptSecret, decryptSecret } from './secret-box.js'
import { generateTotpSecret, otpauthUri, verifyTotp } from './totp.js'
import { limits } from './limits.js'
import { AuthError, loadAdminRoleIds } from './admin-roles.js'

export const SESSION_TTL_S = 8 * 60 * 60
export const PENDING_TTL_S = 5 * 60
export const SETUP_TTL_S = 30 * 60
export const RESET_TTL_S = 15 * 60
export const ISSUER = 'VALOUR Admin'

const USER_SELECT = {
  id: true, email: true, firstName: true, lastName: true, password: true, roleId: true, status: true, deletedAt: true,
  twoFactorEnabled: true, twoFactorSecret: true, role: { select: { name: true, deletedAt: true } },
}

const nowS = (now) => Math.floor(now / 1000)
const keyOf = (s) => createHash('sha256').update(String(s).toLowerCase()).digest('hex').slice(0, 32)
// A real argon2id hash of random bytes, made once per process: verifying against
// it costs the same time as a real account, so response time does not reveal
// whether an email exists.
let dummyHash
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(32).toString('hex')))

export const normalizeEmail = (e) => (typeof e === 'string' ? e.trim().toLowerCase() : '')

export async function loadUser(db, id) {
  try {
    return await db.user.findUnique({ where: { id: BigInt(id) }, select: USER_SELECT })
  } catch {
    return null
  }
}

/** Account may use the admin at all (ignores MFA state). */
function eligible(user, adminRoleIds) {
  return Boolean(user && user.status && !user.deletedAt && user.password && !user.role?.deletedAt && adminRoleIds.has(String(user.roleId)))
}

function issue(user, purpose, ttl, { secret }, now) {
  return signToken({ uid: String(user.id), fp: securityFingerprint(user, secret), iat: nowS(now), exp: nowS(now) + ttl }, { secret, purpose })
}

/** Validate a token of `purpose` and re-check the user against the database. */
export async function resolveToken(db, token, purpose, config, { now = Date.now(), requireMfa } = {}) {
  const payload = verifyToken(token, { secret: config.secret, purpose, now })
  if (!payload?.uid) return null
  const user = await loadUser(db, payload.uid)
  if (!user || payload.fp !== securityFingerprint(user, config.secret)) return null
  const adminRoleIds = await loadAdminRoleIds(db)
  if (!eligible(user, adminRoleIds)) return null
  if (requireMfa === true && !user.twoFactorEnabled) return null
  if (requireMfa === false && user.twoFactorEnabled) return null
  return { user, payload }
}

/** Step 1: email + password. Always the same error for unknown email, wrong password, disabled or non-admin account. */
export async function login(db, { email, password, ip }, config, now = Date.now()) {
  const addr = normalizeEmail(email)
  if (!limits.loginPerIp.hit(keyOf(ip ?? 'unknown'), now)) throw new AuthError('rate_limited', 'Too many attempts. Please wait a few minutes.')
  const lockKey = keyOf(addr)
  if (limits.loginLockout.lockedUntil(lockKey, now)) throw new AuthError('locked', 'Too many attempts. Please wait 15 minutes and try again.')
  const user = addr ? await db.user.findUnique({ where: { email: addr }, select: USER_SELECT }) : null
  const passwordOk = await verifyPassword({ hash: user?.password ?? (await getDummyHash()), password: String(password ?? '') })
  const adminRoleIds = await loadAdminRoleIds(db)
  if (!passwordOk || !eligible(user, adminRoleIds)) {
    limits.loginLockout.fail(lockKey, now)
    throw new AuthError('invalid_credentials', 'Invalid email or password.')
  }
  limits.loginLockout.succeed(lockKey)
  return user.twoFactorEnabled
    ? { next: 'mfa-verify', token: issue(user, 'mfa-pending', PENDING_TTL_S, config, now), ttl: PENDING_TTL_S }
    : { next: 'mfa-setup', token: issue(user, 'mfa-setup', SETUP_TTL_S, config, now), ttl: SETUP_TTL_S }
}

/** Step 2 for enrolled admins: TOTP code -> full session. */
export async function verifyMfa(db, { pendingToken, code }, config, now = Date.now()) {
  const found = await resolveToken(db, pendingToken, 'mfa-pending', config, { now, requireMfa: true })
  if (!found) throw new AuthError('expired', 'Your sign-in has expired. Please sign in again.')
  const { user } = found
  const key = String(user.id)
  if (limits.mfaPerUser.lockedUntil(key, now)) throw new AuthError('locked', 'Too many attempts. Please wait 15 minutes and try again.')
  const secret = decryptSecret(user.twoFactorSecret, config.secret)
  const step = secret ? verifyTotp(secret, code, { now }) : null
  if (step === null || !limits.totpReplay.use(key, step, now)) {
    limits.mfaPerUser.fail(key, now)
    throw new AuthError('invalid_code', 'That code is not valid.')
  }
  limits.mfaPerUser.succeed(key)
  return { token: issue(user, 'session', SESSION_TTL_S, config, now), ttl: SESSION_TTL_S }
}

/**
 * Enrolment, step A: new secret for the QR code. The secret is returned inside a
 * signed, short-lived token (never stored until confirmed) and as the otpauth URI.
 */
export async function startMfaSetup(db, { setupToken }, config, now = Date.now()) {
  const found = await resolveToken(db, setupToken, 'mfa-setup', config, { now, requireMfa: false })
  if (!found) throw new AuthError('expired', 'Your sign-in has expired. Please sign in again.')
  const secret = generateTotpSecret()
  const enrolment = signToken({ uid: String(found.user.id), s: encryptSecret(secret, config.secret), exp: nowS(now) + 10 * 60 }, { secret: config.secret, purpose: 'mfa-enrolment' })
  return { otpauthUri: otpauthUri({ issuer: ISSUER, account: found.user.email, secret }), secret, enrolment }
}

/** Enrolment, step B: first valid code turns MFA on and starts the session. */
export async function confirmMfaSetup(db, { setupToken, enrolment, code }, config, now = Date.now()) {
  const found = await resolveToken(db, setupToken, 'mfa-setup', config, { now, requireMfa: false })
  const pending = verifyToken(enrolment, { secret: config.secret, purpose: 'mfa-enrolment', now })
  if (!found || !pending || pending.uid !== String(found.user.id)) throw new AuthError('expired', 'Setup has expired. Please sign in again.')
  const key = String(found.user.id)
  if (limits.mfaPerUser.lockedUntil(key, now)) throw new AuthError('locked', 'Too many attempts. Please wait 15 minutes and try again.')
  const secret = decryptSecret(pending.s, config.secret)
  const step = secret ? verifyTotp(secret, code, { now }) : null
  if (step === null || !limits.totpReplay.use(key, step, now)) {
    limits.mfaPerUser.fail(key, now)
    throw new AuthError('invalid_code', 'That code is not valid. Check your authenticator app and try again.')
  }
  // Only enable if still disabled (no concurrent enrolment overwrote it).
  const updated = await db.user.updateMany({
    where: { id: found.user.id, twoFactorEnabled: false },
    data: { twoFactorEnabled: true, twoFactorSecret: encryptSecret(secret, config.secret) },
  })
  if (updated.count !== 1) throw new AuthError('expired', 'Setup has expired. Please sign in again.')
  limits.mfaPerUser.succeed(key)
  const user = await loadUser(db, found.user.id)
  return { token: issue(user, 'session', SESSION_TTL_S, config, now), ttl: SESSION_TTL_S }
}

/**
 * Forgot password: returns { user, link } only for an eligible admin, otherwise
 * null. The caller always shows the same message (no email enumeration).
 * The link's token is signed, expires in 15 minutes and is bound to the current
 * password hash, so it stops working after one successful reset.
 */
export async function createPasswordReset(db, { email, ip }, config, now = Date.now()) {
  const addr = normalizeEmail(email)
  const ipOk = limits.resetPerIp.hit(keyOf(ip ?? 'unknown'), now)
  const emailOk = limits.resetPerEmail.hit(keyOf(addr), now)
  if (!ipOk || !emailOk || !addr) return null
  const user = await db.user.findUnique({ where: { email: addr }, select: USER_SELECT })
  const adminRoleIds = await loadAdminRoleIds(db)
  // Admins invited without a password yet may also use the link to set one.
  const allowed = user && user.status && !user.deletedAt && !user.role?.deletedAt && adminRoleIds.has(String(user.roleId))
  if (!allowed) return null
  const token = signToken({ uid: String(user.id), fp: securityFingerprint(user, config.secret), exp: nowS(now) + RESET_TTL_S }, { secret: config.secret, purpose: 'password-reset' })
  return { user, link: `${config.appUrl}/admin/reset-password?token=${encodeURIComponent(token)}` }
}

/** Validate a reset token without using it (for showing the form). */
export async function checkResetToken(db, token, config, now = Date.now()) {
  const payload = verifyToken(token, { secret: config.secret, purpose: 'password-reset', now })
  if (!payload?.uid) return null
  const user = await loadUser(db, payload.uid)
  if (!user || payload.fp !== securityFingerprint(user, config.secret)) return null
  return user
}

/**
 * Set the new password. The UPDATE is guarded on the old hash, so two
 * concurrent uses of the same link cannot both succeed. MFA is untouched:
 * the next sign-in still asks for the TOTP code.
 */
export async function resetPassword(db, { token, password }, config, now = Date.now()) {
  const user = await checkResetToken(db, token, config, now)
  if (!user) throw new AuthError('invalid_link', 'This link is invalid or has expired. Request a new one.')
  const problems = passwordProblems(password, { email: user.email })
  if (problems.length) throw new AuthError('weak_password', problems.join(' '))
  const updated = await db.user.updateMany({ where: { id: user.id, password: user.password }, data: { password: await hashPassword(password) } })
  if (updated.count !== 1) throw new AuthError('invalid_link', 'This link is invalid or has expired. Request a new one.')
  limits.loginLockout.succeed(keyOf(user.email))
}
