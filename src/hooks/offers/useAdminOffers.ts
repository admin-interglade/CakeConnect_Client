import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  OFFER_PAGE_LIMIT,
  getOfferById,
  getOffers,
  isOverdueForExpiry,
  isOverdueForPublication,
} from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { toApiDate } from '../../utils/format';
import type { OfferFilters, Pagination } from '../../types/admin';
import type { Offer } from '../../types/shop';

export const defaultOfferFilters: OfferFilters = { status: 'all' };

export const defaultOfferPagination: Pagination = { page: 1, limit: OFFER_PAGE_LIMIT };

type AdminOffersResult = {
  offers: Offer[];
  total: number;
  /**
   * Offers on **this page** that the missing scheduler has stranded: live past
   * their end date, or scheduled past their start date. Scoped to the page and
   * described that way on screen — the endpoint has no filter for either state,
   * so a stranded offer three pages back cannot be counted from here.
   */
  stranded: { overdueForExpiry: Offer[]; overdueForPublication: Offer[] };
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-32 — the authoring list, one status tab at a time.
 *
 * `GET /offers` takes a single `status`, so each tab is exactly one query and
 * pages correctly. It is deliberately not aggregated into "ended": merging
 * expired and withdrawn would need two queries whose pages cannot be
 * interleaved without inventing an order the server never sent.
 *
 * Offers change when an admin changes them, so this is cached rather than
 * polled — but not for long, because the actions on the detail screen change
 * status and an admin flips back to the list expecting to see it.
 */
export function useAdminOffers(
  filters: OfferFilters,
  pagination: Pagination,
): AdminOffersResult {
  const list = useQuery({
    queryKey: queryKeys.offers.list(filters, pagination),
    queryFn: () => getOffers(filters, pagination),
    // Keeps the current page on screen while the next loads, so paging does not
    // flash an empty list.
    placeholderData: keepPreviousData,
  });

  const offers = list.data?.items ?? [];
  const today = toApiDate(new Date());

  return {
    offers,
    total: list.data?.total ?? 0,
    stranded: {
      overdueForExpiry: offers.filter(offer => isOverdueForExpiry(offer, today)),
      overdueForPublication: offers.filter(offer =>
        isOverdueForPublication(offer, today),
      ),
    },
    isLoading: list.isLoading,
    isError: list.isError && list.data === undefined,
    error: list.isError ? describeApiError(list.error) : undefined,
    isRefetching: list.isRefetching,
    refetch: () => {
      list.refetch();
    },
  };
}

type OfferDetailsResult = {
  offer?: Offer;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * One offer, for the detail and reach screen.
 *
 * Fetched rather than read out of the list cache: the list is paged and a
 * detail screen can be reached from a stale page, and `GET /offers/:id` is the
 * only route that returns the product rows with their products attached.
 */
export function useOfferDetails(offerId: string): OfferDetailsResult {
  const detail = useQuery({
    queryKey: queryKeys.offers.detail(offerId),
    queryFn: () => getOfferById(offerId),
    enabled: Boolean(offerId),
  });

  return {
    offer: detail.data,
    isLoading: detail.isLoading,
    isError: detail.isError,
    error: detail.isError ? describeApiError(detail.error) : undefined,
    isRefetching: detail.isRefetching,
    refetch: () => {
      detail.refetch();
    },
  };
}

export default useAdminOffers;
