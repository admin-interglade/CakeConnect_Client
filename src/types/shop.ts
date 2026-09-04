/**
 * Domain types for the shop-owner (franchise outlet) surface.
 *
 * Modelled directly on the PRD: the order builder is FR-7 to FR-12, the cut-off
 * is FR-9/FR-13, the dashboard tiles are FR-20, the transaction list is FR-23,
 * invoices are FR-25, payments are FR-26 to FR-30, offers are FR-34 and
 * notifications are FR-43 to FR-45.
 *
 * These are the shapes `services/shop` returns, so the screens depend on this
 * file rather than on any transport detail. Types shared with the franchise
 * owner's surface — `Order`, `LedgerEntry`, `Product`, `DateRange` — are
 * re-used from `types/admin` rather than duplicated, so an order rendered on
 * either side is the same object.
 */

import type {
  CreditBehavior,
  DateRange,
  LedgerEntry,
  OrderStatus,
  Product,
} from './admin';

/* -------------------------------------------------------------------------- */
/* Catalogue — FR-5, FR-6                                                      */
/* -------------------------------------------------------------------------- */

/**
 * FR-6 — whether the price shown came from the shop's assigned price list or
 * fell back to the product's base price. Stated rather than inferred: a shop
 * asking why a price changed needs to know which of the two it is looking at.
 */
export type PriceSource = 'priceList' | 'basePrice';

/**
 * FR-5 + FR-6 — a catalogue row as one shop sees it: the product record with
 * the price that shop actually pays.
 */
export type CatalogueProduct = Product & {
  /** The shop's applicable price, which may differ from `basePrice`. */
  price: number;
  priceSource: PriceSource;
  /** FR-34 — offers naming this product, for the catalogue badge. */
  offerIds: string[];
};

/** FR-5 — the category strip above the catalogue list. */
export type CatalogueFilters = {
  search: string;
  categoryId: string | 'all';
};

/* -------------------------------------------------------------------------- */
/* Cut-off — FR-9, FR-13, FR-14                                                */
/* -------------------------------------------------------------------------- */

/**
 * FR-9 — the cut-off in force for this shop, resolved by the backend through
 * FR-14's date-override -> shop-override -> global-default precedence.
 *
 * `deliveryDate` is always tomorrow: `POST /orders` rejects any other date, so
 * the whole ordering surface is next-day by construction.
 */
export type EffectiveCutoff = {
  shopId: string;
  /** "22:00" IST, as the PRD states it. */
  cutoffTime: string;
  /** ISO timestamp of the cut-off this order is racing. */
  cutoffAt: string;
  /** `YYYY-MM-DD` — the delivery date this cut-off governs. */
  deliveryDate: string;
  /** True once `cutoffAt` is in the past; orders can no longer be submitted. */
  passed: boolean;
  /** Seconds remaining, for the FR-9 countdown. Zero once passed. */
  secondsRemaining: number;
};

/* -------------------------------------------------------------------------- */
/* Cart — FR-7, FR-8, FR-10, FR-11                                             */
/* -------------------------------------------------------------------------- */

/**
 * One line of the next-day order under construction.
 *
 * `moq` and `packSize` are carried on the line rather than looked up at render
 * time so the stepper still enforces them when the catalogue is not loaded —
 * FR-11 requires the cart to work offline, and the server rejects a quantity
 * below MOQ with a 400.
 */
export type CartLine = {
  productId: string;
  name: string;
  unit: string;
  imageUrl?: string;
  /** Snapshot of the shop's price when the line was added. */
  unitPrice: number;
  quantity: number;
  moq: number;
  packSize: number;
  /** FR-7 — per-item note, which reaches the kitchen on the production plan. */
  note?: string;
};

/** FR-7 — the running order value, recomputed on every quantity change. */
export type CartTotals = {
  lineCount: number;
  unitCount: number;
  subtotal: number;
  /**
   * The server's GST rate is currently zero, so this is zero on every order it
   * prices. It is still shown rather than hidden: FR-7 asks for a value "with
   * tax", and a missing line reads as an oversight where a zero reads as a fact.
   */
  taxTotal: number;
  total: number;
};

/** Why the cart cannot be submitted right now, if it cannot. */
export type CartBlocker =
  | 'empty'
  | 'cutoffPassed'
  | 'creditExceeded'
  | 'shopSuspended'
  | 'belowMoq';

/* -------------------------------------------------------------------------- */
/* Dashboard — FR-19 to FR-22                                                  */
/* -------------------------------------------------------------------------- */

export type ShopSummary = {
  id: string;
  code: string;
  name: string;
  creditLimit: number;
};

/** FR-21 — a product this shop bought most of, over the selected range. */
export type ShopTopProduct = {
  name: string;
  quantity: number;
  value: number;
};

/** FR-20 — the headline tiles, all driven by the FR-19 date range. */
export type ShopDashboard = {
  shop: ShopSummary;
  totalOrderedValue: number;
  orderCount: number;
  todayOrderCount: number;
  quantityDelivered: number;
  amountPaid: number;
  currentOutstanding: number;
  availableCredit: number;
  /** FR-22 — the most recent order still moving through the FR-40 pipeline. */
  currentOrderStatus: OrderStatus | 'none';
  /** FR-22 — how many of this shop's orders sit in each state, all time. */
  statusBreakdown: Partial<Record<OrderStatus, number>>;
  topProducts: ShopTopProduct[];
};

