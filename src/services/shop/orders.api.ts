import type { Order, Paginated, Pagination } from '../../types/admin';
import type { CartLine, ShopOrderFilters } from '../../types/shop';
import { addDays, toApiDate } from '../../utils/format';
import { apiDelete, apiGet, apiGetPaged, apiPatch, apiPost } from '../api';
import {
  NotImplementedOnServer,
  orderStatusCodec,
  toOrder,
  type ApiOrder,
} from '../mappers';

/**
 * The shop's own orders — FR-7 to FR-12, FR-22.
 *
 * Endpoints: `/orders`, `/orders/:id`, `/orders/:id/submit`,
 * `/orders/:id/cancel`, `/orders/repeat-last`, `/orders/repeat-weekday`.
 *
 * Every route here is the same one the franchise owner uses; the backend scopes
 * the rows to the caller's own shops from the JWT (`where.shopId in shopIds`),
 * so nothing in this file has to filter by shop for safety — it does so only
 * where a multi-outlet owner (FR-4) has picked one.
 */

/**
 * FR-7 — the only delivery date the API accepts.
 *
 * `POST /orders` runs `isValidOrderDate`, which requires exactly tomorrow. The
 * whole ordering surface is next-day by construction rather than by choice, so
 * this is the single place the date is decided.
 */
export const nextDeliveryDate = (): string => addDays(toApiDate(new Date()), 1);

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * `GET /orders` filters on one exact `deliveryDate` and has no from/to, so a
 * multi-day range cannot be honoured server-side. The list screen says so
 * rather than presenting unfiltered rows as filtered.
 * See docs/api-gaps.md G7.
 */
export function isOrderDateFilterSupported(filters: ShopOrderFilters): boolean {
  return filters.range.from === filters.range.to;
}

