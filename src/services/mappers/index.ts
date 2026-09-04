export {
  createEnumCodec,
  UnknownEnumValueError,
  type EnumCodec,
} from './codec';

export { NotImplementedOnServer, isMissingEndpoint } from './errors';

export {
  API_NO_ORDER_PLACED,
  creditBehaviorCodec,
  dateRangePresetCodec,
  deliveryStatusCodec,
  orderFilterStatusToApi,
  orderStatusCodec,
  orderStatusFromApi,
  shopStatusCodec,
  userRoleCodec,
  type ApiCreditBehavior,
  type ApiDateRangePeriod,
  type ApiDeliveryStatus,
  type ApiOrderStatus,
  type ApiShopStatus,
  type ApiUserRole,
} from './enums';

export {
  toApiShopCreate,
  toApiShopDetails,
  toAuditEntry,
  toDashboardStats,
  toLedgerEntry,
  toOrder,
  toPayment,
  toDelivery,
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
  type ApiDelivery,
  type ApiPriceList,
  type ApiSalesReport,
  type ApiShop,
} from './admin';

export {
  productStatusCodec,
  toCategory,
  toPriceListDetail,
  toPriceListItem,
  toProduct,
  type ApiCategory,
  type ApiPriceListDetail,
  type ApiPriceListItem,
  type ApiProduct,
  type ApiProductStatus,
} from './catalogue';