/**
 * FR-20 available credit, and the PRD §8 answer to "blocked or only warned":
 * the backend settles it per shop through `creditBehavior`.
 */
export type ShopCredit = {
  shopId: string;
  currentOutstanding: number;
  totalInvoices: number;
  totalPayments: number;
  creditLimit: number;
  availableCredit: number;
  creditBehavior: CreditBehavior;
};

/* -------------------------------------------------------------------------- */
/* Invoices — FR-25                                                            */
/* -------------------------------------------------------------------------- */

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type InvoiceLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  discount: number;
  lineTotal: number;
};

/**
 * FR-25 — line items, taxes and short-supply notes against the original order.
 *
 * `basedOnDelivered` is the PRD §8 open question answered: when true the
 * invoice was raised on delivered quantities, so any gap against the order is
 * short supply rather than a billing error.
 */
export type Invoice = {
  id: string;
  number: string;
  shopId: string;
  orderId?: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  paid: number;
  outstanding: number;
  status: InvoiceStatus;
  basedOnDelivered: boolean;
  lines: InvoiceLine[];
};

/* -------------------------------------------------------------------------- */
/* Payments — FR-26 to FR-30                                                   */
/* -------------------------------------------------------------------------- */

/** FR-27 — the three online rails and the three offline ones. */
export type PaymentMethod =
  | 'upi'
  | 'card'
  | 'netBanking'
  | 'cash'
  | 'cheque'
  | 'neft';

export type PaymentStatus =
  | 'pending'
  | 'success'
  | 'failed'
  | 'pendingConfirmation'
  | 'rejected'
  | 'refunded';

export type ShopPayment = {
  id: string;
  reference: string;
  date: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  invoiceId?: string;
  invoiceNumber?: string;
  note?: string;
};

/** FR-26 — pay one invoice, the full outstanding, or an amount on account. */
export type PaymentTarget =
  | { kind: 'invoice'; invoiceId: string; invoiceNumber: string; amount: number }
  | { kind: 'outstanding'; amount: number }
  | { kind: 'onAccount'; amount: number };

export type PaymentRequest = {
  shopId: string;
  invoiceId?: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
  /**
   * Sent as `idempotencyKey` so a retry after a timeout cannot take the money
   * twice. Generated per attempt by the caller, not per render.
   */
  idempotencyKey: string;
};

/**
 * What `POST /payments/create` came back with.
 *
 * `channel` is the server's own routing: online rails go to a gateway and
 * offline ones (FR-30) sit in "pending confirmation" until an admin accepts
 * them. `gatewayUrl` is absent whenever no gateway is wired — see
 * docs/api-gaps.md G16 — and the screen says so rather than pretending the
 * payment completed.
 */
export type PaymentIntent = {
  payment: ShopPayment;
  channel: 'gateway' | 'offline';
  /** Present only when a live gateway returns a checkout URL. */
  gatewayUrl?: string;
  message: string;
};

/* -------------------------------------------------------------------------- */
/* Offers — FR-34                                                              */
/* -------------------------------------------------------------------------- */

export type DiscountType = 'percentage' | 'flat' | 'buyXGetY';

export type OfferStatus = 'active' | 'scheduled' | 'expired' | 'withdrawn';

export type Offer = {
  id: string;
  title: string;
  description?: string;
  bannerUrl?: string;
  discountType: DiscountType;
  discountValue: number;
  buyQuantity?: number;
  getQuantity?: number;
  startDate: string;
  endDate: string;
  status: OfferStatus;
  targetAllShops: boolean;
  /** Empty means the offer applies across the catalogue. */
  productIds: string[];
};

/* -------------------------------------------------------------------------- */
/* Notifications — FR-43 to FR-45                                              */
/* -------------------------------------------------------------------------- */

export type NotificationType =
  | 'cutoffReminder'
  | 'orderSubmitted'
  | 'orderAccepted'
  | 'orderInProduction'
  | 'orderDispatched'
  | 'orderDelivered'
  | 'invoiceGenerated'
  | 'paymentSuccess'
  | 'paymentFailed'
  | 'paymentOverdue'
  | 'newOffer'
  | 'creditLimitWarning';

/**
 * FR-45 — users can mute non-critical categories; financial and cut-off alerts
 * cannot be muted. The grouping is what decides that, so it lives beside the
 * type rather than being re-derived at each screen.
 */
export type NotificationCategory = 'cutoff' | 'order' | 'financial' | 'offer';

export type AppNotification = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  /** Free-form payload the backend attaches, e.g. `{ orderId }`. */
  data?: Record<string, unknown>;
};

export type NotificationFeed = {
  items: AppNotification[];
  unreadCount: number;
  total: number;
};

export type NotificationSetting = {
  type: NotificationType;
  category: NotificationCategory;
  push: boolean;
  sms: boolean;
  email: boolean;
  /** FR-45 — false for cut-off and financial alerts, which stay on. */
  muteable: boolean;
};

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

/** FR-22 — the shop's own order list, one tab per stage of the FR-40 flow. */
export type ShopOrderFilters = {
  search: string;
  status: OrderStatus | 'all';
  range: DateRange;
};

/** FR-23 — the transaction list is filterable and searchable. */
export type TransactionFilters = {
  search: string;
  type: LedgerEntry['type'] | 'all';
  range: DateRange;
};

/**
 * FR-23 — one row of the shop's own ledger. Identical to the admin shape: it
 * is literally the same shared ledger, which is the point of FR-23.
 */
export type Transaction = LedgerEntry;
