'use client'

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
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
import { showCartNotice, toggleCartSidebar } from './cSidebarSlice'
import { createClickGuard } from './clickGuard'

// Clicks on the same line less than this far apart form one burst (see clickGuard).
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

// Cart feedback: inside the sidebar while it's open (a floating toast would cover
// its Checkout / View cart buttons), otherwise a toast. A fixed toastId reuses one
// toast instead of stacking duplicates.
const notify = (dispatch, store, type, text, toastId) => {
  if (store.getState().cSidebar.value) {
    dispatch(showCartNotice({ type, text }))
  } else {
    toast[type](text, toastId ? { id: toastId } : undefined)
  }
}

// Cart line actions with their user feedback, shared by the cart page and
// sidebar so both behave identically.
export const useCartActions = () => {
  const dispatch = useDispatch()
  const store = useStore()

  return useMemo(() => ({
    increase: (line) => {
      if (line.quantity >= MAX_LINE_QUANTITY) {
        notify(dispatch, store, 'error', `Maximum ${MAX_LINE_QUANTITY} per item.`, 'cart-max-quantity')
        return
      }
      dispatch(incrementQuantity(line.lineId))
    },

    decrease: (line) => {
      dispatch(decrementQuantity(line.lineId))
    },

    remove: (lineId) => {
      dispatch(removeItem(lineId))
      notify(dispatch, store, 'success', "Product removed Successfully!")
    },

    clear: () => {
      if (!window.confirm("Remove all items from your cart?")) return
      dispatch(clearCart())
      notify(dispatch, store, 'success', "Cart cleared.")
    },
  }), [dispatch, store])
}

// Add-to-cart with its feedback: the cart sidebar opens and shows one notice
// per outcome. Returns 'added' | 'capped' | 'max' | 'invalid' | 'ignored'.
// payload: { kind, productId, options?, quantity? = 1 }
export const useAddToCart = () => {
  const dispatch = useDispatch()
  const store = useStore()
  const [clickGuard] = useState(() => createClickGuard(DOUBLE_CLICK_MS))

  return useCallback((payload) => {
    const { cart } = store.getState()
    // Before the saved cart loads, an add would be overwritten by hydration.
    if (!cart.hydrated) return 'ignored'

    const { outcome, lineId } = getAddOutcome(cart.lines, payload)

    if (outcome === 'invalid') {
      toast.error("This item can't be added to the cart.", { id: 'cart-invalid' })
      return outcome
    }

    // Only the first click of a rapid burst counts; the rest just keep the sidebar open.
    if (clickGuard.isRepeat(lineId, Date.now())) {
      dispatch(toggleCartSidebar(true))
      return 'ignored'
    }

    // Open first so the feedback lands inside the sidebar (see notify).
    dispatch(toggleCartSidebar(true))
    if (outcome === 'max') {
      notify(dispatch, store, 'error', `Maximum ${MAX_LINE_QUANTITY} per item.`, 'cart-max-quantity')
    } else {
      dispatch(addItem(payload))
      const name = payload.kind === 'product' ? payload.summary?.name ?? 'Item' : getCatalogItem(payload.kind, payload.productId).name
      notify(
        dispatch,
        store,
        'success',
        outcome === 'capped' ? `Quantity limited to ${MAX_LINE_QUANTITY} per item.` : `${name} added to cart`,
        'cart-added'
      )
    }
    return outcome
  }, [dispatch, store, clickGuard])
}
