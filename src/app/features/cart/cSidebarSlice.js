import { createSlice } from "@reduxjs/toolkit";

const cSidebarSlice = createSlice({
    name: 'cartSide',
    initialState: {
        value: false,
    },
    reducers: {
        toggleCartSidebar: (state, action) => {
            state.value = action.payload
        }
    }
});

export const { toggleCartSidebar } = cSidebarSlice.actions;
export default cSidebarSlice.reducer;