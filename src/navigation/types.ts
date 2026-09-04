import type { AssignedShop, UserRole } from '../store/authSlice';
import type { OrderStatus } from '../types/admin';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

/** Re-exported so the auth screens have one source for the outlet shape. */
export type { AssignedShop };

/**
 * Everything gathered during onboarding but not yet committed to the auth
 * store. It is threaded through the remaining auth screens as a route param
 * and only dispatched to Redux on the final "Go to Dashboard" tap — dispatching
 * earlier would flip `isAuthenticated` and swap the navigator out mid-flow.
 */
export type PendingSession = {
  userId: string;
  /** The access token; paired with `refreshToken` so the session can renew. */
  token: string;
  refreshToken: string;
  role: UserRole;
  /** Display form, e.g. "+91 98765 43210". */
  phone: string;
  fullName?: string;
  email?: string;
  photoUri?: string;
  /** FR-4 — every outlet this login can act on; empty for admin and support. */
  shops: AssignedShop[];
};

export type AuthStackParamList = {
  Splash: undefined;
  Landing: undefined;
  /** Identifier + password sign-in, the default entry point. */
  Login: undefined;
  /** FR-1 mobile-number + OTP sign-in, reached from the login screen. */
  OtpLogin: undefined;
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

/* -------------------------------------------------------------------------- */
/* Admin (franchise owner)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Three tabs, each owning a stack. Details are pushed inside their tab's stack
 * so the tab bar stays visible and the back gesture returns to the list the
 * admin came from.
 */
export type AdminTabParamList = {
  DashboardTab: undefined;
  ShopsTab: undefined;
  OrdersTab: undefined;
  /** FR-5, FR-6, FR-15 — catalogue, price lists and categories. */
  CatalogueTab: undefined;
};

/**
 * The catalogue is a top-level admin job rather than a detail of the
 * dashboard, so it owns a tab and a stack of its own.
 */
export type AdminCatalogueStackParamList = {
  Catalogue: undefined;
};

export type AdminDashboardStackParamList = {
  AdminDashboard: undefined;
  /** FR-37 — the full consolidated plan; defaults to tomorrow's delivery. */
  ProductionPlan: { deliveryDate?: string } | undefined;
  ProductionDetail: { deliveryDate: string; productId: string };
  /** Batch B placeholders, routed now so dashboard quick actions never dead-end. */
  CutoffSettings: undefined;
  Offers: undefined;
  PaymentsQueue: undefined;
  Reports: undefined;
};

export type AdminShopsStackParamList = {
  ShopsList: undefined;
  ShopDetails: { shopId?: string; mode?: 'view' | 'edit' | 'create' };
  /** Reached from a shop's order history. */
  OrderDetails: { orderId: string };
  /** FR-40 — pushed from an order that cannot be fulfilled in full. */
  ShortSupply: { orderId: string };
};

export type AdminOrdersStackParamList = {
  /** Pre-filtered when a dashboard tile deep-links into the queue. */
  OrdersList: { status?: OrderStatus | 'pending_cutoff'; shopId?: string } | undefined;
  OrderDetails: { orderId: string };
  /** FR-40 — pushed from an order that cannot be fulfilled in full. */
  ShortSupply: { orderId: string };
  ShopDetails: { shopId?: string; mode?: 'view' | 'edit' | 'create' };
};
