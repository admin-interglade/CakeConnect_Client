import { useQueries } from '@tanstack/react-query';

import { getActiveOffers, getScheduledOffers, trackOfferView } from '../../services/shop';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import type { Offer } from '../../types/shop';

type OffersResult = {
  /** FR-34 — live now, and what the shop can act on today. */
  active: Offer[];
  /** Coming up, so a shop can plan an order around it. */
  scheduled: Offer[];
  /**
   * False — no order total returned by the API reflects an offer. The pricer
   * writes `discount: 0` on every line and never consults one, so a discount
   * shown on the cart would not match the invoice. See docs/api-gaps.md G20.
   */
  appliedAutomatically: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
  /** FR-35 — fired when a shop opens an offer, which is what "reach" counts. */
  trackView: (offerId: string) => void;
};

/** Offers stay fresh for a while: an admin publishes them, they do not tick. */
const OFFERS_STALE_MS = 5 * 60_000;

/** FR-34 — the offers this shop has been sent, live and upcoming. */
export function useOffers(): OffersResult {
  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.shop.offers,
        queryFn: getActiveOffers,
        staleTime: OFFERS_STALE_MS,
      },
      {
        queryKey: [...queryKeys.shop.offers, 'scheduled'] as const,
        queryFn: getScheduledOffers,
        staleTime: OFFERS_STALE_MS,
      },
    ],
  });

  const [active, scheduled] = results;

  return {
    active: (active.data as Offer[] | undefined) ?? [],
    scheduled: (scheduled.data as Offer[] | undefined) ?? [],
    appliedAutomatically: false,
    isLoading: active.isLoading,
    isError: active.isError && active.data === undefined,
    error: active.error ? describeApiError(active.error) : undefined,
    isRefetching: results.some(result => result.isRefetching),
    refetch: () => {
      results.forEach(result => result.refetch());
    },
    trackView: offerId => {
      // Fire and forget: the call already swallows its own failures, and a
      // missed analytics increment must never block reading the offer.
      trackOfferView(offerId);
    },
  };
}

export default useOffers;
