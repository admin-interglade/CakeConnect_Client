import type {
  AppNotification,
  CatalogueProduct,
  EffectiveCutoff,
  Invoice,
  InvoiceLine,
  NotificationFeed,
  NotificationSetting,
  Offer,
  PaymentIntent,
  PriceSource,
  ShopCredit,
  ShopDashboard,
  ShopPayment,
} from '../../types/shop';
import type { Product } from '../../types/admin';
import { addDays, toApiDate } from '../../utils/format';
import {
  creditBehaviorCodec,
  discountTypeCodec,
  invoiceStatusCodec,
  isMuteableNotification,
  notificationCategories,
  notificationTypeCodec,
  offerStatusCodec,
  orderStatusCodec,
  paymentMethodCodec,
  paymentStatusCodec,
} from './enums';

/**
 * Wire shapes and mappers for the shop-owner surface.
 *
 * The same two rules as `mappers/admin.ts` apply: money and quantities arrive
 * as **strings** from the API's decimal columns, so everything numeric goes
 * through `num()`; and nothing here invents a value the payload did not carry.
 *
 * VERIFICATION STATUS: every shape below was read off the backend's own Prisma
 * models and service `include` clauses rather than from the endpoint doc, so
 * the field names are the ones the server actually emits — notably
 * `paymentStatus` (not `status`) on a payment, and `productName`/`totalAmount`
 * (not a nested `product` and `lineTotal`) on an order or invoice item.
 */

const num = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** `2026-09-01T12:25:45.086Z` -> `2026-09-01`, which is what the domain uses. */
const dateOnly = (value: unknown): string =>
  typeof value === 'string' ? value.slice(0, 10) : '';

/* -------------------------------------------------------------------------- */
/* Cut-off — FR-9, FR-13, FR-14                                                */
/* -------------------------------------------------------------------------- */

/**
 * `GET /cutoff/shops/:shopId/effective` returns only `{ shopId, cutoffTime }`,
 * having already applied FR-14's date -> shop -> global precedence. The instant
 * and the countdown are derived here from that time in IST.
 *
 * The delivery date is always tomorrow: `POST /orders` rejects anything else
 * (`isValidOrderDate` on the server), so next-day is a property of the API and
 * not a choice this screen makes.
 */
export type ApiEffectiveCutoff = {
  shopId?: string;
  cutoffTime?: string | null;
} | null;

