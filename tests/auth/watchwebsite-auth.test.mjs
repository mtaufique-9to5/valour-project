// Authentication and dynamic RBAC for watchwebsite (Revision 3), against a fake
// database. Run with: node --conditions=react-server --test tests/auth/
import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

import { signToken, verifyToken, securityFingerprint, safeEqual } from '../../src/server/auth/tokens.js'
import { encryptSecret, decryptSecret } from '../../src/server/auth/secret-box.js'
import { base32Encode, base32Decode, totpCode, verifyTotp, stepAt, otpauthUri, generateTotpSecret } from '../../src/server/auth/totp.js'
import { SlidingWindow, Lockout, ReplayGuard, limits } from '../../src/server/auth/limits.js'
import { hashPassword, passwordProblems } from '../../src/server/auth/password.js'
import { getAuthConfig } from '../../src/server/auth/env.js'
import { parseAdminRoleIds, serializeAdminRoleIds, isUsableAdmin } from '../../src/server/auth/admin-roles.js'
import {
  login, verifyMfa, startMfaSetup, confirmMfaSetup, createPasswordReset, checkResetToken, resetPassword, resolveToken,
} from '../../src/server/auth/service.js'
import {
  createRole, renameRole, setRoleAdminAccess, deactivateRole, createAdminUser, changeUserRole, setUserActive, resetUserMfa,
} from '../../src/server/auth/admin-management.js'

const SECRET = 'x'.repeat(48)
const CONFIG = { secret: SECRET, appUrl: 'http://localhost:3000', secure: false }
const T0 = Date.UTC(2026, 9, 22, 12, 0, 0)
const code = (fn) => fn.then(() => assert.fail('expected rejection'), (e) => e.code)

// ---- in-memory fake of the Prisma client for users / roles / general_settings ----
function fakeDb({ users = [], roles = [], adminRoleIds = null } = {}) {
  const state = {
    users: users.map((u) => ({ status: true, deletedAt: null, twoFactorEnabled: false, twoFactorSecret: null, lastName: null, ...u })),
    roles: roles.map((r) => ({ deletedAt: null, ...r })),
    setting: adminRoleIds === null ? null : { key: 'admin_role_ids', value: JSON.stringify(adminRoleIds) },
  }
  const roleOf = (u) => state.roles.find((r) => r.id === u.roleId)
  const withRole = (u) => (u ? { ...u, role: roleOf(u) ? { name: roleOf(u).name, deletedAt: roleOf(u).deletedAt } : null } : null)
  const match = (u, where) => Object.entries(where).every(([k, v]) => {
    if (k === 'roleId' && v?.in) return v.in.some((x) => x === u.roleId)
    if (k === 'id' && v && typeof v === 'object' && 'not' in v) return u.id !== v.not
    if (k === 'password' && v && typeof v === 'object' && 'not' in v) return u.password !== null
    return u[k] === v
  })
  let nextId = 100n
  const db = {
    state,
    user: {
      findUnique: async ({ where }) => withRole(state.users.find((u) => (where.id !== undefined ? u.id === where.id : u.email === where.email)) ?? null),
      count: async ({ where }) => state.users.filter((u) => match(u, where)).length,
      create: async ({ data }) => {
        if (state.users.some((u) => u.email === data.email)) { const e = new Error('dup'); e.code = 'P2002'; throw e }
        const u = { id: nextId++, status: true, deletedAt: null, twoFactorEnabled: false, twoFactorSecret: null, lastName: null, ...data }
        state.users.push(u)
        return u
      },
      update: async ({ where, data }) => Object.assign(state.users.find((u) => u.id === where.id), data),
      updateMany: async ({ where, data }) => {
        const hits = state.users.filter((u) => match(u, where))
        hits.forEach((u) => Object.assign(u, data))
        return { count: hits.length }
      },
    },
    role: {
      findUnique: async ({ where }) => state.roles.find((r) => (where.id !== undefined ? r.id === where.id : r.name === where.name)) ?? null,
      create: async ({ data }) => {
        if (state.roles.some((r) => r.name === data.name)) { const e = new Error('dup'); e.code = 'P2002'; throw e }
        const r = { id: nextId++, deletedAt: null, ...data }
        state.roles.push(r)
        return r
      },
      update: async ({ where, data }) => {
        if (data.name && state.roles.some((r) => r.name === data.name && r.id !== where.id)) { const e = new Error('dup'); e.code = 'P2002'; throw e }
        return Object.assign(state.roles.find((r) => r.id === where.id), data)
      },
    },
    generalSetting: {
      findUnique: async () => (state.setting ? { value: state.setting.value } : null),
      update: async ({ data }) => { state.setting.value = data.value; return state.setting },
    },
    $queryRaw: async () => (state.setting ? [{ value: state.setting.value }] : []),
  }
  return db
}

