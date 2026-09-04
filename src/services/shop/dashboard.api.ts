import type { DateRange, OrderTrendPoint } from '../../types/admin';
import type { ShopCredit, ShopDashboard } from '../../types/shop';
import { apiGet } from '../api';
import {
  NotImplementedOnServer,
  dateRangePresetCodec,
  toShopCredit,
  toShopDashboard,
  type ApiShopDashboard,
  type ApiShopOutstanding,
} from '../mappers';

/**
 * Shop-owner dashboard — FR-19 to FR-22.
 *
 * Endpoints: `/dashboard/shop-owner`, `/ledger/shops/:shopId/outstanding`.
 */

const rangeParams = (range: DateRange) => ({
  period: dateRangePresetCodec.toApi(range.preset),
  from: range.from,
  to: range.to,
});

/**
 * FR-20 — the headline tiles for the selected range.
 *
 * The endpoint scopes itself to the caller's own shop from the JWT, so no
 * `shopId` is sent: a shop owner cannot ask for another shop's figures even by
 * changing the request.
 */
export async function getShopDashboard(range: DateRange): Promise<ShopDashboard> {
  return toShopDashboard(
    await apiGet<ApiShopDashboard>('/dashboard/shop-owner', rangeParams(range)),
  );
}

/**
 * FR-20 available credit, and the PRD §8 rule for what happens at the limit.
 *
 * The dashboard also reports outstanding and available credit, but only this
 * route carries `creditBehavior` — the per-shop answer to "blocked or only
 * warned" — which the cart needs before it can enforce anything.
 */
export async function getShopCredit(shopId: string): Promise<ShopCredit> {
  return toShopCredit(
    await apiGet<ApiShopOutstanding>(`/ledger/shops/${shopId}/outstanding`),
    shopId,
  );
}

/**
 * FR-21's order-value trend needs a per-day series.
 *
 * `/dashboard/shop-owner` reports single totals for the range and
 * `/reports/sales` aggregates by shop and by product; nothing buckets value or
 * count by day. Charting the one total as a flat line, or splitting it evenly
 * across the range, would both be inventions. See docs/api-gaps.md G5.
 */
export async function getShopOrderTrend(
  _range: DateRange,
): Promise<OrderTrendPoint[]> {
  throw new NotImplementedOnServer(
    'getShopOrderTrend',
    'G5',
    'no endpoint returns this shop\'s order value or count bucketed by day',
  );
}
