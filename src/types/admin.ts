/**
 * Domain types for the admin (franchise owner) surface.
 *
 * Modelled directly on the PRD: the order lifecycle is FR-40, shop lifecycle is
 * FR-2/FR-3, credit fields are FR-38, and the ledger shape is FR-23/FR-39.
 * These are the shapes `services/adminApi` returns, so the screens depend on
 * this file rather than on any transport detail.
 */

import type { DiscountType, OfferStatus } from './shop';

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
  /**
   * FR-2 — the owner account this shop belongs to, absent while the shop is
   * unclaimed. It is what makes a shop "available" to hand to a new owner, so
   * it is carried on the domain type rather than inferred from `ownerName`,
   * which a create can fill in without ever linking an account.
   */
  ownerId?: string;
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
  /**
   * FR-2 — the owner account this shop is created under, or absent for a shop
   * created without one.
   *
   * Both are optional because the shop form picks an existing owner rather
   * than typing a new one: they are either copied from the chosen account or
   * not sent, and an unowned shop is a real state — it is what makes the shop
   * available to assign from an owner's profile. Never a typed pair; see
   * `toApiShopCreate` for why an invented number is dangerous here.
   */
  ownerName?: string;
  ownerPhone?: string;
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

/* -------------------------------------------------------------------------- */
/* Shop owners — FR-2                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A shop-owner account's lifecycle. `invited` is the state between the admin
 * creating the account and the owner completing their first sign-in; the
 * backend does not write it yet (see docs/api-gaps.md G26), so nothing in the
 * app produces it, but the codec accepts it so the screens do not have to
 * change when the invite flow lands.
 */
export type ShopOwnerStatus = 'active' | 'invited' | 'suspended' | 'inactive';

/** Just enough of a shop to name it in an assignment list or an error. */
export type AssignedShopSummary = {
  id: string;
  name: string;
  code: string;
};

/** FR-2 — the account an outlet signs in with, and the outlets it can act on. */
export type ShopOwner = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: ShopOwnerStatus;
  /**
   * Empty on list rows: `GET /users` returns no shop association, only
   * `GET /users/:id` does. An empty array on a list row therefore means "not
   * loaded here", which is why the list does not report a shop count.
   */
  shops: AssignedShopSummary[];
  createdAt: string;
};

/** The write shape for FR-2 owner creation. */
export type ShopOwnerInput = {
  name: string;
  phone: string;
  email?: string;
  /**
   * The shops to hand over. Full summaries rather than ids: each shop is a
   * separate assign call, and a failed one has to be named back to the admin.
   */
  shops: AssignedShopSummary[];
};

/**
 * Assigning shops fans out to one `POST /shops/:id/assign-owner` per shop, so
 * it can half-succeed. As with `ShopUpdateOutcome`, the caller is told exactly
 * which shops landed rather than a single pass/fail — otherwise an admin cannot
 * know which ones to retry.
 */
export type ShopAssignmentOutcome = {
  assigned: AssignedShopSummary[];
  failed: { shop: AssignedShopSummary; message: string }[];
  inviteError?: string;
};

/**
 * Creating an owner is a create plus those assignments. The owner is returned
 * even when every assignment failed: the account exists at that point, and
 * telling the admin otherwise would have them create a duplicate.
 */