let PW_HASH
const TOTP_SECRET = 'JBSWY3DPEHPK3PXP'
async function world(over = {}) {
  PW_HASH ??= await hashPassword('Correct-Horse-9!')
  return fakeDb({
    roles: [{ id: 1n, name: 'Customer' }, { id: 2n, name: 'Administrator' }, { id: 3n, name: 'Editor' }],
    users: [
      { id: 10n, email: 'owner@valour.test', firstName: 'Owner', roleId: 2n, password: PW_HASH, twoFactorEnabled: true, twoFactorSecret: encryptSecret(TOTP_SECRET, SECRET) },
      { id: 11n, email: 'shopper@valour.test', firstName: 'Shopper', roleId: 1n, password: null },
      { id: 12n, email: 'editor@valour.test', firstName: 'Ed', roleId: 3n, password: PW_HASH },
    ],
    adminRoleIds: ['2'],
    ...over,
  })
}

function resetLimits() {
  for (const l of Object.values(limits)) {
    if (l.hits) l.hits.clear()
    if (l.state) l.state.clear()
    if (l.used) l.used.clear()
  }
}
beforeEach(resetLimits)

// ---------------------------------------------------------------------------

describe('tokens', () => {
  test('round trip; tampering, wrong secret, wrong purpose and expiry all fail', () => {
    const t = signToken({ uid: '1', exp: T0 / 1000 + 60 }, { secret: SECRET, purpose: 'session' })
    assert.equal(verifyToken(t, { secret: SECRET, purpose: 'session', now: T0 }).uid, '1')
    assert.equal(verifyToken(t, { secret: SECRET, purpose: 'password-reset', now: T0 }), null)
    assert.equal(verifyToken(t, { secret: 'y'.repeat(48), purpose: 'session', now: T0 }), null)
    assert.equal(verifyToken(t, { secret: SECRET, purpose: 'session', now: T0 + 61_000 }), null)
    const [body, mac] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ uid: '2', exp: T0 / 1000 + 60 })).toString('base64url')
    assert.equal(verifyToken(`${forged}.${mac}`, { secret: SECRET, purpose: 'session', now: T0 }), null)
    assert.equal(verifyToken(`${body}.`, { secret: SECRET, purpose: 'session', now: T0 }), null)
    assert.equal(verifyToken('garbage', { secret: SECRET, purpose: 'session', now: T0 }), null)
    assert.ok(safeEqual('abc', 'abc') && !safeEqual('abc', 'abd'))
  })
  test('fingerprint changes with password, role, status, deletion and MFA', () => {
    const u = { id: 1n, password: 'h', roleId: 2n, status: true, deletedAt: null, twoFactorEnabled: true, twoFactorSecret: 's' }
    const fp = securityFingerprint(u, SECRET)
    for (const change of [{ password: 'h2' }, { roleId: 3n }, { status: false }, { deletedAt: new Date() }, { twoFactorEnabled: false }, { twoFactorSecret: 's2' }]) {
      assert.notEqual(securityFingerprint({ ...u, ...change }, SECRET), fp)
    }
    assert.equal(securityFingerprint({ ...u }, SECRET), fp)
  })
})

describe('TOTP secret encryption', () => {
  test('round trip, random IV, tamper detection', () => {
    const a = encryptSecret(TOTP_SECRET, SECRET)
    assert.notEqual(a, encryptSecret(TOTP_SECRET, SECRET))
    assert.ok(!a.includes(TOTP_SECRET))
    assert.equal(decryptSecret(a, SECRET), TOTP_SECRET)
    const parts = a.split('.')
    parts[3] = Buffer.from('tampered').toString('base64url')
    assert.equal(decryptSecret(parts.join('.'), SECRET), null)
    assert.equal(decryptSecret(a, 'z'.repeat(48)), null)
    assert.equal(decryptSecret(null, SECRET), null)
  })
})

