'use client'

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { hydrateCart, isUnrecognizedLine } from './features/cart/cartSlice'
import { CART_STORAGE_KEY, loadCart, setPreservedLines } from './features/cart/cartStorage'

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
