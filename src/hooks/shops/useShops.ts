import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getAgeingBuckets, getRegions, getShops } from '../../services/admin';
import { describeApiError } from '../../services/api';
import { isMissingEndpoint } from '../../services/mappers';
import { queryKeys } from '../queryKeys';
import type { AgeingBucket, Pagination, Shop, ShopFilters } from '../../types/admin';


/**
 * A missing endpoint will never succeed, so retrying it burns three requests to
 * reach the same answer. Everything else keeps the default backoff.
 */
const retryUnlessMissing = (count: number, error: unknown) =>
  !isMissingEndpoint(error) && count < 2;

export const defaultShopFilters: ShopFilters = {
  search: '',
  status: 'all',
  region: 'all',
  sort: 'name',
};

export const defaultPagination: Pagination = { page: 1, limit: 10 };

type ShopsResult = {
  shops: Shop[];
  total: number;
  ageing: AgeingBucket[];
  regions: string[];
  /**
   * False when the backend cannot serve these, so the screen hides the control
   * rather than offering an empty dropdown or a blank ageing card that looks
   * like "no debt" (docs/api-gaps.md G1, G6).
   */
  ageingAvailable: boolean;
  regionsAvailable: boolean;
  /** FR-38 sort only orders the current page; the API has no sort (G2). */
  sortIsPageOnly: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isStale: boolean;
  isRefetching: boolean;
  refetch: () => void;
};

/** FR-38 — the paginated, filtered shop directory plus its ageing summary. */
export function useShops(filters: ShopFilters, pagination: Pagination): ShopsResult {
  const list = useQuery({
    queryKey: queryKeys.shops.list(filters, pagination),
    queryFn: () => getShops(filters, pagination),
    // Keeps the previous page on screen while the next one loads, so paging
    // does not flash an empty table.
    placeholderData: keepPreviousData,
  });

  const ageing = useQuery({
    queryKey: queryKeys.shops.ageing,
    queryFn: getAgeingBuckets,
    staleTime: 5 * 60_000,
    retry: retryUnlessMissing,
  });

  const regions = useQuery({
    queryKey: queryKeys.shops.regions,
    queryFn: getRegions,
    staleTime: Infinity,
    retry: retryUnlessMissing,
  });

  return {
    shops: list.data?.items ?? [],
    total: list.data?.total ?? 0,
    ageing: ageing.data ?? [],
    regions: regions.data ?? [],
    ageingAvailable: !isMissingEndpoint(ageing.error),
    regionsAvailable: !isMissingEndpoint(regions.error),
    sortIsPageOnly: true,
    isLoading: list.isLoading,
    isError: list.isError && list.data === undefined,
    error: list.error ? describeApiError(list.error) : undefined,
    isStale: list.isError && list.data !== undefined,
    isRefetching: list.isRefetching,
    refetch: () => {
      list.refetch();
      ageing.refetch();
    },
  };
}

export default useShops;
