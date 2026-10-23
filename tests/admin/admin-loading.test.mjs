// Shared admin loading state: one route-group boundary inside the panel layout.
// Run: node --test tests/admin/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const PANEL = new URL('../../src/app/admin/(panel)/', import.meta.url)

test('one shared loading boundary for the (panel) route group, rendering AdminLoading', () => {
  const src = read('../../src/app/admin/(panel)/loading.jsx')
  assert.match(src, /import AdminLoading from '@\/admin\/components\/AdminLoading'/)
  assert.match(src, /return <AdminLoading \/>/)
  // Inside the panel layout, so the sidebar and header stay visible.
  assert.ok(existsSync(new URL('layout.jsx', PANEL)))
  // Login / MFA pages are outside the group and keep their own UI.
  for (const page of ['login', 'mfa-setup', 'mfa-verify']) assert.ok(!existsSync(new URL(`../../src/app/admin/${page}/loading.jsx`, import.meta.url)))
})

test('no admin route defines its own different loader (no overlapping or inconsistent loaders)', () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => {
    const u = new URL(f + (statSync(new URL(f, dir)).isDirectory() ? '/' : ''), dir)
    return statSync(u).isDirectory() ? walk(u) : [u]
  })
  const loaders = walk(PANEL).filter((u) => /\/loading\.(js|jsx)$/.test(u.pathname) && !u.pathname.endsWith('(panel)/loading.jsx'))
  for (const u of loaders) assert.match(readFileSync(u, 'utf8'), /export \{ default \} from '(\.\.\/)+loading'/, `${u.pathname} must reuse the shared loader`)
})

test('loader is accessible, uses the existing spinner and has no timer', () => {
  const src = read('../../src/admin/components/AdminLoading.jsx')
  assert.match(src, /role="status"/)
  assert.match(src, /aria-live="polite"/)
  assert.match(src, /className="va-spin"/)
  assert.match(src, /Loading\.\.\./)
  assert.doesNotMatch(src, /setTimeout|setInterval|useEffect|'use client'/)
  const css = read('../../src/admin/styles/admin.css')
  assert.match(css, /\.va-page-loading \{[\s\S]*animation: va-loading-in 0\.2s ease-out 0\.15s forwards;/)
})
