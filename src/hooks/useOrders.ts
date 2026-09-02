import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getOrders, getShops, getShopsPendingCutoff } from '../services/adminApi';
import { describeApiError } from '../services/httpClient';
import { queryKeys } from './queryKeys';
import { defaultRange } from '../utils/dateRange';
import type { Order, OrderFilters, Pagination, Shop } from '../types/admin';

export const defaultOrderFilters = (): OrderFilters => ({
  search: '',
  status: 'all',
  shopId: 'all',
  range: defaultRange(),
  dateField: 'orderDate',
});

export const defaultOrderPagination: Pagination = { page: 1, limit: 15 };

type OrdersResult = {
  orders: Order[];
  total: number;
  /** Every shop, for the FR-40 shop selector. */
  shops: Shop[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isStale: boolean;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-40 order queue with FR-17's "pending against cut-off" view.
 *
 * The pending view is a different endpoint — it lists shops that have *not*
 * ordered — so it is swapped in here rather than expressed as a status filter,
 * which keeps the list screen rendering one shape either way.
 */
export function useOrders(filters: OrderFilters, pagination: Pagination): OrdersResult {
  const isPendingView = filters.status === 'pending_cutoff';

  const list = useQuery({
    queryKey: queryKeys.orders.list(filters, pagination),
    queryFn: () => getOrders(filters, pagination),
    enabled: !isPendingView,
    placeholderData: keepPreviousData,
  });

  const pending = useQuery({
    queryKey: queryKeys.orders.pendingCutoff,
    queryFn: getShopsPendingCutoff,
    enabled: isPendingView,
  });

  const shops = useQuery({
    queryKey: queryKeys.shops.list(
      { search: '', status: 'all', region: 'all', sort: 'name' },
      { page: 1, limit: 100 },
    ),
    queryFn: () =>
      getShops(
        { search: '', status: 'all', region: 'all', sort: 'name' },
        { page: 1, limit: 100 },
      ),
    staleTime: 5 * 60_000,
  });

  const active = isPendingView ? pending : list;
  const orders = isPendingView ? pending.data ?? [] : list.data?.items ?? [];

  return {
    orders,
    total: isPendingView ? pending.data?.length ?? 0 : list.data?.total ?? 0,
    shops: shops.data?.items ?? [],
    isLoading: active.isLoading,
    isError: active.isError && active.data === undefined,
    error: active.error ? describeApiError(active.error) : undefined,
    isStale: active.isError && active.data !== undefined,
    isRefetching: active.isRefetching,
    refetch: () => {
      active.refetch();
    },
  };
}

export default useOrders;
