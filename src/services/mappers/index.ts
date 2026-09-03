export {
  createEnumCodec,
  UnknownEnumValueError,
  type EnumCodec,
} from './codec';

export { NotImplementedOnServer, isMissingEndpoint } from './errors';

export {
  API_NO_ORDER_PLACED,
  dateRangePresetCodec,
  orderFilterStatusToApi,
  orderStatusCodec,
  orderStatusFromApi,
  shopStatusCodec,
  userRoleCodec,
  type ApiDateRangePeriod,
  type ApiOrderStatus,
  type ApiShopStatus,
  type ApiUserRole,
} from './enums';

export {
  toAuditEntry,
  toDashboardStats,
  toLedgerEntry,
  toOrder,
  toPayment,
  toPriceList,
  toShop,
  toTopProducts,
  type ApiAdminDashboard,
  type ApiAgeingRow,
  type ApiAuditLog,
  type ApiLedgerEntry,
  type ApiOrder,
  type ApiOrderItem,
  type ApiPayment,
  type ApiPriceList,
  type ApiSalesReport,
  type ApiShop,
} from './admin';
