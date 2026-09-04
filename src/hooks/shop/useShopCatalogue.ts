import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getShopCatalogue, getShopCategories } from '../../services/shop';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useActiveShop } from './useActiveShop';
import type { Category, Pagination } from '../../types/admin';
import type { CatalogueFilters, CatalogueProduct } from '../../types/shop';

export const defaultCatalogueFilters = (): CatalogueFilters => ({
  search: '',
  categoryId: 'all',
});

export const defaultCataloguePagination: Pagination = { page: 1, limit: 20 };

type CatalogueResult = {
  products: CatalogueProduct[];
  categories: Category[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  /** True when a refetch failed while cached rows are still on screen. */
  isStale: boolean;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-5 + FR-6 — the orderable catalogue at the price this shop pays.
 *
 * `keepPreviousData` matters more here than on most lists: typing in the search
 * box refires the query on every keystroke, and without it the list would blank
 * between letters.
 *
 * Categories are cached far longer than products — they change when an admin
 * edits the catalogue structure, not when a price moves.
 */
export function useShopCatalogue(
  filters: CatalogueFilters,
  pagination: Pagination,
): CatalogueResult {
  const { shopId } = useActiveShop();
  const enabled = Boolean(shopId);

  const catalogue = useQuery({
    queryKey: queryKeys.shop.catalogue(shopId, filters, pagination),
    queryFn: () => getShopCatalogue(shopId, filters, pagination),
    enabled,
    placeholderData: keepPreviousData,
  });

  const categories = useQuery({
    queryKey: queryKeys.shop.categories,
    queryFn: getShopCategories,
    enabled,
    staleTime: 10 * 60_000,
  });

  return {
    products: catalogue.data?.items ?? [],
    categories: categories.data ?? [],
    total: catalogue.data?.total ?? 0,
    isLoading: catalogue.isLoading,
    isError: catalogue.isError && catalogue.data === undefined,
    error: catalogue.error ? describeApiError(catalogue.error) : undefined,
    isStale: catalogue.isError && catalogue.data !== undefined,
    isRefetching: catalogue.isRefetching,
    refetch: () => {
      catalogue.refetch();
      categories.refetch();
    },
  };
}

export default useShopCatalogue;
