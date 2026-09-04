import type { Paginated, Pagination } from '../../types/admin';
import type { Transaction, TransactionFilters } from '../../types/shop';
import { apiGetPaged } from '../api';
import { toLedgerEntry, type ApiLedgerEntry } from '../mappers';

/**
 * The shop's own ledger — FR-23.
 *
 * Endpoint: `/ledger`.
 *
 * `GET /ledger` is used rather than `/ledger/shops/:id/ledger` because it is
 * the only one of the two that accepts `from`/`to`, and FR-23 asks for "any
 * duration". The backend scopes rows to the caller's shops from the JWT.
 */

/**
 * FR-23 — every order, invoice, payment, credit note and adjustment with its
 * running balance.
 *
 * Type and text filtering happen client-side over the fetched page: the
 * endpoint takes neither a `type` nor a `search` parameter. That is honest for
 * a filter over one page but cannot narrow rows the server did not send, which
 * is why the screen pages rather than filtering a truncated set.
 * See docs/api-gaps.md G19.
 */
export async function getTransactions(
  filters: TransactionFilters,
  pagination: Pagination,
  shopId?: string,
): Promise<Paginated<Transaction>> {
  const page = await apiGetPaged<ApiLedgerEntry>('/ledger', {
    page: pagination.page,
    limit: pagination.limit,
    from: filters.range.from,
    to: filters.range.to,
    // FR-4 — narrows a multi-outlet login to the selected outlet.
    ...(shopId ? { shopId } : {}),
  });

  return { ...page, items: page.items.map(toLedgerEntry) };
}

/** True when the server can honour every part of the filter, not just the range. */
export const isTransactionFilterFullyApplied = (
  filters: TransactionFilters,
): boolean => filters.type === 'all' && filters.search.trim() === '';

/** The client-side half of the filter, applied to the page that came back. */
export function applyTransactionFilters(
  entries: Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  const search = filters.search.trim().toLowerCase();

  return entries.filter(entry => {
    if (filters.type !== 'all' && entry.type !== filters.type) {
      return false;
    }
    if (!search) {
      return true;
    }
    return (
      entry.reference.toLowerCase().includes(search) ||
      entry.description.toLowerCase().includes(search)
    );
  });
}