export function toEffectiveCutoff(
  api: ApiEffectiveCutoff,
  shopId: string,
  fallbackTime: string,
): EffectiveCutoff {
  const cutoffTime = api?.cutoffTime ?? fallbackTime;
  const today = toApiDate(new Date());

  // IST is a fixed +05:30 offset, matching `utils/format`. The cut-off is
  // today's: it is the deadline for tomorrow's delivery (FR-13).
  const cutoffAt = new Date(`${today}T${cutoffTime}:00+05:30`);
  const msRemaining = cutoffAt.getTime() - Date.now();

  return {
    shopId: api?.shopId ?? shopId,
    cutoffTime,
    cutoffAt: cutoffAt.toISOString(),
    deliveryDate: addDays(today, 1),
    passed: msRemaining <= 0,
    secondsRemaining: Math.max(Math.floor(msRemaining / 1000), 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Catalogue — FR-5, FR-6                                                      */
/* -------------------------------------------------------------------------- */

/** `GET /price-lists/shops/:shopId/products/:productId`. */
export type ApiApplicablePrice = {
  source?: string;
  price?: string | number | null;
  priceListName?: string | null;
};

/**
 * FR-6 — one shop's price for one product.
 *
 * The endpoint answers a single product per call, which is why the catalogue
 * resolves prices from the shop's assigned price list in one request instead
 * (see `services/shop/catalogue.api.ts`). This mapper covers the single-product
 * case, used when a cart line needs re-pricing on its own.
 */
export const toApplicablePrice = (
  api: ApiApplicablePrice,
): { price: number; source: PriceSource; priceListName?: string } => ({
  price: num(api.price),
  source: api.source === 'PRICE_LIST' ? 'priceList' : 'basePrice',
  priceListName: api.priceListName ?? undefined,
});

/**
 * Joins a product to the price this shop pays. Falls back to the base price
 * only because the server does exactly the same (`getApplicablePrice` returns
 * `BASE_PRICE` when the shop has no list, or the list omits the product), so
 * this is the API's own rule rather than a guess made on the client.
 */
export function toCatalogueProduct(
  product: Product,
  listPrice: number | undefined,
  offerIds: string[],
): CatalogueProduct {
  return {
    ...product,
    price: listPrice ?? product.basePrice,
    priceSource: listPrice === undefined ? 'basePrice' : 'priceList',
    offerIds,
  };
}

/* -------------------------------------------------------------------------- */
/* Dashboard — FR-19 to FR-22                                                  */
/* -------------------------------------------------------------------------- */

export type ApiShopDashboard = {
  shop?: {
    id?: string;
    shopCode?: string;
    shopName?: string;
    creditLimit?: string | number | null;
  } | null;
  totalOrderedValue?: string | number;
  orderCount?: number;
  todayOrderCount?: number;
  quantityDelivered?: string | number;
  amountPaid?: string | number;
  currentOutstanding?: string | number;
  availableCredit?: string | number;
  /** `"NONE"` when nothing is in flight. */
  currentOrderStatus?: string;
  statusBreakdown?: Record<string, number> | null;
  topProducts?: Array<{
    name?: string;
    quantity?: string | number;
    value?: string | number;
  }> | null;
};

export function toShopDashboard(api: ApiShopDashboard): ShopDashboard {
  const breakdown: ShopDashboard['statusBreakdown'] = {};

  Object.entries(api.statusBreakdown ?? {}).forEach(([apiStatus, count]) => {
    // NO_ORDER_PLACED is a cut-off placeholder, not a state this shop's order
    // ever reached, so it is skipped rather than coerced into the breakdown.
    if (orderStatusCodec.isKnown(apiStatus)) {
      breakdown[orderStatusCodec.fromApi(apiStatus)] = num(count);
    }
  });

  const current = api.currentOrderStatus;

  return {
    shop: {
      id: api.shop?.id ?? '',
      code: api.shop?.shopCode ?? '',
      name: api.shop?.shopName ?? '',
      creditLimit: num(api.shop?.creditLimit),
    },
    totalOrderedValue: num(api.totalOrderedValue),
    orderCount: num(api.orderCount),
    todayOrderCount: num(api.todayOrderCount),
    quantityDelivered: num(api.quantityDelivered),
    amountPaid: num(api.amountPaid),
    currentOutstanding: num(api.currentOutstanding),
    availableCredit: num(api.availableCredit),
    currentOrderStatus:
      current && orderStatusCodec.isKnown(current)
        ? orderStatusCodec.fromApi(current)
        : 'none',
    statusBreakdown: breakdown,
    topProducts: (api.topProducts ?? []).map(row => ({
      name: row.name ?? '',
      quantity: num(row.quantity),
      value: num(row.value),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Credit — FR-20, PRD §8                                                      */
/* -------------------------------------------------------------------------- */

export type ApiShopOutstanding = {
  shopId?: string;
  currentOutstanding?: string | number;
  totalInvoices?: string | number;
  totalPayments?: string | number;
  creditLimit?: string | number;
  availableCredit?: string | number;
  creditBehavior?: string | null;
};

export const toShopCredit = (
  api: ApiShopOutstanding,
  shopId: string,
): ShopCredit => ({
  shopId: api.shopId ?? shopId,
  currentOutstanding: num(api.currentOutstanding),
  totalInvoices: num(api.totalInvoices),
  totalPayments: num(api.totalPayments),
  creditLimit: num(api.creditLimit),
  availableCredit: num(api.availableCredit),
  // PRD §8 asks whether an over-limit shop is blocked or warned. The backend
  // stores the answer per shop; WARN is its own column default.
  creditBehavior: api.creditBehavior
    ? creditBehaviorCodec.fromApi(api.creditBehavior)
    : 'warn',
});

/* -------------------------------------------------------------------------- */
/* Invoices — FR-25                                                            */
/* -------------------------------------------------------------------------- */

export type ApiInvoiceItem = {
  id?: string;
  productId?: string;
  productName?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  tax?: string | number;
  discount?: string | number;
  totalAmount?: string | number;
};

export type ApiInvoice = {
  id: string;
  invoiceNumber?: string;
  shopId?: string;
  orderId?: string | null;
  invoiceDate?: string;
  dueDate?: string;
  subtotal?: string | number;
  taxAmount?: string | number;
  discountAmount?: string | number;
  totalAmount?: string | number;
  paidAmount?: string | number;
  outstandingAmount?: string | number;
  status?: string;
  basedOnDelivered?: boolean;
  items?: ApiInvoiceItem[] | null;
  order?: { id?: string; orderNumber?: string } | null;
};

const toInvoiceLine = (api: ApiInvoiceItem): InvoiceLine => {
  const quantity = num(api.quantity);
  const unitPrice = num(api.unitPrice);

  return {
    productId: api.productId ?? '',
    // The invoice item stores the product name at the time of billing, so a
    // later rename never rewrites history.
    name: api.productName ?? api.productId ?? '',
    quantity,
    unitPrice,
    tax: num(api.tax),
    discount: num(api.discount),
    lineTotal: num(api.totalAmount, quantity * unitPrice),
  };
};

export function toInvoice(api: ApiInvoice): Invoice {
  const lines = (api.items ?? []).map(toInvoiceLine);
  const subtotal = num(
    api.subtotal,
    lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
  );
  const taxTotal = num(api.taxAmount);
  const discountTotal = num(api.discountAmount);
  const total = num(api.totalAmount, subtotal + taxTotal - discountTotal);
  const paid = num(api.paidAmount);

  return {
    id: api.id,
    number: api.invoiceNumber ?? api.id,
    shopId: api.shopId ?? '',
    orderId: api.orderId ?? api.order?.id ?? undefined,
    invoiceDate: dateOnly(api.invoiceDate),
    dueDate: dateOnly(api.dueDate),
    subtotal,
    taxTotal,
    discountTotal,
    total,
    paid,
    outstanding: num(api.outstandingAmount, Math.max(total - paid, 0)),
    status: invoiceStatusCodec.fromApi(String(api.status ?? 'DRAFT')),
    // FR-25 / PRD §8 — true means the invoice was raised on what was actually
    // delivered, which is what makes a shortfall visible against the order.
    basedOnDelivered: api.basedOnDelivered ?? true,
    lines,
  };
}

/* -------------------------------------------------------------------------- */
/* Payments — FR-26 to FR-30                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The Payment model spells the state `paymentStatus`; there is no `status`
 * column. Reading `status` was silently producing an empty badge on every row.
 */
export type ApiShopPayment = {
  id: string;
  paymentReference?: string | null;
  transactionId?: string | null;
  shopId?: string;
  invoiceId?: string | null;
  amount?: string | number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentDate?: string | null;
  createdAt?: string;
  notes?: string | null;
  invoice?: { id?: string; invoiceNumber?: string } | null;
};

export const toShopPayment = (api: ApiShopPayment): ShopPayment => ({
  id: api.id,
  reference: api.paymentReference ?? api.transactionId ?? api.id,
  date: dateOnly(api.paymentDate ?? api.createdAt),
  amount: num(api.amount),
  method: paymentMethodCodec.fromApi(String(api.paymentMethod ?? 'UPI')),
  status: paymentStatusCodec.fromApi(String(api.paymentStatus ?? 'PENDING')),
  invoiceId: api.invoiceId ?? api.invoice?.id ?? undefined,
  invoiceNumber: api.invoice?.invoiceNumber ?? undefined,
  note: api.notes ?? undefined,
});

/**
 * `POST /payments/create` answers with the payment wrapped alongside the
 * server's own routing decision, not with a bare payment.
 *
 * `gatewayStatus: "SANDBOX"` means no gateway was called and no checkout URL
 * exists — the payment row is real and PENDING, but nothing can complete it.
 * That is surfaced verbatim rather than being read as a success.
 */
export type ApiPaymentIntent = {
  payment: ApiShopPayment;
  gatewayStatus?: string;
  gatewayUrl?: string | null;
  paymentUrl?: string | null;
  message?: string;
};

export function toPaymentIntent(api: ApiPaymentIntent): PaymentIntent {
  const gatewayUrl = api.gatewayUrl ?? api.paymentUrl ?? undefined;

  return {
    payment: toShopPayment(api.payment),
    channel: api.gatewayStatus === 'OFFLINE' ? 'offline' : 'gateway',
    gatewayUrl: gatewayUrl ?? undefined,
    message: api.message ?? '',
  };
}

/* -------------------------------------------------------------------------- */
/* Offers — FR-34                                                              */
/* -------------------------------------------------------------------------- */

export type ApiOffer = {
  id: string;
  title?: string;
  description?: string | null;
  bannerUrl?: string | null;
  discountType?: string;
  discountValue?: string | number;
  buyQuantity?: number | null;
  getQuantity?: number | null;
  startDate?: string;
  endDate?: string;
  status?: string;
  targetAllShops?: boolean;
  products?: Array<{ productId?: string }> | null;
};

export const toOffer = (api: ApiOffer): Offer => ({
  id: api.id,
  title: api.title ?? '',
  description: api.description ?? undefined,
  bannerUrl: api.bannerUrl ?? undefined,
  discountType: discountTypeCodec.fromApi(String(api.discountType ?? 'FLAT')),
  discountValue: num(api.discountValue),
  buyQuantity: api.buyQuantity ?? undefined,
  getQuantity: api.getQuantity ?? undefined,
  startDate: dateOnly(api.startDate),
  endDate: dateOnly(api.endDate),
  status: offerStatusCodec.fromApi(String(api.status ?? 'SCHEDULED')),
  targetAllShops: api.targetAllShops ?? false,
  // An empty list means the offer is catalogue-wide, which is how the backend
  // stores "no product restriction".
  productIds: (api.products ?? [])
    .map(row => row.productId)
    .filter((id): id is string => Boolean(id)),
});

/* -------------------------------------------------------------------------- */
/* Notifications — FR-43 to FR-45                                              */
/* -------------------------------------------------------------------------- */

export type ApiNotification = {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  isRead?: boolean;
  createdAt?: string;
  data?: Record<string, unknown> | null;
};

/** `GET /notifications` nests the rows and carries the unread count alongside. */
export type ApiNotificationFeed = {
  notifications?: ApiNotification[] | null;
  unreadCount?: number;
};

export function toNotification(api: ApiNotification): AppNotification {
  const type = notificationTypeCodec.fromApi(String(api.type));

  return {
    id: api.id,
    type,
    category: notificationCategories[type],
    title: api.title ?? '',
    body: api.body ?? '',
    isRead: api.isRead ?? false,
    createdAt: api.createdAt ?? '',
    data: api.data ?? undefined,
  };
}

export function toNotificationFeed(
  api: ApiNotificationFeed,
  total: number,
): NotificationFeed {
  return {
    // An unrecognised type would throw and take the whole feed with it, so
    // rows the app does not know about are dropped rather than blocking the
    // ones it does. This is a list, not a figure: omitting a row understates
    // nothing the user would act on.
    items: (api.notifications ?? []).flatMap(row => {
      if (!row?.type || !notificationTypeCodec.isKnown(row.type)) {
        return [];
      }
      return [toNotification(row)];
    }),
    unreadCount: api.unreadCount ?? 0,
    total,
  };
}

export type ApiNotificationPreference = {
  type?: string;
  push?: boolean;
  sms?: boolean;
  email?: boolean;
};

/**
 * FR-45 — one row per event, with the ones that cannot be muted marked as such.
 *
 * The backend stores a preference only once it has been changed, so the list it
 * returns is partial. The full set is assembled from the codec's own domain
 * values and defaults filled in to match the server's column defaults
 * (`push: true`, `sms: false`, `email: false`) rather than being left blank.
 */
export function toNotificationSettings(
  api: ApiNotificationPreference[],
): NotificationSetting[] {
  const stored = new Map(
    api
      .filter(row => row?.type && notificationTypeCodec.isKnown(row.type))
      .map(row => [notificationTypeCodec.fromApi(String(row.type)), row]),
  );

  return notificationTypeCodec.domainValues.map(type => {
    const row = stored.get(type);
    const muteable = isMuteableNotification(type);

    return {
      type,
      category: notificationCategories[type],
      // A critical alert reads as on whatever the server holds: FR-45 says it
      // cannot be muted, and showing it off would misstate what will happen.
      push: muteable ? row?.push ?? true : true,
      sms: muteable ? row?.sms ?? false : row?.sms ?? false,
      email: muteable ? row?.email ?? false : row?.email ?? false,
      muteable,
    };
  });
}
