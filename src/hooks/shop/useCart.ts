import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createDraftOrder,
  deleteDraftOrder,
  getShopCredit,
  getTomorrowsOrder,
  hydrateCartLines,
  nextDeliveryDate,
  repeatOrder,
  submitOrder as submitOrderApi,
  updateDraftOrder,
  type RepeatMode,
} from '../../services/shop';
import { describeApiError } from '../../services/api';
import type { AxiosError } from 'axios';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import {
  addLine,
  clearCart,
  markSynced,
  openCart,
  removeLine,
  replaceLines,
  setLineNote,
  setOrderNote,
  setQuantity,
} from '../../store/cartSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { queryKeys } from '../queryKeys';
import { useActiveShop } from './useActiveShop';
import { useCutoff } from './useCutoff';
import type { Order } from '../../types/admin';
import type {
  CartBlocker,
  CartLine,
  CartTotals,
  CatalogueProduct,
  ShopCredit,
} from '../../types/shop';

/**
 * FR-7 to FR-12 — the next-day order, from first tap to submitted.
 *
 * Where the truth lives, and why:
 *
 *   editing      local (Redux, persisted). FR-11 requires the cart to survive
 *                an app restart and a connectivity loss, so nothing about
 *                adding a line or changing a quantity touches the network.
 *   pricing      the server. `POST /orders` re-prices every line from the
 *                shop's own price list and ignores whatever the client sent,
 *                so the order it returns replaces the cart rather than
 *                confirming it.
 *   the cut-off  the server. It re-checks on submit and answers 403, so the
 *                countdown here is a courtesy, never the control.
 *
 * The local cart is pushed to a server DRAFT on demand — on an explicit save,
 * and again immediately before submit — rather than on every keystroke. One
 * draft per delivery date: `draftOrderId` is what stops a second one being
 * created after a restart.
 */

type CartResult = {
  lines: CartLine[];
  totals: CartTotals;
  notes: string;
  deliveryDate: string;
  /** Set once the cart is backed by a server draft. */
  draftOrderId: string | null;
  /** True when local edits have not reached the server yet. */
  dirty: boolean;
  lastSyncedAt: string | null;

  /** FR-22 — an order already placed for this delivery date, if any. */
  existingOrder?: Order;
  /** True when that order is past DRAFT and the cart is therefore read-only. */
  alreadySubmitted: boolean;

  credit?: ShopCredit;
  /** FR-9 — seconds until the cut-off, ticking live. */
  secondsToCutoff: number;
  cutoffTime?: string;
  cutoffPassed: boolean;

  /** Everything standing between this cart and a submitted order. */
  blockers: CartBlocker[];
  canSubmit: boolean;
  /** PRD §8 — over the limit on a shop the franchise only warns, not blocks. */
  creditWarning: boolean;

  /* Editing — all local, all synchronous. */
  add: (product: CatalogueProduct, quantity?: number) => void;
  setLineQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  setNote: (productId: string, note: string) => void;
  setOrderNotes: (notes: string) => void;

  /* Writes. */
  save: () => void;
  submit: () => void;
  discard: () => void;
  repeat: (mode: RepeatMode) => void;

  isAdopting: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  isRepeating: boolean;
  isDiscarding: boolean;
};

/**
 * FR-7 — the running order value.
 *
 * Tax is zero on every order this backend prices (its GST rate is configured
 * at 0), so this reports zero rather than applying a rate of its own. Guessing
 * one would put a total on screen that the invoice will not match.
 */
/** True for a 404, which the repeat routes use to mean "nothing to copy". */
const isNotFound = (error: unknown): boolean =>
  (error as AxiosError)?.response?.status === 404;

export function computeTotals(lines: CartLine[]): CartTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );

  return {
    lineCount: lines.length,
    unitCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    taxTotal: 0,
    total: subtotal,
  };
}

/** Stable empty reference, so an unbound cart does not churn its dependents. */
const EMPTY_LINES: CartLine[] = [];

