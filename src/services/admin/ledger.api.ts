import type { DateRange, LedgerEntry } from '../../types/admin';
import { toApiDate } from '../../utils/format';
import { apiGetPaged } from '../api';
import { toLedgerEntry, type ApiLedgerEntry } from '../mappers';
import { recordAudit, shops as mockShops } from './mockStore';

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
/* Writes — MOCK-BACKED. See the banner in `api/index.ts`.                     */
/* -------------------------------------------------------------------------- */

export async function createLedgerAdjustment(
  shopId: string,
  input: { amount: number; reference: string; description: string },
): Promise<LedgerEntry> {
  const shopIndex = mockShops.findIndex(shop => shop.id === shopId);
  if (shopIndex === -1) {
    throw new Error('Shop not found');
  }

  const previousOutstanding = mockShops[shopIndex].outstanding;
  mockShops[shopIndex] = {
    ...mockShops[shopIndex],
    outstanding: previousOutstanding + input.amount,
  };

  recordAudit(shopId, {
    action: input.amount < 0 ? 'Credit note issued' : 'Adjustment posted',
    field: 'outstanding',
    before: String(previousOutstanding),
    after: String(previousOutstanding + input.amount),
  });

  return {
    id: `led_adj_${Date.now()}`,
    date: toApiDate(new Date()),
    type: input.amount < 0 ? 'credit_note' : 'adjustment',
    reference: input.reference,
    description: input.description,
    amount: input.amount,
    runningBalance: previousOutstanding + input.amount,
  };
}
