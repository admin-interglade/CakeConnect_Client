import { configureHttpClient } from '../services/httpClient';
import { logout } from './authSlice';
import { store } from './store';

/**
 * Connects the axios instance to the store without either module importing the
 * other (store -> slices -> services -> store would be a cycle). Called once
 * from `App.tsx`, before the first request can be made.
 */
export function connectHttpClientToStore() {
  configureHttpClient({
    getToken: () => store.getState().auth.token,
    onUnauthorized: () => {
      store.dispatch(logout());
    },
  });
}
