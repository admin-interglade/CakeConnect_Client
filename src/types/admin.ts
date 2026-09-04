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
  /**
   * Undefined when the source payload does not carry it. `GET /shops` reports
   * outstanding but not payments-to-date, and zeroing it would read as "this
   * shop has never paid" rather than "not known here". See docs/api-gaps.md G3.
   */
  paidToDate?: number;
  /**
   * FR-38 — the shop's order state for today's cut-off cycle. No backend field
   * supplies this; undefined means "not known", which is not the same as
   * `'no_order'`. See docs/api-gaps.md G4.
   */
  todaysOrderStatus?: OrderStatus | 'no_order';
  /** FR-2 — set until the invited owner completes their first login. */
  inviteSentAt?: string;
  createdAt: string;
};

/**
 * FR-6 / PRD section 8 — whether exceeding the credit limit warns the shop or
 * blocks the order. The backend settles the PRD's open question by making it a
 * per-shop setting rather than a network-wide rule.
 */
export type CreditBehavior = 'warn' | 'blockOrder';

/** The write shape for FR-2 create and edit. */
export type ShopInput = {
  name: string;
  code: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  /** The shop's own line, which `POST /shops` requires separately. */
  mobileNumber: string;
  /** Street line only; the city/state/pincode are stored separately. */
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  /**
   * No backend field maps to this — see docs/api-gaps.md G6. Retained so the
   * type does not change shape for existing callers, but never sent.
   */
  region?: string;
  creditLimit: number;
  creditBehavior?: CreditBehavior;
  priceListId: string;
};

/** Which parts of an FR-2 edit reached the server; see `updateShop`. */
export type ShopUpdatePart = 'details' | 'creditLimit' | 'priceList';

/**
 * A shop edit fans out to up to three endpoints, so it can half-succeed. The
 * caller is told exactly which parts landed rather than a single pass/fail,
 * because otherwise an admin cannot know what to retry.
 */
export type ShopUpdateOutcome = {
  shop: Shop;
  saved: ShopUpdatePart[];
  failed: { part: ShopUpdatePart; message: string }[];
};

/** FR-39 — an adjustment moves the balance; a credit note reduces it. */
export type LedgerAdjustmentInput =
  | {
      kind: 'adjustment';
      amount: number;
      /** DEBIT increases what the shop owes; CREDIT reduces it. */
      direction: 'debit' | 'credit';
      reference: string;
      description: string;
    }
  | {
      kind: 'creditNote';
      /** Always positive; a credit note only ever reduces the balance. */
      amount: number;
      reason: string;
      reference: string;
      invoiceId?: string;
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

/** FR-40 — the fulfilment record that carries delivered quantities. */
export type DeliveryStatus =
  | 'pending'
  | 'in_transit'
  | 'delivered'
  | 'partially_delivered'
  | 'failed';

export type Delivery = {
  id: string;
  orderId: string;
  deliveryDate: string;
  status: DeliveryStatus;
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

/* -------------------------------------------------------------------------- */
/* Catalogue — FR-5, FR-6, FR-15                                               */
/* -------------------------------------------------------------------------- */

/** FR-5 — a product can be withdrawn (INACTIVE) or temporarily unavailable. */
export type ProductStatus = 'active' | 'inactive' | 'unavailable';

/**
 * FR-15 — a catalogue category. Distinct from `ProductCategory`, which is the
 * production plan's fixed set of kitchen sections; these are uuid-keyed rows
 * the admin creates. See docs/api-gaps.md G8.
 */
export type Category = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  /** FR-15 — lead time for this category, where longer than one day. */
  leadTimeHours: number;
  /** How many products reference it; the guard before deleting. */
  productCount: number;
};

export type CategoryInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  leadTimeHours: number;
  isActive?: boolean;
};

/** FR-5 — name, category, image, unit, base price, MOQ and pack size. */
export type Product = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  description?: string;
  imageUrl?: string;
  unit: string;
  basePrice: number;
  /** The backend calls this `minimumOrderQuantity`. */
  moq: number;
  packSize: number;
  status: ProductStatus;
};

export type ProductInput = {
  name: string;
  sku: string;
  categoryId: string;
  description?: string;
  imageUrl?: string;
  unit: string;
  basePrice: number;
  moq: number;
  packSize: number;
  status?: ProductStatus;
};

export type ProductFilters = {
  search: string;
  status: ProductStatus | 'all';
  categoryId: string | 'all';
};

/** FR-5 — a product marked available or not for one delivery date. */
export type ProductAvailabilityInput = {
  date: string;
  available: boolean;
  note?: string;
};

/** FR-6 — one product's price on a list. */
export type PriceListItem = {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  price: number;
};

/** FR-6 — the full record, as opposed to the `{id, name}` dropdown shape. */
export type PriceListDetail = PriceList & {
  region?: string;
  description?: string;
  isActive: boolean;
  items: PriceListItem[];
};

export type PriceListInput = {
  name: string;
  region?: string;
  description?: string;
};

/**
 * FR-39 — a shop's payment history, which is a distinct record from the ledger
 * entry a confirmed payment produces: a payment can sit in PENDING_CONFIRMATION
 * (FR-30) and never reach the ledger at all.
 */
export type Payment = {
  id: string;
  date: string;
  amount: number;
  /** UPI | CARD | NET_BANKING | CASH | CHEQUE | NEFT, as the backend reports it. */
  method: string;
  /** PENDING | SUCCESS | FAILED | PENDING_CONFIRMATION | REJECTED | REFUNDED. */
  status: string;
  reference: string;
  note?: string;
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
