/**
 * Hooks, grouped by the domain they read.
 *
 * Each folder pairs with the API module of the same name, so a screen showing
 * the wrong thing leads to one hook and one API file:
 *
 *   dashboard/   -> services/api/dashboard.api.ts
 *   shops/       -> services/api/shops.api.ts, ledger.api.ts, payments.api.ts
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
