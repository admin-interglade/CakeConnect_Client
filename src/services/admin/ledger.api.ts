import type {
  DateRange,
  LedgerAdjustmentInput,
  LedgerEntry,
} from '../../types/admin';
import { apiGetPaged, apiPost } from '../api';
import { toLedgerEntry, type ApiLedgerEntry } from '../mappers';

/**
 * Ledger — FR-23 transaction list, FR-39 adjustments and credit notes.
 *
 * Endpoints: `/ledger`, `/ledger/shops/:shopId/outstanding`,
 * `/ledger/adjustments`, `/ledger/credit-notes`.
 */

/**
 * FR-23 / FR-39 — the shared ledger with its running balance.
 *
 * Uses the top-level `/ledger` route rather than
 * `/ledger/shops/:shopId/ledger`: only this one accepts `from`/`to`, and the
 * transaction list is defined by its date range.
 */
export async function getShopLedger(
  shopId: string,
  range: DateRange,
): Promise<LedgerEntry[]> {
  const page = await apiGetPaged<ApiLedgerEntry>('/ledger', {
    shopId,
    from: range.from,
    to: range.to,
    page: 1,
    limit: 200,
  });

  return page.items.map(toLedgerEntry);
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * FR-39 — a manual adjustment or a credit note.
 *
 * These are two endpoints with different semantics, not one operation with a
 * sign. An adjustment carries an explicit DEBIT/CREDIT direction; a credit note
 * is always a positive amount plus a reason, and may be tied to an invoice. The
 * caller states which it means rather than the service inferring it from
 * `amount < 0`, which silently made every negative adjustment a credit note.
 */
export async function createLedgerAdjustment(
  shopId: string,
  input: LedgerAdjustmentInput,
): Promise<LedgerEntry> {
  const created =
    input.kind === 'creditNote'
      ? await apiPost<ApiLedgerEntry>('/ledger/credit-notes', {
          shopId,
          amount: Math.abs(input.amount),
          reason: input.reason,
          ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
        })
      : await apiPost<ApiLedgerEntry>('/ledger/adjustments', {
          shopId,
          amount: Math.abs(input.amount),
          type: 'ADJUSTMENT',
          direction: input.direction === 'credit' ? 'CREDIT' : 'DEBIT',
          description: input.description,
        });

  return toLedgerEntry(created);
}
