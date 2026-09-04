import type { Paginated, Pagination } from '../../types/admin';
import type {
  PaymentIntent,
  PaymentMethod,
  PaymentRequest,
  ShopPayment,
} from '../../types/shop';
import { apiGet, apiGetPaged, apiPost } from '../api';
import {
  ONLINE_PAYMENT_METHODS,
  paymentMethodCodec,
  toPaymentIntent,
  toShopPayment,
  type ApiPaymentIntent,
  type ApiShopPayment,
} from '../mappers';

/**
 * Paying the franchise — FR-26 to FR-30.
 *
 * Endpoints: `/payments`, `/payments/create`, `/payments/:id`.
 *
 * What works end to end today: the offline rails (FR-27 cash, cheque, NEFT).
 * A payment recorded through one of those sits in PENDING_CONFIRMATION exactly
 * as FR-30 describes, and the admin's confirmation posts it to the ledger.
 *
 * What does not: the online rails. `POST /payments/create` recognises UPI, card
 * and net banking and answers `gatewayStatus: "SANDBOX"` with no checkout URL —
 * no gateway is wired on the server, and no gateway SDK is installed in the
 * app. The payment row is real and PENDING, but nothing can carry it to
 * SUCCESS except the webhook a gateway would call. `describePaymentOutcome`
 * below says exactly that rather than reporting a payment that did not happen.
 * See docs/api-gaps.md G16.
 */

/** FR-27 — which rails go to a gateway, and which wait for an admin. */
export const isOnlineMethod = (method: PaymentMethod): boolean =>
  ONLINE_PAYMENT_METHODS.includes(method);

/**
 * A per-attempt key so a retry after a timeout cannot take the money twice.
 * The server stores it as `transactionId` and returns the existing payment
 * when it sees the same key again.
 */
export function paymentIdempotencyKey(shopId: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${shopId.slice(0, 8)}-${Date.now().toString(36)}-${random}`;
}

/**
 * FR-26 — pay a specific invoice, the full outstanding, or an amount on
 * account. All three are the same call; only `invoiceId` differs, and its
 * absence is what "on account" means to the backend.
 */
export async function createPayment(
  request: PaymentRequest,
): Promise<PaymentIntent> {
  const intent = await apiPost<ApiPaymentIntent>('/payments/create', {
    shopId: request.shopId,
    ...(request.invoiceId ? { invoiceId: request.invoiceId } : {}),
    amount: request.amount,
    paymentMethod: paymentMethodCodec.toApi(request.method),
    ...(request.note ? { notes: request.note } : {}),
    idempotencyKey: request.idempotencyKey,
  });

  return toPaymentIntent(intent);
}

/**
 * FR-29 / FR-30 — what actually happened, stated plainly.
 *
 * Three outcomes, and the copy has to distinguish them because they mean very
 * different things to whoever is holding the phone:
 *   - offline: recorded, awaiting the admin. The flow is complete.
 *   - gateway with a URL: hand off to checkout.
 *   - gateway without a URL: the row exists, nothing can settle it. Saying
 *     "payment successful" here would be a lie about money.
 */
export type PaymentOutcome =
  | { kind: 'awaitingConfirmation'; payment: ShopPayment }
  | { kind: 'gatewayHandoff'; payment: ShopPayment; url: string }
  | { kind: 'gatewayUnavailable'; payment: ShopPayment };

export function describePaymentOutcome(intent: PaymentIntent): PaymentOutcome {
  if (intent.channel === 'offline') {
    return { kind: 'awaitingConfirmation', payment: intent.payment };
  }
  if (intent.gatewayUrl) {
    return {
      kind: 'gatewayHandoff',
      payment: intent.payment,
      url: intent.gatewayUrl,
    };
  }
  return { kind: 'gatewayUnavailable', payment: intent.payment };
}

/** FR-29 — payment history, including the rows still awaiting confirmation. */
export async function getShopPayments(
  pagination: Pagination,
  shopId?: string,
): Promise<Paginated<ShopPayment>> {
  const page = await apiGetPaged<ApiShopPayment>('/payments', {
    page: pagination.page,
    limit: pagination.limit,
    ...(shopId ? { shopId } : {}),
  });

  return { ...page, items: page.items.map(toShopPayment) };
}

/**
 * FR-29 — a single payment, polled after a gateway handoff so a settlement
 * that lands via the webhook is picked up without the user refreshing.
 */
export async function getPayment(paymentId: string): Promise<ShopPayment> {
  return toShopPayment(await apiGet<ApiShopPayment>(`/payments/${paymentId}`));
}