describe('TOTP (RFC 6238)', () => {
  test('RFC 6238 SHA-1 test vectors (8-digit values, last 6 digits)', () => {
    const secret = base32Encode(Buffer.from('12345678901234567890'))
    assert.equal(totpCode(secret, Math.floor(59 / 30)), '287082')
    assert.equal(totpCode(secret, Math.floor(1111111109 / 30)), '081804')
    assert.equal(totpCode(secret, Math.floor(1234567890 / 30)), '005924')
    assert.equal(totpCode(secret, Math.floor(2000000000 / 30)), '279037')
  })
  test('accepts ±1 step, rejects older codes and malformed input', () => {
    const now = T0
    const c = totpCode(TOTP_SECRET, stepAt(now) - 1)
    assert.equal(verifyTotp(TOTP_SECRET, c, { now }), stepAt(now) - 1)
    assert.equal(verifyTotp(TOTP_SECRET, totpCode(TOTP_SECRET, stepAt(now) - 3), { now }), null)
    assert.equal(verifyTotp(TOTP_SECRET, '12345', { now }), null)
    assert.equal(verifyTotp(TOTP_SECRET, 'abcdef', { now }), null)
  })
  test('base32 round trip, 160-bit secrets, otpauth URI', () => {
    const s = generateTotpSecret()
    assert.equal(base32Decode(s).length, 20)
    assert.equal(base32Encode(base32Decode(s)), s)
    assert.match(otpauthUri({ issuer: 'VALOUR Admin', account: 'a@b.c', secret: s }), /^otpauth:\/\/totp\/VALOUR%20Admin%3Aa%40b\.c\?secret=/)
  })
})

describe('limits', () => {
  test('sliding window, lockout after 5 failures for 15 minutes, success resets', () => {
    const w = new SlidingWindow({ limit: 2, windowMs: 1000 })
    assert.ok(w.hit('k', 0) && w.hit('k', 1))
    assert.equal(w.hit('k', 2), false)
    assert.ok(w.hit('k', 1500))
    const l = new Lockout({ maxFailures: 5, lockMs: 15 * 60_000 })
    for (let i = 0; i < 4; i++) assert.equal(l.fail('a', i), null)
    assert.ok(l.fail('a', 5))
    assert.ok(l.lockedUntil('a', 10))
    assert.equal(l.lockedUntil('a', 15 * 60_000 + 6), null)
    l.fail('b', 0); l.succeed('b'); assert.equal(l.lockedUntil('b', 1), null)
  })
  test('a TOTP step can be used once per user', () => {
    const g = new ReplayGuard()
    assert.ok(g.use('1', 5, 0))
    assert.equal(g.use('1', 5, 1), false)
    assert.ok(g.use('2', 5, 1))
  })
})

describe('password policy and config', () => {
  test('length, character mix, common passwords, email name', () => {
    assert.deepEqual(passwordProblems('Correct-Horse-9!', { email: 'owner@valour.test' }), [])
    assert.ok(passwordProblems('Short1!').length)
    assert.ok(passwordProblems('alllowercaseletters').length)
    assert.ok(passwordProblems('password1234').length, 'common / too few character classes')
    assert.ok(passwordProblems('aaaaaaaaaaaaaaaa').length)
    assert.ok(passwordProblems('Owner-Strong-123', { email: 'owner@valour.test' }).length)
    assert.ok(passwordProblems('A'.repeat(129) + 'a1').length)
  })
  test('config needs a 32+ char secret and a URL; https or production means Secure cookies', () => {
    assert.throws(() => getAuthConfig({ AUTH_SECRET: 'short', APP_URL: 'http://x' }))
    assert.throws(() => getAuthConfig({ AUTH_SECRET: SECRET }))
    assert.equal(getAuthConfig({ AUTH_SECRET: SECRET, APP_URL: 'http://localhost:3000' }).secure, false)
    assert.equal(getAuthConfig({ AUTH_SECRET: SECRET, APP_URL: 'https://valour.example' }).secure, true)
    assert.equal(getAuthConfig({ AUTH_SECRET: SECRET, APP_URL: 'http://localhost:3000', NODE_ENV: 'production' }).secure, true)
    assert.equal(getAuthConfig({ BETTER_AUTH_SECRET: SECRET, BETTER_AUTH_URL: 'http://localhost:3000/x' }).appUrl, 'http://localhost:3000')
  })
})

