// Sidebar active-state matching for filtered (query string) nav links.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { activeNavIds } from '../../src/admin/components/nav-match.js'

// Mirrors the Catalog/Overview paths in nav.js (which imports icons).
const items = [
  { id: 'dashboard', path: '' },
  { id: 'products', path: '/products' },
  { id: 'watches', path: '/products?type=WATCH' },
  { id: 'straps', path: '/products?type=STRAP' },
  { id: 'pricing', path: '/pricing' },
]
const active = (path, search) => [...activeNavIds(items, '/admin', path, search)].sort()

test('products vs filtered watches/straps', () => {
  assert.deepEqual(active('/admin/products', ''), ['products'])
  assert.deepEqual(active('/admin/products', 'type=WATCH'), ['watches'])
  assert.deepEqual(active('/admin/products', 'type=STRAP&page=2'), ['straps'])
  assert.deepEqual(active('/admin/products/12', ''), ['products'])
  assert.deepEqual(active('/admin', ''), ['dashboard'])
})
