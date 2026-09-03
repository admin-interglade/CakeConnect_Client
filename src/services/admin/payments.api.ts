import type { Payment } from '../../types/admin';
import { apiGetPaged } from '../api';
import { toPayment, type ApiPayment } from '../mappers';

/**
 * Payments — FR-39 history, FR-41 confirmation queue.
 *
 * Endpoints: `/payments`.
 */

/**
 * A shop's payment history. Distinct from the ledger's payment rows: a payment
 * can sit in PENDING_CONFIRMATION (FR-30) and never reach the ledger at all, so
 * deriving this from the ledger would hide exactly the ones needing action.
 */
export async function getShopPayments(shopId: string): Promise<Payment[]> {
  const page = await apiGetPaged<ApiPayment>('/payments', {
    shopId,
    page: 1,
    limit: 100,
  });

  return page.items.map(toPayment);
}
