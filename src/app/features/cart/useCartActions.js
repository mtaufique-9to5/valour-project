'use client'

import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import toast from 'react-hot-toast'
import { getCatalogItem } from '@/data/catalog'
import {
  MAX_LINE_QUANTITY,
  addItem,
  clearCart,
  decrementQuantity,
  getAddOutcome,
  incrementQuantity,
  removeItem,
  selectCartHydrated,
} from './cartSlice'
import { toggleCartSidebar } from './cSidebarSlice'

// Repeat adds of the same line within this window are treated as a double-click.
const DOUBLE_CLICK_MS = 400

const subscribeNoop = () => () => {}

// True once the saved cart is loaded AND this component has finished hydrating.
// The store flag alone isn't enough: page segments can hydrate after the layout
// has already loaded the cart, and rendering cart data in that hydration pass
// wouldn't match the server HTML. useSyncExternalStore returns the server
// snapshot (false) while hydrating, then true.
export const useCartReady = () => {
  const isClient = useSyncExternalStore(subscribeNoop, () => true, () => false)
  const hydrated = useSelector(selectCartHydrated)
  return isClient && hydrated
}

// Cart line actions with their user feedback, shared by the cart page and
// sidebar so both behave identically.
export const useCartActions = () => {
  const dispatch = useDispatch()

  return useMemo(() => ({
    increase: (line) => {
      if (line.quantity >= MAX_LINE_QUANTITY) {
        // Fixed id: repeated clicks reuse one toast instead of stacking duplicates.
        toast.error(`Maximum ${MAX_LINE_QUANTITY} per item.`, { id: 'cart-max-quantity' })
        return
      }
      dispatch(incrementQuantity(line.lineId))
    },

    decrease: (line) => {
      dispatch(decrementQuantity(line.lineId))
    },

    remove: (lineId) => {
      dispatch(removeItem(lineId))
      toast.success("Product removed Successfully!")
    },

    clear: () => {
      if (!window.confirm("Remove all items from your cart?")) return
      dispatch(clearCart())
      toast.success("Cart cleared.")
    },
  }), [dispatch])
}

// Add-to-cart with its feedback: one toast per outcome (fixed ids) and the
// cart sidebar opens. Returns 'added' | 'capped' | 'max' | 'invalid' | 'ignored'.
// payload: { kind, productId, options?, quantity? = 1 }
export const useAddToCart = () => {
  const dispatch = useDispatch()
  const store = useStore()
  const lastAddRef = useRef({ lineId: null, time: 0 })

  return useCallback((payload) => {
    const { cart } = store.getState()
    // Before the saved cart loads, an add would be overwritten by hydration.
    if (!cart.hydrated) return 'ignored'

    const { outcome, lineId } = getAddOutcome(cart.lines, payload)

    if (outcome === 'invalid') {
      toast.error("This item can't be added to the cart.", { id: 'cart-invalid' })
      return outcome
    }

    const now = Date.now()
    const last = lastAddRef.current
    if (last.lineId === lineId && now - last.time < DOUBLE_CLICK_MS) {
      dispatch(toggleCartSidebar(true))
      return 'ignored'
    }
    lastAddRef.current = { lineId, time: now }

    if (outcome === 'max') {
      toast.error(`Maximum ${MAX_LINE_QUANTITY} per item.`, { id: 'cart-max-quantity' })
    } else {
      dispatch(addItem(payload))
      const { name } = getCatalogItem(payload.kind, payload.productId)
      toast.success(
        outcome === 'capped' ? `Quantity limited to ${MAX_LINE_QUANTITY} per item.` : `${name} added to cart`,
        { id: 'cart-added' }
      )
    }
    dispatch(toggleCartSidebar(true))
    return outcome
  }, [dispatch, store])
}
