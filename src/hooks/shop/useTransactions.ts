import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  applyTransactionFilters,
  getInvoice,
  getTransactions,
  isTransactionFilterFullyApplied,
} from '../../services/shop';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { defaultRange } from '../../utils/dateRange';
import { useActiveShop } from './useActiveShop';
import type { Pagination } from '../../types/admin';
import type { Invoice, Transaction, TransactionFilters } from '../../types/shop';

export const defaultTransactionFilters = (): TransactionFilters => ({
  search: '',
  type: 'all',
  range: defaultRange(),
});

export const defaultTransactionPagination: Pagination = { page: 1, limit: 25 };

type TransactionsResult = {
  /** The page, after the client-side half of the filter. */
  transactions: Transaction[];
  /** How many rows the server holds for this range, before local filtering. */
  total: number;
  /** Closing balance of the range: the running balance on the newest row. */
  closingBalance: number;
  /** What was billed and what was received within the page, for the summary. */
  billed: number;
  received: number;
  /**
   * False when part of the filter could only be applied locally, so the count
   * on screen describes this page rather than the whole range.
   * See docs/api-gaps.md G19.
   */
  filterFullyApplied: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isStale: boolean;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-23 — the transaction list for any duration, with its running balance.
 *
 * The endpoint accepts the date range but neither a type nor a search term, so
 * those two are applied to the page that came back. The hook reports which
 * half of the filter the server honoured, because a count that silently
 * describes one page rather than the range would misstate the shop's position.
 *
 * The ledger arrives newest-first, which is why the closing balance is the
 * running balance of the *first* row rather than the last.
 */
export function useTransactions(
  filters: TransactionFilters,
  pagination: Pagination,
): TransactionsResult {
  const { shopId } = useActiveShop();

  const query = useQuery({
    queryKey: queryKeys.shop.transactions(shopId, filters, pagination),
    queryFn: () => getTransactions(filters, pagination, shopId),
    enabled: Boolean(shopId),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.items ?? [];
  const visible = applyTransactionFilters(rows, filters);

  return {
    transactions: visible,
    total: query.data?.total ?? 0,
    closingBalance: rows[0]?.runningBalance ?? 0,
    billed: rows
      .filter(entry => entry.amount > 0)
      .reduce((sum, entry) => sum + entry.amount, 0),
    received: rows
      .filter(entry => entry.amount < 0)
      .reduce((sum, entry) => sum - entry.amount, 0),
    filterFullyApplied: isTransactionFilterFullyApplied(filters),
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

type InvoiceResult = {
  invoice?: Invoice;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  refetch: () => void;
};

/** FR-25 — invoice detail with line items, taxes and short-supply notes. */
export function useInvoiceDetails(invoiceId: string): InvoiceResult {
  const query = useQuery({
    queryKey: queryKeys.shop.invoice(invoiceId),
    queryFn: () => getInvoice(invoiceId),
    enabled: Boolean(invoiceId),
  });

  return {
    invoice: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? describeApiError(query.error) : undefined,
    refetch: () => {
      query.refetch();
    },
  };
}

export default useTransactions;
