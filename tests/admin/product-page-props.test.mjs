// Regression: product page components must declare every variable they use.
// "product is not defined" (DetailSec3 declared without its `product` prop) is
// invisible to the build and to Next's default lint rules, so it is checked here.
// Run: node --test tests/admin/
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { ESLint } from 'eslint'

const SECTION_DIR = new URL('../../src/app/our-shop/components/', import.meta.url)
const PRODUCT_DIR = new URL('../../src/components/product/', import.meta.url)
const files = (dir) => readdirSync(dir).filter((f) => f.endsWith('.jsx')).map((f) => new URL(f, dir))

test('every product page component that uses `product` declares it as a parameter', () => {
  for (const url of [...files(SECTION_DIR), ...files(PRODUCT_DIR)]) {
    const code = readFileSync(url, 'utf8')
    const body = code.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    if (!/\bproduct\b[?.]/.test(body)) continue
    // The default export (or its component) must take { product ... }.
    const declares = /(function\s+\w+\s*\(\s*\{[^)]*\bproduct\b|=\s*\(\s*\{[^)]*\bproduct\b)/.test(body)
    assert.ok(declares, `${url.pathname.split('/').pop()} uses product but does not declare a { product } parameter`)
  }
})

test('no undefined variables in the product page chain (ESLint no-undef)', async () => {
  const eslint = new ESLint({ cwd: new URL('../..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), overrideConfig: { rules: { 'no-undef': 'error' } } })
  const results = await eslint.lintFiles(['src/app/our-shop/**/*.jsx', 'src/components/product/*.jsx'])
  const undef = results.flatMap((r) => r.messages.filter((m) => m.ruleId === 'no-undef').map((m) => `${r.filePath.split(/[\\/]/).pop()}:${m.line} ${m.message}`))
  assert.deepEqual(undef, [])
})

test('the watch page passes the product to every section', () => {
  const watch = readFileSync(new URL('WatchDetail.jsx', PRODUCT_DIR), 'utf8')
  for (const name of ['HeroSection', 'DetailSec', 'ParraSec1', 'DetailSec2', 'ParraSec2', 'DetailSec3', 'StrapSec']) {
    assert.match(watch, new RegExp(`<${name} product=\\{product\\} />`), `${name} must receive product`)
  }
})

test('spec rows keep duplicate labels without duplicate React keys (e.g. two "Movement" rows)', () => {
  const src = readFileSync(new URL('ProductSpecs.jsx', PRODUCT_DIR), 'utf8')
  assert.match(src, /specs\.map\(\(spec, i\) =>/)
  assert.match(src, /key=\{`\$\{spec\.label\}-\$\{i\}`\}/)
  assert.doesNotMatch(src, /key=\{spec\.label\}/)
})

test('carousels only loop when they have more slides than are visible (Swiper loop warning)', () => {
  const home = readFileSync(new URL('../../src/components/ProductSec.jsx', import.meta.url), 'utf8')
  const blog = readFileSync(new URL('../../src/components/BlogDetails.jsx', import.meta.url), 'utf8')
  assert.match(home, /loop=\{products\.length > 4\}/)
  assert.match(blog, /loop=\{latestArticles\.length > 4\}/)
  assert.match(blog, /<SwiperSlide key=\{post\.id\}>/)
})
