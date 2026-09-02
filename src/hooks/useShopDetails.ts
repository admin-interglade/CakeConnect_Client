import React from 'react';
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
import { defaultRange, resolveRange } from '../utils/dateRange';
import type {
  AuditEntry,
  DateRange,
  LedgerEntry,
  Order,
  PriceList,
  Shop,
} from '../types/admin';

/** FR-39 — the three figures the profile's monthly summary block reports. */
export type ShopMonthlySummary = {
  orderCount: number;
  orderValue: number;
  paymentsReceived: number;
};

type ShopDetailsResult = {
  shop?: Shop;
  ledger: LedgerEntry[];
  orders: Order[];
  audit: AuditEntry[];
  summary: ShopMonthlySummary;
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

  // The summary block always reports the calendar month, whatever range the
  // ledger and order tabs are showing, so it is resolved independently.
  const monthRange = React.useMemo(() => resolveRange('thisMonth'), []);

  const monthlyOrders = useQuery({
    queryKey: [...queryKeys.shops.detail(id), 'summary', monthRange.from, monthRange.to],
    queryFn: () =>
      getOrders(
        {
          search: '',
          status: 'all',
          shopId: id,
          range: monthRange,
          dateField: 'orderDate',
        },
        // A month of one shop's orders fits comfortably inside one page.
        { page: 1, limit: 200 },
      ),
    enabled,
  });

  // Shares its key with the ledger query above whenever the screen is on the
  // default month range, so the common case costs one request, not two.
  const monthlyLedger = useQuery({
    queryKey: queryKeys.shops.ledger(id, monthRange),
    queryFn: () => getShopLedger(id, monthRange),
    enabled,
  });

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

  const monthlyItems = monthlyOrders.data?.items ?? [];
  const monthlyEntries = monthlyLedger.data ?? [];

  const summary: ShopMonthlySummary = {
    orderCount: monthlyOrders.data?.total ?? 0,
    orderValue: monthlyItems.reduce((total, order) => total + order.total, 0),
    // Payments and credit notes are stored as negative ledger amounts, so the
    // collected figure is their magnitude.
    paymentsReceived: monthlyEntries
      .filter(entry => entry.type === 'payment' || entry.type === 'credit_note')
      .reduce((total, entry) => total + Math.abs(entry.amount), 0),
  };

  return {
    shop: shop.data as Shop | undefined,
    ledger: (ledger.data as LedgerEntry[] | undefined) ?? [],
    orders: orders.data?.items ?? [],
    audit: (audit.data as AuditEntry[] | undefined) ?? [],
    summary,
    isLoading: enabled && shop.isLoading,
    isError: Boolean(failed),
    error: failed ? describeApiError(failed.error) : undefined,
    isRefetching: results.some(result => result.isRefetching),
    refetch: () => {
      results.forEach(result => result.refetch());
      orders.refetch();
      monthlyOrders.refetch();
      monthlyLedger.refetch();
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