/** FR-22 — this shop's orders, one tab per stage of the FR-40 flow. */
export async function getShopOrders(
  filters: ShopOrderFilters,
  pagination: Pagination,
  shopId?: string,
): Promise<Paginated<Order>> {
  const page = await apiGetPaged<ApiOrder>('/orders', {
    page: pagination.page,
    limit: pagination.limit,
    ...(filters.status !== 'all'
      ? { status: orderStatusCodec.toApi(filters.status) }
      : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(isOrderDateFilterSupported(filters)
      ? { deliveryDate: filters.range.from }
      : {}),
    // FR-4 — a single-outlet owner is already scoped by the server; this only
    // narrows a multi-outlet login to the outlet currently selected.
    ...(shopId ? { shopId } : {}),
  });

  return { ...page, items: page.items.map(toOrder) };
}

export async function getShopOrder(orderId: string): Promise<Order> {
  return toOrder(await apiGet<ApiOrder>(`/orders/${orderId}`));
}

/**
 * FR-10, FR-22 — the order already in progress for tomorrow, if there is one.
 *
 * Answers `null`, not `undefined`, when there is none: TanStack Query treats an
 * `undefined` result as a failed query, which would make "no order yet" — an
 * ordinary state — indistinguishable from "the lookup failed". The two say
 * opposite things to a shop deciding whether it still has to order.
 *
 * Both a DRAFT (still editable) and a SUBMITTED order matter: the cart must
 * adopt an existing draft rather than creating a second one, and the home
 * screen shows "tomorrow's order" either way. Anything further down the
 * pipeline is history, not tomorrow's order.
 *
 * Returns the draft in preference to the submitted order, since that is the one
 * the shop can still act on.
 */
export async function getTomorrowsOrder(shopId?: string): Promise<Order | null> {
  const deliveryDate = nextDeliveryDate();

  const [drafts, submitted] = await Promise.all([
    apiGetPaged<ApiOrder>('/orders', {
      deliveryDate,
      status: orderStatusCodec.toApi('draft'),
      page: 1,
      limit: 1,
      ...(shopId ? { shopId } : {}),
    }),
    apiGetPaged<ApiOrder>('/orders', {
      deliveryDate,
      status: orderStatusCodec.toApi('submitted'),
      page: 1,
      limit: 1,
      ...(shopId ? { shopId } : {}),
    }),
  ]);

  const found = drafts.items[0] ?? submitted.items[0];
  if (!found) {
    return null;
  }

  // The list response includes items, but the detail route joins the delivery
  // and invoice too, which is what the cart and the detail screen both read.
  return getShopOrder(found.id);
}

/**
 * FR-22 — today's order, whatever stage it has reached.
 *
 * The home screen's order track shows today's alongside tomorrow's, and today's
 * is interesting precisely *because* it has moved on: in production, dispatched,
 * delivered. So unlike `getTomorrowsOrder` this takes no status filter and
 * reports whatever the day's order became.
 *
 * `NO_ORDER_PLACED` rows are dropped rather than mapped. The cut-off job writes
 * them as placeholders for shops that never ordered (FR-17), and `toOrder`
 * rejects the status because it is not one an order ever really held — reading
 * one as an order would put a phantom row on the track.
 */
export async function getTodaysOrder(shopId?: string): Promise<Order | null> {
  const deliveryDate = toApiDate(new Date());

  const page = await apiGetPaged<ApiOrder>('/orders', {
    deliveryDate,
    page: 1,
    limit: 5,
    ...(shopId ? { shopId } : {}),
  });

  const real = page.items.filter(item => orderStatusCodec.isKnown(String(item.status)));
  if (real.length === 0) {
    // `null` rather than `undefined` — see `getTomorrowsOrder`.
    return null;
  }

  // The list comes back newest-first, so the head is the current one. A
  // cancelled order only stands in when there is nothing else for the date.
  const active = real.find(item => item.status !== orderStatusCodec.toApi('cancelled'));

  return getShopOrder((active ?? real[0]).id);
}

/* -------------------------------------------------------------------------- */
/* Writes — the FR-7 order builder                                             */
/* -------------------------------------------------------------------------- */

const toApiItems = (lines: CartLine[]) =>
  lines.map(line => ({
    productId: line.productId,
    quantity: line.quantity,
    ...(line.note ? { notes: line.note } : {}),
  }));

/**
 * FR-7 — create the server-side draft from the cart.
 *
 * The server re-prices every line from the shop's own price list rather than
 * trusting the client, and rejects the call outright if a product is below its
 * MOQ, inactive, or unavailable for that date. So the returned order — not the
 * local cart — is the authoritative one, and callers replace their cart with it.
 */
export async function createDraftOrder(
  shopId: string,
  lines: CartLine[],
  notes?: string,
): Promise<Order> {
  return toOrder(
    await apiPost<ApiOrder>('/orders', {
      shopId,
      deliveryDate: nextDeliveryDate(),
      ...(notes ? { notes } : {}),
      items: toApiItems(lines),
    }),
  );
}

/**
 * FR-10 — rewrite a draft that has not been submitted.
 *
 * `PATCH /orders/:id` replaces the item set wholesale (it deletes and recreates
 * the rows), so the full cart is always sent. Sending a delta would silently
 * drop every line not included.
 */
export async function updateDraftOrder(
  orderId: string,
  lines: CartLine[],
  notes?: string,
): Promise<Order> {
  return toOrder(
    await apiPatch<ApiOrder>(`/orders/${orderId}`, {
      ...(notes !== undefined ? { notes } : {}),
      items: toApiItems(lines),
    }),
  );
}

/**
 * FR-12 — submit, which is what produces the order ID and notifies the admin.
 *
 * The server re-checks the cut-off here and answers 403 if it has passed, so
 * the client's countdown is a courtesy rather than the control.
 */
export async function submitOrder(orderId: string): Promise<Order> {
  return toOrder(await apiPost<ApiOrder>(`/orders/${orderId}/submit`, {}));
}

/**
 * FR-10 — cancel freely until cut-off.
 *
 * Allowed for DRAFT, SUBMITTED and ACCEPTED; a SUBMITTED order is refused once
 * the cut-off has passed, which is the freeze FR-10 describes.
 */
export async function cancelOrder(orderId: string): Promise<Order> {
  return toOrder(await apiPost<ApiOrder>(`/orders/${orderId}/cancel`, {}));
}

/** FR-10 — discard a draft entirely, as opposed to cancelling a submitted one. */
export async function deleteDraftOrder(orderId: string): Promise<void> {
  await apiDelete(`/orders/${orderId}`);
}

/* -------------------------------------------------------------------------- */
/* FR-8 — repeat, because demand is highly repetitive                          */
/* -------------------------------------------------------------------------- */

export type RepeatMode = 'last' | 'weekday';

/**
 * FR-8 — pre-fill tomorrow's order from the last one, or from the last order
 * for the same weekday.
 *
 * Both routes create a fresh DRAFT server-side at today's prices rather than
 * copying old ones, so a repeat never resurrects a stale price. They 404 when
 * there is nothing to repeat, which the caller surfaces as "no previous order"
 * rather than as an error.
 *
 * The weekday route matches on the delivery date itself rather than on the day
 * of the week, so it only finds a source order when one already exists for that
 * exact date — a backend quirk recorded as docs/api-gaps.md G18.
 */
export async function repeatOrder(
  shopId: string,
  mode: RepeatMode,
): Promise<Order> {
  const path = mode === 'last' ? '/orders/repeat-last' : '/orders/repeat-weekday';

  return toOrder(
    await apiPost<ApiOrder>(path, {
      shopId,
      deliveryDate: nextDeliveryDate(),
    }),
  );
}

/* -------------------------------------------------------------------------- */
/* Gaps                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * FR-24 — export the filtered list to PDF or CSV and share it.
 *
 * There is no order or transaction export endpoint at all; the report routes
 * stream CSV rather than returning a URL, and nothing produces PDF. A stream
 * is also not something React Native can hand to the OS without a file-system
 * module. See docs/api-gaps.md G11.
 */
export async function exportShopOrders(
  _filters: ShopOrderFilters,
): Promise<{ url: string }> {
  throw new NotImplementedOnServer(
    'exportShopOrders',
    'G11',
    'no order or transaction export endpoint, and report exports stream CSV rather than returning a URL',
  );
}
