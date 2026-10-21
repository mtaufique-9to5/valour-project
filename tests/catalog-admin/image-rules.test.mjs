import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sniffMime, imageSize, validateImage, parseMediaPath, isStorageKey, imageUrl, isSameOriginRequest,
  MAX_BYTES, MIN_DIM, MAX_DIM, MAX_GALLERY, ACCEPT,
} from '../../src/server/catalog/image-rules.js'

const pad = (arr, n = 64) => { const b = new Uint8Array(Math.max(n, arr.length)); b.set(arr); return b }
const be32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]
const be16 = (n) => [(n >>> 8) & 255, n & 255]
const le16 = (n) => [n & 255, (n >>> 8) & 255]
const le24 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255]
const str = (s) => [...s].map((c) => c.charCodeAt(0))

const png = (w, h) => pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, ...str('IHDR'), ...be32(w), ...be32(h), 8, 6, 0, 0, 0])
const jpeg = (w, h, sof = 0xc0) => pad([
  0xff, 0xd8, 0xff, 0xe0, 0, 16, ...str('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, // APP0 (len 16)
  0xff, 0xdb, 0, 4, 0, 0, // DQT stub (len 4)
  0xff, sof, 0, 17, 8, ...be16(h), ...be16(w), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1,
  0xff, 0xda, 0, 2,
])
const riff = (chunk, body) => pad([...str('RIFF'), 0, 0, 0, 0, ...str('WEBP'), ...str(chunk), 10, 0, 0, 0, ...body])
const webpX = (w, h) => riff('VP8X', [0, 0, 0, 0, ...le24(w - 1), ...le24(h - 1)])
const webpL = (w, h) => {
  const bits = ((w - 1) & 0x3fff) | (((h - 1) & 0x3fff) << 14)
  return riff('VP8L', [0x2f, bits & 255, (bits >>> 8) & 255, (bits >>> 16) & 255, (bits >>> 24) & 255])
}
const webpLossy = (w, h) => riff('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(w), ...le16(h)])

test('limits', () => {
  assert.equal(MAX_BYTES, 5 * 1024 * 1024)
  assert.deepEqual([...ACCEPT], ['image/jpeg', 'image/png', 'image/webp'])
  assert.deepEqual([MIN_DIM, MAX_DIM, MAX_GALLERY], [200, 8000, 12])
})

test('magic bytes', () => {
  assert.equal(sniffMime(png(300, 300)), 'image/png')
  assert.equal(sniffMime(jpeg(300, 300)), 'image/jpeg')
  assert.equal(sniffMime(webpX(300, 300)), 'image/webp')
  assert.equal(sniffMime(pad(str('GIF89a'))), null)
  assert.equal(sniffMime(pad(str('<svg xmlns="http://www.w3.org/2000/svg">'))), null)
  assert.equal(sniffMime(pad([...str('RIFF'), 0, 0, 0, 0, ...str('WAVE')])), null)
  assert.equal(sniffMime(new Uint8Array(3)), null)
})

test('dimension parsing for every format', () => {
  assert.deepEqual(imageSize(png(640, 480), 'image/png'), { width: 640, height: 480 })
  assert.deepEqual(imageSize(jpeg(1024, 768), 'image/jpeg'), { width: 1024, height: 768 })
  assert.deepEqual(imageSize(jpeg(1024, 768, 0xc2), 'image/jpeg'), { width: 1024, height: 768 }) // progressive
  assert.deepEqual(imageSize(webpX(4000, 3000), 'image/webp'), { width: 4000, height: 3000 })
  assert.deepEqual(imageSize(webpL(512, 256), 'image/webp'), { width: 512, height: 256 })
  assert.deepEqual(imageSize(webpLossy(800, 600), 'image/webp'), { width: 800, height: 600 })
  // JPEG with SOS before any SOF -> unreadable
  assert.equal(imageSize(pad([0xff, 0xd8, 0xff, 0xda, 0, 2]), 'image/jpeg'), null)
  // PNG without IHDR
  assert.equal(imageSize(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, ...str('XXXX')]), 'image/png'), null)
})

