import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelOrder,
  getShopOrder,
  getShopOrders,
  isOrderDateFilterSupported,
} from '../../services/shop';
import { describeApiError } from '../../services/api';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import { queryKeys } from '../queryKeys';
import { defaultRange } from '../../utils/dateRange';
import { useActiveShop } from './useActiveShop';
import type { Order, Pagination } from '../../types/admin';
import type { ShopOrderFilters } from '../../types/shop';

export const defaultShopOrderFilters = (): ShopOrderFilters => ({
  search: '',
  status: 'all',
  range: defaultRange(),
});

export const defaultShopOrderPagination: Pagination = { page: 1, limit: 15 };

type ShopOrdersResult = {
  orders: Order[];
  total: number;
  /**
   * False when the chosen range cannot be pushed to the server: `GET /orders`
   * filters on one exact `deliveryDate` and has no from/to, so a multi-day
   * range returns unfiltered rows. The screen says so rather than presenting
   * them as filtered. See docs/api-gaps.md G7.
   */
  dateFilterApplied: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isStale: boolean;
  isRefetching: boolean;
  refetch: () => void;
};

/** FR-22 — this shop's own orders, tracked through the FR-40 pipeline. */
export function useShopOrders(
  filters: ShopOrderFilters,
  pagination: Pagination,
): ShopOrdersResult {
  const { shopId } = useActiveShop();

  const query = useQuery({
    queryKey: queryKeys.shop.orders(shopId, filters, pagination),
    queryFn: () => getShopOrders(filters, pagination, shopId),
    enabled: Boolean(shopId),
    placeholderData: keepPreviousData,
  });

  return {
    orders: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    dateFilterApplied: isOrderDateFilterSupported(filters),
    isLoading: query.isLoading,
    isError: query.isError && query.data === undefined,
    error: query.error ? describeApiError(query.error) : undefined,
    isStale: query.isError && query.data !== undefined,
    isRefetching: query.isRefetching,
    refetch: () => {
      query.refetch();
    },
  };
}

type ShopOrderDetailsResult = {
  order?: Order;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/** FR-22, FR-25 — one order with its lines, taxes and invoice link. */
export function useShopOrderDetails(orderId: string): ShopOrderDetailsResult {
  const query = useQuery({
    queryKey: queryKeys.shop.order(orderId),
    queryFn: () => getShopOrder(orderId),
    enabled: Boolean(orderId),
  });

  return {
    order: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? describeApiError(query.error) : undefined,
    isRefetching: query.isRefetching,
    refetch: () => {
      query.refetch();
    },
  };
}

/**
 * FR-10 — the only write a shop makes to an order it has already submitted.
 *
 * The backend allows cancellation from DRAFT, SUBMITTED and ACCEPTED, and
 * refuses a SUBMITTED order once the cut-off has passed — which is the freeze
 * FR-10 describes. The screen reads `canCancelOrder` from `utils/format` to
 * decide whether to offer the action, and the server decides whether it lands.
 */
export function useShopOrderMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const cancel = useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: (_order, orderId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shop.order(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.shop.all });
      toast.show(strings.shopOrders.cancelled, { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  return { cancel };
}

export default useShopOrders;