export function useCart(): CartResult {
  const dispatch = useDispatch<AppDispatch>();
  const queryClient = useQueryClient();
  const toast = useToast();

  const { shopId } = useActiveShop();
  const { cutoff, secondsRemaining, passed } = useCutoff();
  const cart = useSelector((state: RootState) => state.cart);

  const deliveryDate = nextDeliveryDate();

  /* ---------------------------------------------------------------------- */
  /* Binding                                                                 */
  /* ---------------------------------------------------------------------- */

  /**
   * Rebinding on a shop or date change is what stops yesterday's cart being
   * submitted into today's cut-off cycle, or one outlet's lines being sent to
   * another. `openCart` is a no-op when neither has changed.
   */
  React.useEffect(() => {
    if (shopId) {
      dispatch(openCart({ shopId, deliveryDate }));
    }
  }, [dispatch, shopId, deliveryDate]);

  /* ---------------------------------------------------------------------- */
  /* Adopting an existing draft                                              */
  /* ---------------------------------------------------------------------- */

  const existing = useQuery({
    queryKey: queryKeys.shop.tomorrow(shopId),
    queryFn: () => getTomorrowsOrder(shopId),
    enabled: Boolean(shopId),
  });

  const credit = useQuery({
    queryKey: queryKeys.shop.credit(shopId),
    queryFn: () => getShopCredit(shopId),
    enabled: Boolean(shopId),
  });

  // `getTomorrowsOrder` answers `null` when there is no order, which is an
  // ordinary state rather than a failure.
  const existingOrder = existing.data ?? undefined;
  const existingDraft =
    existingOrder?.status === 'draft' ? existingOrder : undefined;

  /**
   * A DRAFT already on the server, with nothing local to lose, is adopted into
   * the cart. Without this, an owner who saved a draft on one device — or
   * reinstalled the app — would start from an empty cart and create a second
   * draft for the same delivery date.
   *
   * A dirty local cart is never overwritten: unsent local edits are the newer
   * of the two, and FR-11 promises they survive.
   */
  const adopt = useMutation({
    mutationFn: async (order: Order) =>
      hydrateCartLines(
        shopId,
        order.items.map(item => ({
          productId: item.productId,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.orderedQty,
          note: item.note,
        })),
      ),
    onSuccess: (lines, order) => {
      dispatch(replaceLines({ lines, draftOrderId: order.id, notes: '' }));
    },
    // Silent: a failed adoption leaves the shop with an empty cart it can fill
    // by hand, which is a worse start but not a broken one.
    onError: () => undefined,
  });

  const adoptedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!existingDraft || cart.dirty || cart.lines.length > 0) {
      return;
    }
    if (cart.draftOrderId === existingDraft.id) {
      return;
    }
    // Guarded by a ref as well as by state: the mutation is async, and the
    // effect would otherwise re-fire before the store has caught up.
    if (adoptedRef.current === existingDraft.id) {
      return;
    }

    adoptedRef.current = existingDraft.id;
    adopt.mutate(existingDraft);
    // `adopt` is a stable mutation object; including it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDraft, cart.dirty, cart.lines.length, cart.draftOrderId]);

  /* ---------------------------------------------------------------------- */
  /* Derived state                                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * Guarded on the bound shop: between `openCart` dispatching and the store
   * settling there is a render where the persisted cart still belongs to the
   * previous outlet, and those lines must not be priced or submitted here.
   *
   * Memoised because the empty-array branch would otherwise be a new reference
   * on every render, re-running every total and callback below it.
   */
  const lines = React.useMemo(
    () => (cart.shopId === shopId ? cart.lines : EMPTY_LINES),
    [cart.shopId, cart.lines, shopId],
  );
  const totals = React.useMemo(() => computeTotals(lines), [lines]);

  const alreadySubmitted = Boolean(
    existingOrder && existingOrder.status !== 'draft',
  );

  const creditData = credit.data;
  const overCreditLimit = Boolean(
    creditData && totals.total > creditData.availableCredit,
  );
  /** PRD §8 — the backend settles "blocked or warned" per shop. */
  const creditBlocks = overCreditLimit && creditData?.creditBehavior === 'blockOrder';

  const blockers = React.useMemo<CartBlocker[]>(() => {
    const found: CartBlocker[] = [];

    if (lines.length === 0) {
      found.push('empty');
    }
    if (passed) {
      found.push('cutoffPassed');
    }
    if (creditBlocks) {
      found.push('creditExceeded');
    }
    // The stepper normalises on every change, so a line below its MOQ can only
    // arrive from a rehydrated cart whose product rules have since changed.
    if (lines.some(line => line.quantity < line.moq)) {
      found.push('belowMoq');
    }

    return found;
  }, [lines, passed, creditBlocks]);

  /* ---------------------------------------------------------------------- */
  /* Writes                                                                  */
  /* ---------------------------------------------------------------------- */

  const invalidate = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shop.all });
  }, [queryClient]);

  /**
   * Pushes the cart to the server, creating the draft on first save and
   * rewriting it after that. `PATCH /orders/:id` replaces the item set
   * wholesale, so the whole cart goes every time.
   */
  const pushDraft = React.useCallback(async (): Promise<Order> => {
    if (cart.draftOrderId) {
      return updateDraftOrder(cart.draftOrderId, lines, cart.notes);
    }
    return createDraftOrder(shopId, lines, cart.notes);
  }, [cart.draftOrderId, cart.notes, lines, shopId]);

  const save = useMutation({
    mutationFn: pushDraft,
    onSuccess: order => {
      dispatch(markSynced({ draftOrderId: order.id }));
      invalidate();
      toast.show(strings.cart.draftSaved, { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  /**
   * FR-12 — submit.
   *
   * Always saves first, even when the cart looks clean: the draft on the server
   * is what gets submitted, and submitting a stale one would send an order the
   * shop is not looking at. The two calls are sequential rather than parallel
   * for the same reason.
   */
  const submit = useMutation({
    mutationFn: async () => {
      const draft = await pushDraft();
      return submitOrderApi(draft.id);
    },
    onSuccess: order => {
      dispatch(clearCart());
      adoptedRef.current = null;
      invalidate();
      toast.show(strings.cart.submitted(order.orderNumber), { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  /** FR-10 — discard before cut-off, locally and on the server. */
  const discard = useMutation({
    mutationFn: async () => {
      if (cart.draftOrderId) {
        await deleteDraftOrder(cart.draftOrderId);
      }
    },
    onSuccess: () => {
      dispatch(clearCart());
      adoptedRef.current = null;
      invalidate();
      toast.show(strings.cart.discarded, { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  /**
   * FR-8 — repeat the last order, or the last order for the same weekday.
   *
   * The server builds a fresh draft at today's prices and returns it; the cart
   * is then rebuilt from that draft, so what the shop sees is exactly what the
   * server holds. A 404 means there is nothing to repeat, which is an ordinary
   * state rather than a failure.
   */
  const repeat = useMutation({
    mutationFn: async (mode: RepeatMode) => {
      const order = await repeatOrder(shopId, mode);
      const hydrated = await hydrateCartLines(
        shopId,
        order.items.map(item => ({
          productId: item.productId,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.orderedQty,
          note: item.note,
        })),
      );
      return { order, lines: hydrated };
    },
    onSuccess: ({ order, lines: hydrated }) => {
      adoptedRef.current = order.id;
      dispatch(replaceLines({ lines: hydrated, draftOrderId: order.id, notes: '' }));
      invalidate();
      toast.show(strings.cart.repeated(hydrated.length), { tone: 'success' });
    },

    onError: error => {
      // The repeat routes 404 when there is nothing to copy. That is an
      // ordinary state for a new shop, not a failure, and the generic
      // "that record no longer exists" reads as though something broke.
      if (isNotFound(error)) {
        toast.show(strings.cart.repeatNone, { tone: 'info' });
        return;
      }
      toast.show(describeApiError(error), { tone: 'error' });
    },
  });

  /* ---------------------------------------------------------------------- */

  return {
    lines,
    totals,
    notes: cart.notes,
    deliveryDate,
    draftOrderId: cart.draftOrderId,
    dirty: cart.dirty,
    lastSyncedAt: cart.lastSyncedAt,

    existingOrder,
    alreadySubmitted,

    credit: creditData,
    secondsToCutoff: secondsRemaining,
    cutoffTime: cutoff?.cutoffTime,
    cutoffPassed: passed,

    blockers,
    canSubmit: blockers.length === 0 && !alreadySubmitted,
    creditWarning: overCreditLimit && !creditBlocks,

    add: (product, quantity) =>
      dispatch(
        addLine({
          line: {
            productId: product.id,
            name: product.name,
            unit: product.unit,
            imageUrl: product.imageUrl,
            unitPrice: product.price,
            moq: product.moq,
            packSize: product.packSize,
          },
          quantity,
        }),
      ),
    setLineQuantity: (productId, quantity) =>
      dispatch(setQuantity({ productId, quantity })),
    remove: productId => dispatch(removeLine(productId)),
    setNote: (productId, note) => dispatch(setLineNote({ productId, note })),
    setOrderNotes: notes => dispatch(setOrderNote(notes)),

    save: () => save.mutate(),
    submit: () => submit.mutate(),
    discard: () => discard.mutate(),
    repeat: mode => repeat.mutate(mode),

    isAdopting: adopt.isPending,
    isSaving: save.isPending,
    isSubmitting: submit.isPending,
    isRepeating: repeat.isPending,
    isDiscarding: discard.isPending,
  };
}

export default useCart;
