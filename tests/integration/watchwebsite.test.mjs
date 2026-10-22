// MariaDB integration tests for Revision 3 (watchwebsite schema). They run ONLY
// against a separate database whose name is exactly `watchwebsite_test`, given in
// TEST_DATABASE_URL, and never fall back to DATABASE_URL. Every test runs inside
// a transaction that is always rolled back, so even the test database keeps no rows.
// Prepare (needs approval + root): create watchwebsite_test and its own user, put
// TEST_DATABASE_URL in .env.test.local, then: node scripts/db/migrate-test-db.mjs
// Run: node --conditions=react-server --test tests/integration/
import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Test credentials live only in .env.test.local (git-ignored), separate from .env.local.
const envFile = fileURLToPath(new URL('../../.env.test.local', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const SKIP = process.env.TEST_DATABASE_URL ? false : 'TEST_DATABASE_URL is not set (watchwebsite_test not created yet)'

let db
if (!SKIP) {
  const { parseDatabaseUrl } = await import('../../src/server/db-config.js')
  const testDb = parseDatabaseUrl(process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL').database
  if (testDb !== 'watchwebsite_test') throw new Error('Refusing to run: TEST_DATABASE_URL must point to the database `watchwebsite_test`.')
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  ;({ db } = await import('../../src/server/db.js'))
}

const ROLLBACK = Symbol('rollback')
async function rolledBack(fn) {
  try {
    await db.$transaction(async (tx) => { await fn(tx); throw ROLLBACK }, { timeout: 30_000 })
  } catch (e) {
    if (e !== ROLLBACK) throw e
  }
}

describe('watchwebsite_test (MariaDB)', { skip: SKIP }, () => {
  before(async () => { await db.$queryRaw`SELECT 1` })
  after(async () => { await db?.$disconnect() })

  test('session settings: strict SQL mode and UTC', async () => {
    const [row] = await db.$queryRaw`SELECT @@SESSION.sql_mode AS mode, @@SESSION.time_zone AS tz`
    assert.match(row.mode, /STRICT_TRANS_TABLES/)
    assert.equal(row.tz, '+00:00')
  })

  test('exactly the 25 Revision 3 tables plus _prisma_migrations', async () => {
    const rows = await db.$queryRaw`SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    assert.equal(Number(rows[0].n), 26)
  })

  test('CHECK constraints reject invalid rows', async () => {
    await rolledBack(async (tx) => {
      await assert.rejects(tx.$executeRaw`INSERT INTO coupons (code, type, value, status) VALUES ('BAD', 'percentage', 150, FALSE)`)
      await assert.rejects(tx.$executeRaw`INSERT INTO carts (status) VALUES ('active')`, 'cart needs an owner')
    })
  })

  test('admin access: role + admin_role_ids + user with MFA is a usable admin; Customer role is not', async () => {
    const { countUsableAdmins, serializeAdminRoleIds } = await import('../../src/server/auth/admin-roles.js')
    await rolledBack(async (tx) => {
      const admin = await tx.role.create({ data: { name: 'IT Admin Role' } })
      const customer = await tx.role.create({ data: { name: 'IT Customer Role' } })
      await tx.generalSetting.upsert({ where: { key: 'admin_role_ids' }, create: { key: 'admin_role_ids', type: 'json', value: serializeAdminRoleIds([String(admin.id)]) }, update: { value: serializeAdminRoleIds([String(admin.id)]) } })
      await tx.user.create({ data: { email: 'it-admin@valour.test', firstName: 'IT', roleId: admin.id, password: '$argon2id$x', twoFactorEnabled: true } })
      await tx.user.create({ data: { email: 'it-cust@valour.test', firstName: 'IT', roleId: customer.id } })
      assert.equal(await countUsableAdmins(tx, new Set([String(admin.id)])), 1)
      const locked = await tx.$queryRaw`SELECT value FROM general_settings WHERE \`key\` = 'admin_role_ids' FOR UPDATE`
      assert.equal(locked.length, 1)
    })
  })

  test('users.email is unique; roles referenced by users cannot be hard-deleted', async () => {
    await rolledBack(async (tx) => {
      const r = await tx.role.create({ data: { name: 'IT Unique Role' } })
      await tx.user.create({ data: { email: 'dup@valour.test', firstName: 'A', roleId: r.id } })
      await assert.rejects(tx.user.create({ data: { email: 'dup@valour.test', firstName: 'B', roleId: r.id } }))
    })
    await rolledBack(async (tx) => {
      const r = await tx.role.create({ data: { name: 'IT Restrict Role' } })
      await tx.user.create({ data: { email: 'r@valour.test', firstName: 'A', roleId: r.id } })
      await assert.rejects(tx.role.delete({ where: { id: r.id } }))
    })
  })
})
