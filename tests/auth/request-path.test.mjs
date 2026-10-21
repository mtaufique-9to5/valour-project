// Regression: with trailingSlash: true, Better Auth received /sign-in/email/ and
// returned 404, which the login page showed as "Invalid email or password".
// Run: node --test --conditions=react-server "tests/auth/*.test.mjs"
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTrailingSlash, withoutTrailingSlash } from '../../src/server/auth/request-path.js'

test('removes the trailing slash and keeps the query', () => {
  assert.equal(stripTrailingSlash('http://localhost:3000/api/auth/sign-in/email/'), 'http://localhost:3000/api/auth/sign-in/email')
  assert.equal(stripTrailingSlash('http://localhost:3000/api/auth/get-session/?x=1'), 'http://localhost:3000/api/auth/get-session?x=1')
  assert.equal(stripTrailingSlash('http://localhost:3000/api/auth/two-factor/verify-totp'), 'http://localhost:3000/api/auth/two-factor/verify-totp')
})

test('POST body, method and headers survive the rewrite', async () => {
  const req = new Request('http://localhost:3000/api/auth/sign-in/email/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
    body: JSON.stringify({ email: 'a@example.invalid', password: 'x' }),
  })
  const out = withoutTrailingSlash(req)
  assert.equal(new URL(out.url).pathname, '/api/auth/sign-in/email')
  assert.equal(out.method, 'POST')
  assert.equal(out.headers.get('origin'), 'http://localhost:3000')
  assert.deepEqual(await out.json(), { email: 'a@example.invalid', password: 'x' })
})

test('request without a trailing slash is passed through unchanged', () => {
  const req = new Request('http://localhost:3000/api/auth/get-session')
  assert.equal(withoutTrailingSlash(req), req)
})

test('auth route applies the normalisation to GET and POST', () => {
  const src = readFileSync(new URL('../../src/app/api/auth/[...all]/route.js', import.meta.url), 'utf8')
  assert.match(src, /export const GET = \(request\) => handlers\.GET\(withoutTrailingSlash\(request\)\)/)
  assert.match(src, /export const POST = \(request\) => handlers\.POST\(withoutTrailingSlash\(request\)\)/)
})

test('login page shows "invalid credentials" only for 401', () => {
  const src = readFileSync(new URL('../../src/admin/client/LoginClient.jsx', import.meta.url), 'utf8')
  assert.match(src, /failure\.status === 401 \? GENERIC_ERROR/)
})
