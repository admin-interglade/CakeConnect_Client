/**
 * Domain types for the admin (franchise owner) surface.
 *
 * Modelled directly on the PRD: the order lifecycle is FR-40, shop lifecycle is
 * FR-2/FR-3, credit fields are FR-38, and the ledger shape is FR-23/FR-39.
 * These are the shapes `services/adminApi` returns, so the screens depend on
 * this file rather than on any transport detail.
 */

/** FR-3 — a suspended shop can read history but cannot order. */
export type ShopStatus = 'active' | 'suspended' | 'inactive';

/**
 * FR-40 — the fulfilment workflow, in transition order. `draft` is the shop
 * owner's pre-submission state; `cancelled` is terminal and can be reached
 * from any state up to `dispatched`.
 */
export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'accepted'
  | 'in_production'
  | 'dispatched'
  | 'delivered'
  | 'invoiced'
  | 'cancelled';

/** FR-19 — the ranges that drive every figure on the admin dashboard. */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom';

/** Both bounds are inclusive `YYYY-MM-DD` dates in IST. */
export type DateRange = {
  preset: DateRangePreset;
  from: string;
  to: string;
};

/** FR-2, FR-6, FR-38. */
export type Shop = {
  id: string;
  name: string;
  code: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  address: string;
  gstin?: string;
  region?: string;
  status: ShopStatus;
  creditLimit: number;
  creditUsed: number;
  creditAvailable: number;
  priceListId: string;
  priceListName: string;
  /** FR-14 — per-shop cut-off as "HH:mm" IST; absent means the global default. */
  cutoffOverride?: string;
  outstanding: number;
  paidToDate: number;
  /** FR-38 — the shop's order state for today's cut-off cycle. */
  todaysOrderStatus: OrderStatus | 'no_order';
  /** FR-2 — set until the invited owner completes their first login. */
  inviteSentAt?: string;
  createdAt: string;
};

/** The write shape for FR-2 create and edit. */
export type ShopInput = {
  name: string;
  code: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  address: string;
  gstin?: string;
  region?: string;
  creditLimit: number;
  priceListId: string;
};

/**
 * FR-5, FR-7 — `deliveredQty` is what the kitchen commits to sending: it is
 * captured either up front on the short-supply screen or at the Delivered step
 * (FR-40), and `shortSupplyReason` explains any gap below `orderedQty`.
 */
export type OrderItem = {
  productId: string;
  name: string;
  unit: string;
  packSize: number;
  moq: number;
  orderedQty: number;
  deliveredQty?: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
  shortSupplyReason?: string;
};

/** One line of the short-supply declaration the admin confirms before delivery. */
export type ShortSupplyLine = {
  productId: string;
  /** Quantity that will actually be sent; never above the ordered quantity. */
  deliveringQty: number;
  /** Required once `deliveringQty` is below the ordered quantity. */
  reason?: string;
};

/** PRD §3 — every transition records who made it and when. */
export type OrderStatusEvent = {
  status: OrderStatus;
  at: string;
  actor: string;
};

export type Order = {
  id: string;
  shopId: string;
  shopName: string;
  shopCode: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  /** Date the order was placed; `deliveryDate` is the next-day fulfilment date. */
  orderDate: string;
  deliveryDate: string;
  submittedAt?: string;
  /** FR-9 — the cut-off that applied to this order, as an ISO timestamp. */
  cutoffAt: string;
  status: OrderStatus;
  statusHistory: OrderStatusEvent[];
  items: OrderItem[];
  subtotal: number;
  taxTotal: number;
  taxBreakdown: TaxLine[];
  total: number;
  /** FR-40 — true once any line was delivered short of the ordered quantity. */
  shortSupply?: boolean;
  invoiceId?: string;
  /** FR-18 — set when an admin reopened the order after cut-off. */
  wasReopened?: boolean;
  reopenReason?: string;
};

/** PRD §5 — GST-compliant invoicing needs the split, not just a total. */
export type TaxLine = {
  label: string;
  rate: number;
  amount: number;
};

