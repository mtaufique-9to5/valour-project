// Pure auth/RBAC/audit logic (no database needed).
// Run with: node --test --conditions=react-server tests/auth/
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import {
  evaluateSignInAttempt, nextFailureState, successState, isLocked,
  MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MS, normalizeEmail,
} from '../../src/server/auth/lockout.js'
import { assertAuthSecret, assertAuthUrl } from '../../src/server/auth/env.js'
import { hashPassword, verifyPassword } from '../../src/server/auth/password.js'
import { ALL_PERMISSION_KEYS, PERMISSIONS as P, isKnownPermission } from '../../src/server/rbac/permissions.js'
import { ROLE_DEFINITIONS, permissionsForRoles } from '../../src/server/rbac/roles.js'
import { getUserPermissions, hasPermission } from '../../src/server/rbac/check.js'
import {
  buildAuditData, sanitizeSnapshot, serializeSnapshot, trimTo, minimizeIp, recordAudit,
  MAX_SNAPSHOT_BYTES,
} from '../../src/server/audit/audit.js'

const NOW = new Date('2026-01-01T12:00:00Z')

describe('lockout policy', () => {
  test('active, unlocked user is allowed; unknown user is not blocked here', () => {
    assert.deepEqual(evaluateSignInAttempt({ status: 'ACTIVE', lockedUntil: null }, NOW), { blocked: false, reason: null })
    assert.equal(evaluateSignInAttempt(null, NOW).blocked, false)
  })
  test('disabled and locked users are blocked', () => {
    assert.equal(evaluateSignInAttempt({ status: 'DISABLED' }, NOW).reason, 'disabled')
    const locked = { status: 'ACTIVE', lockedUntil: new Date(NOW.getTime() + 1000) }
    assert.equal(evaluateSignInAttempt(locked, NOW).reason, 'locked')
    assert.equal(isLocked({ lockedUntil: new Date(NOW.getTime() - 1) }, NOW), false)
  })
  test('locks on the 5th failure for 15 minutes', () => {
    let user = { failedLoginCount: 0, lockedUntil: null }
    for (let i = 1; i < MAX_FAILED_ATTEMPTS; i++) {
      user = nextFailureState(user, NOW)
      assert.equal(user.lockedNow, false)
    }
    const s = nextFailureState(user, NOW)
    assert.equal(s.failedLoginCount, 5)
    assert.equal(s.lockedNow, true)
    assert.equal(s.lockedUntil.getTime(), NOW.getTime() + LOCKOUT_DURATION_MS)
  })
  test('expired lock restarts the count; success resets', () => {
    const s = nextFailureState({ failedLoginCount: 5, lockedUntil: new Date(NOW.getTime() - 1) }, NOW)
    assert.equal(s.failedLoginCount, 1)
    assert.deepEqual(successState(), { failedLoginCount: 0, lockedUntil: null })
    assert.equal(normalizeEmail('  A@B.Test '), 'a@b.test')
  })
})

describe('auth env', () => {
  test('secret must exist and be >= 32 chars; errors do not echo the value', () => {
    assert.throws(() => assertAuthSecret(undefined), /not set/)
    const short = 'x'.repeat(31)
    assert.throws(() => assertAuthSecret(short), (e) => !e.message.includes(short))
    assert.equal(assertAuthSecret('y'.repeat(32)).length, 32)
  })
  test('url validation', () => {
    assert.throws(() => assertAuthUrl(''), /not set/)
    assert.throws(() => assertAuthUrl('nope'), /valid URL/)
    assert.equal(assertAuthUrl('https://example.test'), 'https://example.test')
  })
})

describe('argon2id password', () => {
  test('hash/verify round trip', async () => {
    const h = await hashPassword('Dummy-password-123!')
    assert.match(h, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/)
    assert.equal(await verifyPassword({ hash: h, password: 'Dummy-password-123!' }), true)
    assert.equal(await verifyPassword({ hash: h, password: 'wrong' }), false)
    assert.equal(await verifyPassword({ hash: 'scrypt:abc', password: 'x' }), false)
  })
})

describe('RBAC matrix', () => {
  const set = (role) => new Set(ROLE_DEFINITIONS[role].permissions)
  test('SUPER_ADMIN has everything; ADMIN lacks only role.manage', () => {
    assert.deepEqual(set('SUPER_ADMIN'), new Set(ALL_PERMISSION_KEYS))
    const missing = ALL_PERMISSION_KEYS.filter((k) => !set('ADMIN').has(k))
    assert.deepEqual(missing, [P.ROLE_MANAGE])
  })
  test('PRODUCT_MANAGER / CONTENT_MANAGER / VIEWER', () => {
    assert.deepEqual(set('PRODUCT_MANAGER'), new Set([
      'dashboard.view', 'product.view', 'product.create', 'product.update',
      'product.price.update', 'inventory.update', 'order.view',
    ]))
    assert.deepEqual(set('CONTENT_MANAGER'), new Set(['dashboard.view', 'content.update', 'product.view']))
    assert.ok([...set('VIEWER')].every((k) => k.endsWith('.view')))
    assert.ok(set('VIEWER').has('audit.view'))
  })
  test('every role permission is a known key; unknown roles grant nothing', () => {
    for (const def of Object.values(ROLE_DEFINITIONS)) for (const k of def.permissions) assert.ok(isKnownPermission(k))
    assert.equal(permissionsForRoles(['NOPE', '__proto__']).size, 0)
    assert.equal(isKnownPermission('product.delete'), false)
  })
})

