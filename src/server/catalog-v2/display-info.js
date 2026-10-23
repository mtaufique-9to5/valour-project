// products.additional_info (Decision 1): storefront display details that have no
// column of their own. Only these keys are edited by the admin form; they mirror
// what src/data/catalog.js holds today, so nothing new is invented. Unknown keys
// already stored in the JSON are kept untouched. Pure; unit tested.
import { z } from 'zod'

const text = (max) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined))

// One spec row: { label, value } (both required).
const specRow = z.object({ label: z.string().trim().min(1).max(80), value: z.string().trim().min(1).max(200) }).strict()
const specRows = (max) => z.array(specRow).max(max).optional().transform((v) => (v?.length ? v : undefined))
const dropEmpty = (o) => {
  const out = Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined))
  return Object.keys(out).length ? out : undefined
}
// A product page section: optional heading and paragraph (and spec table where the page has one).
const section = (withSpecs) => z.object({
  heading: text(120),
  text: text(5000),
  ...(withSpecs ? { specs: specRows(20) } : {}),
}).strict().optional().transform((v) => (v ? dropEmpty(v) : undefined))

// Product detail page content (owner decision): every product-specific heading,
// paragraph and spec table of the watch page. Empty fields are left out and the
// storefront hides them (no placeholder text). Section IMAGES are not part of this
// form; they live in additional_info.media and change only through the image actions.
export const pdpSchema = z.object({
  hero: z.object({ subtitle: text(120) }).strict().optional().transform((v) => (v ? dropEmpty(v) : undefined)),
  intro: section(true),
  parallax1: section(false),
  parallax2: section(false),
  movement: section(true),
  dial: section(true),
  strap: section(false),
}).strict()

export const PDP_SECTIONS = Object.freeze(Object.keys(pdpSchema.shape))

// Dedicated product page image roles, stored as image paths in additional_info.media.
// Watches use all but `detail`; straps use `hero` (strap hero) and `detail` (the
// large image of the strap details section). A product is only ever one type.
export const MEDIA_ROLES = Object.freeze(['hero', 'parallax1', 'parallax2', 'introLeft', 'introRight', 'movement', 'dial', 'strapLeft', 'strapRight', 'detail'])

const displayInfoShape = z.object({
  subtitle: text(120),
  collection: text(80),
  movement: text(80),
  material: text(80),
  color: text(80),
  tagline: text(200),
  pdpSubtitle: text(200),
  accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Use a colour like #FACC15.').optional().or(z.literal('').transform(() => undefined)),
  limited: z.boolean().optional(),
  edition: text(40),
  editions: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
  specs: z.array(specRow).max(40).optional(),
  pdp: pdpSchema.optional().transform((v) => (v ? dropEmpty(v) : undefined)),
}).strict()

// Drop fields left empty, so only real values are stored.
export const displayInfoSchema = displayInfoShape.transform((v) => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined)))

export const DISPLAY_KEYS = Object.freeze(Object.keys(displayInfoShape.shape))

/** Stored JSON (object, string or null) -> plain object. */
export function readAdditionalInfo(value) {
  if (!value) return {}
  if (typeof value === 'string') {
    try { return readAdditionalInfo(JSON.parse(value)) } catch { return {} }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {}
}

/** The editable display fields of a stored value (other keys left out). */
export function pickDisplayInfo(value) {
  const all = readAdditionalInfo(value)
  return Object.fromEntries(DISPLAY_KEYS.filter((k) => all[k] !== undefined && all[k] !== null).map((k) => [k, all[k]]))
}

/**
 * Merge validated display fields into the stored JSON: listed keys are replaced
 * (an empty field removes the key), every other stored key is preserved.
 * Returns null when nothing is left.
 */
export function mergeDisplayInfo(stored, display) {
  const base = readAdditionalInfo(stored)
  const out = Object.fromEntries(Object.entries(base).filter(([k]) => !DISPLAY_KEYS.includes(k)))
  for (const k of DISPLAY_KEYS) {
    const v = display[k]
    if (v === undefined || (Array.isArray(v) && v.length === 0)) continue
    out[k] = v
  }
  return Object.keys(out).length ? out : null
}

/** Stored section images: { role: path } for known roles with a string value. */
export function readMedia(value) {
  const media = readAdditionalInfo(value).media
  if (!media || typeof media !== 'object' || Array.isArray(media)) return {}
  return Object.fromEntries(MEDIA_ROLES.filter((r) => typeof media[r] === 'string' && media[r]).map((r) => [r, media[r]]))
}

/** Stored JSON with one section image set (path) or removed (null); everything else kept. */
export function withMedia(stored, role, path) {
  if (!MEDIA_ROLES.includes(role)) throw new RangeError('unknown image role')
  const base = readAdditionalInfo(stored)
  const media = { ...readMedia(base) }
  if (path) media[role] = path
  else delete media[role]
  const out = { ...base }
  if (Object.keys(media).length) out.media = media
  else delete out.media
  return out
}
