/**
 * Hooks, grouped by the domain they read.
 *
 * Each folder pairs with the API module of the same name, so a screen showing
 * the wrong thing leads to one hook and one API file:
 *
 *   dashboard/   -> services/api/dashboard.api.ts
 *   shops/       -> services/admin/shops.api.ts, ledger.api.ts, payments.api.ts
 *   catalogue/   -> services/admin/products.api.ts, categories.api.ts, priceLists.api.ts
 *   orders/      -> services/api/orders.api.ts
 *   production/  -> services/api/production.api.ts
 *
 * Screens import from this barrel, never from the folders directly, so hooks
 * can move without touching a screen.
 */

/* Cross-cutting */
export { default as useCountdown } from './useCountdown';
export { default as usePermissions, type Permissions } from './usePermissions';
export { queryKeys } from './queryKeys';

/* Dashboard — FR-36, FR-21 */
export { default as useAdminDashboard } from './dashboard/useAdminDashboard';

/* Shops — FR-2, FR-3, FR-38, FR-39 */
export {
  default as useShops,
  defaultShopFilters,
  defaultPagination,
} from './shops/useShops';
export { default as useShopDetails, usePriceLists } from './shops/useShopDetails';
export { default as useShopMutations } from './shops/useShopMutations';

/* Catalogue — FR-5, FR-6, FR-15 */
export {
  default as useCatalogue,
  defaultProductFilters,
  defaultCataloguePagination,
} from './catalogue/useCatalogue';
export { default as useCatalogueMutations } from './catalogue/useCatalogueMutations';

/* Orders — FR-40, FR-17, FR-18 */
export {
  default as useOrders,
  defaultOrderFilters,
  defaultOrderPagination,
} from './orders/useOrders';
export { default as useOrderDetails } from './orders/useOrderDetails';
export { default as useOrderMutations } from './orders/useOrderMutations';

/* Production — FR-37 */
export {
  useProductionRequirement,
  useProductionDetail,
} from './production/useProduction';

/* -------------------------------------------------------------------------- */
/* Shop owner                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The outlet's own surface, mirroring the folder layout above:
 *
 *   shop/  -> services/shop/*
 *
 * Every hook in here is scoped to the outlet `useActiveShop` reports (FR-4),
 * and the server scopes the rows again from the JWT.
 */
export {
  /* FR-4 */
  useActiveShop,
  /* FR-9, FR-13 */
  useCutoff,
  /* FR-19 to FR-22 */
  useShopDashboard,
  /* FR-5, FR-6. Aliased: the admin catalogue exports a pagination default of
     the same name, and the two lists page differently. */
  useShopCatalogue,
  defaultCatalogueFilters as defaultShopCatalogueFilters,
  defaultCataloguePagination as defaultShopCataloguePagination,
  /* FR-7 to FR-12 */
  useCart,
  computeTotals,
  /* FR-22, FR-40 */
  useShopOrders,
  useShopOrderDetails,
  useShopOrderMutations,
  defaultShopOrderFilters,
  defaultShopOrderPagination,
  /* FR-23, FR-25 */
  useTransactions,
  useInvoiceDetails,
  defaultTransactionFilters,
  defaultTransactionPagination,
  /* FR-26 to FR-30 */
  usePayments,
  defaultPaymentPagination,
  /* FR-34 */
  useOffers,
  /* FR-43 to FR-45 */
  useNotifications,
  useNotificationSettings,
  useUnreadNotificationCount,
  defaultNotificationPagination,
} from './shop';
