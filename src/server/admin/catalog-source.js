import 'server-only'
import { getProductPrice, straps, watches } from '@/data/catalog'

// Until the catalog moves into the database, the admin reads products straight
// from src/data/catalog.js — the same source the storefront uses — read-only.
// Prices come only from CONFIRMED_PRICES (null = "Price on request").
const toRow = (p) => ({
  id: p.key,
  type: p.type,
  name: p.name,
  slug: p.slug,
  ref: p.ref,
  subtitle: p.subtitle ?? (p.type === 'strap' ? 'Strap' : ''),
  collection: p.collection ?? null,
  movement: p.movement ?? null,
  image: p.image,
  price: getProductPrice(p),
  status: 'Published',
})

export const catalogWatches = () => watches.map(toRow)
export const catalogStraps = () => straps.map(toRow)
export const catalogProducts = () => [...catalogWatches(), ...catalogStraps()]
