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

// `whitelist` names keys *inside* the auth slice, not the slice itself.
const persistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['isAuthenticated', 'user', 'token', 'biometricsEnabled'],
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
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
