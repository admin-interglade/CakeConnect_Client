/**
 * Seeded, mutable dataset backing the `adminApi` stubs.
 *
 * It exists so the five admin screens are runnable end to end before the
 * backend lands: writes made through the API stubs are visible on the next
 * read, which is what the optimistic-update and invalidation paths need in
 * order to be exercised. Delete this file when `adminApi` talks to
 * https://api.cakeconnect.com for real.
 */

import type {
  AuditEntry,
  LedgerEntry,
  Order,
  OrderItem,
  OrderStatus,
  PriceList,
  ProductCategory,
  Shop,
  ShopStatus,
  TaxLine,
} from '../types/admin';
import { addDays, toApiDate } from '../utils/format';

/** Deterministic pseudo-random so the mock renders the same on every reload. */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

const random = seeded(20260830);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];
const between = (min: number, max: number) => Math.floor(random() * (max - min + 1)) + min;

export const GST_RATE = 0.05;
export const CUTOFF_TIME = '22:00';

export const priceLists: PriceList[] = [
  { id: 'pl_metro', name: 'Metro' },
  { id: 'pl_tier2', name: 'Tier 2' },
  { id: 'pl_premium', name: 'Premium outlets' },
];

export const regions = ['North', 'South', 'East', 'West'];

/**
 * `variant` is what the kitchen bakes to and `category` drives the production
 * plan's section filter, so both travel with the product rather than being
 * derived from the name.
 */
const products = [
  {
    id: 'p_choc_truffle',
    name: 'Chocolate Truffle Cake',
    variant: 'Standard Size - 1kg',
    category: 'cakes' as ProductCategory,
    description: 'Standard chocolate frosting decoration',
    unit: 'pcs',
    price: 420,
  },
  {
    id: 'p_black_forest',
    name: 'Black Forest Cake',
    variant: 'Standard Size - 1kg',
    category: 'cakes' as ProductCategory,
    description: 'Cherry and cream finish, chocolate shavings',
    unit: 'pcs',
    price: 620,
  },
  {
    id: 'p_red_velvet',
    name: 'Red Velvet Cake',
    variant: 'Standard Size - 500g',
    category: 'cakes' as ProductCategory,
    description: 'Cream cheese frosting, no decoration',
    unit: 'pcs',
    price: 480,
  },
  {
    id: 'p_butterscotch',
    name: 'Butterscotch Cake',
    variant: 'Standard Size - 1kg',
    category: 'cakes' as ProductCategory,
    description: 'Praline crunch topping',
    unit: 'pcs',
    price: 540,
  },
  {
    id: 'p_pineapple',
    name: 'Pineapple Pastry',
    variant: 'Standard Size - 6 pack',
    category: 'pastries' as ProductCategory,
    description: 'Fresh pineapple, whipped cream layers',
    unit: 'pcs',
    price: 65,
  },
  {
    id: 'p_butter_croissant',
    name: 'Butter Croissant',
    variant: 'Standard Size - 6 pack',
    category: 'pastries' as ProductCategory,
    description: 'All-butter laminated dough',
    unit: 'pcs',
    price: 55,
  },
  {
    id: 'p_dutch_truffle',
    name: 'Dutch Truffle Cake',
    variant: 'Standard Size - 1kg',
    category: 'cakes' as ProductCategory,
    description: 'Dark chocolate ganache glaze',
    unit: 'pcs',
    price: 700,
  },
  {
    id: 'p_veg_puff',
    name: 'Veg Puff',
    variant: 'Standard Size - 12 pack',
    category: 'savoury' as ProductCategory,
    description: 'Spiced potato filling, flaky pastry',
    unit: 'pcs',
    price: 25,
  },
  {
    id: 'p_choco_chip',
    name: 'Choco-chip Cookies',
    variant: 'Standard Size - 250g',
    category: 'dryItems' as ProductCategory,
    description: 'Shelf stable, sealed pack',
    unit: 'packs',
    price: 180,
  },
  {
    id: 'p_bread',
    name: 'Sandwich Bread',
    variant: 'Standard Size - 400g',
    category: 'dryItems' as ProductCategory,
    description: 'Sliced white loaf',
    unit: 'loaves',
    price: 48,
  },
];