describe('admin_role_ids setting', () => {
  test('parsing never grants access on bad data', () => {
    assert.deepEqual([...parseAdminRoleIds('["2","5"]')], ['2', '5'])
    assert.deepEqual([...parseAdminRoleIds('[2]')], ['2'])
    for (const bad of [null, '', 'oops', '{"a":1}', '["0"]', '["-1"]', '["1 OR 1=1"]']) assert.equal(parseAdminRoleIds(bad).size, 0)
    assert.equal(serializeAdminRoleIds(new Set(['10', '2'])), '["2","10"]')
  })
  test('usable admin = active, not deleted, password, MFA, admin role', () => {
    const ids = new Set(['2'])
    const u = { status: true, deletedAt: null, password: 'h', twoFactorEnabled: true, roleId: 2n }
    assert.ok(isUsableAdmin(u, ids))
    for (const change of [{ status: false }, { deletedAt: new Date() }, { password: null }, { twoFactorEnabled: false }, { roleId: 3n }]) {
      assert.equal(isUsableAdmin({ ...u, ...change }, ids), false)
    }
  })
})

describe('login and MFA', () => {
  test('admin with MFA: password -> pending token -> code -> session', async () => {
    const db = await world()
    const r = await login(db, { email: ' Owner@Valour.test ', password: 'Correct-Horse-9!', ip: '1.1.1.1' }, CONFIG, T0)
    assert.equal(r.next, 'mfa-verify')
    assert.equal(await resolveToken(db, r.token, 'session', CONFIG, { now: T0 }), null, 'a pending token is not a session')
    const s = await verifyMfa(db, { pendingToken: r.token, code: totpCode(TOTP_SECRET, stepAt(T0)) }, CONFIG, T0)
    const found = await resolveToken(db, s.token, 'session', CONFIG, { now: T0, requireMfa: true })
    assert.equal(found.user.email, 'owner@valour.test')
  })
  test('same generic error for unknown email, wrong password, customer and non-admin role', async () => {
    const db = await world()
    for (const [email, password] of [['nobody@valour.test', 'x'], ['owner@valour.test', 'wrong'], ['shopper@valour.test', ''], ['editor@valour.test', 'Correct-Horse-9!']]) {
      assert.equal(await code(login(db, { email, password, ip: `ip-${email}` }, CONFIG, T0)), 'invalid_credentials')
    }
  })
  test('lockout after 5 failures, even with the right password afterwards', async () => {
    const db = await world()
    for (let i = 0; i < 5; i++) await code(login(db, { email: 'owner@valour.test', password: 'bad', ip: `ip${i}` }, CONFIG, T0))
    assert.equal(await code(login(db, { email: 'owner@valour.test', password: 'Correct-Horse-9!', ip: 'ip9' }, CONFIG, T0)), 'locked')
  })
  test('a TOTP code cannot be replayed; wrong codes count toward lockout', async () => {
    const db = await world()
    const c = totpCode(TOTP_SECRET, stepAt(T0))
    const p1 = await login(db, { email: 'owner@valour.test', password: 'Correct-Horse-9!', ip: 'a' }, CONFIG, T0)
    await verifyMfa(db, { pendingToken: p1.token, code: c }, CONFIG, T0)
    const p2 = await login(db, { email: 'owner@valour.test', password: 'Correct-Horse-9!', ip: 'a' }, CONFIG, T0)
    assert.equal(await code(verifyMfa(db, { pendingToken: p2.token, code: c }, CONFIG, T0)), 'invalid_code')
    assert.equal(await code(verifyMfa(db, { pendingToken: 'forged', code: c }, CONFIG, T0)), 'expired')
  })
  test('first sign-in without MFA: setup token only; enrolment turns MFA on and encrypts the secret', async () => {
    const db = await world()
    db.state.users[0].twoFactorEnabled = false
    db.state.users[0].twoFactorSecret = null
    const r = await login(db, { email: 'owner@valour.test', password: 'Correct-Horse-9!', ip: 'a' }, CONFIG, T0)
    assert.equal(r.next, 'mfa-setup')
    assert.equal(await resolveToken(db, r.token, 'session', CONFIG, { now: T0, requireMfa: true }), null)
    const setup = await startMfaSetup(db, { setupToken: r.token }, CONFIG, T0)
    assert.equal(await code(confirmMfaSetup(db, { setupToken: r.token, enrolment: setup.enrolment, code: '000000' }, CONFIG, T0)), 'invalid_code')
    const s = await confirmMfaSetup(db, { setupToken: r.token, enrolment: setup.enrolment, code: totpCode(setup.secret, stepAt(T0)) }, CONFIG, T0)
    assert.equal(db.state.users[0].twoFactorEnabled, true)
    assert.notEqual(db.state.users[0].twoFactorSecret, setup.secret, 'stored encrypted')
    assert.equal(decryptSecret(db.state.users[0].twoFactorSecret, SECRET), setup.secret)
    assert.ok(await resolveToken(db, s.token, 'session', CONFIG, { now: T0, requireMfa: true }))
    assert.equal(await resolveToken(db, r.token, 'mfa-setup', CONFIG, { now: T0, requireMfa: false }), null, 'setup token dies once MFA is on')
  })
})

