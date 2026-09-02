import { useQueries, useQuery } from '@tanstack/react-query';

import {
  getOrders,
  getPriceLists,
  getShop,
  getShopAudit,
  getShopLedger,
} from '../services/adminApi';
import { describeApiError } from '../services/httpClient';
import { queryKeys } from './queryKeys';
import { defaultRange } from '../utils/dateRange';
import type {
  AuditEntry,
  DateRange,
  LedgerEntry,
  Order,
  PriceList,
  Shop,
} from '../types/admin';

type ShopDetailsResult = {
  shop?: Shop;
  ledger: LedgerEntry[];
  orders: Order[];
  audit: AuditEntry[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-39 — profile, order history, ledger and audit trail for one shop.
 * `shopId` is undefined in create mode, where every query stays disabled.
 */
export function useShopDetails(
  shopId?: string,
  range: DateRange = defaultRange(),
): ShopDetailsResult {
  const enabled = Boolean(shopId);
  const id = shopId ?? '';

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.shops.detail(id),
        queryFn: () => getShop(id),
        enabled,
      },
      {
        queryKey: queryKeys.shops.ledger(id, range),
        queryFn: () => getShopLedger(id, range),
        enabled,
      },
      {
        queryKey: queryKeys.shops.audit(id),
        queryFn: () => getShopAudit(id),
        enabled,
      },
    ],
  });

  const [shop, ledger, audit] = results;

  // The shop's own order history, newest first and capped at a readable page.
  const orders = useQuery({
    queryKey: [...queryKeys.shops.detail(id), 'orders'],
    queryFn: () =>
      getOrders(
        {
          search: '',
          status: 'all',
          shopId: id,
          range,
          dateField: 'orderDate',
        },
        { page: 1, limit: 10 },
      ),
    enabled,
  });

  const failed = results.find(result => result.isError);

  return {
    shop: shop.data as Shop | undefined,
    ledger: (ledger.data as LedgerEntry[] | undefined) ?? [],
    orders: orders.data?.items ?? [],
    audit: (audit.data as AuditEntry[] | undefined) ?? [],
    isLoading: enabled && shop.isLoading,
    isError: Boolean(failed),
    error: failed ? describeApiError(failed.error) : undefined,
    isRefetching: results.some(result => result.isRefetching),
    refetch: () => {
      results.forEach(result => result.refetch());
      orders.refetch();
    },
  };
}

/** FR-6 — the price lists a shop can be assigned to. */
export function usePriceLists(): PriceList[] {
  const { data } = useQuery({
    queryKey: queryKeys.shops.priceLists,
    queryFn: getPriceLists,
    staleTime: Infinity,
  });

  return data ?? [];
}

export default useShopDetails;
