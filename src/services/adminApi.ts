/**
 * Admin (franchise owner) endpoints.
 *
 * NOTE: these are stubs with simulated latency, backed by the seeded dataset in
 * `adminApi.mock`, so the admin screens are runnable end to end. Swap each body
 * for the matching `httpClient` call against https://api.cakeconnect.com when
 * the backend is ready — the screens and hooks depend only on the shapes
 * declared here and in `types/admin`.
 *
 * Every write records an audit entry (PRD §3: actor, timestamp, before/after).
 */

import type {
  AgeingBucket,
  AuditEntry,
  DateRange,
  DashboardStats,
  ExportFormat,
  LedgerEntry,
  Order,
  OrderFilters,
  OrderStatus,
  OrderStatusCounts,
  OrderTrendPoint,
  Paginated,
  Pagination,
  PriceList,
  ProductionDetail,
  ProductionRequirement,
  ProductionShopLine,
  ProductionTrendPoint,
  Shop,
  ShopFilters,
  ShopInput,
  ShopStatus,
  ShortSupplyLine,
  TopProductPoint,
} from '../types/admin';
import { addDays, creditUtilisation, toApiDate } from '../utils/format';
import { delay } from './httpClient';
import {
  CUTOFF_TIME,
  auditEntries,
  buildLedger,
  orders,
  priceLists,
  products,
  recordAudit,
  regions,
  shops,
} from './adminApi.mock';

const inRange = (date: string, range: DateRange) =>
  date >= range.from && date <= range.to;

const paginate = <T,>(items: T[], { page, limit }: Pagination): Paginated<T> => ({
  items: items.slice((page - 1) * limit, page * limit),
  page,
  limit,
  total: items.length,
});

/* -------------------------------------------------------------------------- */
/* Dashboard — FR-36, FR-37, FR-21                                            */
/* -------------------------------------------------------------------------- */

export async function getDashboardStats(range: DateRange): Promise<DashboardStats> {
  // TODO: httpClient.get('/admin/dashboard/stats', { params: range })
  await delay(500);

  const today = toApiDate(new Date());
  const activeShops = shops.filter(shop => shop.status === 'active');
  const todaysOrders = orders.filter(order => order.orderDate === today);
  const rangeOrders = orders.filter(order => inRange(order.orderDate, range));
  const submittedShopIds = new Set(todaysOrders.map(order => order.shopId));

  return {
    totalShops: shops.length,
    activeShops: activeShops.length,
    suspendedShops: shops.filter(shop => shop.status === 'suspended').length,
    ordersReceivedToday: todaysOrders.length,
    ordersPendingAgainstCutoff: activeShops.length - submittedShopIds.size,
    todaysOrderValue: todaysOrders.reduce((sum, order) => sum + order.total, 0),
    networkOutstanding: shops.reduce((sum, shop) => sum + shop.outstanding, 0),
    collectionsReceivedToday: Math.round(
      rangeOrders.slice(0, 6).reduce((sum, order) => sum + order.total, 0) * 0.6,
    ),
    cutoffTime: CUTOFF_TIME,
    nextCutoffAt: nextCutoffIso(),
    shopsSubmitted: submittedShopIds.size,
    shopsExpected: activeShops.length,
    noOrderPlacedCount: activeShops.length - submittedShopIds.size,
  };
}

/** Today's cut-off if it is still ahead, otherwise tomorrow's. */
function nextCutoffIso(): string {
  const today = toApiDate(new Date());
  const todayCutoff = new Date(`${today}T${CUTOFF_TIME}:00+05:30`);

  return todayCutoff.getTime() > Date.now()
    ? todayCutoff.toISOString()
    : new Date(`${addDays(today, 1)}T${CUTOFF_TIME}:00+05:30`).toISOString();
}

