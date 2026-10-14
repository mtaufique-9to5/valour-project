'use client'

import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { hydrateCart } from './features/cart/cartSlice'
import { CART_STORAGE_KEY, loadCart } from './features/cart/cartStorage'

// Loads the saved cart after the first client render (so server and client
// markup match), and reloads it when another tab changes it.
const CartHydrator = () => {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(hydrateCart(loadCart()))

    const onStorage = (e) => {
      // e.key is null when another tab calls localStorage.clear().
      if (e.key === CART_STORAGE_KEY || e.key === null) {
        dispatch(hydrateCart(loadCart()))
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dispatch])

  return null
}

export default CartHydrator
