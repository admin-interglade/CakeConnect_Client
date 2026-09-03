import { configureStore } from '@reduxjs/toolkit';
import {
  persistReducer,
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './authSlice';
import ordersReducer from './ordersSlice';
import { authListener } from './authListener';

// `whitelist` names keys *inside* the auth slice, not the slice itself.
const persistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: [
    'isAuthenticated',
    'user',
    'token',
    // Without this the session cannot outlive a cold start: the access token
    // rehydrates already expired and there is nothing to exchange for a new one.
    'refreshToken',
    // FR-4 — the outlet list and the active selection have to survive a restart
    // or every cold start would land a multi-outlet owner on no shop at all.
    'shops',
    'activeShopId',
    'biometricsEnabled',
  ],
};

const persistedAuthReducer = persistReducer(persistConfig, authReducer);
const persistedOrdersReducer = persistReducer(
  { key: 'orders', storage: AsyncStorage, whitelist: ['cart', 'pendingSync'] },
  ordersReducer,
);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    orders: persistedOrdersReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
      // Prepended so the listener sees the pre-action state and can read the
      // refresh token the logout reducer is about to clear.
    }).prepend(authListener.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
