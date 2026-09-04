import type { NavigatorScreenParams } from '@react-navigation/native';

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

/* -------------------------------------------------------------------------- */
/* Shop owner (franchise outlet)                                               */
/* -------------------------------------------------------------------------- */

/**
 * The home stack owns the daily job: see where the day stands, then order.
 * The catalogue and the cart live here rather than in tabs of their own —
 * "Place Order" and "Continue Order" are steps in one flow that starts on the
 * dashboard, and the design gives that flow one tab.
 */
export type ShopHomeStackParamList = {
  ShopHome: undefined;
  /** FR-5, FR-6 — browse and add, at this shop's prices. */
  ShopCatalogue: undefined;
  /** FR-7 to FR-12 — the next-day order under construction. */
  Cart: undefined;
  /** FR-34 — offers; `offerId` highlights one and records the FR-35 view. */
  Offers: { offerId?: string } | undefined;
  /** FR-43, FR-44 — the in-app notification centre. */
  Notifications: undefined;
  /** FR-25 — reached from a notification about an invoice. */
  InvoiceDetails: { invoiceId: string };
};

export type ShopOrdersStackParamList = {
  ShopOrdersList: undefined;
  /** FR-22 — one of this shop's orders, in full. */
  ShopOrderDetails: { orderId: string };
  /** Reached from an invoiced order. */
  InvoiceDetails: { invoiceId: string };
};

/**
 * The money tab. The statement and paying a bill are the same job seen from two
 * ends, so they share a stack: "Pay Now" and "View Ledger" both land here.
 */
export type ShopLedgerStackParamList = {
  /** FR-23, FR-24 — the transaction list for any duration. */
  Transactions: undefined;
  /** FR-25 — invoice detail with line items and taxes. */
  InvoiceDetails: { invoiceId: string };
  /** FR-26 to FR-30 — settle an invoice, the outstanding, or an amount. */
  ShopPayments: undefined;
};

/** Everything that is not the daily job: profile, outlets, offers, settings. */
export type ShopMoreStackParamList = {
  More: undefined;
  /** FR-45 — per-event notification preferences. */
  NotificationSettings: undefined;
  /** FR-43, FR-44 — reachable from More as well as from the dashboard. */
  Notifications: undefined;
  /** FR-34 — the full offers list. */
  Offers: { offerId?: string } | undefined;
};

/**
 * Four tabs — Home, Orders, Ledger, More — as the design specifies. Each owns a
 * stack, so a detail screen keeps the tab bar and the back gesture returns to
 * the list it was opened from.
 *
 * Each tab is typed with `NavigatorScreenParams` so a screen in one stack can
 * deep-link into a screen in another: "Pay Now" on the dashboard opens the
 * payments screen inside the Ledger tab, and a notification about an order
 * opens that order inside the Orders tab, rather than dropping the reader on a
 * list to find it.
 */
export type ShopTabParamList = {
  HomeTab: NavigatorScreenParams<ShopHomeStackParamList> | undefined;
  OrdersTab: NavigatorScreenParams<ShopOrdersStackParamList> | undefined;
  LedgerTab: NavigatorScreenParams<ShopLedgerStackParamList> | undefined;
  MoreTab: NavigatorScreenParams<ShopMoreStackParamList> | undefined;
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
