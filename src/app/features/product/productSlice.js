import { createSlice } from "@reduxjs/toolkit";
import { watches } from "../../../data/catalog.js";

const initialState = {
  value: watches,
}

export const productSlice = createSlice({
  name: "productSlice",
  initialState,
  reducers: {
    //your logic
  }
})

export const { } = productSlice.actions;
export default productSlice.reducer;