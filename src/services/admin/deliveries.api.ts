import type { Delivery, Order, ShortSupplyLine } from '../../types/admin';
import { apiGetPaged, apiPost } from '../api';
import { toDelivery, type ApiDelivery } from '../mappers';
import { getOrder } from './orders.api';

/**
 * Deliveries — FR-40 dispatch, delivery and short supply.
 *
 * Endpoints: `/deliveries`, `/deliveries/:id`, `/deliveries/:id/dispatch`,
 * `/deliveries/:id/deliver`.
 *
 * This is where delivered quantities live. The order status route accepts only
 * `{status}`, so anything to do with *how much* actually arrived — and why a
 * line fell short — belongs here, not on the order.
 */

/**
 * The delivery for an order, or null if none has been created.
 *
 * `GET /deliveries` has no `orderId` filter, so this lists that delivery date
 * and matches client-side. See docs/api-gaps.md G12.
 */
export async function findDeliveryForOrder(order: Order): Promise<Delivery | null> {
  const page = await apiGetPaged<ApiDelivery>('/deliveries', {
    deliveryDate: order.deliveryDate,
    page: 1,
    limit: 100,
  });

  const match = page.items
    .map(toDelivery)
    .find(delivery => delivery.orderId === order.shopId || delivery.orderId === order.id);

  return match ?? null;
}

export async function createDelivery(order: Order): Promise<Delivery> {
  return toDelivery(
    await apiPost<ApiDelivery>('/deliveries', {
      orderId: order.id,
      deliveryDate: order.deliveryDate,
    }),
  );
}

/** Creates the delivery on first use, so callers need not track its lifecycle. */
async function ensureDelivery(order: Order): Promise<Delivery> {
  return (await findDeliveryForOrder(order)) ?? (await createDelivery(order));
}

export async function dispatchDelivery(
  deliveryId: string,
  notes?: string,
): Promise<void> {
  await apiPost(`/deliveries/${deliveryId}/dispatch`, notes ? { notes } : {});
}

/**
 * FR-40 — the Delivered step, carrying what actually arrived.
 *
 * `lines` is the short-supply declaration; any order line not named is treated
 * as delivered in full, which is what "no shortfall recorded" means.
 */
export async function deliverOrder(
  orderId: string,
  lines: ShortSupplyLine[],
  options?: { receivedBy?: string; notes?: string },
): Promise<Order> {
  const order = await getOrder(orderId);
  const delivery = await ensureDelivery(order);

  // The deliver route expects a quantity for every line, so unnamed lines are
  // filled in from the ordered quantity rather than sent as zero.
  const declared = new Map(lines.map(line => [line.productId, line]));

  const items = order.items.map(item => {
    const line = declared.get(item.productId);
    const deliveredQuantity = line
      ? Math.min(Math.max(line.deliveringQty, 0), item.orderedQty)
      : item.orderedQty;

    return {
      productId: item.productId,
      deliveredQuantity,
      ...(deliveredQuantity < item.orderedQty && line?.reason
        ? { shortSupplyReason: line.reason }
        : {}),
    };
  });

  await apiPost(`/deliveries/${delivery.id}/deliver`, {
    ...(options?.receivedBy ? { receivedBy: options.receivedBy } : {}),
    ...(options?.notes ? { notes: options.notes } : {}),
    items,
  });

  // The order's own status and delivered quantities are re-read: the server
  // decides which lines end up flagged short.
  return getOrder(orderId);
}

/**
 * FR-40 — the shortfall declared ahead of delivery.
 *
 * The backend records shortfall only at the point of delivery, so declaring it
 * early and dispatching are the same call sequence: ensure a delivery exists,
 * mark it dispatched, then deliver with the quantities. There is no endpoint
 * that stores an intended shortfall without completing the delivery.
 */
export async function captureShortSupply(
  orderId: string,
  lines: ShortSupplyLine[],
): Promise<Order> {
  const order = await getOrder(orderId);
  const delivery = await ensureDelivery(order);

  if (delivery.status === 'pending') {
    await dispatchDelivery(delivery.id);
  }

  return deliverOrder(orderId, lines);
}
