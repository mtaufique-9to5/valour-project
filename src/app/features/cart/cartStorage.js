// Reads and writes the saved cart. Contents are untrusted — hydrateCart
// validates every line against the catalog.

export const CART_STORAGE_KEY = 'valour-cart-v1'
const CART_STORAGE_VERSION = 1

// Pre-v1 carts stored whole product objects (including prices) and in practice
// only ever held the old hardcoded seed item, so they're dropped, not migrated.
const LEGACY_CART_KEY = 'cart'

// Well-formed saved lines this tab's catalog doesn't recognise — most likely
// written by another tab running a newer catalog. They aren't shown here, but
// every save writes them back so this tab never deletes them. Capped so stale
// entries can't pile up; clearing the cart drops them.
const MAX_PRESERVED_LINES = 50
let preservedLines = []

export const setPreservedLines = (lines) => {
  preservedLines = lines.slice(0, MAX_PRESERVED_LINES)
}

const toSavedLine = ({ kind, productId, options, quantity }) => ({ kind, productId, options, quantity })

export const loadCart = () => {
  try {
    localStorage.removeItem(LEGACY_CART_KEY)
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY))
    return saved?.version === CART_STORAGE_VERSION && Array.isArray(saved.lines) ? saved.lines : []
  } catch {
    // Corrupt JSON or storage blocked (e.g. private mode) — start with an empty cart.
    return []
  }
}

export const saveCart = (lines) => {
  const json = JSON.stringify({
    version: CART_STORAGE_VERSION,
    lines: [...lines, ...preservedLines].map(toSavedLine),
  })
  try {
    // Skipping identical writes also stops tabs echoing storage events back and forth.
    if (localStorage.getItem(CART_STORAGE_KEY) !== json) {
      localStorage.setItem(CART_STORAGE_KEY, json)
    }
  } catch {
    // Storage full or blocked — the cart keeps working for this session.
  }
}
