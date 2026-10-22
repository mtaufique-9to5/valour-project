// Pure auth/RBAC/audit logic (no database needed).
// Run with: node --test --conditions=react-server tests/auth/
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { assertAuthSecret, assertAuthUrl } from '../../src/server/auth/env.js'
import { hashPassword, verifyPassword } from '../../src/server/auth/password.js'
import { ALL_PERMISSION_KEYS, PERMISSIONS as P, isKnownPermission } from '../../src/server/rbac/permissions.js'
import {
  buildAuditData, sanitizeSnapshot, serializeSnapshot, trimTo, minimizeIp, recordAudit,
  MAX_SNAPSHOT_BYTES,
} from '../../src/server/audit/audit.js'


describe('permission keys', () => {
  test('known keys only; unknown or non-string keys are denied', () => {
    assert.ok(ALL_PERMISSION_KEYS.length > 0 && ALL_PERMISSION_KEYS.every(isKnownPermission))
    assert.ok(isKnownPermission(P.DASHBOARD_VIEW))
    assert.equal(isKnownPermission('everything'), false)
    assert.equal(isKnownPermission(undefined), false)
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
  test('recordAudit writes one sanitised [audit] log line (no audit table in Revision 3)', async () => {
    const lines = []
    const original = console.info
    console.info = (line) => lines.push(line)
    try {
      await recordAudit(null, { actorType: 'CLI', action: 'admin_user.create', after: { email: 'a@b.test', password: 'x' } })
    } finally {
      console.info = original
    }
    assert.equal(lines.length, 1)
    assert.ok(lines[0].startsWith('[audit] '))
    const entry = JSON.parse(lines[0].slice(8))
    assert.equal(entry.after, '{"email":"a@b.test"}')
    assert.ok(!lines[0].includes('"x"'), 'password value never logged')
    await assert.rejects(recordAudit(null, { actorType: 'CLI', action: '' }))
  })
})
