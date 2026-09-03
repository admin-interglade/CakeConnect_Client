import type {
  AuditEntry,
  DashboardStats,
  LedgerEntry,
  Order,
  OrderItem,
  OrderStatusEvent,
  Payment,
  PriceList,
  Shop,
  TaxLine,
  TopProductPoint,
} from '../../types/admin';
import { orderStatusCodec, shopStatusCodec } from './enums';

/**
 * Wire shapes and mappers for the admin surface.
 *
 * Two things the backend does that the domain types do not:
 *   - money and quantities arrive as **strings** ("30000"), so everything
 *     numeric goes through `num()` rather than being trusted as a number;
 *   - names are prefixed (`shopName`, `shopCode`), which the domain drops.
 *
 * VERIFICATION STATUS: the shop, price-list, audit-log and dashboard shapes
 * below were captured from a live server. The order, ledger and payment shapes
 * were NOT — those tables were empty on the dev database, so they follow
 * `docs/api-endpoints.md` and are marked UNVERIFIED. Re-check them against real
 * rows before trusting the order queue.
 */

/** Money and counts come back as strings from the API's decimal columns. */
const num = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** `2026-09-01T12:25:45.086Z` -> `2026-09-01`, which is what the domain uses. */
const toApiDateOnly = (value: unknown): string =>
  typeof value === 'string' ? value.slice(0, 10) : '';

/* -------------------------------------------------------------------------- */
/* Shops — verified against a live payload                                     */
/* -------------------------------------------------------------------------- */

export type ApiShopOwner = {
  id?: string;
  name?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
};

export type ApiShop = {
  id: string;
  shopCode: string;
  shopName: string;
  ownerId?: string | null;
  mobileNumber?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  creditLimit?: string | number | null;
  currentOutstanding?: string | number | null;
  /** Present on the detail response only; derived for list rows. */
  availableCredit?: number | null;
  creditBehavior?: 'WARN' | 'BLOCK_ORDER' | null;
  status: string;
  createdAt?: string;
  owner?: ApiShopOwner | null;
  priceListAssociations?: Array<{
    priceListId?: string;
    priceList?: { id?: string; name?: string } | null;
  }> | null;
};

export function toShop(api: ApiShop): Shop {
  const creditLimit = num(api.creditLimit);
  // `currentOutstanding` is what the shop owes, which is exactly the credit it
  // has consumed — the server agrees, returning
  // availableCredit === creditLimit - currentOutstanding on the detail route.
  const outstanding = num(api.currentOutstanding);
  const association = api.priceListAssociations?.[0];

  return {
    id: api.id,
    name: api.shopName,
    code: api.shopCode,
    ownerName: api.owner?.name ?? '',
    ownerPhone: api.owner?.mobileNumber ?? api.mobileNumber ?? '',
    ownerEmail: api.owner?.email ?? api.email ?? undefined,
    address:
      api.address ??
      [api.city, api.state, api.pincode].filter(Boolean).join(', '),
    gstin: api.gstin ?? undefined,
    // No region on the shop model. `city` is the nearest thing the backend has,
    // and it is what `GET /shops?city=` filters on, so it stands in here.
    region: api.city ?? undefined,
    status: shopStatusCodec.fromApi(api.status),
    creditLimit,
    creditUsed: outstanding,
    creditAvailable: api.availableCredit ?? Math.max(creditLimit - outstanding, 0),
    priceListId: association?.priceListId ?? association?.priceList?.id ?? '',
    priceListName: association?.priceList?.name ?? '',
    // Per-shop cut-off lives at /cutoff/shops/:id/effective, not on the shop.
    cutoffOverride: undefined,
    outstanding,
    // paidToDate and todaysOrderStatus have no source on this payload; they are
    // left undefined rather than zeroed so the UI can show "-" instead of a
    // figure that reads as real. See docs/api-gaps.md G3 and G4.
    paidToDate: undefined,
    todaysOrderStatus: undefined,
    createdAt: toApiDateOnly(api.createdAt),
  };
}

/* -------------------------------------------------------------------------- */
/* Price lists — verified                                                      */
/* -------------------------------------------------------------------------- */

export type ApiPriceList = { id: string; name: string };

export const toPriceList = (api: ApiPriceList): PriceList => ({
  id: api.id,
  name: api.name,
});

/* -------------------------------------------------------------------------- */
/* Orders — UNVERIFIED (no rows on the dev database)                           */
/* -------------------------------------------------------------------------- */

export type ApiOrderItem = {
  id?: string;
  productId: string;
  quantity?: string | number;
  deliveredQuantity?: string | number | null;
  unitPrice?: string | number;
  lineTotal?: string | number;
  notes?: string | null;
  shortSupplyReason?: string | null;
  product?: {
    name?: string;
    unit?: string;
    packSize?: number;
    minimumOrderQuantity?: number;
  } | null;
};

