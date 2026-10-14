import { createSelector, createSlice } from '@reduxjs/toolkit'
import {
  describeOptions,
  getCatalogItem,
  getLineLayers,
  getUnitPrice,
  validateOptions,
} from '../../../data/catalog.js'

export const MAX_LINE_QUANTITY = 10

// Lines store references only ({ kind, productId, options, quantity }), never
// prices or product details — those are looked up from the catalog in selectors,
// so editing localStorage can't change what anything costs.
const initialState = {
  lines: [],
  // False until the saved cart has been loaded; persistence waits for this.
  hydrated: false,
}

// Same kind + product + options => same line (quantities merge). Option order
// doesn't matter; any differing option (variant, customization) is a new line.
export const makeLineId = (kind, productId, options = {}) => {
  const opts = Object.keys(options).sort().map((key) => `${key}=${options[key]}`).join(',')
  return opts ? `${kind}:${productId}|${opts}` : `${kind}:${productId}`
}

const clampQuantity = (quantity) => Math.min(Math.max(quantity, 1), MAX_LINE_QUANTITY)

const isPlainOptions = (options) =>
  options !== null &&
  typeof options === 'object' &&
  !Array.isArray(options) &&
  Object.values(options).every((value) => typeof value === 'string' || typeof value === 'number')

// Turns untrusted input (storage, action payloads) into a valid line, or null.
export const normalizeLine = (raw) => {
  if (raw === null || typeof raw !== 'object') return null
  const { kind, productId, options = {}, quantity } = raw
  if (!getCatalogItem(kind, productId)) return null
  if (!isPlainOptions(options)) return null
  if (!validateOptions(kind, productId, options)) return null
  if (!Number.isInteger(quantity) || quantity < 1) return null
  return {
    lineId: makeLineId(kind, productId, options),
    kind,
    productId,
    options: { ...options },
    quantity: clampQuantity(quantity),
  }
}

// Predicts what adding payload ({ kind, productId, options?, quantity? = 1 })
// to lines would do, so the UI can pick its feedback before dispatching addItem.
// outcome: 'invalid' | 'max' (already at the limit) | 'capped' (add is clamped) | 'added'
export const getAddOutcome = (lines, payload) => {
  const line = normalizeLine({ quantity: 1, ...payload })
  if (!line) return { outcome: 'invalid', lineId: null }
  const existing = lines.find((l) => l.lineId === line.lineId)
  const current = existing ? existing.quantity : 0
  if (current >= MAX_LINE_QUANTITY) return { outcome: 'max', lineId: line.lineId }
  // Use the requested amount: normalizeLine has already clamped line.quantity.
  const requested = payload.quantity ?? 1
  if (current + requested > MAX_LINE_QUANTITY) return { outcome: 'capped', lineId: line.lineId }
  return { outcome: 'added', lineId: line.lineId }
}

const mergeLine = (lines, line) => {
  const existing = lines.find((l) => l.lineId === line.lineId)
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + line.quantity)
  } else {
    lines.push(line)
  }
}

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {

    hydrateCart: (state, action) => {
      const lines = []
      if (Array.isArray(action.payload)) {
        action.payload.map(normalizeLine).filter(Boolean).forEach((line) => mergeLine(lines, line))
      }
      state.lines = lines
      state.hydrated = true
    },

    // payload: { kind, productId, options?, quantity? = 1 }
    addItem: (state, action) => {
      const line = normalizeLine({ quantity: 1, ...action.payload })
      if (line) mergeLine(state.lines, line)
    },

    // payload: { lineId, quantity }
    setQuantity: (state, action) => {
      const { lineId, quantity } = action.payload
      const line = state.lines.find((l) => l.lineId === lineId)
      if (line && Number.isInteger(quantity) && quantity >= 1) {
        line.quantity = clampQuantity(quantity)
      }
    },

    // payload: lineId
    incrementQuantity: (state, action) => {
      const line = state.lines.find((l) => l.lineId === action.payload)
      if (line) line.quantity = clampQuantity(line.quantity + 1)
    },

    // payload: lineId
    decrementQuantity: (state, action) => {
      const line = state.lines.find((l) => l.lineId === action.payload)
      if (line) line.quantity = clampQuantity(line.quantity - 1)
    },

    // payload: lineId
    removeItem: (state, action) => {
      state.lines = state.lines.filter((l) => l.lineId !== action.payload)
    },

    clearCart: (state) => {
      state.lines = []
    },

  },
})

export const {
  hydrateCart,
  addItem,
  setQuantity,
  incrementQuantity,
  decrementQuantity,
  removeItem,
  clearCart,
} = cartSlice.actions

export default cartSlice.reducer

// ─── Selectors ──────────────────────────────────────────────────────────────

const selectRawLines = (state) => state.cart.lines

export const selectCartHydrated = (state) => state.cart.hydrated

// Lines joined with catalog data. unitPrice / lineTotal are null for items
// without a confirmed price ("Price on request"). Custom watches have no
// slug/image/edition: render `layers` (stacked images) and link to `href`.
export const selectCartLines = createSelector([selectRawLines], (lines) =>
  lines.flatMap((line) => {
    const item = getCatalogItem(line.kind, line.productId)
    if (!item) return []
    const unitPrice = getUnitPrice(line.kind, line.productId)
    return [{
      ...line,
      name: item.name,
      slug: item.slug,
      image: item.image,
      edition: item.edition,
      optionLabels: describeOptions(line.kind, line.options),
      layers: getLineLayers(line.kind, line.options),
      href: line.kind === 'custom' ? '/customizer' : `/our-shop/${item.slug}`,
      unitPrice,
      lineTotal: unitPrice === null ? null : unitPrice * line.quantity,
    }]
  })
)

export const selectCartCount = createSelector([selectRawLines], (lines) =>
  lines.reduce((sum, line) => sum + line.quantity, 0)
)

// Sum of priced lines only; check selectHasUnpricedItems before presenting it as a total.
export const selectSubtotal = createSelector([selectCartLines], (lines) =>
  lines.reduce((sum, line) => (line.lineTotal === null ? sum : sum + line.lineTotal), 0)
)

export const selectHasUnpricedItems = createSelector([selectCartLines], (lines) =>
  lines.some((line) => line.unitPrice === null)
)

export const selectHasPricedItems = createSelector([selectCartLines], (lines) =>
  lines.some((line) => line.unitPrice !== null)
)
