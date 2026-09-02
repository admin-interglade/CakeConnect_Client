import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getAgeingBuckets, getRegions, getShops } from '../services/adminApi';
import { describeApiError } from '../services/httpClient';
import { queryKeys } from './queryKeys';
import type { AgeingBucket, Pagination, Shop, ShopFilters } from '../types/admin';

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
  });

  const regions = useQuery({
    queryKey: queryKeys.shops.regions,
    queryFn: getRegions,
    staleTime: Infinity,
  });

  return {
    shops: list.data?.items ?? [],
    total: list.data?.total ?? 0,
    ageing: ageing.data ?? [],
    regions: regions.data ?? [],
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
