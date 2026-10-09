import { configureStore } from '@reduxjs/toolkit'
import cartReducer from './features/cart/cartSlice'
import  cSidebarReducer  from './features/cart/cSidebarSlice'
import  productReducer  from './features/product/productSlice'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    cSidebar: cSidebarReducer,
    product: productReducer
  },
})