export type ApiOrder = {
  id: string;
  orderNumber?: string;
  shopId: string;
  shop?: {
    shopName?: string;
    shopCode?: string;
    mobileNumber?: string | null;
    email?: string | null;
    owner?: ApiShopOwner | null;
  } | null;
  orderDate?: string;
  deliveryDate?: string;
  submittedAt?: string | null;
  cutoffAt?: string | null;
  status: string;
  items?: ApiOrderItem[] | null;
  subtotal?: string | number;
  taxTotal?: string | number;
  taxBreakdown?: Array<{ label?: string; rate?: string | number; amount?: string | number }> | null;
  totalAmount?: string | number;
  total?: string | number;
  invoiceId?: string | null;
  statusHistory?: Array<{ status?: string; at?: string; createdAt?: string; actor?: string }> | null;
};

function toOrderItem(api: ApiOrderItem): OrderItem {
  const orderedQty = num(api.quantity);
  const unitPrice = num(api.unitPrice);
  const delivered = api.deliveredQuantity;

  return {
    productId: api.productId,
    name: api.product?.name ?? api.productId,
    unit: api.product?.unit ?? '',
    packSize: api.product?.packSize ?? 1,
    moq: api.product?.minimumOrderQuantity ?? 1,
    orderedQty,
    deliveredQty:
      delivered === null || delivered === undefined ? undefined : num(delivered),
    unitPrice,
    lineTotal: num(api.lineTotal, orderedQty * unitPrice),
    note: api.notes ?? undefined,
    shortSupplyReason: api.shortSupplyReason ?? undefined,
  };
}

/**
 * FR-40's timeline. The order payload is not documented as carrying a status
 * history; when it is absent the current status is shown as the only event
 * rather than inventing transitions that never happened. See gap G7.
 */
function toStatusHistory(api: ApiOrder): OrderStatusEvent[] {
  if (!Array.isArray(api.statusHistory) || api.statusHistory.length === 0) {
    return [];
  }

  return api.statusHistory
    .filter(event => typeof event?.status === 'string')
    .map(event => ({
      status: orderStatusCodec.fromApi(event.status as string),
      at: event.at ?? event.createdAt ?? '',
      actor: event.actor ?? '',
    }));
}

export function toOrder(api: ApiOrder): Order {
  const items = (api.items ?? []).map(toOrderItem);
  const subtotal = num(api.subtotal, items.reduce((sum, item) => sum + item.lineTotal, 0));
  const taxTotal = num(api.taxTotal);

  const taxBreakdown: TaxLine[] = (api.taxBreakdown ?? [])
    .filter(line => line && line.label !== undefined)
    .map(line => ({
      label: String(line.label),
      rate: num(line.rate),
      amount: num(line.amount),
    }));

  const shortSupply = items.some(
    item => item.deliveredQty !== undefined && item.deliveredQty < item.orderedQty,
  );

  return {
    // The human-readable order number is what the queue and search show.
    id: api.orderNumber ?? api.id,
    shopId: api.shopId,
    shopName: api.shop?.shopName ?? '',
    shopCode: api.shop?.shopCode ?? '',
    ownerName: api.shop?.owner?.name ?? '',
    ownerPhone: api.shop?.owner?.mobileNumber ?? api.shop?.mobileNumber ?? '',
    ownerEmail: api.shop?.owner?.email ?? api.shop?.email ?? undefined,
    orderDate: toApiDateOnly(api.orderDate),
    deliveryDate: toApiDateOnly(api.deliveryDate),
    submittedAt: api.submittedAt ?? undefined,
    // FR-9's cut-off is per shop and per date; the order payload does not carry
    // it, so screens needing a countdown must read /cutoff/shops/:id/effective.
    cutoffAt: api.cutoffAt ?? '',
    status: orderStatusCodec.fromApi(api.status),
    statusHistory: toStatusHistory(api),
    items,
    subtotal,
    taxTotal,
    taxBreakdown,
    total: num(api.totalAmount ?? api.total, subtotal + taxTotal),
    shortSupply: shortSupply || undefined,
    invoiceId: api.invoiceId ?? undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Ledger — UNVERIFIED                                                         */
/* -------------------------------------------------------------------------- */

export type ApiLedgerEntry = {
  id: string;
  entryDate?: string;
  createdAt?: string;
  type?: string;
  direction?: 'DEBIT' | 'CREDIT';
  referenceNumber?: string | null;
  reference?: string | null;
  description?: string | null;
  amount?: string | number;
  runningBalance?: string | number | null;
  balance?: string | number | null;
};

const LEDGER_TYPES: Record<string, LedgerEntry['type']> = {
  ORDER: 'order',
  INVOICE: 'invoice',
  PAYMENT: 'payment',
  CREDIT_NOTE: 'credit_note',
  ADJUSTMENT: 'adjustment',
};

export function toLedgerEntry(api: ApiLedgerEntry): LedgerEntry {
  const magnitude = Math.abs(num(api.amount));

  return {
    id: api.id,
    date: toApiDateOnly(api.entryDate ?? api.createdAt),
    type: LEDGER_TYPES[String(api.type)] ?? 'adjustment',
    reference: api.referenceNumber ?? api.reference ?? '',
    description: api.description ?? '',
    // The backend splits sign into `direction`; the domain carries it in the
    // amount, where positive increases what the shop owes.
    amount: api.direction === 'CREDIT' ? -magnitude : magnitude,
    runningBalance: num(api.runningBalance ?? api.balance),
  };
}

/* -------------------------------------------------------------------------- */
/* Payments — UNVERIFIED. FR-39 payment history.                               */
/* -------------------------------------------------------------------------- */

export type ApiPayment = {
  id: string;
  shopId?: string;
  invoiceId?: string | null;
  amount?: string | number;
  paymentMethod?: string;
  status?: string;
  paymentDate?: string | null;
  createdAt?: string;
  paymentReference?: string | null;
  transactionId?: string | null;
  notes?: string | null;
};

export const toPayment = (api: ApiPayment): Payment => ({
  id: api.id,
  date: toApiDateOnly(api.paymentDate ?? api.createdAt),
  amount: num(api.amount),
  method: api.paymentMethod ?? '',
  status: api.status ?? '',
  reference: api.paymentReference ?? api.transactionId ?? '',
  note: api.notes ?? undefined,
});

/* -------------------------------------------------------------------------- */
/* Audit logs — verified                                                       */
/* -------------------------------------------------------------------------- */

export type ApiAuditLog = {
  id: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt?: string;
  actor?: { name?: string | null; mobileNumber?: string | null } | null;
};

/** `USER_CREATED` -> `User created`, which is what the audit list renders. */
const humaniseAction = (action?: string): string => {
  if (!action) {
    return '';
  }
  const words = action.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * PRD §3 wants before/after per field. The backend stores whole-object
 * snapshots in `oldValue`/`newValue`, so they are summarised rather than
 * diffed; a field-level diff would need the server to record one.
 */
const summariseValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && typeof v !== 'object')
      .slice(0, 4)
      .map(([k, v]) => `${k}: ${v}`);
    return entries.length > 0 ? entries.join(', ') : undefined;
  }
  return undefined;
};

