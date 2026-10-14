import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import {
  addItem,
  clearCart,
  decrementQuantity,
  incrementQuantity,
  removeItem,
  setQuantity,
} from './cartSlice.js'
import { saveCart, setPreservedLines } from './cartStorage.js'

// Saves the cart after user actions only. Loading it (hydrateCart) never writes:
// storage already holds that data, and writing this tab's filtered copy back
// would delete lines it doesn't recognise, e.g. ones from a tab on a newer catalog.
export const createCartPersistence = () => {
  const listener = createListenerMiddleware()

  listener.startListening({
    matcher: isAnyOf(addItem, setQuantity, incrementQuantity, decrementQuantity, removeItem, clearCart),
    effect: (action, api) => {
      const { lines, hydrated } = api.getState().cart
      // Before the saved cart has loaded, saving would overwrite it.
      if (!hydrated) return
      // Clearing means empty, including lines this tab couldn't show.
      if (clearCart.match(action)) setPreservedLines([])
      saveCart(lines)
    },
  })

  return listener.middleware
}
