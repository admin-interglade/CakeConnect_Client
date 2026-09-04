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
import cartReducer from './cartSlice';
import { authListener } from './authListener';

/**
 * Disables redux-persist's 5s rehydrate timeout.
 *
 * When storage answers after the timeout, PersistGate has already released the
 * app with default state and the late REHYDRATE still lands — merging the
 * stored keys over whatever the user has done since. Signing in inside that
 * window means `setCredentials` is overwritten by the logged-out state that was
 * on disk, and the user is bounced straight back to the login screen.
 *
 * 0 means "wait for storage" rather than "give up at 5s". A debug build on a
 * physical device is exactly where the read is slow enough to matter.
 */
const PERSIST_TIMEOUT_DISABLED = 0;

// `whitelist` names keys *inside* the auth slice, not the slice itself.
const persistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  timeout: PERSIST_TIMEOUT_DISABLED,
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
/**
 * FR-11 — the draft cart must survive an app restart and a connectivity loss,
 * so every field that describes the order in progress is persisted. Omitting
 * `shopId` or `deliveryDate` would rehydrate lines with nothing to bind them
 * to, and `draftOrderId` is what stops a restart creating a second server
 * draft for the same delivery date.
 */
const persistedCartReducer = persistReducer(
  {
    key: 'cart',
    storage: AsyncStorage,
    timeout: PERSIST_TIMEOUT_DISABLED,
    whitelist: [
      'shopId',
      'deliveryDate',
      'lines',
      'notes',
      'draftOrderId',
      'dirty',
      'lastSyncedAt',
    ],
  },
  cartReducer,
);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    cart: persistedCartReducer,
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
