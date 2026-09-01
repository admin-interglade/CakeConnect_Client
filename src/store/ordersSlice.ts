import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
};

export type CartItem = Product & { quantity: number };

type OrdersState = {
  cart: CartItem[];
  lastOrderTotal: number;
  pendingSync: boolean;
};

const initialState: OrdersState = {
  cart: [],
  lastOrderTotal: 0,
  pendingSync: false,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<Product>) => {
      const item = state.cart.find(product => product.id === action.payload.id);
      if (item) item.quantity += 1;
      else state.cart.push({ ...action.payload, quantity: 1 });
      state.pendingSync = true;
    },
    updateQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>,
    ) => {
      const item = state.cart.find(product => product.id === action.payload.productId);
      if (!item) return;
      if (action.payload.quantity <= 0) {
        state.cart = state.cart.filter(product => product.id !== action.payload.productId);
      } else item.quantity = action.payload.quantity;
      state.pendingSync = true;
    },
    submitOrder: state => {
      state.lastOrderTotal = state.cart.reduce(
        (total, item) => total + item.price * item.quantity,
        0,
      );
      state.cart = [];
      state.pendingSync = false;
    },
  },
});

export const { addToCart, updateQuantity, submitOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
