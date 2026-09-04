import type {
  CreditBehavior,
  DateRangePreset,
  DeliveryStatus,
  OrderFilters,
  OrderStatus,
  ShopStatus,
} from '../../types/admin';
import type {
  DiscountType,
  InvoiceStatus,
  NotificationCategory,
  NotificationType,
  OfferStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../types/shop';
import type { UserRole } from '../../store/authSlice';
import { createEnumCodec } from './codec';

/* -------------------------------------------------------------------------- */
/* Order status — FR-40                                                        */
/* -------------------------------------------------------------------------- */

export type ApiOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'IN_PRODUCTION'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'INVOICED'
  | 'CANCELLED'
  | 'NO_ORDER_PLACED';

/**
 * The eight states an order can actually hold in the domain model. The backend
 * has a ninth, `NO_ORDER_PLACED` (FR-17: a shop that did not submit before
 * cut-off), which the frontend expresses as the `pending_cutoff` *filter*
 * rather than as an order status — see `orderFilterStatusToApi` below.
 */
export const orderStatusCodec = createEnumCodec<OrderStatus, ApiOrderStatus>(
  'order status',
  {
    draft: 'DRAFT',
    submitted: 'SUBMITTED',
    accepted: 'ACCEPTED',
    in_production: 'IN_PRODUCTION',
    dispatched: 'DISPATCHED',
    delivered: 'DELIVERED',
    invoiced: 'INVOICED',
    cancelled: 'CANCELLED',
  },
);

/** FR-17 — written by the backend's cut-off job; has no domain counterpart. */
export const API_NO_ORDER_PLACED = 'NO_ORDER_PLACED' as const;

/**
 * `OrderFilters.status` carries two values that are not order statuses:
 * `'all'` (no filter) and `'pending_cutoff'` (FR-17). Returns undefined for
 * `'all'` so the caller can simply omit the query parameter.
 */
export function orderFilterStatusToApi(
  status: OrderFilters['status'],
): ApiOrderStatus | undefined {
  if (status === 'all') {
    return undefined;
  }
  if (status === 'pending_cutoff') {
    return API_NO_ORDER_PLACED;
  }
  return orderStatusCodec.toApi(status);
}

/**
 * Reading an order back. `NO_ORDER_PLACED` rows arrive from the same list
 * endpoint as real orders, so callers get the widened type and decide how to
 * render the placeholder rather than having it silently become a draft.
 */
export function orderStatusFromApi(
  value: string,
): OrderStatus | 'pending_cutoff' {
  if (value === API_NO_ORDER_PLACED) {
    return 'pending_cutoff';
  }
  return orderStatusCodec.fromApi(value);
}

/* -------------------------------------------------------------------------- */
/* Shop status — FR-3                                                          */
/* -------------------------------------------------------------------------- */

export type ApiShopStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export const shopStatusCodec = createEnumCodec<ShopStatus, ApiShopStatus>(
  'shop status',
  {
    active: 'ACTIVE',
    suspended: 'SUSPENDED',
    inactive: 'INACTIVE',
  },
);

/* -------------------------------------------------------------------------- */
/* Date-range preset — FR-19                                                   */
/* -------------------------------------------------------------------------- */

export type ApiDateRangePeriod =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM';

/**
 * The dashboard endpoints accept `period` plus optional `from`/`to`. The app
 * resolves every preset to concrete IST bounds in `utils/dateRange`, so callers
 * should send both: `period` for the server's own bucketing, and the bounds so
 * the figures agree with what the date picker is showing.
 */
export const dateRangePresetCodec = createEnumCodec<
  DateRangePreset,
  ApiDateRangePeriod
>('date range preset', {
  today: 'TODAY',
  yesterday: 'YESTERDAY',
  thisWeek: 'THIS_WEEK',
  thisMonth: 'THIS_MONTH',
  lastMonth: 'LAST_MONTH',
  custom: 'CUSTOM',
});

/* -------------------------------------------------------------------------- */
/* Credit behaviour — FR-6, PRD §8                                             */
/* -------------------------------------------------------------------------- */

export type ApiCreditBehavior = 'WARN' | 'BLOCK_ORDER';

export const creditBehaviorCodec = createEnumCodec<CreditBehavior, ApiCreditBehavior>(
  'credit behaviour',
  { warn: 'WARN', blockOrder: 'BLOCK_ORDER' },
);

/* -------------------------------------------------------------------------- */
/* Delivery status — FR-40                                                     */
/* -------------------------------------------------------------------------- */

export type ApiDeliveryStatus =
  | 'PENDING'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'FAILED';

export const deliveryStatusCodec = createEnumCodec<DeliveryStatus, ApiDeliveryStatus>(
  'delivery status',
  {
    pending: 'PENDING',
    in_transit: 'IN_TRANSIT',
    delivered: 'DELIVERED',
    partially_delivered: 'PARTIALLY_DELIVERED',
    failed: 'FAILED',
  },
);

/* -------------------------------------------------------------------------- */
/* User role — PRD §3                                                          */
/* -------------------------------------------------------------------------- */

export type ApiUserRole = 'ADMIN' | 'SHOP_OWNER' | 'SUPPORT_STAFF';

export const userRoleCodec = createEnumCodec<UserRole, ApiUserRole>('user role', {
  admin: 'ADMIN',
  shopOwner: 'SHOP_OWNER',
  supportStaff: 'SUPPORT_STAFF',
});

/* -------------------------------------------------------------------------- */
/* Invoice status — FR-25                                                      */
/* -------------------------------------------------------------------------- */

export type ApiInvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export const invoiceStatusCodec = createEnumCodec<InvoiceStatus, ApiInvoiceStatus>(
  'invoice status',
  {
    draft: 'DRAFT',
    issued: 'ISSUED',
    partially_paid: 'PARTIALLY_PAID',
    paid: 'PAID',
    overdue: 'OVERDUE',
    cancelled: 'CANCELLED',
  },
);

/* -------------------------------------------------------------------------- */
/* Payment method and status — FR-27, FR-29, FR-30                             */
/* -------------------------------------------------------------------------- */

export type ApiPaymentMethod =
  | 'UPI'
  | 'CARD'
  | 'NET_BANKING'
  | 'CASH'
  | 'CHEQUE'
  | 'NEFT';

export const paymentMethodCodec = createEnumCodec<PaymentMethod, ApiPaymentMethod>(
  'payment method',
  {
    upi: 'UPI',
    card: 'CARD',
    netBanking: 'NET_BANKING',
    cash: 'CASH',
    cheque: 'CHEQUE',
    neft: 'NEFT',
  },
);

/** FR-27 — the three rails that go to a gateway, as opposed to the offline ones. */
export const ONLINE_PAYMENT_METHODS: readonly PaymentMethod[] = [
  'upi',
  'card',
  'netBanking',
];

export type ApiPaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING_CONFIRMATION'
  | 'REJECTED'
  | 'REFUNDED';

export const paymentStatusCodec = createEnumCodec<PaymentStatus, ApiPaymentStatus>(
  'payment status',
  {
    pending: 'PENDING',
    success: 'SUCCESS',
    failed: 'FAILED',
    pendingConfirmation: 'PENDING_CONFIRMATION',
    rejected: 'REJECTED',
    refunded: 'REFUNDED',
  },
);

/* -------------------------------------------------------------------------- */
/* Offers — FR-32, FR-34                                                       */
/* -------------------------------------------------------------------------- */

export type ApiDiscountType = 'PERCENTAGE' | 'FLAT' | 'BUY_X_GET_Y';

export const discountTypeCodec = createEnumCodec<DiscountType, ApiDiscountType>(
  'discount type',
  { percentage: 'PERCENTAGE', flat: 'FLAT', buyXGetY: 'BUY_X_GET_Y' },
);

export type ApiOfferStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'WITHDRAWN';

export const offerStatusCodec = createEnumCodec<OfferStatus, ApiOfferStatus>(
  'offer status',
  {
    active: 'ACTIVE',
    scheduled: 'SCHEDULED',
    expired: 'EXPIRED',
    withdrawn: 'WITHDRAWN',
  },
);

/* -------------------------------------------------------------------------- */
/* Notifications — FR-44, FR-45                                                */
/* -------------------------------------------------------------------------- */

export type ApiNotificationType =
  | 'CUT_OFF_REMINDER'
  | 'ORDER_SUBMITTED'
  | 'ORDER_ACCEPTED'
  | 'ORDER_IN_PRODUCTION'
  | 'ORDER_DISPATCHED'
  | 'ORDER_DELIVERED'
  | 'INVOICE_GENERATED'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_OVERDUE'
  | 'NEW_OFFER'
  | 'CREDIT_LIMIT_WARNING';

/** FR-44 — the full event list the backend can raise. */
export const notificationTypeCodec = createEnumCodec<
  NotificationType,
  ApiNotificationType
>('notification type', {
  cutoffReminder: 'CUT_OFF_REMINDER',
  orderSubmitted: 'ORDER_SUBMITTED',
  orderAccepted: 'ORDER_ACCEPTED',
  orderInProduction: 'ORDER_IN_PRODUCTION',
  orderDispatched: 'ORDER_DISPATCHED',
  orderDelivered: 'ORDER_DELIVERED',
  invoiceGenerated: 'INVOICE_GENERATED',
  paymentSuccess: 'PAYMENT_SUCCESS',
  paymentFailed: 'PAYMENT_FAILED',
  paymentOverdue: 'PAYMENT_OVERDUE',
  newOffer: 'NEW_OFFER',
  creditLimitWarning: 'CREDIT_LIMIT_WARNING',
});

/**
 * FR-45 — which bucket each event falls in, and therefore whether it can be
 * muted. Cut-off and financial alerts cannot be; the backend's preferences
 * endpoint accepts muting them anyway, so the rule is enforced here.
 * See docs/api-gaps.md G17.
 */
export const notificationCategories: Record<NotificationType, NotificationCategory> = {
  cutoffReminder: 'cutoff',
  orderSubmitted: 'order',
  orderAccepted: 'order',
  orderInProduction: 'order',
  orderDispatched: 'order',
  orderDelivered: 'order',
  invoiceGenerated: 'financial',
  paymentSuccess: 'financial',
  paymentFailed: 'financial',
  paymentOverdue: 'financial',
  newOffer: 'offer',
  creditLimitWarning: 'financial',
};

/** FR-45 — only order and offer notices may be silenced. */
export const isMuteableNotification = (type: NotificationType): boolean =>
  notificationCategories[type] === 'order' || notificationCategories[type] === 'offer';
