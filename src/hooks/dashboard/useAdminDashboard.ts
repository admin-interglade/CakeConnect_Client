import { useQueries } from '@tanstack/react-query';

import {
  getDashboardStats,
  getOrderTrends,
  getProductionRequirement,
  getTopProducts,
} from '../../services/admin';
import { describeApiError } from '../../services/api';
import { isMissingEndpoint } from '../../services/mappers';
import { ProductionPlanNotGenerated } from '../../services/admin';
import { queryKeys } from '../queryKeys';
import { addDays, toApiDate } from '../../utils/format';
import type {
  DashboardStats,
  DateRange,
  OrderTrendPoint,
  ProductionRequirement,
  TopProductPoint,
} from '../../types/admin';

type AdminDashboard = {
  stats?: DashboardStats;
  trends: OrderTrendPoint[];
  topProducts: TopProductPoint[];
  production?: ProductionRequirement;
  /** False when no endpoint returns a per-day series (docs/api-gaps.md G5). */
  trendsAvailable: boolean;
  /** True when the plan for that date has not been generated yet (FR-37). */
  productionNeedsGenerating: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  /** True when a refetch failed while cached data is still on screen. */
  isStale: boolean;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-36 / FR-37 / FR-21 in one hook.
 *
 * The four requests run as a single `useQueries` batch so the screen has one
 * loading flag and one refresh handler rather than four that can disagree.
 */
export function useAdminDashboard(range: DateRange): AdminDashboard {
  // FR-37 aggregates tomorrow's delivery, which is today's cut-off cycle.
  const deliveryDate = addDays(toApiDate(new Date()), 1);

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.dashboard.stats(range),
        queryFn: () => getDashboardStats(range),
      },
      {
        queryKey: queryKeys.dashboard.trends(range),
        queryFn: () => getOrderTrends(range),
        // Never succeeds today; retrying only delays the empty state.
        retry: (count: number, error: unknown) =>
          !isMissingEndpoint(error) && count < 2,
      },
      {
        queryKey: queryKeys.dashboard.topProducts(range),
        queryFn: () => getTopProducts(range),
      },
      {
        queryKey: queryKeys.dashboard.production(deliveryDate),
        queryFn: () => getProductionRequirement(deliveryDate),
        retry: (count: number, error: unknown) =>
          !ProductionPlanNotGenerated.is(error) && count < 2,
      },
    ],
  });

  const [stats, trends, topProducts, production] = results;

  // A gap is a known limitation, not a screen failure: the dashboard still has
  // everything else to show, so these are reported as absent capabilities
  // rather than folded into the error state.
  const failed = results.find(
    result =>
      result.isError &&
      !isMissingEndpoint(result.error) &&
      !ProductionPlanNotGenerated.is(result.error),
  );

  return {
    stats: stats.data,
    trends: trends.data ?? [],
    topProducts: topProducts.data ?? [],
    production: production.data,
    trendsAvailable: !isMissingEndpoint(trends.error),
    productionNeedsGenerating: ProductionPlanNotGenerated.is(production.error),
    // Only a first load blocks the screen; a failed refresh keeps cached rows.
    isLoading: results.some(result => result.isLoading),
    isError: Boolean(failed) && stats.data === undefined,
    error: failed ? describeApiError(failed.error) : undefined,
    isStale: Boolean(failed) && stats.data !== undefined,
    isRefetching: results.some(result => result.isRefetching),
    refetch: () => {
      results.forEach(result => result.refetch());
    },
  };
}

export default useAdminDashboard;