export async function getOrderTrends(range: DateRange): Promise<OrderTrendPoint[]> {
  // TODO: httpClient.get('/admin/dashboard/trends', { params: range })
  await delay(450);

  const byDate = new Map<string, OrderTrendPoint>();

  orders
    .filter(order => inRange(order.orderDate, range) && order.status !== 'cancelled')
    .forEach(order => {
      const point = byDate.get(order.orderDate) ?? {
        date: order.orderDate,
        orderValue: 0,
        orderCount: 0,
      };
      point.orderValue += order.total;
      point.orderCount += 1;
      byDate.set(order.orderDate, point);
    });

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function getTopProducts(range: DateRange): Promise<TopProductPoint[]> {
  // TODO: httpClient.get('/admin/dashboard/top-products', { params: range })
  await delay(400);

  const byProduct = new Map<string, TopProductPoint>();

  orders
    .filter(order => inRange(order.orderDate, range) && order.status !== 'cancelled')
    .forEach(order =>
      order.items.forEach(item => {
        const point = byProduct.get(item.productId) ?? {
          productId: item.productId,
          name: item.name,
          unit: item.unit,
          quantity: 0,
        };
        point.quantity += item.orderedQty;
        byProduct.set(item.productId, point);
      }),
    );

  return [...byProduct.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);
}

/** FR-37 — consolidated kitchen requirement for one delivery date. */
export async function getProductionRequirement(
  deliveryDate: string,
): Promise<ProductionRequirement> {
  // TODO: httpClient.get(`/admin/production/${deliveryDate}`)
  await delay(500);

  const relevant = orders.filter(
    order =>
      order.deliveryDate === deliveryDate &&
      order.status !== 'cancelled' &&
      order.status !== 'draft',
  );

  const byProduct = new Map<string, { qty: number; shops: Set<string> }>();

  relevant.forEach(order =>
    order.items.forEach(item => {
      const line = byProduct.get(item.productId) ?? { qty: 0, shops: new Set<string>() };
      line.qty += item.orderedQty;
      line.shops.add(order.shopId);
      byProduct.set(item.productId, line);
    }),
  );

  return {
    deliveryDate,
    // FR-17 — the figure freezes once the cut-off for that delivery has passed.
    frozen: new Date(`${addDays(deliveryDate, -1)}T${CUTOFF_TIME}:00+05:30`).getTime() < Date.now(),
    totalShops: shops.filter(shop => shop.status === 'active').length,
    lines: [...byProduct.entries()]
      .map(([productId, line]) => {
        const product = products.find(candidate => candidate.id === productId);

        return {
          productId,
          name: product?.name ?? productId,
          variant: product?.variant ?? '',
          category: product?.category ?? 'cakes',
          unit: product?.unit ?? 'pcs',
          totalQuantity: line.qty,
          shopCount: line.shops.size,
        };
      })
      .sort((a, b) => b.totalQuantity - a.totalQuantity),
  };
}

/**
 * FR-37 for a single product: which shops asked for it, the notes they
 * attached (FR-7), and how the last week of demand has moved, so an unusual
 * number can be checked before the kitchen commits to the bake.
 */
export async function getProductionDetail(
  deliveryDate: string,
  productId: string,
): Promise<ProductionDetail> {
  // TODO: httpClient.get(`/admin/production/${deliveryDate}/${productId}`)
  await delay(450);

  const product = products.find(candidate => candidate.id === productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const relevantOrders = orders.filter(
    order =>
      order.deliveryDate === deliveryDate &&
      order.status !== 'cancelled' &&
      order.status !== 'draft',
  );

  const shopLines: ProductionShopLine[] = [];

  relevantOrders.forEach(order => {
    const item = order.items.find(candidate => candidate.productId === productId);
    if (item) {
      shopLines.push({
        shopId: order.shopId,
        shopName: order.shopName,
        quantity: item.orderedQty,
        note: item.note,
      });
    }
  });

  // Seven days ending on this delivery date, zero-filled so the chart keeps a
  // constant number of bars whether or not a day had demand.
  const trend: ProductionTrendPoint[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(deliveryDate, index - 6);
    const quantity = orders
      .filter(order => order.deliveryDate === date && order.status !== 'cancelled')
      .reduce(
        (sum, order) =>
          sum +
          (order.items.find(item => item.productId === productId)?.orderedQty ?? 0),
        0,
      );

    return { date, quantity };
  });

  return {
    deliveryDate,
    productId,
    name: product.name,
    variant: product.variant,
    category: product.category,
    description: product.description,
    unit: product.unit,
    totalQuantity: shopLines.reduce((sum, line) => sum + line.quantity, 0),
    shopCount: shopLines.length,
    totalShops: shops.filter(shop => shop.status === 'active').length,
    trend,
    shops: shopLines.sort((a, b) => b.quantity - a.quantity),
  };
}

export async function exportProductionRequirement(
  deliveryDate: string,
  format: ExportFormat,
): Promise<{ url: string }> {
  // TODO: httpClient.post('/admin/production/export', { deliveryDate, format })
  await delay(700);
  return { url: `https://api.cakeconnect.com/exports/production-${deliveryDate}.${format}` };
}

/* -------------------------------------------------------------------------- */
/* Shops — FR-2, FR-3, FR-6, FR-38, FR-39                                     */
/* -------------------------------------------------------------------------- */

export async function getShops(
  filters: ShopFilters,
  pagination: Pagination,
): Promise<Paginated<Shop>> {
  // TODO: httpClient.get('/admin/shops', { params: { ...filters, ...pagination } })
  await delay(500);

  const search = filters.search.trim().toLowerCase();

  const filtered = shops.filter(shop => {
    if (filters.status !== 'all' && shop.status !== filters.status) {
      return false;
    }
    if (filters.region !== 'all' && shop.region !== filters.region) {
      return false;
    }
    if (!search) {
      return true;
    }
    return [shop.name, shop.code, shop.ownerName]
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case 'outstanding':
        return b.outstanding - a.outstanding;
      case 'creditUtilisation':
        return (
          creditUtilisation(b.creditUsed, b.creditLimit) -
          creditUtilisation(a.creditUsed, a.creditLimit)
        );
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return paginate(sorted, pagination);
}

/** FR-38 — the 0-30 / 31-60 / 60+ ageing split across the network. */
export async function getAgeingBuckets(): Promise<AgeingBucket[]> {
  // TODO: httpClient.get('/admin/shops/ageing')
  await delay(400);

  const labels: AgeingBucket['label'][] = ['0-30', '31-60', '60+'];

  return labels.map((label, index) => {
    const slice = shops.filter((_, shopIndex) => shopIndex % 3 === index);
    return {
      label,
      amount: slice.reduce((sum, shop) => sum + shop.outstanding, 0),
      shopCount: slice.length,
    };
  });
}

export async function getShop(shopId: string): Promise<Shop> {
  // TODO: httpClient.get(`/admin/shops/${shopId}`)
  await delay(400);

  const shop = shops.find(item => item.id === shopId);
  if (!shop) {
    throw new Error('Shop not found');
  }
  return shop;
}

export async function getPriceLists(): Promise<PriceList[]> {
  // TODO: httpClient.get('/admin/price-lists')
  await delay(250);
  return priceLists;
}

export async function getRegions(): Promise<string[]> {
  // TODO: httpClient.get('/admin/regions')
  await delay(200);
  return regions;
}

/** FR-2 — creates the shop and sends the owner their first-login invite. */
export async function createShop(input: ShopInput): Promise<Shop> {
  // TODO: httpClient.post('/admin/shops', input)
  await delay(700);

  const shop: Shop = {
    ...input,
    id: `shop_${Date.now()}`,
    status: 'active',
    creditUsed: 0,
    creditAvailable: input.creditLimit,
    priceListName: priceLists.find(list => list.id === input.priceListId)?.name ?? '',
    outstanding: 0,
    paidToDate: 0,
    todaysOrderStatus: 'no_order',
    inviteSentAt: new Date().toISOString(),
    createdAt: toApiDate(new Date()),
  };

  shops.unshift(shop);
  recordAudit(shop.id, { action: 'Shop created', after: shop.name });

  return shop;
}

export async function updateShop(shopId: string, input: ShopInput): Promise<Shop> {
  // TODO: httpClient.patch(`/admin/shops/${shopId}`, input)
  await delay(600);

  const index = shops.findIndex(shop => shop.id === shopId);
  if (index === -1) {
    throw new Error('Shop not found');
  }

  const previous = shops[index];
  const updated: Shop = {
    ...previous,
    ...input,
    priceListName: priceLists.find(list => list.id === input.priceListId)?.name ?? '',
    creditAvailable: Math.max(input.creditLimit - previous.creditUsed, 0),
  };

  shops[index] = updated;

  // PRD §3 — record each changed field with its before/after value.
  (Object.keys(input) as (keyof ShopInput)[]).forEach(field => {
    if (String(previous[field] ?? '') !== String(input[field] ?? '')) {
      recordAudit(shopId, {
        action: 'Shop updated',
        field,
        before: String(previous[field] ?? ''),
        after: String(input[field] ?? ''),
      });
    }
  });

  return updated;
}

/** FR-3 — activate, suspend or deactivate. */
export async function setShopStatus(shopId: string, status: ShopStatus): Promise<Shop> {
  // TODO: httpClient.post(`/admin/shops/${shopId}/status`, { status })
  await delay(500);

  const index = shops.findIndex(shop => shop.id === shopId);
  if (index === -1) {
    throw new Error('Shop not found');
  }

  const previous = shops[index].status;
  shops[index] = { ...shops[index], status };

  recordAudit(shopId, {
    action: 'Shop status changed',
    field: 'status',
    before: previous,
    after: status,
  });

  return shops[index];
}

export async function getShopLedger(
  shopId: string,
  range: DateRange,
): Promise<LedgerEntry[]> {
  // TODO: httpClient.get(`/admin/shops/${shopId}/ledger`, { params: range })
  await delay(500);
  return buildLedger(shopId).filter(entry => inRange(entry.date, range));
}

/** FR-39 — manual adjustment or credit note against a shop's ledger. */
export async function createLedgerAdjustment(
  shopId: string,
  input: { amount: number; reference: string; description: string },
): Promise<LedgerEntry> {
  // TODO: httpClient.post(`/admin/shops/${shopId}/adjustments`, input)
  await delay(600);

  const shopIndex = shops.findIndex(shop => shop.id === shopId);
  if (shopIndex === -1) {
    throw new Error('Shop not found');
  }

  const previousOutstanding = shops[shopIndex].outstanding;
  shops[shopIndex] = {
    ...shops[shopIndex],
    outstanding: previousOutstanding + input.amount,
  };

  recordAudit(shopId, {
    action: input.amount < 0 ? 'Credit note issued' : 'Adjustment posted',
    field: 'outstanding',
    before: String(previousOutstanding),
    after: String(previousOutstanding + input.amount),
  });

  return {
    id: `led_adj_${Date.now()}`,
    date: toApiDate(new Date()),
    type: input.amount < 0 ? 'credit_note' : 'adjustment',
    reference: input.reference,
    description: input.description,
    amount: input.amount,
    runningBalance: previousOutstanding + input.amount,
  };
}

export async function getShopAudit(shopId: string): Promise<AuditEntry[]> {
  // TODO: httpClient.get(`/admin/shops/${shopId}/audit`)
  await delay(350);
  return auditEntries[shopId] ?? [];
}

/* -------------------------------------------------------------------------- */
/* Orders — FR-40, FR-18, FR-24                                               */
/* -------------------------------------------------------------------------- */

export async function getOrders(
  filters: OrderFilters,
  pagination: Pagination,
): Promise<Paginated<Order>> {
  // TODO: httpClient.get('/admin/orders', { params: { ...filters, ...pagination } })
  await delay(550);

  const search = filters.search.trim().toLowerCase();

  const filtered = orders.filter(order => {
    const date = filters.dateField === 'orderDate' ? order.orderDate : order.deliveryDate;
    if (!inRange(date, filters.range)) {
      return false;
    }
    if (filters.shopId !== 'all' && order.shopId !== filters.shopId) {
      return false;
    }
    if (filters.status !== 'all' && filters.status !== 'pending_cutoff') {
      if (order.status !== filters.status) {
        return false;
      }
    }
    if (search && !order.id.toLowerCase().includes(search)) {
      return false;
    }
    return true;
  });

  return paginate(filtered, pagination);
}

/**
 * The queue tab counts for the current filters, minus the status itself — the
 * tabs have to keep showing what sits behind them while one of them is open,
 * so the count cannot come from the filtered page the list is already holding.
 */
export async function getOrderStatusCounts(
  filters: OrderFilters,
): Promise<OrderStatusCounts> {
  // TODO: httpClient.get('/admin/orders/counts', { params: { ...filters } })
  await delay(300);

  const search = filters.search.trim().toLowerCase();

  const matching = orders.filter(order => {
    const date = filters.dateField === 'orderDate' ? order.orderDate : order.deliveryDate;
    if (!inRange(date, filters.range)) {
      return false;
    }
    if (filters.shopId !== 'all' && order.shopId !== filters.shopId) {
      return false;
    }
    return search ? order.id.toLowerCase().includes(search) : true;
  });

  return matching.reduce<OrderStatusCounts>(
    (counts, order) => ({
      ...counts,
      all: counts.all + 1,
      [order.status]: (counts[order.status] ?? 0) + 1,
    }),
    { all: 0 },
  );
}

/**
 * FR-17 — active shops with no order for today's cut-off. Returned as
 * placeholder orders so the list screen can render one table for both views.
 */
export async function getShopsPendingCutoff(): Promise<Order[]> {
  // TODO: httpClient.get('/admin/orders/pending-cutoff')
  await delay(400);

  const today = toApiDate(new Date());
  const submitted = new Set(
    orders.filter(order => order.orderDate === today).map(order => order.shopId),
  );

  return shops
    .filter(shop => shop.status === 'active' && !submitted.has(shop.id))
    .map(shop => ({
      id: `NO-ORDER-${shop.code.replace('#', '')}`,
      shopId: shop.id,
      shopName: shop.name,
      shopCode: shop.code,
      ownerName: shop.ownerName,
      ownerPhone: shop.ownerPhone,
      ownerEmail: shop.ownerEmail,
      orderDate: today,
      deliveryDate: addDays(today, 1),
      cutoffAt: `${today}T${shop.cutoffOverride ?? CUTOFF_TIME}:00+05:30`,
      status: 'draft' as OrderStatus,
      statusHistory: [],
      items: [],
      subtotal: 0,
      taxTotal: 0,
      taxBreakdown: [],
      total: 0,
    }));
}

export async function getOrder(orderId: string): Promise<Order> {
  // TODO: httpClient.get(`/admin/orders/${orderId}`)
  await delay(400);

  const order = orders.find(item => item.id === orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  return order;
}

/** FR-40 — one transition, optionally carrying the delivered quantities. */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  payload?: { deliveredQty?: Record<string, number>; reason?: string },
): Promise<Order> {
  // TODO: httpClient.post(`/admin/orders/${orderId}/status`, { status, ...payload })
  await delay(600);

  const index = orders.findIndex(order => order.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  const previous = orders[index];
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

  orders[index] = updated;
  recordAudit(previous.shopId, {
    action: 'Order status changed',
    field: previous.id,
    before: previous.status,
    after: status,
  });

  return updated;
}

/**
 * FR-40 — the shortfall declared before the van loads, rather than discovered
 * at delivery. It writes the quantities the kitchen will actually send and the
 * reason for each gap, and leaves the status where it is: the order still has
 * to travel through the rest of the flow.
 */
export async function captureShortSupply(
  orderId: string,
  lines: ShortSupplyLine[],
): Promise<Order> {
  // TODO: httpClient.post(`/admin/orders/${orderId}/short-supply`, { lines })
  await delay(600);

  const index = orders.findIndex(order => order.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  const previous = orders[index];
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

  orders[index] = updated;
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

/** Applied as one call so a partial failure cannot leave the queue half-moved. */
export async function bulkUpdateOrderStatus(
  orderIds: string[],
  status: OrderStatus,
): Promise<Order[]> {
  // TODO: httpClient.post('/admin/orders/bulk-status', { orderIds, status })
  await delay(800);
  return Promise.all(orderIds.map(orderId => updateOrderStatus(orderId, status)));
}

/** FR-18 — reopen after cut-off by exception; always audit-logged with a reason. */
export async function reopenOrder(orderId: string, reason: string): Promise<Order> {
  // TODO: httpClient.post(`/admin/orders/${orderId}/reopen`, { reason })
  await delay(600);

  const index = orders.findIndex(order => order.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  const previous = orders[index];
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

  orders[index] = updated;
  recordAudit(previous.shopId, {
    action: 'Order reopened after cut-off',
    field: previous.id,
    before: previous.status,
    after: `draft — ${reason}`,
  });

  return updated;
}

/** FR-24 / FR-42 — the filtered list, not the whole table. */
export async function exportOrders(
  filters: OrderFilters,
  format: ExportFormat,
): Promise<{ url: string }> {
  // TODO: httpClient.post('/admin/orders/export', { ...filters, format })
  await delay(800);
  return {
    url: `https://api.cakeconnect.com/exports/orders-${filters.range.from}-${filters.range.to}.${format}`,
  };
}
