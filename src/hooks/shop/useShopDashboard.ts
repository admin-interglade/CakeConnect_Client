import { useQueries } from '@tanstack/react-query';

import {
  getActiveOffers,
  getShopCredit,
  getShopDashboard,
  getTodaysOrder,
  getTomorrowsOrder,
} from '../../services/shop';
import { describeApiError } from '../../services/api';
import { isMissingEndpoint } from '../../services/mappers';
import { queryKeys } from '../queryKeys';
import { useActiveShop } from './useActiveShop';
import type { DateRange, Order } from '../../types/admin';
import type { Offer, ShopCredit, ShopDashboard } from '../../types/shop';

/**
 * FR-22 — the two orders the home screen tracks side by side.
 *
 * Today's is interesting because it has moved on (in production, dispatched,
 * delivered); tomorrow's because it may still be a draft the shop can act on.
 */
export type OrderTrack = {
  today?: Order;
  tomorrow?: Order;
  /** False when the lookup itself failed, as opposed to there being no order. */
  available: boolean;
};

type ShopDashboardResult = {
  dashboard?: ShopDashboard;
  credit?: ShopCredit;
  /** FR-22 — today's and tomorrow's orders. */
  track: OrderTrack;
  /** FR-34 — offers live for this shop. */
  offers: Offer[];
  /** False when the offers call failed; the section says so instead of "none". */
  offersAvailable: boolean;
  /**
   * False — no endpoint returns this shop's value bucketed by day, so FR-21's
   * order-value trend cannot be drawn. See docs/api-gaps.md G5.
   */
  trendAvailable: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  /** True when a refetch failed while cached figures are still on screen. */
  isStale: boolean;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-19 to FR-22 in one hook.
 *
 * The five requests run as a single `useQueries` batch so the screen has one
 * loading flag and one pull-to-refresh handler rather than five that can
 * disagree, matching how `useAdminDashboard` composes the owner's side.
 *
 * Each section reports its own availability rather than folding into a single
 * error state. "No active offers" and "offers could not be loaded" look
 * identical on a blank card but mean opposite things to whoever reads it, and
 * the same is true of the order track. Only the two queries carrying *figures*
 * decide whether the screen as a whole failed — a dashboard that refuses to
 * render because the offers call timed out is worse than one showing no offers.
 */
export function useShopDashboard(range: DateRange): ShopDashboardResult {
  const { shopId } = useActiveShop();
  const enabled = Boolean(shopId);

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.shop.dashboard(shopId, range),
        queryFn: () => getShopDashboard(range),
        enabled,
      },
      {
        queryKey: queryKeys.shop.credit(shopId),
        queryFn: () => getShopCredit(shopId),
        enabled,
      },
      {
        // Shares its key with `useCart`, so the home screen and the cart agree
        // about tomorrow's order and fetch it once between them.
        queryKey: queryKeys.shop.tomorrow(shopId),
        queryFn: () => getTomorrowsOrder(shopId),
        enabled,
      },
      {
        queryKey: queryKeys.shop.today(shopId),
        queryFn: () => getTodaysOrder(shopId),
        enabled,
      },
      {
        queryKey: queryKeys.shop.offers,
        queryFn: getActiveOffers,
        enabled,
        staleTime: 5 * 60_000,
        // A missing endpoint never succeeds; retrying only delays the notice.
        retry: (count: number, error: unknown) =>
          !isMissingEndpoint(error) && count < 2,
      },
    ],
  });

  const [dashboard, credit, tomorrow, today, offers] = results;

  const figures = [dashboard, credit];
  const failed = figures.find(result => result.error);

  return {
    dashboard: dashboard.data as ShopDashboard | undefined,
    credit: credit.data as ShopCredit | undefined,

    track: {
      // The services answer `null` for "no order", which is a real state; the
      // domain expresses that as an absent field.
      today: (today.data as Order | null) ?? undefined,
      tomorrow: (tomorrow.data as Order | null) ?? undefined,
      available: !today.isError && !tomorrow.isError,
    },

    offers: (offers.data as Offer[] | undefined) ?? [],
    offersAvailable: !offers.isError,

    trendAvailable: false,

    isLoading: figures.some(result => result.isLoading),
    isError: figures.some(result => result.isError && result.data === undefined),
    error: failed ? describeApiError(failed.error) : undefined,
    isStale: figures.some(result => result.isError && result.data !== undefined),
    isRefetching: results.some(result => result.isRefetching),
    refetch: () => {
      results.forEach(result => result.refetch());
    },
  };
}

export default useShopDashboard;
