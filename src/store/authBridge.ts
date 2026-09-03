import { configureHttpClient } from '../services/api';
import { logout, setTokens } from './authSlice';
import { store } from './store';

/**
 * Connects the axios instance to the store without either module importing the
 * other (store -> slices -> services -> store would be a cycle). Called once
 * from `App.tsx`, before the first request can be made.
 */
export function connectHttpClientToStore() {
  configureHttpClient({
    getToken: () => store.getState().auth.token,
    getRefreshToken: () => store.getState().auth.refreshToken,

    // Only reached once a refresh has been attempted and failed, so the session
    // really is over rather than merely stale.
    onUnauthorized: () => {
      store.dispatch(logout());
    },

    onTokensRefreshed: tokens => {
      store.dispatch(setTokens(tokens));
    },
  });
}
