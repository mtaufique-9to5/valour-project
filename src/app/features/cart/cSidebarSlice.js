import { createSlice } from "@reduxjs/toolkit";

const cSidebarSlice = createSlice({
    name: 'cartSide',
    initialState: {
        value: false,
        // Cart feedback shown inside the open sidebar: { type, text, id } or null.
        notice: null,
    },
    reducers: {
        toggleCartSidebar: (state, action) => {
            state.value = action.payload
            if (!action.payload) state.notice = null
        },
        // A floating toast would cover the sidebar's Checkout / View cart buttons,
        // so while it's open, feedback goes here. A new id lets a repeated message
        // restart its timer.
        showCartNotice: (state, action) => {
            state.notice = { type: action.payload.type, text: action.payload.text, id: (state.notice?.id ?? 0) + 1 }
        },
        // payload: the id of the notice to clear, so a newer notice isn't removed early.
        clearCartNotice: (state, action) => {
            if (state.notice?.id === action.payload) state.notice = null
        },
    }
});

export const { toggleCartSidebar, showCartNotice, clearCartNotice } = cSidebarSlice.actions;
export default cSidebarSlice.reducer;
