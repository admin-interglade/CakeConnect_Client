import type {
  DateRange,
  OrderFilters,
  Pagination,
  ShopFilters,
} from '../types/admin';

/**
 * Every query key in one place, so a mutation can invalidate exactly what it
 * invalidated last time. Keys are hierarchical: invalidating `['shops']`
 * refreshes every shop list and detail at once.
 */
export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    stats: (range: DateRange) => ['dashboard', 'stats', range.from, range.to] as const,
    trends: (range: DateRange) => ['dashboard', 'trends', range.from, range.to] as const,
    topProducts: (range: DateRange) =>
      ['dashboard', 'topProducts', range.from, range.to] as const,
    production: (deliveryDate: string) =>
      ['dashboard', 'production', deliveryDate] as const,
    productionDetail: (deliveryDate: string, productId: string) =>
      ['dashboard', 'production', deliveryDate, productId] as const,
  },

  shops: {
    all: ['shops'] as const,
    list: (filters: ShopFilters, pagination: Pagination) =>
      [
        'shops',
        'list',
        filters.search,
        filters.status,
        filters.region,
        filters.sort,
        pagination.page,
        pagination.limit,
      ] as const,
    detail: (shopId: string) => ['shops', 'detail', shopId] as const,
    ledger: (shopId: string, range: DateRange) =>
      ['shops', 'ledger', shopId, range.from, range.to] as const,
    audit: (shopId: string) => ['shops', 'audit', shopId] as const,
    ageing: ['shops', 'ageing'] as const,
    priceLists: ['shops', 'priceLists'] as const,
    regions: ['shops', 'regions'] as const,
  },

  orders: {
    all: ['orders'] as const,
    list: (filters: OrderFilters, pagination: Pagination) =>
      [
        'orders',
        'list',
        filters.search,
        filters.status,
        filters.shopId,
        filters.dateField,
        filters.range.from,
        filters.range.to,
        pagination.page,
        pagination.limit,
      ] as const,
    pendingCutoff: ['orders', 'pendingCutoff'] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  },
} as const;

export default queryKeys;
