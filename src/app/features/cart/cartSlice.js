import { createSlice } from '@reduxjs/toolkit'
import toast from 'react-hot-toast';
if (typeof window !== "undefined") {
  localStorage.setItem("cart", JSON.stringify([  {
    id: 1,
    ref: "P-01",
    name: "Sunseeker Yellow",
    subtitle: "Aviation Excellence",
    concept: "aviation",
    range: "tourbillon",
    type: "automatic",
    material: "titanium",
    color: "yellow",
    image: "/images/watch-1.png",
    accent: "#00d4ff",
    limited: false,
    price: 499,
    edition: '17/100',
    quantity: 1,
  },]))
}

const initialState = {
  value: typeof window !== "undefined" ? JSON.parse(localStorage.getItem("cart")) || [] : [],
}
export const cartSlice = createSlice({

  name: 'cart',
  initialState,
  reducers: {

    addToCart: (state, action) => {
      const isAlreadyExists = state.value.some((item) => item.id == action.payload.id);
      if (!isAlreadyExists) {
        state.value.push(action.payload);
        localStorage.setItem("cart", JSON.stringify(state.value))
        toast.success("Added to cart Successfully!")
      } else {
        toast.error("Item already exists in cart.")
      }
    },

    removeItemInCart: (state, action) => {
      state.value = state.value.filter((item) => item.id !== action.payload);
      localStorage.setItem("cart", JSON.stringify(state.value))
    },

    updateQuantity: (state, action) => {
      if (action.payload.qty < 1) return;
      state.value = state.value.map((item) => (item.id === action.payload.id ? { ...item, quantity: action.payload.qty } : item))
      localStorage.setItem("cart", JSON.stringify(state.value))
    },


  },
})

// Action creators are generated for each case reducer function
export const { addToCart, removeItemInCart, updateQuantity } = cartSlice.actions

export default cartSlice.reducer