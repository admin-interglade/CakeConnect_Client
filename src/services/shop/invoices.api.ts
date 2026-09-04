import type { DateRange, Paginated, Pagination } from '../../types/admin';
import type { Invoice } from '../../types/shop';
import { apiGet, apiGetPaged } from '../api';
import { toInvoice, type ApiInvoice } from '../mappers';

/**
 * The shop's invoices — FR-25, and the payable list behind FR-26.
 *
 * Endpoints: `/invoices`, `/invoices/:id`.
 *
 * `GET /invoices` accepts `from`/`to`, unlike `/orders`, so the date range the
 * transaction list is showing can actually be pushed to the server here.
 */

export async function getShopInvoices(
  range: DateRange,
  pagination: Pagination,
  shopId?: string,
): Promise<Paginated<Invoice>> {
  const page = await apiGetPaged<ApiInvoice>('/invoices', {
    page: pagination.page,
    limit: pagination.limit,
    from: range.from,
    to: range.to,
    ...(shopId ? { shopId } : {}),
  });

  return { ...page, items: page.items.map(toInvoice) };
}

/**
 * FR-26 — the invoices a shop can actually pay.
 *
 * DRAFT invoices are excluded: they have not been issued to the shop yet, and
 * offering to pay one would be paying a bill nobody has sent. PAID and
 * CANCELLED are excluded because there is nothing left to settle.
 */
export async function getPayableInvoices(shopId?: string): Promise<Invoice[]> {
  const statuses = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];

  const pages = await Promise.all(
    statuses.map(status =>
      apiGetPaged<ApiInvoice>('/invoices', {
        status,
        page: 1,
        limit: 50,
        ...(shopId ? { shopId } : {}),
      }),
    ),
  );

  return pages
    .flatMap(page => page.items.map(toInvoice))
    .filter(invoice => invoice.outstanding > 0)
    // Oldest due date first: that is the one accruing age on the FR-38 report.
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** FR-25 — line items, taxes and the gap against the original order. */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  return toInvoice(await apiGet<ApiInvoice>(`/invoices/${invoiceId}`));
}
