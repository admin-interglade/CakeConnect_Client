import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { CartLine } from '../types/shop';

/**
 * The next-day order under construction — FR-7, FR-8, FR-10, FR-11.
 *
 * The cart is the local source of truth while the shop is building an order,
 * and it is persisted (see `store.ts`). That is what makes FR-11 work: the cart
 * survives an app restart and a dropped connection because nothing about
 * editing it needs the network.
 *
 * The server draft is reconciled separately, by `useCart`:
 *   - `draftOrderId` remembers the DRAFT order this cart is backed by, so a
 *     save updates that order instead of creating a second one for the same
 *     delivery date;
 *   - `dirty` marks local edits not yet pushed, which is what the sync banner
 *     and the pre-submit save both read.
 *
 * Quantities are held here as authored. Validation against MOQ and pack size
 * happens in the stepper and again on the server, which is the real gate.
 */

type CartState = {
  /**
   * The outlet this cart belongs to (FR-4). A cart built for one outlet must
   * never be submitted against another, so switching outlets clears it.
   */
  shopId: string | null;
  /** `YYYY-MM-DD`; always tomorrow, since the API accepts nothing else. */
  deliveryDate: string | null;
  lines: CartLine[];
  /** FR-7 — an order-level note, distinct from the per-item notes. */
  notes: string;
  /** The server-side DRAFT this cart is backed by, once one exists. */
  draftOrderId: string | null;
  /** True when local edits have not reached the server. */
  dirty: boolean;
  /** ISO timestamp of the last successful push, for the sync caption. */
  lastSyncedAt: string | null;
};

const initialState: CartState = {
  shopId: null,
  deliveryDate: null,
  lines: [],
  notes: '',
  draftOrderId: null,
  dirty: false,
  lastSyncedAt: null,
};

/**
 * FR-5 — a quantity must clear the MOQ and land on a pack-size boundary, or the
 * server rejects the whole order with a 400. Rounding up rather than down: a
 * shop that asks for 5 of something sold in packs of 4 wants 8, not 4.
 */
export function normaliseQuantity(
  quantity: number,
  { moq, packSize }: { moq: number; packSize: number },
): number {
  const pack = Math.max(Math.round(packSize) || 1, 1);
  const minimum = Math.max(Math.round(moq) || 0, 0);

  if (quantity <= 0) {
    return 0;
  }

  const rounded = Math.ceil(quantity / pack) * pack;
  if (minimum <= 0) {
    return rounded;
  }

  // The MOQ itself may not sit on a pack boundary; the first legal quantity is
  // the smallest multiple of the pack that reaches it.
  const minimumOnPack = Math.ceil(minimum / pack) * pack;
  return Math.max(rounded, minimumOnPack);
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /**
     * Binds the cart to an outlet and a delivery date. A change to either
     * empties it: carrying lines priced for one shop into another, or an
     * overnight cart into a new cut-off cycle, would submit the wrong order.
     */
    openCart: (
      state,
      action: PayloadAction<{ shopId: string; deliveryDate: string }>,
    ) => {
      const changed =
        state.shopId !== action.payload.shopId ||
        state.deliveryDate !== action.payload.deliveryDate;

      if (!changed) {
        return;
      }

      state.shopId = action.payload.shopId;
      state.deliveryDate = action.payload.deliveryDate;
      state.lines = [];
      state.notes = '';
      state.draftOrderId = null;
      state.dirty = false;
      state.lastSyncedAt = null;
    },

    /** FR-7 — adding an item already present tops it up by one pack. */
    addLine: (
      state,
      action: PayloadAction<{ line: Omit<CartLine, 'quantity'>; quantity?: number }>,
    ) => {
      const { line } = action.payload;
      const existing = state.lines.find(item => item.productId === line.productId);

      if (existing) {
        existing.quantity = normaliseQuantity(
          existing.quantity + (action.payload.quantity ?? line.packSize),
          existing,
        );
        // The price is re-snapshotted: the catalogue is the fresher of the two.
        existing.unitPrice = line.unitPrice;
      } else {
        state.lines.push({
          ...line,
          quantity: normaliseQuantity(action.payload.quantity ?? line.moq, line),
        });
      }

      state.dirty = true;
    },

    /** FR-7 — the quantity stepper. Zero removes the line. */
    setQuantity: (
      state,
      action: PayloadAction<{ productId: string; quantity: number }>,
    ) => {
      const line = state.lines.find(
        item => item.productId === action.payload.productId,
      );
      if (!line) {
        return;
      }

      const quantity = normaliseQuantity(action.payload.quantity, line);
      if (quantity <= 0) {
        state.lines = state.lines.filter(
          item => item.productId !== action.payload.productId,
        );
      } else {
        line.quantity = quantity;
      }

      state.dirty = true;
    },

    removeLine: (state, action: PayloadAction<string>) => {
      state.lines = state.lines.filter(item => item.productId !== action.payload);
      state.dirty = true;
    },

    /** FR-7 — the per-item note that reaches the kitchen on the production plan. */
    setLineNote: (
      state,
      action: PayloadAction<{ productId: string; note: string }>,
    ) => {
      const line = state.lines.find(
        item => item.productId === action.payload.productId,
      );
      if (!line) {
        return;
      }
      line.note = action.payload.note.trim() || undefined;
      state.dirty = true;
    },

    setOrderNote: (state, action: PayloadAction<string>) => {
      state.notes = action.payload;
      state.dirty = true;
    },

    /**
     * FR-8 — replaces the cart wholesale from a repeat, or from a server draft
     * adopted on load. Not dirty afterwards: what is on screen is what the
     * server already holds.
     */
    replaceLines: (
      state,
      action: PayloadAction<{
        lines: CartLine[];
        draftOrderId?: string | null;
        notes?: string;
      }>,
    ) => {
      state.lines = action.payload.lines;
      if (action.payload.notes !== undefined) {
        state.notes = action.payload.notes;
      }
      if (action.payload.draftOrderId !== undefined) {
        state.draftOrderId = action.payload.draftOrderId;
      }
      state.dirty = false;
      state.lastSyncedAt = new Date().toISOString();
    },

    /** Called once a save or submit lands, so the sync caption is truthful. */
    markSynced: (state, action: PayloadAction<{ draftOrderId: string }>) => {
      state.draftOrderId = action.payload.draftOrderId;
      state.dirty = false;
      state.lastSyncedAt = new Date().toISOString();
    },

    /**
     * FR-12 — the order has been submitted, so the cart is done. The shop and
     * delivery date are kept, so `openCart` does not immediately clear a cart
     * the owner starts building for the same cycle.
     */
    clearCart: state => {
      state.lines = [];
      state.notes = '';
      state.draftOrderId = null;
      state.dirty = false;
      state.lastSyncedAt = null;
    },
  },
});

export const {
  openCart,
  addLine,
  setQuantity,
  removeLine,
  setLineNote,
  setOrderNote,
  replaceLines,
  markSynced,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
