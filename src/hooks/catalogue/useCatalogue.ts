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

/**
 * Same shape as `useShopOptions`, and for the same reason: the offer composer
 * needs every product by name to name a few of them, not a paged directory.
 *
 * One page, and the screen says so when there is more than one — a picker that
 * quietly offers a subset of the catalogue is how an offer ends up missing the
 * product it was written for.
 */
const PRODUCT_PICKER_LIMIT = 100;

const productPickerPagination: Pagination = { page: 1, limit: PRODUCT_PICKER_LIMIT };

type ProductOptionsResult = {
  products: Product[];
  /** True when the catalogue holds more products than one page carries. */
  truncated: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
};

export function useProductOptions(): ProductOptionsResult {
  const list = useQuery({
    // Shares the catalogue screen's cache key, so opening that first costs
    // nothing here.
    queryKey: queryKeys.catalogue.products(
      defaultProductFilters,
      productPickerPagination,
    ),
    queryFn: () => getProducts(defaultProductFilters, productPickerPagination),
    staleTime: 5 * 60_000,
  });

  const products = list.data?.items ?? [];

  return {
    products,
    truncated: (list.data?.total ?? 0) > products.length,
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error ? describeApiError(list.error) : undefined,
  };
}

export default useCatalogue;
