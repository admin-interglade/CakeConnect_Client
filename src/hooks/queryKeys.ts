import type {
  DateRange,
  OrderFilters,
  Pagination,
  ProductFilters,
  ShopFilters,
} from '../types/admin';
import type {
  CatalogueFilters,
  ShopOrderFilters,
  TransactionFilters,
} from '../types/shop';

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
    payments: (shopId: string) => ['shops', 'payments', shopId] as const,
    ageing: ['shops', 'ageing'] as const,
    priceLists: ['shops', 'priceLists'] as const,
    regions: ['shops', 'regions'] as const,
  },

  catalogue: {
    all: ['catalogue'] as const,
    products: (filters: ProductFilters, pagination: Pagination) =>
      [
        'catalogue',
        'products',
        filters.search,
        filters.status,
        filters.categoryId,
        pagination.page,
        pagination.limit,
      ] as const,
    product: (productId: string) => ['catalogue', 'product', productId] as const,
    categories: ['catalogue', 'categories'] as const,
    priceLists: ['catalogue', 'priceLists'] as const,
    priceList: (priceListId: string) =>
      ['catalogue', 'priceList', priceListId] as const,
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
    counts: (filters: OrderFilters) =>
      [
        'orders',
        'counts',
        filters.search,
        filters.shopId,
        filters.dateField,
        filters.range.from,
        filters.range.to,
      ] as const,
    pendingCutoff: ['orders', 'pendingCutoff'] as const,
    detail: (orderId: string) => ['orders', 'detail', orderId] as const,
  },

  /**
   * The shop-owner surface. Namespaced under `shop` so a shop-side mutation
   * cannot invalidate the franchise owner's caches, and so signing out of one
   * role never leaves the other's rows behind.
   *
   * Every key carries the outlet id (FR-4): a multi-outlet owner switching
   * shops must not be shown the previous outlet's cached figures.
   */
  shop: {
    all: ['shop'] as const,

    dashboard: (shopId: string, range: DateRange) =>
      ['shop', 'dashboard', shopId, range.from, range.to] as const,
    credit: (shopId: string) => ['shop', 'credit', shopId] as const,
    cutoff: (shopId: string) => ['shop', 'cutoff', shopId] as const,

    catalogue: (shopId: string, filters: CatalogueFilters, pagination: Pagination) =>
      [
        'shop',
        'catalogue',
        shopId,
        filters.search,
        filters.categoryId,
        pagination.page,
        pagination.limit,
      ] as const,
    categories: ['shop', 'categories'] as const,

    orders: (shopId: string, filters: ShopOrderFilters, pagination: Pagination) =>
      [
        'shop',
        'orders',
        shopId,
        filters.search,
        filters.status,
        filters.range.from,
        filters.range.to,
        pagination.page,
        pagination.limit,
      ] as const,
    order: (orderId: string) => ['shop', 'order', orderId] as const,
    /** FR-22 — the draft or submitted order for the next delivery date. */
    tomorrow: (shopId: string) => ['shop', 'tomorrow', shopId] as const,
    /** FR-22 — today's order, at whatever stage it has reached. */
    today: (shopId: string) => ['shop', 'today', shopId] as const,

    transactions: (
      shopId: string,
      filters: TransactionFilters,
      pagination: Pagination,
    ) =>
      [
        'shop',
        'transactions',
        shopId,
        filters.range.from,
        filters.range.to,
        pagination.page,
        pagination.limit,
      ] as const,

    invoices: (shopId: string, range: DateRange, pagination: Pagination) =>
      [
        'shop',
        'invoices',
        shopId,
        range.from,
        range.to,
        pagination.page,
        pagination.limit,
      ] as const,
    payableInvoices: (shopId: string) => ['shop', 'payableInvoices', shopId] as const,
    invoice: (invoiceId: string) => ['shop', 'invoice', invoiceId] as const,

    payments: (shopId: string, pagination: Pagination) =>
      ['shop', 'payments', shopId, pagination.page, pagination.limit] as const,
    payment: (paymentId: string) => ['shop', 'payment', paymentId] as const,

    offers: ['shop', 'offers'] as const,
    offer: (offerId: string) => ['shop', 'offer', offerId] as const,

    notifications: (pagination: Pagination) =>
      ['shop', 'notifications', pagination.page, pagination.limit] as const,
    unreadCount: ['shop', 'notifications', 'unread'] as const,
    notificationSettings: ['shop', 'notifications', 'settings'] as const,
  },
} as const;

export default queryKeys;
