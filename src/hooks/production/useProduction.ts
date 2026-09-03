import { useQuery } from '@tanstack/react-query';

import { getProductionDetail, getProductionRequirement } from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import type { ProductionDetail, ProductionRequirement } from '../../types/admin';

type ProductionResult = {
  requirement?: ProductionRequirement;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/** FR-37 — the consolidated plan for one delivery date. */
export function useProductionRequirement(deliveryDate: string): ProductionResult {
  const query = useQuery({
    queryKey: queryKeys.dashboard.production(deliveryDate),
    queryFn: () => getProductionRequirement(deliveryDate),
    enabled: Boolean(deliveryDate),
  });

  return {
    requirement: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? describeApiError(query.error) : undefined,
    isRefetching: query.isRefetching,
    refetch: () => {
      query.refetch();
    },
  };
}

type ProductionDetailResult = {
  detail?: ProductionDetail;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/** One product's shop-by-shop breakdown for that date. */
export function useProductionDetail(
  deliveryDate: string,
  productId: string,
): ProductionDetailResult {
  const query = useQuery({
    queryKey: queryKeys.dashboard.productionDetail(deliveryDate, productId),
    queryFn: () => getProductionDetail(deliveryDate, productId),
    enabled: Boolean(deliveryDate && productId),
  });

  return {
    detail: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? describeApiError(query.error) : undefined,
    isRefetching: query.isRefetching,
    refetch: () => {
      query.refetch();
    },
  };
}
