import { useQuery } from '@tanstack/react-query';

import { getOrder } from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import type { Order } from '../../types/admin';

type OrderDetailsResult = {
  order?: Order;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/** FR-40 / FR-25 — one order with its items, taxes and status history. */
export function useOrderDetails(orderId: string): OrderDetailsResult {
  const query = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => getOrder(orderId),
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

export default useOrderDetails;
