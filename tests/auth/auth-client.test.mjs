// Regressions for the admin sign-in client (pure source checks; no browser).
// Run: node --test --conditions=react-server "tests/auth/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('auth calls use the trailing-slash URL (trailingSlash: true) and POST JSON', () => {
  const src = read('../../src/admin/lib/auth-client.js')
  assert.match(src, /fetch\(`\/api\/admin\/auth\/\$\{action\}\/`/)
  assert.match(src, /'Content-Type': 'application\/json'/)
  assert.doesNotMatch(src, /better-auth/)
})

test('login page shows "invalid credentials" only for 401', () => {
  const src = read('../../src/admin/client/LoginClient.jsx')
  assert.match(src, /status === 401 \? 'Invalid email or password\.'/)
})

test('auth route enforces same-origin and JSON before doing anything', () => {
  const src = read('../../src/app/api/admin/auth/[action]/route.js')
  const origin = src.indexOf('isSameOriginRequest(')
  const json = src.indexOf("startsWith('application/json')")
  const work = src.indexOf('switch (action)')
  assert.ok(origin > 0 && json > origin && work > json)
})

test('the reset page never sends its token onward in a Referer header', () => {
  assert.match(read('../../src/app/admin/reset-password/page.jsx'), /referrer: 'no-referrer'/)
})
