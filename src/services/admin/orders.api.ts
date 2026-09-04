import type {
  ExportFormat,
  Order,
  OrderFilters,
  OrderStatus,
  OrderStatusCounts,
  Paginated,
  Pagination,
} from '../../types/admin';
import { addDays, toApiDate } from '../../utils/format';
import { apiGet, apiGetPaged, apiPatch, apiPost } from '../api';
import {
  API_NO_ORDER_PLACED,
  NotImplementedOnServer,
  orderFilterStatusToApi,
  orderStatusCodec,
  toOrder,
  type ApiOrder,
} from '../mappers';

/**
 * Orders — FR-40 queue, FR-17 cut-off compliance, FR-18 reopen.
 *
 * Endpoints: `/orders`, `/orders/:id`, `/orders/:id/status`, `/orders/:id/cancel`.
 */

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `GET /orders` filters on an exact `deliveryDate` and has no from/to, so a
 * multi-day range cannot be honoured server-side. Screens call this to warn
 * that the date filter is not being applied rather than showing
 * filtered-looking results that are not filtered. See docs/api-gaps.md G7.
 */
export function isOrderDateFilterSupported(filters: OrderFilters): boolean {
  return filters.dateField === 'deliveryDate' && filters.range.from === filters.range.to;
}

const orderQuery = (filters: OrderFilters) => {
  const status = orderFilterStatusToApi(filters.status);

  return {
    ...(status ? { status } : {}),
    ...(filters.shopId !== 'all' ? { shopId: filters.shopId } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(isOrderDateFilterSupported(filters) ? { deliveryDate: filters.range.from } : {}),
  };
};

export async function getOrders(
  filters: OrderFilters,
  pagination: Pagination,
): Promise<Paginated<Order>> {
  const page = await apiGetPaged<ApiOrder>('/orders', {
    page: pagination.page,
    limit: pagination.limit,
    ...orderQuery(filters),
  });

  return { ...page, items: page.items.map(toOrder) };
}

export async function getOrder(orderId: string): Promise<Order> {
  return toOrder(await apiGet<ApiOrder>(`/orders/${orderId}`));
}

/**
 * Queue tab counts. There is no `/orders/counts`, so this issues one
 * `limit=1` query per status in parallel and reads `meta.total`. Those are real
 * server counts rather than a client-side tally, but it is nine requests where
 * one would do — see docs/api-gaps.md G9.
 */
export async function getOrderStatusCounts(
  filters: OrderFilters,
): Promise<OrderStatusCounts> {
  // The tabs must keep their badges while one of them is selected, so the
  // status filter is dropped and the rest of the filters are shared.
  const shared = orderQuery({ ...filters, status: 'all' });
  const statuses = orderStatusCodec.domainValues;

  const [all, ...totals] = await Promise.all([
    apiGetPaged<ApiOrder>('/orders', { ...shared, page: 1, limit: 1 }),
    ...statuses.map(status =>
      apiGetPaged<ApiOrder>('/orders', {
        ...shared,
        status: orderStatusCodec.toApi(status),
        page: 1,
        limit: 1,
      }),
    ),
  ]);

  return statuses.reduce<OrderStatusCounts>(
    (counts, status, index) => ({ ...counts, [status]: totals[index].total }),
    { all: all.total },
  );
}

/**
 * FR-17 — active shops with no order against the cut-off. The backend's own
 * cut-off job writes these as orders in `NO_ORDER_PLACED`, so they are read
 * back rather than reconstructed from the shop list.
 */
export async function getShopsPendingCutoff(): Promise<Order[]> {
  const deliveryDate = addDays(toApiDate(new Date()), 1);

  const page = await apiGetPaged<ApiOrder>('/orders', {
    status: API_NO_ORDER_PLACED,
    deliveryDate,
    page: 1,
    limit: 100,
  });

  // `toOrder` rejects NO_ORDER_PLACED, which is not a domain status; these are
  // placeholder rows, so the status is pinned to the pre-submission state the
  // list renders them in.
  return page.items.map(item => toOrder({ ...item, status: 'DRAFT' }));
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * FR-40 — one transition.
 *
 * `PATCH /orders/:id/status` accepts only `{status}`, and only the five forward
 * states; cancellation is its own route. Delivered quantities are NOT accepted
 * here — they belong to `deliveries.api.ts`, so a Delivered transition that
 * carries a shortfall must go through `deliverOrder` instead.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  if (status === 'cancelled') {
    return toOrder(await apiPost<ApiOrder>(`/orders/${orderId}/cancel`, {}));
  }

  if (status === 'draft' || status === 'submitted') {
    throw new NotImplementedOnServer(
      'updateOrderStatus',
      'G10',
      `the status route cannot move an order back to ${status}`,
    );
  }

  return toOrder(
    await apiPatch<ApiOrder>(`/orders/${orderId}/status`, {
      status: orderStatusCodec.toApi(status),
    }),
  );
}

/**
 * FR-18 — reopen a shop's order after cut-off by exception.
 *
 * No endpoint exists. Reconstructing it client-side would mean writing DRAFT
 * through a route that refuses it, and would leave no audit record of the
 * exception, which is the part FR-18 actually cares about.
 * See docs/api-gaps.md G10.
 */
export async function reopenOrder(
  _orderId: string,
  _reason: string,
): Promise<Order> {
  throw new NotImplementedOnServer(
    'reopenOrder',
    'G10',
    'no endpoint reopens an order after cut-off, and the exception must be audit-logged server-side',
  );
}

/**
 * FR-40 — move several orders at once.
 *
 * There is no bulk endpoint. Looping client-side would move some orders and
 * leave the rest, which is exactly the half-moved queue the caller is promised
 * cannot happen — so this refuses rather than pretending to be atomic.
 * See docs/api-gaps.md G13.
 */
export async function bulkUpdateOrderStatus(
  _orderIds: string[],
  _status: OrderStatus,
): Promise<Order[]> {
  throw new NotImplementedOnServer(
    'bulkUpdateOrderStatus',
    'G13',
    'no bulk endpoint; a client-side loop cannot be atomic and would half-move the queue',
  );
}

/**
 * FR-24 / FR-42 want PDF or CSV. The backend streams CSV from the report and
 * production-plan routes only, and has no order export at all — and a stream is
 * not a URL, so React Native needs a file-download path either way. See G11.
 */
export async function exportOrders(
  _filters: OrderFilters,
  _format: ExportFormat,
): Promise<{ url: string }> {
  throw new NotImplementedOnServer(
    'exportOrders',
    'G11',
    'no order export endpoint, and report exports stream CSV rather than returning a URL',
  );
}
