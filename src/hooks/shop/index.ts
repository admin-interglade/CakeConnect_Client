/**
 * Shop-owner hooks, grouped the same way the admin hooks are: one folder per
 * domain, each pairing with the API module of the same name.
 *
 *   useActiveShop        FR-4 outlet selection — every other hook reads it
 *   useCutoff            services/shop/cutoff.api.ts
 *   useShopDashboard     services/shop/dashboard.api.ts
 *   useShopCatalogue     services/shop/catalogue.api.ts
 *   useCart              services/shop/orders.api.ts (the FR-7 builder)
 *   useShopOrders        services/shop/orders.api.ts (FR-22 tracking)
 *   useTransactions      services/shop/ledger.api.ts, invoices.api.ts
 *   usePayments          services/shop/payments.api.ts
 *   useOffers            services/shop/offers.api.ts
 *   useNotifications     services/shop/notifications.api.ts
 *
 * Screens import from the top-level `hooks` barrel, never from here directly.
 */

export { default as useActiveShop } from './useActiveShop';
export { default as useCutoff } from './useCutoff';
export { default as useShopDashboard } from './useShopDashboard';

export {
  default as useShopCatalogue,
  defaultCatalogueFilters,
  defaultCataloguePagination,
} from './useShopCatalogue';

export { default as useCart, computeTotals } from './useCart';

export {
  default as useShopOrders,
  useShopOrderDetails,
  useShopOrderMutations,
  defaultShopOrderFilters,
  defaultShopOrderPagination,
} from './useShopOrders';

export {
  default as useTransactions,
  useInvoiceDetails,
  defaultTransactionFilters,
  defaultTransactionPagination,
} from './useTransactions';

export {
  default as usePayments,
  defaultPaymentPagination,
} from './usePayments';

export { default as useOffers } from './useOffers';

export {
  default as useNotifications,
  useNotificationSettings,
  useUnreadNotificationCount,
  defaultNotificationPagination,
} from './useNotifications';
