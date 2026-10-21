// Static check: storefront chrome (cart, toasts) is hidden on /admin routes.
// Run with: node --test tests/admin/storefront-chrome.test.mjs
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')
const layout = read('src/app/layout.js')
const chrome = read('src/app/StorefrontChrome.jsx')

describe('root layout', () => {
  test('imports and renders <StorefrontChrome />', () => {
    assert.match(layout, /import\s+StorefrontChrome\s+from\s+['"]\.\/StorefrontChrome['"]/)
    assert.match(layout, /<StorefrontChrome\s*\/>/)
  })
  test('no longer imports CartSidebar, CartHydrator or Toaster directly', () => {
    assert.doesNotMatch(layout, /import[^\n]*CartSidebar/)
    assert.doesNotMatch(layout, /import[^\n]*CartHydrator/)
    assert.doesNotMatch(layout, /import[^\n]*Toaster/)
  })
})

describe('StorefrontChrome', () => {
  test('is a client component using usePathname', () => {
    assert.match(chrome, /^\s*['"]use client['"]/)
    assert.match(chrome, /usePathname\(\)/)
  })
  test("returns null for '/admin' and '/admin/*'", () => {
    assert.match(chrome, /===\s*['"]\/admin['"]/)
    assert.match(chrome, /\.startsWith\(\s*['"]\/admin\/['"]\s*\)/)
    assert.match(chrome, /\)\s*return\s+null/)
  })
  test('renders CartHydrator, Toaster and CartSidebar otherwise', () => {
    for (const el of ['CartHydrator', 'Toaster', 'CartSidebar']) {
      assert.ok(chrome.includes(`<${el} `) || chrome.includes(`<${el}/`), el)
    }
  })
})
