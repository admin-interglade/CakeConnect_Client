import type { UserRole } from '../store/authSlice';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

/** The franchise outlet the backend assigns to a shop owner at verification. */
export type AssignedShop = {
  id: string;
  name: string;
  code: string;
  area: string;
};

/**
 * Everything gathered during onboarding but not yet committed to the auth
 * store. It is threaded through the remaining auth screens as a route param
 * and only dispatched to Redux on the final "Go to Dashboard" tap — dispatching
 * earlier would flip `isAuthenticated` and swap the navigator out mid-flow.
 */
export type PendingSession = {
  userId: string;
  token: string;
  role: UserRole;
  /** Display form, e.g. "+91 98765 43210". */
  phone: string;
  fullName?: string;
  email?: string;
  photoUri?: string;
  assignedShop?: AssignedShop;
};

export type AuthStackParamList = {
  Splash: undefined;
  Landing: undefined;
  Login: undefined;
  Verification: {
    dialCode: string;
    nationalNumber: string;
    resendAfterSeconds: number;
  };
  Profile: { session: PendingSession };
  Biometric: { session: PendingSession };
  AllSet: { session: PendingSession; biometricsEnabled: boolean };
};

export type MainTabParamList = {
  HomeTab: undefined;
  CatalogueTab: undefined;
  CartTab: undefined;
  PaymentsTab: undefined;
  AccountTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
};

export type PaymentsStackParamList = {
  PaymentsHome: undefined;
  PaymentDetail: { invoiceId: string };
};

export type AccountStackParamList = {
  AccountHome: undefined;
  Profile: undefined;
};