test('validateImage: accepts valid files, checks declared type and extension', () => {
  const ok = validateImage(png(300, 400), { declaredMime: 'image/png', filename: 'a.PNG' })
  assert.equal(ok.ok, true)
  assert.deepEqual([ok.mime, ok.ext, ok.width, ok.height], ['image/png', 'png', 300, 400])
  assert.equal(validateImage(jpeg(300, 300), { declaredMime: 'image/jpeg', filename: 'x.jpeg' }).ok, true)
  assert.equal(validateImage(webpX(300, 300), { filename: 'x.webp' }).ok, true)
  assert.equal(validateImage(png(300, 300), { declaredMime: 'image/jpeg' }).ok, false)
  assert.equal(validateImage(png(300, 300), { filename: 'evil.jpg' }).ok, false)
  assert.equal(validateImage(png(300, 300), { filename: 'evil.svg' }).ok, false)
  assert.equal(validateImage(pad(str('<html>')), { declaredMime: 'image/png' }).ok, false)
  assert.equal(validateImage(new Uint8Array(0)).ok, false)
})

test('validateImage: dimension and size limits', () => {
  assert.equal(validateImage(png(199, 500)).ok, false)
  assert.equal(validateImage(png(500, 199)).ok, false)
  assert.equal(validateImage(png(200, 200)).ok, true)
  assert.equal(validateImage(png(8000, 8000)).ok, true)
  assert.equal(validateImage(png(8001, 500)).ok, false)
  assert.equal(validateImage(webpX(9000, 300)).ok, false)
  const big = new Uint8Array(MAX_BYTES + 1)
  big.set(png(300, 300))
  assert.match(validateImage(big).error, /5 MB/)
})

test('media path validation', () => {
  const hex = 'a'.repeat(32)
  assert.deepEqual(parseMediaPath(['12', `${hex}.jpg`]), { storageKey: `12/${hex}.jpg`, mime: 'image/jpeg' })
  assert.equal(parseMediaPath(['12', `${hex}.webp`]).mime, 'image/webp')
  for (const segs of [
    ['..', `${hex}.jpg`], ['12', '..'], ['12', `../${hex}.jpg`], ['12', `${hex}.svg`], ['12', `${hex}.JPG`],
    ['12', `${'A'.repeat(32)}.jpg`], ['012', `${hex}.jpg`], ['0', `${hex}.jpg`], ['12', `${hex}.jpg`, 'x'],
    ['12'], ['12', `${hex}.jpg.tmp`], ['12', `${hex.slice(1)}.png`], ['12', `${hex}%2e.png`], ['1\\2', `${hex}.png`],
    'x', null, ['12', 5],
  ]) assert.equal(parseMediaPath(segs), null, JSON.stringify(segs))
  assert.equal(isStorageKey(`3/${hex}.png`), true)
  assert.equal(isStorageKey(`3/../${hex}.png`), false)
})

test('imageUrl: uploads under /media/products, static paths unchanged', () => {
  const hex = 'b'.repeat(32)
  assert.equal(imageUrl({ source: 'UPLOAD', storageKey: `4/${hex}.png` }), `/media/products/4/${hex}.png`)
  assert.equal(imageUrl({ source: 'UPLOAD', storageKey: '../../etc/passwd' }), null)
  assert.equal(imageUrl({ source: 'STATIC', url: '/images/watch-1.png' }), '/images/watch-1.png')
})

test('same-origin guard', () => {
  const h = (o) => new Headers(o)
  const app = 'https://valour.example/'
  assert.equal(isSameOriginRequest(h({ origin: 'https://valour.example' }), app), true)
  assert.equal(isSameOriginRequest(h({ origin: 'https://valour.example', 'sec-fetch-site': 'same-origin' }), app), true)
  assert.equal(isSameOriginRequest(h({ origin: 'https://valour.example', 'sec-fetch-site': 'cross-site' }), app), false)
  assert.equal(isSameOriginRequest(h({ origin: 'https://evil.example' }), app), false)
  assert.equal(isSameOriginRequest(h({ origin: 'null' }), app), false)
  assert.equal(isSameOriginRequest(h({}), app), false)
  assert.equal(isSameOriginRequest(h({ origin: 'https://valour.example' }), undefined), false)
})
