// Database connection settings (no database needed).
// Run with: node --conditions=react-server --test tests/db-config.test.mjs
// (the condition lets `server-only` modules load, as they do in Next's server).
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

import { parseDatabaseUrl, SESSION_VARIABLES } from '../src/server/db-config.js'

// Dummy values only — never real credentials.
const SECRET = 'Dummy@Pass#123'
const ENCODED = encodeURIComponent(SECRET) // Dummy%40Pass%23123

describe('parseDatabaseUrl', () => {
  test('reads a mysql:// URL, decoding an encoded password', () => {
    assert.deepEqual(parseDatabaseUrl(`mysql://app_user:${ENCODED}@localhost:3307/shop_db`), {
      host: 'localhost', port: 3307, user: 'app_user', password: SECRET, database: 'shop_db',
    })
  })

  test('accepts mariadb:// and defaults the port to 3306', () => {
    const opts = parseDatabaseUrl('mariadb://app_user:pw@db.example.test/shop_db')
    assert.equal(opts.port, 3306)
    assert.equal(opts.host, 'db.example.test')
  })

  test('rejects missing, invalid and incomplete values', () => {
    const cases = [
      [undefined, /is not set/],
      ['', /is not set/],
      ['not a url', /is not a valid URL/],
      [`mysql://app_user:Dummy@Pass#123@localhost/shop_db`, /must include a user, host and database name|is not a valid URL/],
      ['postgres://app_user:pw@localhost/shop_db', /must start with mysql:\/\/ or mariadb:\/\//],
      ['mysql://app_user:pw@localhost/', /must include a user, host and database name/],
      ['mysql://localhost/shop_db', /must include a user, host and database name/],
      ['mysql://app_user:%E0%A4%A@localhost/shop_db', /invalid URL-encoding/],
    ]
    for (const [value, expected] of cases) assert.throws(() => parseDatabaseUrl(value), expected, String(value))
  })

  test('errors name the variable but never contain the URL or password', () => {
    const leaky = [
      `postgres://app_user:${ENCODED}@localhost/shop_db`,
      `mysql://app_user:${ENCODED}@localhost/`,
      `mysql://app_user:${ENCODED}%E0%A4%A@localhost/shop_db`,
    ]
    for (const value of leaky) {
      try {
        parseDatabaseUrl(value, 'TEST_DATABASE_URL')
        assert.fail('expected an error')
      } catch (e) {
        assert.match(e.message, /^TEST_DATABASE_URL /)
        for (const secretPart of [SECRET, ENCODED, 'Dummy', value]) assert.ok(!e.message.includes(secretPart), e.message)
      }
    }
  })
})

describe('SESSION_VARIABLES', () => {
  test('strict SQL mode and UTC, exactly as approved', () => {
    assert.deepEqual({ ...SESSION_VARIABLES }, {
      sql_mode: 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION',
      time_zone: '+00:00',
    })
    assert.ok(Object.isFrozen(SESSION_VARIABLES))
  })
})