describe('RBAC check (mocked client)', () => {
  const client = {
    adminUserRole: {
      findMany: async ({ where }) => where.userId === 'u1'
        ? [{ role: { permissions: [{ permission: { key: 'product.view' } }, { permission: { key: 'bogus.key' } }] } }]
        : [],
    },
  }
  test('loads known keys only; deny by default', async () => {
    assert.deepEqual(await getUserPermissions('u1', client), new Set(['product.view']))
    assert.equal(await hasPermission('u1', 'product.view', client), true)
    assert.equal(await hasPermission('u1', 'product.update', client), false)
    assert.equal(await hasPermission('u1', 'bogus.key', client), false)
    assert.equal(await hasPermission('u2', 'product.view', client), false)
    assert.equal(await hasPermission('', 'product.view', client), false)
  })
  test('database errors deny', async () => {
    const broken = { adminUserRole: { findMany: async () => { throw new Error('db down') } } }
    assert.equal(await hasPermission('u1', 'product.view', broken), false)
  })
})

describe('audit sanitizer and caps', () => {
  test('strips sensitive keys at any depth', () => {
    const out = sanitizeSnapshot('custom.action', {
      name: 'x', password: 'p', passwordHash: 'h', nested: { token: 't', access_token: 'a', ok: 1 },
      twoFactor: { secret: 's', backupCodes: ['1'] }, list: [{ apiKey: 'k', v: 2 }],
    })
    assert.deepEqual(out, { name: 'x', nested: { ok: 1 }, twoFactor: {}, list: [{ v: 2 }] })
  })
  test('applies the per-action allowlist', () => {
    assert.deepEqual(
      sanitizeSnapshot('auth.login.failure', { email: 'a@b.test', reason: 'locked', ip: '1.2.3.4', password: 'x' }),
      { email: 'a@b.test', reason: 'locked' },
    )
  })
  test('snapshots over 60,000 UTF-8 bytes become a marker', () => {
    const big = { text: '€'.repeat(25_000) } // 75,000 bytes
    const s = serializeSnapshot(big)
    assert.ok(Buffer.byteLength(s) <= MAX_SNAPSHOT_BYTES)
    assert.equal(JSON.parse(s)._truncated, true)
    assert.equal(serializeSnapshot({ a: 1 }), '{"a":1}')
  })
  test('trims by code point without splitting surrogate pairs', () => {
    assert.equal(trimTo('😀😀😀', 2), '😀😀')
    assert.equal(trimTo(null, 5), null)
  })
  test('IP minimization', () => {
    assert.equal(minimizeIp('203.0.113.77'), '203.0.113.0')
    assert.equal(minimizeIp('::ffff:203.0.113.77'), '203.0.113.0')
    assert.equal(minimizeIp('2001:db8:85a3:8d3:1319:8a2e:370:7348'), '2001:db8:85a3::')
  })
  test('buildAuditData validates and trims', () => {
    assert.throws(() => buildAuditData({ actorType: 'ADMIN', action: 'x' }), /actorId/)
    assert.throws(() => buildAuditData({ actorType: 'ROOT', action: 'x' }), /actorType/)
    const d = buildAuditData({
      actorType: 'SYSTEM', action: 'a'.repeat(200), targetId: 't'.repeat(100),
      userAgent: 'u'.repeat(400), ipAddress: '203.0.113.77',
    }, { minimize: true })
    assert.equal(d.action.length, 100)
    assert.equal(d.targetId.length, 64)
    assert.equal(d.userAgent.length, 255)
    assert.equal(d.ipAddress, '203.0.113.0')
    assert.equal(d.before, null)
  })
  test('recordAudit writes through the given client', async () => {
    let captured
    const tx = { auditLog: { create: async (args) => { captured = args; return { id: 1 } } } }
    await recordAudit(tx, { actorType: 'CLI', action: 'admin_user.create', after: { email: 'a@b.test', password: 'x' } })
    assert.equal(captured.data.after, '{"email":"a@b.test"}')
    await assert.rejects(recordAudit({}, { actorType: 'CLI', action: 'x' }))
  })
})
