import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './features/cart/cartSlice'
import  cSidebarReducer  from './features/cart/cSidebarSlice'
import  productReducer  from './features/product/productSlice'
import { saveCart } from './features/cart/cartStorage'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    cSidebar: cSidebarReducer,
    product: productReducer
  },
})

// Persist the cart whenever its lines change — but only once the saved cart has
// been loaded, so the initial empty state can never overwrite it.
if (typeof window !== 'undefined') {
  let lastSavedLines
  store.subscribe(() => {
    const { lines, hydrated } = store.getState().cart
    if (!hydrated || lines === lastSavedLines) return
    lastSavedLines = lines
    saveCart(lines)
  })
}