describe('session validation on every request', () => {
  async function signedIn() {
    resetLimits() // each world is a fresh sign-in; the replay guard is per process
    const db = await world()
    const p = await login(db, { email: 'owner@valour.test', password: 'Correct-Horse-9!', ip: 'a' }, CONFIG, T0)
    const s = await verifyMfa(db, { pendingToken: p.token, code: totpCode(TOTP_SECRET, stepAt(T0)) }, CONFIG, T0)
    return { db, token: s.token }
  }
  const valid = (db, token, now = T0) => resolveToken(db, token, 'session', CONFIG, { now, requireMfa: true })
  test('expires after 8 hours', async () => {
    const { db, token } = await signedIn()
    assert.ok(await valid(db, token, T0 + 8 * 3600_000 - 1000))
    assert.equal(await valid(db, token, T0 + 8 * 3600_000 + 1000), null)
  })
  test('revoked immediately by deactivation, role removal, role deletion, password change or MFA reset', async () => {
    for (const change of [
      (db) => { db.state.users[0].status = false },
      (db) => { db.state.setting.value = '[]' },
      (db) => { db.state.roles[1].deletedAt = new Date() },
      (db) => { db.state.users[0].password = 'other-hash' },
      (db) => { db.state.users[0].twoFactorEnabled = false },
      (db) => { db.state.users[0].roleId = 3n },
    ]) {
      const { db, token } = await signedIn()
      change(db)
      assert.equal(await valid(db, token), null)
    }
  })
})

describe('password reset', () => {
  test('link only for admins; same result shape otherwise; 15-minute expiry', async () => {
    const db = await world()
    assert.equal(await createPasswordReset(db, { email: 'nobody@valour.test', ip: 'a' }, CONFIG, T0), null)
    assert.equal(await createPasswordReset(db, { email: 'shopper@valour.test', ip: 'b' }, CONFIG, T0), null)
    const r = await createPasswordReset(db, { email: 'owner@valour.test', ip: 'c' }, CONFIG, T0)
    const token = new URL(r.link).searchParams.get('token')
    assert.ok(r.link.startsWith('http://localhost:3000/admin/reset-password?token='))
    assert.ok(await checkResetToken(db, token, CONFIG, T0 + 14 * 60_000))
    assert.equal(await checkResetToken(db, token, CONFIG, T0 + 16 * 60_000), null)
  })
  test('single use, invalidates sessions, keeps MFA, enforces password policy', async () => {
    const db = await world()
    const p = await login(db, { email: 'owner@valour.test', password: 'Correct-Horse-9!', ip: 'a' }, CONFIG, T0)
    const session = (await verifyMfa(db, { pendingToken: p.token, code: totpCode(TOTP_SECRET, stepAt(T0)) }, CONFIG, T0)).token
    const r = await createPasswordReset(db, { email: 'owner@valour.test', ip: 'c' }, CONFIG, T0)
    const token = new URL(r.link).searchParams.get('token')
    assert.equal(await code(resetPassword(db, { token, password: 'weak' }, CONFIG, T0)), 'weak_password')
    await resetPassword(db, { token, password: 'Brand-New-Pass-42' }, CONFIG, T0)
    assert.equal(await code(resetPassword(db, { token, password: 'Another-New-Pass-43' }, CONFIG, T0)), 'invalid_link', 'link is single-use')
    assert.equal(await resolveToken(db, session, 'session', CONFIG, { now: T0, requireMfa: true }), null, 'old sessions invalid')
    assert.equal(db.state.users[0].twoFactorEnabled, true, 'MFA untouched')
    const again = await login(db, { email: 'owner@valour.test', password: 'Brand-New-Pass-42', ip: 'a' }, CONFIG, T0)
    assert.equal(again.next, 'mfa-verify', 'new password still needs TOTP')
  })
  test('rate limited per email (3 per hour) without revealing it', async () => {
    const db = await world()
    for (let i = 0; i < 3; i++) assert.ok(await createPasswordReset(db, { email: 'owner@valour.test', ip: `x${i}` }, CONFIG, T0))
    assert.equal(await createPasswordReset(db, { email: 'owner@valour.test', ip: 'x9' }, CONFIG, T0), null)
  })
})

