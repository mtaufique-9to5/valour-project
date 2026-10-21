// Pure image rules (no fs/DB; importable by tests and mirrored by the UI).
// Upload validation trusts only the bytes: magic signature, then dimensions
// parsed from the format headers, then a match with the declared type/extension.

export const MAX_BYTES = 5 * 1024 * 1024
export const ACCEPT = Object.freeze(['image/jpeg', 'image/png', 'image/webp'])
export const MIN_DIM = 200
export const MAX_DIM = 8000
export const MAX_GALLERY = 12
export const IMAGE_ROLES = Object.freeze(['MAIN', 'GALLERY'])
/** Public URL prefix served by src/app/media/products/[...path]/route.js. */
export const MEDIA_PREFIX = '/media/products/'

export const EXT_BY_MIME = Object.freeze({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })
export const MIME_BY_EXT = Object.freeze({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const ascii = (b, at, s) => b.length >= at + s.length && [...s].every((c, i) => b[at + i] === c.charCodeAt(0))

/** Detect the real type from magic bytes: 'image/jpeg' | 'image/png' | 'image/webp' | null. */
export function sniffMime(buf) {
  if (!buf || buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (PNG_SIG.every((v, i) => buf[i] === v)) return 'image/png'
  if (ascii(buf, 0, 'RIFF') && ascii(buf, 8, 'WEBP')) return 'image/webp'
  return null
}

const u16be = (b, i) => (b[i] << 8) | b[i + 1]
const u16le = (b, i) => b[i] | (b[i + 1] << 8)
const u24le = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)
const u32be = (b, i) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3])
const u32le = (b, i) => ((b[i + 3] << 24) >>> 0) + ((b[i + 2] << 16) | (b[i + 1] << 8) | b[i])

function pngSize(b) {
  // Signature (8) + IHDR length (4) + "IHDR" (4) + width (4) + height (4).
  if (b.length < 24 || !ascii(b, 12, 'IHDR')) return null
  return { width: u32be(b, 16), height: u32be(b, 20) }
}

// SOF markers carrying frame dimensions (excludes DHT C4, JPG C8, DAC CC).
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

function jpegSize(b) {
  let i = 2
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) return null
    let marker = b[i + 1]
    while (marker === 0xff && i + 2 < b.length) { i++; marker = b[i + 1] } // fill bytes
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue }
    if (marker === 0xd9 || marker === 0xda) return null // EOI / start of scan before any SOF
    if (i + 3 >= b.length) return null
    const len = u16be(b, i + 2)
    if (len < 2) return null
    if (SOF.has(marker)) {
      if (i + 8 >= b.length) return null
      return { height: u16be(b, i + 5), width: u16be(b, i + 7) }
    }
    i += 2 + len
  }
  return null
}

function webpSize(b) {
  if (b.length < 30) return null
  if (ascii(b, 12, 'VP8 ')) {
    // Frame tag (3) then start code 9D 01 2A, then 14-bit width/height.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null
    return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff }
  }
  if (ascii(b, 12, 'VP8L')) {
    if (b[20] !== 0x2f) return null
    const bits = u32le(b, 21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  if (ascii(b, 12, 'VP8X')) {
    return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 }
  }
  return null
}

/** Dimensions from the header bytes, or null when they cannot be read. */
export function imageSize(buf, mime) {
  if (!buf) return null
  if (mime === 'image/png') return pngSize(buf)
  if (mime === 'image/jpeg') return jpegSize(buf)
  if (mime === 'image/webp') return webpSize(buf)
  return null
}

/** 'Photo.JPEG' -> 'jpeg'; '' when there is no extension. */
export function extensionOf(filename) {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(String(filename ?? ''))
  return m ? m[1].toLowerCase() : ''
}

/**
 * Validate an uploaded image.
 * @param {Uint8Array} buf file bytes
 * @param {{ declaredMime?: string, filename?: string }} [meta] browser-declared type and name
 * @returns {{ ok: true, mime: string, ext: string, width: number, height: number, bytes: number } | { ok: false, error: string }}
 */
export function validateImage(buf, { declaredMime = '', filename = '' } = {}) {
  if (!buf || buf.length === 0) return { ok: false, error: 'The file is empty.' }
  if (buf.length > MAX_BYTES) return { ok: false, error: 'The file is larger than 5 MB.' }
  const mime = sniffMime(buf)
  if (!mime) return { ok: false, error: 'Only JPEG, PNG or WebP images are accepted.' }
  const declared = String(declaredMime ?? '').toLowerCase()
  if (declared && declared !== mime) return { ok: false, error: 'The file type does not match its contents.' }
  const ext = extensionOf(filename)
  if (ext && MIME_BY_EXT[ext] !== mime) return { ok: false, error: 'The file extension does not match its contents.' }
  const size = imageSize(buf, mime)
  if (!size || !Number.isInteger(size.width) || !Number.isInteger(size.height)) {
    return { ok: false, error: 'The image dimensions could not be read.' }
  }
  if (size.width < MIN_DIM || size.height < MIN_DIM) return { ok: false, error: `Images must be at least ${MIN_DIM}px on each side.` }
  if (size.width > MAX_DIM || size.height > MAX_DIM) return { ok: false, error: `Images must be at most ${MAX_DIM}px on each side.` }
  return { ok: true, mime, ext: EXT_BY_MIME[mime], width: size.width, height: size.height, bytes: buf.length }
}

const PRODUCT_DIR_RE = /^[1-9][0-9]{0,9}$/
const FILE_RE = /^[0-9a-f]{32}\.(jpg|png|webp)$/

/**
 * Validate media route segments ["<productId>", "<32 hex>.<ext>"].
 * @returns {{ storageKey: string, mime: string } | null}
 */
export function parseMediaPath(segments) {
  if (!Array.isArray(segments) || segments.length !== 2) return null
  const [dir, file] = segments
  if (typeof dir !== 'string' || typeof file !== 'string') return null
  if (!PRODUCT_DIR_RE.test(dir) || !FILE_RE.test(file)) return null
  return { storageKey: `${dir}/${file}`, mime: MIME_BY_EXT[file.slice(file.lastIndexOf('.') + 1)] }
}

/** True for a well-formed storage key "<productId>/<32 hex>.<ext>". */
export function isStorageKey(key) {
  return typeof key === 'string' && parseMediaPath(key.split('/')) !== null
}

/** Public URL of an image row: '/media/products/<key>' for uploads, the static path otherwise. */
export function imageUrl(img) {
  if (!img) return null
  if (img.source === 'UPLOAD') return isStorageKey(img.storageKey) ? `${MEDIA_PREFIX}${img.storageKey}` : null
  return img.url ?? null
}

/**
 * CSRF guard for the upload route: the request's Origin must equal the
 * configured app origin (BETTER_AUTH_URL), and Sec-Fetch-Site, when sent, must
 * be same-origin. A missing Origin is rejected.
 */
export function isSameOriginRequest(headers, appUrl) {
  let expected
  try {
    expected = new URL(appUrl).origin
  } catch {
    return false
  }
  const origin = headers?.get?.('origin')
  if (!origin || origin === 'null' || origin !== expected) return false
  const site = headers.get('sec-fetch-site')
  return !site || site === 'same-origin'
}