/** FR-36 — the six network tiles, plus the cut-off compliance counts (FR-17). */
export type DashboardStats = {
  totalShops: number;
  activeShops: number;
  suspendedShops: number;
  ordersReceivedToday: number;
  ordersPendingAgainstCutoff: number;
  todaysOrderValue: number;
  networkOutstanding: number;
  collectionsReceivedToday: number;
  /** "HH:mm" IST — the global cut-off in force (FR-13). */
  cutoffTime: string;
  /** ISO timestamp of the next cut-off, used for the live countdown. */
  nextCutoffAt: string;
  shopsSubmitted: number;
  shopsExpected: number;
  /** FR-17 — only meaningful once the cut-off has passed. */
  noOrderPlacedCount: number;
};

/** FR-21 — one point per day in the selected range. */
export type OrderTrendPoint = {
  date: string;
  orderValue: number;
  orderCount: number;
};

/** FR-21 — top products by quantity for the selected range. */
export type TopProductPoint = {
  productId: string;
  name: string;
  quantity: number;
  unit: string;
};

/** Kitchen sections the production plan is filtered by. */
export type ProductCategory = 'cakes' | 'pastries' | 'savoury' | 'dryItems';

/** FR-37 — the consolidated kitchen requirement for a delivery date. */
export type ProductionLine = {
  productId: string;
  name: string;
  /** Size and pack description the kitchen bakes to, e.g. "Standard Size - 1kg". */
  variant: string;
  category: ProductCategory;
  unit: string;
  totalQuantity: number;
  shopCount: number;
};

export type ProductionRequirement = {
  deliveryDate: string;
  /** True once the cut-off passed and the figure is frozen (FR-17). */
  frozen: boolean;
  /** Active shops in the network, the denominator for "22 of 24 ordering". */
  totalShops: number;
  lines: ProductionLine[];
};

/** One shop's share of a product, for the production detail breakdown. */
export type ProductionShopLine = {
  shopId: string;
  shopName: string;
  quantity: number;
  /** Per-item note the shop attached to this product (FR-7). */
  note?: string;
};

/** Quantity of one product per day, for the detail screen's demand trend. */
export type ProductionTrendPoint = {
  date: string;
  quantity: number;
};

/**
 * FR-37 drilled down to a single product: who ordered it, how much, and how
 * demand has moved, so the kitchen can sanity-check an unusual number before
 * committing to the bake.
 */
export type ProductionDetail = {
  deliveryDate: string;
  productId: string;
  name: string;
  variant: string;
  category: ProductCategory;
  /** Longer description shown under the product name. */
  description: string;
  unit: string;
  totalQuantity: number;
  shopCount: number;
  totalShops: number;
  trend: ProductionTrendPoint[];
  shops: ProductionShopLine[];
};

/** FR-38 — outstanding split into the PRD's three ageing buckets. */
export type AgeingBucket = {
  label: '0-30' | '31-60' | '60+';
  amount: number;
  shopCount: number;
};

/** FR-23, FR-39 — one row of the shared ledger, with running balance. */
export type LedgerEntry = {
  id: string;
  date: string;
  type: 'order' | 'invoice' | 'payment' | 'credit_note' | 'adjustment';
  reference: string;
  description: string;
  /** Positive increases what the shop owes; negative reduces it. */
  amount: number;
  runningBalance: number;
};

/** PRD §3 — actor, timestamp and before/after for every admin action. */
export type AuditEntry = {
  id: string;
  at: string;
  actor: string;
  action: string;
  field?: string;
  before?: string;
  after?: string;
};

export type PriceList = {
  id: string;
  name: string;
};

/** Every list endpoint pages the same way. */
export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

export type Pagination = {
  page: number;
  limit: number;
};

export type ShopFilters = {
  search: string;
  status: ShopStatus | 'all';
  region: string | 'all';
  sort: 'name' | 'outstanding' | 'creditUtilisation';
};

export type OrderFilters = {
  search: string;
  /** `pending_cutoff` is the FR-17 "not yet submitted" view, not a stored status. */
  status: OrderStatus | 'all' | 'pending_cutoff';
  shopId: string | 'all';
  range: DateRange;
  /** Which date the range filters on. */
  dateField: 'orderDate' | 'deliveryDate';
};

export type ExportFormat = 'csv' | 'pdf';

/** Queue tab counts, so a tab can show how much work sits behind it. */
export type OrderStatusCounts = {
  all: number;
} & Partial<Record<OrderStatus, number>>;