describe('dynamic roles and escalation safeguards', () => {
  const owner = { id: '10', roleId: '2' }
  test('new roles get no admin access; Customer can never get it', async () => {
    const db = await world()
    const id = await createRole(db, { name: 'Content team' })
    assert.deepEqual([...parseAdminRoleIds(db.state.setting.value)], ['2'])
    await setRoleAdminAccess(db, id, true, owner)
    assert.ok(parseAdminRoleIds(db.state.setting.value).has(id))
    assert.equal(await code(setRoleAdminAccess(db, 1n, true, owner)), 'protected_role')
    assert.equal(await code(renameRole(db, 1n, { name: 'Shoppers' }, owner)), 'protected_role')
    assert.equal(await code(deactivateRole(db, 1n, owner)), 'protected_role')
    assert.equal(await code(createRole(db, { name: 'Content team' })), 'duplicate')
    assert.equal(await code(createRole(db, { name: '<script>' })), 'invalid_name')
  })
  test('cannot remove access from own role, or from the last usable admin role', async () => {
    const db = await world()
    assert.equal(await code(setRoleAdminAccess(db, 2n, false, owner)), 'own_role')
    assert.equal(await code(setRoleAdminAccess(db, 2n, false, { id: '99', roleId: '3' })), 'last_admin')
  })
  test('cannot change own role, deactivate self, or reset own MFA here', async () => {
    const db = await world()
    assert.equal(await code(changeUserRole(db, '10', 3n, owner)), 'self')
    assert.equal(await code(setUserActive(db, '10', false, owner)), 'self')
    assert.equal(await code(resetUserMfa(db, '10', owner)), 'self')
  })
  test('another admin cannot remove the last usable admin', async () => {
    const db = await world()
    await setRoleAdminAccess(db, 3n, true, owner) // Editor role becomes admin; editor has no MFA yet
    const editor = { id: '12', roleId: '3' }
    assert.equal(await code(setUserActive(db, '10', false, editor)), 'last_admin')
    assert.equal(await code(changeUserRole(db, '10', 1n, editor)), 'last_admin')
    assert.equal(await code(resetUserMfa(db, '10', editor)), 'last_admin')
    db.state.users[2].twoFactorEnabled = true // now two usable admins
    await setUserActive(db, '10', false, editor)
    assert.equal(db.state.users[0].status, false)
  })
  test('invites need an active admin role; existing customers are not promoted silently', async () => {
    const db = await world()
    assert.equal(await code(createAdminUser(db, { firstName: 'A', email: 'a@valour.test', roleId: 3n })), 'not_admin_role')
    assert.equal(await code(createAdminUser(db, { firstName: 'A', email: 'shopper@valour.test', roleId: 2n })), 'duplicate')
    const id = await createAdminUser(db, { firstName: 'New', email: 'New@Valour.test', roleId: 2n })
    const u = db.state.users.find((x) => String(x.id) === id)
    assert.equal(u.email, 'new@valour.test')
    assert.equal(u.password, null, 'invited admins set their own password via the emailed link')
  })
  test('deactivating a role is blocked while users have it, and removes its admin access', async () => {
    const db = await world()
    await setRoleAdminAccess(db, 3n, true, owner)
    assert.equal(await code(deactivateRole(db, 3n, owner)), 'in_use')
    db.state.users[2].roleId = 1n
    await deactivateRole(db, 3n, owner)
    assert.equal(parseAdminRoleIds(db.state.setting.value).has('3'), false)
  })
})
