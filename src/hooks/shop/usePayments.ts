import React from 'react';
import { keepPreviousData, useMutation, useQueries, useQueryClient } from '@tanstack/react-query';

import {
  createPayment,
  describePaymentOutcome,
  getPayableInvoices,
  getShopCredit,
  getShopPayments,
  paymentIdempotencyKey,
  type PaymentOutcome,
} from '../../services/shop';
import { describeApiError } from '../../services/api';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import { queryKeys } from '../queryKeys';
import { useActiveShop } from './useActiveShop';
import type { Pagination } from '../../types/admin';
import type {
  Invoice,
  PaymentMethod,
  PaymentTarget,
  ShopCredit,
  ShopPayment,
} from '../../types/shop';

export const defaultPaymentPagination: Pagination = { page: 1, limit: 20 };

type PaymentsResult = {
  /** FR-26 — the invoices with something still outstanding. */
  payableInvoices: Invoice[];
  /** FR-29 — history, including rows still awaiting admin confirmation. */
  payments: ShopPayment[];
  paymentsTotal: number;
  credit?: ShopCredit;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;

  /** The last completed attempt, so the screen can say what actually happened. */
  outcome?: PaymentOutcome;
  clearOutcome: () => void;
  pay: (target: PaymentTarget, method: PaymentMethod, note?: string) => void;
  isPaying: boolean;
};

/**
 * FR-26 to FR-30 — paying the franchise.
 *
 * The outcome of an attempt is held here rather than being reduced to a toast,
 * because the three possible endings mean very different things and the shop
 * needs to see which one it got:
 *
 *   - offline rails (cash, cheque, NEFT) are recorded and wait for the admin,
 *     which is FR-30 working exactly as written;
 *   - an online rail with a live gateway hands off to checkout;
 *   - an online rail with no gateway wired leaves a real PENDING row that
 *     nothing can settle. Reporting that as a completed payment would be a lie
 *     about money, so the screen states it. See docs/api-gaps.md G16.
 */
export function usePayments(pagination: Pagination): PaymentsResult {
  const { shopId } = useActiveShop();
  const queryClient = useQueryClient();
  const toast = useToast();
  const enabled = Boolean(shopId);

  const [outcome, setOutcome] = React.useState<PaymentOutcome | undefined>();

  const results = useQueries({
    queries: [
      {
        queryKey: queryKeys.shop.payableInvoices(shopId),
        queryFn: () => getPayableInvoices(shopId),
        enabled,
      },
      {
        queryKey: queryKeys.shop.payments(shopId, pagination),
        queryFn: () => getShopPayments(pagination, shopId),
        enabled,
        placeholderData: keepPreviousData,
      },
      {
        queryKey: queryKeys.shop.credit(shopId),
        queryFn: () => getShopCredit(shopId),
        enabled,
      },
    ],
  });

  const [invoices, history, credit] = results;

  const pay = useMutation({
    mutationFn: (variables: {
      target: PaymentTarget;
      method: PaymentMethod;
      note?: string;
    }) =>
      createPayment({
        shopId,
        // Only an invoice-targeted payment carries an id; its absence is what
        // "on account" means to the backend.
        invoiceId:
          variables.target.kind === 'invoice' ? variables.target.invoiceId : undefined,
        amount: variables.target.amount,
        method: variables.method,
        note: variables.note,
        // Generated per attempt, so a retry after a timeout returns the
        // existing payment rather than taking the money twice.
        idempotencyKey: paymentIdempotencyKey(shopId),
      }),

    onSuccess: intent => {
      const next = describePaymentOutcome(intent);
      setOutcome(next);

      // The ledger only moves once a payment is confirmed, but the payment row
      // itself is visible immediately, so the history and the outstanding
      // figure are both refreshed.
      queryClient.invalidateQueries({ queryKey: queryKeys.shop.all });

      if (next.kind === 'awaitingConfirmation') {
        toast.show(strings.payments.recorded, { tone: 'success' });
      }
    },

    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  return {
    payableInvoices: (invoices.data as Invoice[] | undefined) ?? [],
    payments: (history.data as { items: ShopPayment[] } | undefined)?.items ?? [],
    paymentsTotal: (history.data as { total: number } | undefined)?.total ?? 0,
    credit: credit.data as ShopCredit | undefined,
    isLoading: results.some(result => result.isLoading),
    isError: results.some(result => result.isError && result.data === undefined),
    error: results.find(result => result.error)?.error
      ? describeApiError(results.find(result => result.error)?.error)
      : undefined,
    isRefetching: results.some(result => result.isRefetching),
    refetch: () => {
      results.forEach(result => result.refetch());
    },

    outcome,
    clearOutcome: () => setOutcome(undefined),
    pay: (target, method, note) => pay.mutate({ target, method, note }),
    isPaying: pay.isPending,
  };
}

export default usePayments;
