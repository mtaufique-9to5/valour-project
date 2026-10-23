'use client'

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { hydrateCart, isDbProductId, isUnrecognizedLine, setProductSummaries } from './features/cart/cartSlice'
import { CART_STORAGE_KEY, loadCart, setPreservedLines } from './features/cart/cartStorage'

// Database products in the saved cart are re-read from the server (name, image,
// current price, availability); browser-stored data is never trusted. Products
// no longer published are removed from the cart. On a network error the lines
// are kept and simply not shown until the next successful load.
async function refreshProductSummaries(dispatch, lines) {
  const ids = [...new Set(lines.filter((l) => l?.kind === 'product' && isDbProductId(l.productId)).map((l) => l.productId))].slice(0, 50)
  if (!ids.length) return
  try {
    const res = await fetch(`/api/products/summary/?ids=${ids.join(',')}`, { cache: 'no-store' })
    if (!res.ok) return
    const { products } = await res.json()
    dispatch(setProductSummaries({ ids, found: products ?? {} }))
  } catch {
    // Offline or server unavailable: try again on the next load.
  }
}

// Loads the saved cart after the first client render (so server and client
// markup match), and reloads it when another tab changes it.
const CartHydrator = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    const syncFromStorage = () => {
      const saved = loadCart()
      // Keep lines this tab can't show so its own saves don't delete them.
      setPreservedLines(saved.filter(isUnrecognizedLine))
      dispatch(hydrateCart(saved))
      refreshProductSummaries(dispatch, saved)
    }

    syncFromStorage()

    const onStorage = (e) => {
      // e.key is null when another tab calls localStorage.clear().
      if (e.key === CART_STORAGE_KEY || e.key === null) syncFromStorage()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dispatch])

  return null
}

export default CartHydrator