const shopSeeds = [
  ['Sector 15, Gurgaon', 'North'],
  ['Koramangala, Bengaluru', 'South'],
  ['Bandra West, Mumbai', 'West'],
  ['Salt Lake, Kolkata', 'East'],
  ['Jubilee Hills, Hyderabad', 'South'],
  ['Vashi, Navi Mumbai', 'West'],
  ['Rajouri Garden, Delhi', 'North'],
  ['Anna Nagar, Chennai', 'South'],
  ['Aundh, Pune', 'West'],
  ['Gomti Nagar, Lucknow', 'North'],
  ['Panampilly Nagar, Kochi', 'South'],
  ['Bistupur, Jamshedpur', 'East'],
] as const;

const owners = [
  'Aarav Sharma', 'Meera Iyer', 'Rohan Desai', 'Ananya Bose',
  'Vikram Reddy', 'Priya Nair', 'Karan Malhotra', 'Sneha Pillai',
  'Aditya Kulkarni', 'Ishita Verma', 'Nikhil Menon', 'Ritu Mahato',
];

function buildShops(): Shop[] {
  return shopSeeds.map(([area, region], index) => {
    const creditLimit = between(2, 8) * 50_000;
    const creditUsed = Math.round(creditLimit * (0.15 + random() * 0.8));
    // Two shops are deliberately non-active so FR-3 states are visible.
    const status: ShopStatus =
      index === 5 ? 'suspended' : index === 9 ? 'inactive' : 'active';

    return {
      id: `shop_${200 + index}`,
      name: `CakeConnect ${area}`,
      code: `#${200 + index}`,
      ownerName: owners[index],
      ownerPhone: `9${between(700000000, 999999999)}`,
      ownerEmail: `${owners[index].split(' ')[0].toLowerCase()}@example.in`,
      address: `${between(1, 90)}, ${area}`,
      gstin: `${between(10, 36)}ABCDE${between(1000, 9999)}F1Z${between(1, 9)}`,
      region,
      status,
      creditLimit,
      creditUsed: Math.min(creditUsed, creditLimit),
      creditAvailable: Math.max(creditLimit - creditUsed, 0),
      priceListId: pick(priceLists).id,
      priceListName: '',
      cutoffOverride: index === 2 ? '21:00' : undefined,
      outstanding: Math.min(creditUsed, creditLimit),
      paidToDate: between(4, 40) * 25_000,
      todaysOrderStatus: status === 'active' ? pick(orderStatusPool) : 'no_order',
      createdAt: addDays(toApiDate(new Date()), -between(60, 400)),
    };
  });
}

const orderStatusPool: (OrderStatus | 'no_order')[] = [
  'submitted', 'accepted', 'in_production', 'dispatched', 'delivered', 'no_order',
];

export const shops: Shop[] = buildShops().map(shop => ({
  ...shop,
  priceListName: priceLists.find(list => list.id === shop.priceListId)?.name ?? '',
}));

/** Realistic per-item instructions (FR-7), surfaced on the production detail. */
const itemNotes = [
  'Happy Birthday message tag needed',
  'Deliver before the 10 AM morning slot',
  'Package with gold ribbon',
  'Needs dry-ice packaging',
  'Less sugar, same weight',
  'Eggless batch required',
];

function buildItems(): OrderItem[] {
  const count = between(3, 6);
  const chosen = [...products].sort(() => random() - 0.5).slice(0, count);

  return chosen.map(product => {
    const orderedQty = between(2, 40);
    return {
      productId: product.id,
      name: product.name,
      unit: product.unit,
      packSize: product.unit === 'pc' ? 1 : 6,
      moq: product.unit === 'pc' ? 6 : 1,
      orderedQty,
      unitPrice: product.price,
      lineTotal: orderedQty * product.price,
      note: random() > 0.6 ? pick(itemNotes) : undefined,
    };
  });
}

function taxFor(subtotal: number): { taxTotal: number; taxBreakdown: TaxLine[] } {
  const half = Math.round((subtotal * GST_RATE) / 2);
  return {
    taxTotal: half * 2,
    taxBreakdown: [
      { label: 'CGST', rate: (GST_RATE / 2) * 100, amount: half },
      { label: 'SGST', rate: (GST_RATE / 2) * 100, amount: half },
    ],
  };
}

/** Builds the audit-style status history implied by an order's current state. */
function historyFor(status: OrderStatus, submittedAt: string): Order['statusHistory'] {
  const flow: OrderStatus[] = [
    'submitted', 'accepted', 'in_production', 'dispatched', 'delivered', 'invoiced',
  ];
  const upto = flow.indexOf(status);
  const reached = upto === -1 ? ['submitted'] : flow.slice(0, upto + 1);
  const base = new Date(submittedAt).getTime();

  const events = reached.map((step, index) => ({
    status: step as OrderStatus,
    at: new Date(base + index * 3 * 3600_000).toISOString(),
    actor: index === 0 ? 'Shop owner' : 'Franchise admin',
  }));

  if (status === 'cancelled') {
    events.push({
      status: 'cancelled',
      at: new Date(base + 3600_000).toISOString(),
      actor: 'Franchise admin',
    });
  }

  return events;
}