export type ShopOwnerCreationOutcome = ShopAssignmentOutcome & {
  owner: ShopOwner;
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
  /**
   * The database id, and the only value the `/orders/:id` routes accept.
   * Never the human-readable number — submitting `ORD-0007` as a route id is
   * rejected as a malformed uuid.
   */
  id: string;
  /** The human-readable number (`ORD-0007`); what every screen displays. */
  orderNumber: string;
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

/* -------------------------------------------------------------------------- */
/* Cut-off configuration — FR-13 to FR-16                                      */
/* -------------------------------------------------------------------------- */

/** FR-13 — the global cut-off, and whether an admin has in fact set one. */
export type GlobalCutoff = {
  /** "HH:mm" IST (deviation D3). */
  cutoffTime: string;
  /**
   * False when `GET /cutoff/global` answered null and FR-13's documented 22:00
   * is standing in. The two read the same on screen otherwise, and an admin
   * deciding whether to save one needs to know which they are looking at.
   */
  isSet: boolean;
};

/** FR-15 — one dated entry in the holiday calendar. */
export type Holiday = {
  id: string;
  /** `YYYY-MM-DD` in IST. */
  date: string;
  name: string;
  /**
   * FR-15 keeps these apart: a holiday is a note on the calendar, and closing
   * deliveries for it is a separate decision the admin makes per entry.
   */
  isNonDeliveryDay: boolean;
};

export type HolidayInput = {
  date: string;
  name: string;
  isNonDeliveryDay: boolean;
};

/**
 * FR-14's ladder, in the order the backend applies it, plus the answer it can
 * leave us with: `unattributed` means the server resolved to something other
 * than the global cut-off and the app cannot see which override did it, because
 * neither is readable (docs/api-gaps.md G24).
 */
export type CutoffSource = 'date' | 'shop' | 'global' | 'default' | 'unattributed';

/**
 * What is known about one rung of that ladder for a given shop and date.
 *
 * `unknown` is its own state rather than a missing value: the backend exposes
 * no read for the shop and date overrides (docs/api-gaps.md G24), so "no
 * override is set" and "an override may be set and we cannot see it" are
 * different answers, and only one of them is safe to act on.
 */
export type CutoffLayerState = 'applies' | 'overridden' | 'unknown';

export type CutoffLayer = {
  source: CutoffSource;
  state: CutoffLayerState;
  /** Absent when the state is `unknown`. */
  cutoffTime?: string;
  /**
   * `session` marks a value this app wrote and remembered rather than read back,
   * so the screen can say so instead of presenting it as server truth. `prd` is
   * FR-13's 22:00 standing in for a global cut-off nobody has saved.
   */
  origin?: 'server' | 'session' | 'prd';
  /** When a `session` value was written, so the screen can date the claim. */
  savedAt?: string;
};

/** The resolved answer the FR-14 precedence explainer shows. */
export type CutoffResolution = {
  shopId: string;
  /** `YYYY-MM-DD` the resolution was asked for. */
  date: string;
  cutoffTime: string;
  source: CutoffSource;
  /** Highest precedence first, so the screen renders the ladder in order. */
  layers: CutoffLayer[];
  /**
   * True only when the server resolved this itself, which it can do for today
   * alone — `/cutoff/shops/:id/effective` ignores the date (G23).
   */
  serverConfirmed: boolean;
  /** True when an unreadable layer could still be overriding the answer shown. */
  uncertain: boolean;
  /** The holiday calendar entry for this date, when there is one. */
  holiday?: Holiday;
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

/* -------------------------------------------------------------------------- */
/* Offer authoring — FR-32 to FR-35                                            */
/* -------------------------------------------------------------------------- */

/**
 * The published `Offer` itself lives in `types/shop`, because a shop and the
 * franchise owner read the same record and it must not be modelled twice. Only
 * the write shapes — which are the admin's alone — are declared here.
 */

/** FR-32, FR-33 — the body `POST /offers` accepts. */
export type OfferInput = {
  title: string;
  description?: string;
  /** The endpoint validates this as a URL, so a bare path is rejected. */
  bannerUrl?: string;
  discountType: DiscountType;
  /** Ignored for `buyXGetY`, where the quantities carry the offer instead. */
  discountValue: number;
  buyQuantity?: number;
  getQuantity?: number;
  /** `YYYY-MM-DD`. */
  startDate: string;
  endDate: string;
  /**
   * FR-33 — the whole network, or the shops in `shopIds`. There is no third
   * option: `regions` is accepted by the endpoint and matches no shop, so this
   * type does not offer it. See docs/api-gaps.md G25.
   */
  targetAllShops: boolean;
  shopIds: string[];
  /** Empty means the offer applies across the catalogue. */
  productIds: string[];
};

/**
 * FR-32 — the body `PATCH /offers/:id` accepts, which is deliberately narrower
 * than `OfferInput`: the endpoint takes no `productIds`, `shopIds` or
 * `regions`, so an offer's targeting and product list are fixed at creation.
 * Withdraw the offer and publish a replacement to change either (G25).
 */
export type OfferUpdate = {
  title?: string;
  description?: string;
  bannerUrl?: string;
  discountType?: DiscountType;
  discountValue?: number;
  buyQuantity?: number;
  getQuantity?: number;
  startDate?: string;
  endDate?: string;
  /**
   * The only way an offer ever changes state: nothing on the backend moves an
   * offer to `active` at its start date or to `expired` at its end date (G22).
   */
  status?: OfferStatus;
};

export type OfferFilters = {
  status: OfferStatus | 'all';
};
