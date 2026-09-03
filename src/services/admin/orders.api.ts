import type {
  ExportFormat,
  Order,
  OrderFilters,
  OrderStatus,
  OrderStatusCounts,
  Paginated,
  Pagination,
  ShortSupplyLine,
} from '../../types/admin';
import { addDays, toApiDate } from '../../utils/format';
import { apiGet, apiGetPaged } from '../api';
import {
  API_NO_ORDER_PLACED,
  NotImplementedOnServer,
  orderFilterStatusToApi,
  orderStatusCodec,
  toOrder,
  type ApiOrder,
} from '../mappers';
import { orders as mockOrders, recordAudit } from './mockStore';

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
/* Writes — MOCK-BACKED. See the banner in `api/index.ts`.                     */
/* -------------------------------------------------------------------------- */

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  payload?: { deliveredQty?: Record<string, number>; reason?: string },
): Promise<Order> {
  const index = mockOrders.findIndex(order => order.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  const previous = mockOrders[index];
  const items = payload?.deliveredQty
    ? previous.items.map(item => ({
        ...item,
        deliveredQty: payload.deliveredQty?.[item.productId] ?? item.orderedQty,
      }))
    : previous.items;

  const updated: Order = {
    ...previous,
    status,
    items,
    shortSupply: items.some(
      item => item.deliveredQty !== undefined && item.deliveredQty < item.orderedQty,
    )
      ? true
      : previous.shortSupply,
    invoiceId:
      status === 'invoiced'
        ? previous.invoiceId ?? `INV-${previous.id.replace('CC-', '')}`
        : previous.invoiceId,
    statusHistory: [
      ...previous.statusHistory,
      { status, at: new Date().toISOString(), actor: 'Franchise admin' },
    ],
  };

  mockOrders[index] = updated;
  recordAudit(previous.shopId, {
    action: 'Order status changed',
    field: previous.id,
    before: previous.status,
    after: status,
  });

  return updated;
}

export async function captureShortSupply(
  orderId: string,
  lines: ShortSupplyLine[],
): Promise<Order> {
  const index = mockOrders.findIndex(order => order.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  const previous = mockOrders[index];
  const byProduct = new Map(lines.map(line => [line.productId, line]));

  const items = previous.items.map(item => {
    const line = byProduct.get(item.productId);
    if (!line) {
      return item;
    }

    const deliveredQty = Math.min(Math.max(line.deliveringQty, 0), item.orderedQty);
    return {
      ...item,
      deliveredQty,
      shortSupplyReason: deliveredQty < item.orderedQty ? line.reason : undefined,
    };
  });

  const short = items.some(
    item => item.deliveredQty !== undefined && item.deliveredQty < item.orderedQty,
  );

  const updated: Order = { ...previous, items, shortSupply: short || undefined };

  mockOrders[index] = updated;
  recordAudit(previous.shopId, {
    action: 'Short supply recorded',
    field: previous.id,
    before: `${previous.items.length} lines ordered in full`,
    after: `${items.filter(
      item => item.deliveredQty !== undefined && item.deliveredQty < item.orderedQty,
    ).length} lines short`,
  });

  return updated;
}

export async function bulkUpdateOrderStatus(
  orderIds: string[],
  status: OrderStatus,
): Promise<Order[]> {
  return Promise.all(orderIds.map(orderId => updateOrderStatus(orderId, status)));
}

/** FR-18 — reopen after cut-off. No backend endpoint exists; see gap G10. */
export async function reopenOrder(orderId: string, reason: string): Promise<Order> {
  const index = mockOrders.findIndex(order => order.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  const previous = mockOrders[index];
  const updated: Order = {
    ...previous,
    status: 'draft',
    wasReopened: true,
    reopenReason: reason,
    statusHistory: [
      ...previous.statusHistory,
      { status: 'draft', at: new Date().toISOString(), actor: 'Franchise admin (reopen)' },
    ],
  };

  mockOrders[index] = updated;
  recordAudit(previous.shopId, {
    action: 'Order reopened after cut-off',
    field: previous.id,
    before: previous.status,
    after: `draft - ${reason}`,
  });

  return updated;
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