export const toAuditEntry = (api: ApiAuditLog): AuditEntry => ({
  id: api.id,
  at: api.createdAt ?? '',
  actor: api.actor?.name ?? api.actor?.mobileNumber ?? 'System',
  action: humaniseAction(api.action),
  field: undefined,
  before: summariseValue(api.oldValue),
  after: summariseValue(api.newValue),
});

/* -------------------------------------------------------------------------- */
/* Dashboard — verified                                                        */
/* -------------------------------------------------------------------------- */

export type ApiAgeingRow = {
  bucket?: string;
  label?: string;
  amount?: string | number;
  shopCount?: string | number;
};

export type ApiAdminDashboard = {
  totalShops?: number;
  activeShops?: number;
  suspendedShops?: number;
  ordersToday?: number;
  ordersPendingBeforeCutoff?: number;
  todayOrderValue?: string | number;
  todayOrderValueActual?: string | number;
  collectionsToday?: string | number;
  totalNetworkOutstanding?: string | number;
  consolidatedProduction?: unknown[];
  shopWiseOutstanding?: unknown[];
  ageingReport?: ApiAgeingRow[];
};

/**
 * The dashboard payload carries no cut-off, so `cutoffTime` and `nextCutoffAt`
 * are supplied by the caller from `GET /cutoff/global`.
 */
export function toDashboardStats(
  api: ApiAdminDashboard,
  cutoff: { cutoffTime: string; nextCutoffAt: string },
): DashboardStats {
  const activeShops = api.activeShops ?? 0;
  const pending = api.ordersPendingBeforeCutoff ?? 0;

  return {
    totalShops: api.totalShops ?? 0,
    activeShops,
    suspendedShops: api.suspendedShops ?? 0,
    ordersReceivedToday: api.ordersToday ?? 0,
    ordersPendingAgainstCutoff: pending,
    todaysOrderValue: num(api.todayOrderValue),
    networkOutstanding: num(api.totalNetworkOutstanding),
    collectionsReceivedToday: num(api.collectionsToday),
    cutoffTime: cutoff.cutoffTime,
    nextCutoffAt: cutoff.nextCutoffAt,
    // FR-17's compliance split. Both figures come from the server's own
    // counts; only the subtraction is done here.
    shopsSubmitted: Math.max(activeShops - pending, 0),
    shopsExpected: activeShops,
    noOrderPlacedCount: pending,
  };
}

/* -------------------------------------------------------------------------- */
/* Reports                                                                     */
/* -------------------------------------------------------------------------- */

export type ApiSalesReport = {
  totalSales?: string | number;
  byShop?: unknown[];
  byProduct?: Array<{
    productId?: string;
    name?: string;
    productName?: string;
    unit?: string;
    quantity?: string | number;
  }>;
};

export const toTopProducts = (api: ApiSalesReport): TopProductPoint[] =>
  (api.byProduct ?? [])
    .filter(row => row?.productId)
    .map(row => ({
      productId: String(row.productId),
      name: row.name ?? row.productName ?? String(row.productId),
      unit: row.unit ?? '',
      quantity: num(row.quantity),
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);
