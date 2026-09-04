import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  getCategories,
  getPriceListsDetailed,
  getProducts,
} from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import type {
  Category,
  Pagination,
  PriceListDetail,
  Product,
  ProductFilters,
} from '../../types/admin';

export const defaultProductFilters: ProductFilters = {
  search: '',
  status: 'all',
  categoryId: 'all',
};

export const defaultCataloguePagination: Pagination = { page: 1, limit: 10 };

type CatalogueResult = {
  products: Product[];
  total: number;
  categories: Category[];
  priceLists: PriceListDetail[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-5 / FR-6 — the three catalogue collections behind one loading flag.
 *
 * Categories and price lists are unpaginated and change rarely, so they are
 * cached for longer than the product page, which re-fetches whenever a filter
 * or page changes.
 */
export function useCatalogue(
  filters: ProductFilters,
  pagination: Pagination,
): CatalogueResult {
  const products = useQuery({
    queryKey: queryKeys.catalogue.products(filters, pagination),
    queryFn: () => getProducts(filters, pagination),
    // Keeps the previous page on screen while the next loads, so paging does
    // not flash an empty table.
    placeholderData: keepPreviousData,
  });

  const categories = useQuery({
    queryKey: queryKeys.catalogue.categories,
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });

  const priceLists = useQuery({
    queryKey: queryKeys.catalogue.priceLists,
    queryFn: getPriceListsDetailed,
    staleTime: 5 * 60_000,
  });

  const failed = [products, categories, priceLists].find(query => query.isError);

  return {
    products: products.data?.items ?? [],
    total: products.data?.total ?? 0,
    categories: categories.data ?? [],
    priceLists: priceLists.data ?? [],
    isLoading: products.isLoading || categories.isLoading,
    isError: Boolean(failed) && products.data === undefined,
    error: failed ? describeApiError(failed.error) : undefined,
    isRefetching: [products, categories, priceLists].some(q => q.isRefetching),
    refetch: () => {
      products.refetch();
      categories.refetch();
      priceLists.refetch();
    },
  };
}

export default useCatalogue;
