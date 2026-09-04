import { createListenerMiddleware } from '@reduxjs/toolkit';

import { logoutSession } from '../services/auth';
import { logout } from './authSlice';
import type { RootState } from './store';

/**
 * Side effects that hang off auth actions.
 *
 * Sign-out is dispatched from several places — the account screen, the admin
 * dashboard, and the http client when a refresh fails — so revoking the token
 * belongs here rather than at each call site, where it would inevitably be
 * forgotten in one of them.
 */
export const authListener = createListenerMiddleware();

authListener.startListening({
  actionCreator: logout,
  effect: async (_action, listenerApi) => {
    // Read from the pre-action state: the reducer has already cleared the
    // token by the time this runs, and the revoke needs the value it had.
    const { refreshToken } = (listenerApi.getOriginalState() as RootState).auth;

    // Resolves either way. A failed revoke must not strand the user in a
    // signed-in shell they have already asked to leave; the token expires on
    // its own regardless.
    await logoutSession(refreshToken);
  },
});

export default authListener;
