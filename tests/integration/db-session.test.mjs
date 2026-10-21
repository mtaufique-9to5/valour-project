// Integration test for database session settings, against the TEST database only.
// Run with: node --conditions=react-server --test tests/integration/db-session.test.mjs
//
// Safety: uses TEST_DATABASE_URL from .env.local and refuses to run unless its
// database name ends in "_test" and differs from DATABASE_URL's database. Every
// write happens inside a transaction that is rolled back. Values are never printed.
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { adminRoleModel, adminPermissionModel, adminRolePermissionModel } from '../../src/server/rbac/models.js'

const envFile = fileURLToPath(new URL('../../.env.local', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

// The project currently runs on a single database (no test database), so these
// tests are skipped unless TEST_DATABASE_URL is set. They never fall back to
// DATABASE_URL.
const SKIP = process.env.TEST_DATABASE_URL ? false : 'TEST_DATABASE_URL is not set (single-database setup)'

let db
if (!SKIP) {
  const { parseDatabaseUrl } = await import('../../src/server/db-config.js')
  const testDb = parseDatabaseUrl(process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL').database
  const mainDb = process.env.DATABASE_URL ? parseDatabaseUrl(process.env.DATABASE_URL).database : null
  if (!testDb.endsWith('_test') || testDb === mainDb) {
    throw new Error('Refusing to run: TEST_DATABASE_URL must point to a separate database whose name ends in "_test".')
  }

  // Point the shared client at the test database for this process only.
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  ;({ db } = await import('../../src/server/db.js'))
}

const ROLLBACK = Symbol('rollback')
// Runs fn in a transaction and always rolls it back.
async function inRolledBackTransaction(fn) {
  try {
    await db.$transaction(async (tx) => {
      await fn(tx)
      throw ROLLBACK
    })
  } catch (e) {
    if (e !== ROLLBACK) throw e
  }
}

const tableCounts = async () => ({
  roles: await adminRoleModel(db).count(),
  permissions: await adminPermissionModel(db).count(),
  rolePermissions: await adminRolePermissionModel(db).count(),
  auditLogs: await db.auditLog.count(),
})

describe('database session settings (test database)', { skip: SKIP }, () => {
  let countsBefore
  before(async () => { countsBefore = await tableCounts() })
  after(async () => { await db.$disconnect() })

  test('every session runs in strict SQL mode and UTC', async () => {
    const [row] = await db.$queryRaw`SELECT DATABASE() AS db, @@SESSION.sql_mode AS sqlMode, @@SESSION.time_zone AS timeZone`
    assert.equal(row.db, testDb)
    assert.match(row.sqlMode, /STRICT_TRANS_TABLES/)
    assert.equal(row.timeZone, '+00:00')
  })

  test('an over-long value is rejected, not truncated, and nothing is written', async () => {
    await assert.rejects(
      adminRoleModel(db).create({ data: { key: 'K'.repeat(65), name: 'Over-long key test' } }), // roles.key is VARCHAR(64)
      (e) => e.code === 'P2000' || /too long/i.test(String(e.message)),
    )
    assert.equal(await adminRoleModel(db).count({ where: { name: 'Over-long key test' } }), 0)
  })

  test('database-side CURRENT_TIMESTAMP is UTC', async () => {
    await inRolledBackTransaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO roles (\`key\`, name, updated_at) VALUES ('UTC_PROBE_DEFAULT', 'utc probe', UTC_TIMESTAMP(3))`
      const [r] = await tx.$queryRaw`SELECT TIMESTAMPDIFF(MICROSECOND, created_at, UTC_TIMESTAMP(3)) AS diffMicros FROM roles WHERE \`key\` = 'UTC_PROBE_DEFAULT'`
      assert.ok(Math.abs(Number(r.diffMicros)) < 2_000_000, `created_at should be within 2 s of UTC (diff ${r.diffMicros} µs)`)
    })
  })

  test('a Prisma-written timestamp is stored as UTC', async () => {
    await inRolledBackTransaction(async (tx) => {
      const created = await adminRoleModel(tx).create({ data: { key: 'UTC_PROBE_PRISMA', name: 'utc probe' } })
      const [r] = await tx.$queryRaw`SELECT DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s.%f') AS stored FROM roles WHERE id = ${created.id}`
      const storedMs = Date.parse(`${r.stored.slice(0, 23)}Z`)
      assert.equal(storedMs, created.createdAt.getTime(), 'the stored value read as UTC equals the Date Prisma returned')
    })
  })

  test('no rows were left behind', async () => {
    assert.deepEqual(await tableCounts(), countsBefore)
  })
})
