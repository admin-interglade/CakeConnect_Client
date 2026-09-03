import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * PRD §3. `supportStaff` maps to the backend's SUPPORT_STAFF: admin-delegated,
 * read-mostly access for order processing, without financial controls.
 */
export type UserRole = 'admin' | 'shopOwner' | 'supportStaff';

export type AssignedShop = {
  id: string;
  name: string;
  code: string;
  area: string;
};

export type AppUser = {
  id: string;
  phone: string;
  email?: string;
  role: UserRole;
  name?: string;
  photoUri?: string;
};

type AuthState = {
  isAuthenticated: boolean;
  user: AppUser | null;
  /** The short-lived access token sent as `Authorization: Bearer`. */
  token: string | null;
  /**
   * Exchanged for a fresh access token at `POST /auth/refresh-token` when one
   * expires, so a session outlives its access token rather than dropping the
   * user back to the login screen.
   */
  refreshToken: string | null;
  /**
   * FR-4 — one owner may hold several outlets under a single login. Empty for
   * admins and support staff, who work across the network rather than from a
   * shop.
   */
  shops: AssignedShop[];
  /**
   * The outlet every shop-scoped request is made against. The switcher UI is
   * Phase 2, but the field exists now so no call site has to be rewritten when
   * it arrives.
   */
  activeShopId: string | null;
  /** Whether the user opted into biometric unlock during onboarding. */
  biometricsEnabled: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  shops: [],
  activeShopId: null,
  biometricsEnabled: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: AppUser;
        token: string;
        refreshToken: string;
        shops?: AssignedShop[];
        biometricsEnabled?: boolean;
      }>,
    ) => {
      const shops = action.payload.shops ?? [];

      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.shops = shops;
      // Until the Phase 2 switcher exists, the first outlet is the active one.
      state.activeShopId = shops[0]?.id ?? null;
      state.biometricsEnabled = action.payload.biometricsEnabled ?? false;
    },

    /**
     * Written by the http client after a silent refresh. The backend may or may
     * not rotate the refresh token, so an absent one leaves the current one in
     * place rather than clearing it.
     */
    setTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken?: string }>,
    ) => {
      state.token = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
    },

    /** FR-4 — Phase 2 switcher; ignores an outlet this login cannot act on. */
    setActiveShop: (state, action: PayloadAction<string>) => {
      if (state.shops.some(shop => shop.id === action.payload)) {
        state.activeShopId = action.payload;
      }
    },

    setBiometricsEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricsEnabled = action.payload;
    },

    logout: state => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.shops = [];
      state.activeShopId = null;
      state.biometricsEnabled = false;
    },
  },
});

export const {
  setCredentials,
  setTokens,
  setActiveShop,
  setBiometricsEnabled,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
