import type {
  CreditBehavior,
  DateRangePreset,
  DeliveryStatus,
  OrderFilters,
  OrderStatus,
  ShopStatus,
} from '../../types/admin';
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
