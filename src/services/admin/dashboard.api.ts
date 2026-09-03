import type {
  AgeingBucket,
  DashboardStats,
  DateRange,
  OrderTrendPoint,
  TopProductPoint,
} from '../../types/admin';
import { apiGet } from '../api';
import {
  NotImplementedOnServer,
  dateRangePresetCodec,
  toDashboardStats,
  toTopProducts,
  type ApiAdminDashboard,
  type ApiSalesReport,
} from '../mappers';
import { getGlobalCutoffTime, nextCutoffIso } from './cutoff.api';

/**
 * Admin dashboard — FR-36, FR-21, FR-38 ageing.
 *
 * Endpoints: `/dashboard/admin`, `/reports/sales`.
 */

const rangeParams = (range: DateRange) => ({
  period: dateRangePresetCodec.toApi(range.preset),
  from: range.from,
  to: range.to,
});

const numeric = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** FR-36 — the network tiles, plus FR-17's cut-off compliance counts. */
export async function getDashboardStats(range: DateRange): Promise<DashboardStats> {
  const [dashboard, cutoffTime] = await Promise.all([
    apiGet<ApiAdminDashboard>('/dashboard/admin', rangeParams(range)),
    getGlobalCutoffTime(),
  ]);

  return toDashboardStats(dashboard, {
    cutoffTime,
    nextCutoffAt: nextCutoffIso(cutoffTime),
  });
}

/**
 * FR-21's order-value trend needs a per-day series. `/dashboard/admin` reports
 * single totals and `/reports/sales` aggregates by shop and by product, so
 * nothing exposes a time series. See docs/api-gaps.md G5.
 */
export async function getOrderTrends(_range: DateRange): Promise<OrderTrendPoint[]> {
  throw new NotImplementedOnServer(
    'getOrderTrends',
    'G5',
    'no endpoint returns order value or count bucketed by day',
  );
}

/** FR-21 — top products by quantity, from the sales report's product rollup. */
export async function getTopProducts(range: DateRange): Promise<TopProductPoint[]> {
  const report = await apiGet<ApiSalesReport>('/reports/sales', {
    from: range.from,
    to: range.to,
  });

  return toTopProducts(report);
}

/**
 * FR-38 — the 0-30 / 31-60 / 60+ ageing split. `GET /dashboard/admin` carries
 * an `ageingReport`, but it was empty on every payload captured so far, so the
 * row shape is unconfirmed: anything unrecognisable throws rather than being
 * coerced into a bucket. See docs/api-gaps.md G1.
 */
export async function getAgeingBuckets(): Promise<AgeingBucket[]> {
  const dashboard = await apiGet<ApiAdminDashboard>('/dashboard/admin', {
    period: dateRangePresetCodec.toApi('thisMonth'),
  });

  const rows = dashboard.ageingReport;
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const labels: AgeingBucket['label'][] = ['0-30', '31-60', '60+'];

  return rows.map(row => {
    const label = String(row.bucket ?? row.label ?? '') as AgeingBucket['label'];
    if (!labels.includes(label)) {
      throw new NotImplementedOnServer(
        'getAgeingBuckets',
        'G1',
        `ageingReport row has an unrecognised bucket: ${JSON.stringify(row)}`,
      );
    }

    return {
      label,
      amount: numeric(row.amount),
      shopCount: numeric(row.shopCount),
    };
  });
}