function buildOrders(): Order[] {
  const today = toApiDate(new Date());
  const list: Order[] = [];
  let sequence = 1000;

  // 30 days of history, so FR-19 ranges and FR-21 trends have something to show.
  for (let dayOffset = 30; dayOffset >= 0; dayOffset -= 1) {
    const orderDate = addDays(today, -dayOffset);
    const deliveryDate = addDays(orderDate, 1);
    const activeShops = shops.filter(shop => shop.status === 'active');

    activeShops.forEach(shop => {
      // Not every shop orders every day — that gap is what FR-17 reports on.
      if (random() > 0.82) {
        return;
      }

      const items = buildItems();
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const { taxTotal, taxBreakdown } = taxFor(subtotal);
      const submittedAt = `${orderDate}T${18 + Math.floor(random() * 4)}:${String(
        between(10, 59),
      ).padStart(2, '0')}:00+05:30`;

      const status: OrderStatus =
        dayOffset === 0
          ? pick(['submitted', 'submitted', 'accepted'])
          : dayOffset === 1
          ? pick(['accepted', 'in_production', 'dispatched'])
          : pick(['delivered', 'invoiced', 'invoiced', 'cancelled']);

      const delivered = status === 'delivered' || status === 'invoiced';
      const short = delivered && random() > 0.8;

      sequence += 1;

      list.push({
        id: `CC-${sequence}`,
        shopId: shop.id,
        shopName: shop.name,
        shopCode: shop.code,
        ownerName: shop.ownerName,
        ownerPhone: shop.ownerPhone,
        ownerEmail: shop.ownerEmail,
        orderDate,
        deliveryDate,
        submittedAt,
        cutoffAt: `${orderDate}T${shop.cutoffOverride ?? CUTOFF_TIME}:00+05:30`,
        status,
        statusHistory: historyFor(status, submittedAt),
        items: items.map(item => ({
          ...item,
          deliveredQty: delivered
            ? short
              ? Math.max(item.orderedQty - between(1, 3), 0)
              : item.orderedQty
            : undefined,
        })),
        subtotal,
        taxTotal,
        taxBreakdown,
        total: subtotal + taxTotal,
        shortSupply: short || undefined,
        invoiceId: status === 'invoiced' ? `INV-${sequence}` : undefined,
      });
    });
  }

  return list.reverse();
}

export const orders: Order[] = buildOrders();

/** FR-23 / FR-39 — ledger rows derived from a shop's orders and payments. */
export function buildLedger(shopId: string): LedgerEntry[] {
  const shopOrders = orders
    .filter(order => order.shopId === shopId && order.status !== 'cancelled')
    .slice()
    .reverse();

  const entries: LedgerEntry[] = [];
  let balance = 0;

  shopOrders.forEach((order, index) => {
    balance += order.total;
    entries.push({
      id: `led_${order.id}_inv`,
      date: order.deliveryDate,
      type: order.invoiceId ? 'invoice' : 'order',
      reference: order.invoiceId ?? order.id,
      description: order.invoiceId ? 'Invoice raised' : 'Order placed',
      amount: order.total,
      runningBalance: balance,
    });

    if (index % 3 === 0) {
      const paid = Math.round(order.total * 0.9);
      balance -= paid;
      entries.push({
        id: `led_${order.id}_pay`,
        date: addDays(order.deliveryDate, 2),
        type: 'payment',
        reference: `PAY-${order.id.replace('CC-', '')}`,
        description: 'UPI payment received',
        amount: -paid,
        runningBalance: balance,
      });
    }
  });

  return entries.reverse();
}

export const auditEntries: Record<string, AuditEntry[]> = {};

/** PRD §3 — every admin action lands here with actor, timestamp, before/after. */
export function recordAudit(
  scopeId: string,
  entry: Omit<AuditEntry, 'id' | 'at' | 'actor'> & { actor?: string },
) {
  const list = auditEntries[scopeId] ?? [];
  list.unshift({
    id: `aud_${Date.now()}_${list.length}`,
    at: new Date().toISOString(),
    actor: entry.actor ?? 'Franchise admin',
    action: entry.action,
    field: entry.field,
    before: entry.before,
    after: entry.after,
  });
  auditEntries[scopeId] = list;
}

export { products };
