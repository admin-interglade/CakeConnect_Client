import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type UserRole = 'admin' | 'shopOwner';

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
  /** Set for shop owners; admins have network-wide access instead. */
  assignedShop?: AssignedShop;
};

type AuthState = {
  isAuthenticated: boolean;
  user: AppUser | null;
  token: string | null;
  /** Whether the user opted into biometric unlock during onboarding. */
  biometricsEnabled: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
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
        biometricsEnabled?: boolean;
      }>,
    ) => {
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.biometricsEnabled = action.payload.biometricsEnabled ?? false;
    },
    setBiometricsEnabled: (state, action: PayloadAction<boolean>) => {
      state.biometricsEnabled = action.payload;
    },
    logout: state => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.biometricsEnabled = false;
    },
  },
});

export const { setCredentials, setBiometricsEnabled, logout } = authSlice.actions;

export default authSlice.reducer;
