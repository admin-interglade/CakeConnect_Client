import reducer, {
  addLine,
  clearCart,
  markSynced,
  normaliseQuantity,
  openCart,
  removeLine,
  replaceLines,
  setLineNote,
  setQuantity,
} from '../src/store/cartSlice';
import { computeTotals } from '../src/hooks/shop/useCart';
import type { CartLine } from '../src/types/shop';

/**
 * The cart is the one piece of shop-owner state the app owns rather than
 * reads, and every rule it enforces (FR-5 MOQ, FR-7 totals, FR-11 durability)
 * has a way of being wrong that only shows up as a rejected order. These cover
 * the arithmetic and the state transitions; the network side is the server's.
 */

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  productId: 'p1',
  name: 'Classic Vanilla',
  unit: 'kg',
  unitPrice: 520,
  quantity: 1,
  moq: 1,
  packSize: 1,
  ...overrides,
});

const seed = (lines: CartLine[]) =>
  lines.reduce(
    (state, item) =>
      reducer(
        state,
        addLine({
          line: {
            productId: item.productId,
            name: item.name,
            unit: item.unit,
            unitPrice: item.unitPrice,
            moq: item.moq,
            packSize: item.packSize,
          },
          quantity: item.quantity,
        }),
      ),
    reducer(undefined, openCart({ shopId: 's1', deliveryDate: '2026-09-05' })),
  );

describe('normaliseQuantity — FR-5 MOQ and pack size', () => {
  it('rounds up to the next pack rather than down', () => {
    // A shop asking for 5 of something sold in fours wants 8, not 4.
    expect(normaliseQuantity(5, { moq: 1, packSize: 4 })).toBe(8);
  });

  it('raises a quantity below the MOQ to the first legal pack', () => {
    // MOQ 10 in packs of 4 means 12 is the smallest the server accepts.
    expect(normaliseQuantity(3, { moq: 10, packSize: 4 })).toBe(12);
  });

  it('leaves a quantity that already clears both rules alone', () => {
    expect(normaliseQuantity(12, { moq: 10, packSize: 4 })).toBe(12);
  });

  it('treats zero as a removal rather than raising it to the MOQ', () => {
    expect(normaliseQuantity(0, { moq: 10, packSize: 4 })).toBe(0);
  });

  it('survives a pack size of zero, which would otherwise divide by zero', () => {
    expect(normaliseQuantity(3, { moq: 0, packSize: 0 })).toBe(3);
  });
});

describe('computeTotals — FR-7 running order value', () => {
  it('sums the lines and reports the units behind them', () => {
    const totals = computeTotals([
      line({ productId: 'p1', unitPrice: 520, quantity: 2 }),
      line({ productId: 'p2', unitPrice: 110, quantity: 5 }),
    ]);

    expect(totals.subtotal).toBe(1590);
    expect(totals.lineCount).toBe(2);
    expect(totals.unitCount).toBe(7);
  });

  it('reports zero tax rather than applying a rate of its own', () => {
    // The backend prices every order at a 0% GST rate. Inventing one here
    // would put a total on screen that the invoice will not match.
    const totals = computeTotals([line({ unitPrice: 100, quantity: 1 })]);

    expect(totals.taxTotal).toBe(0);
    expect(totals.total).toBe(totals.subtotal);
  });
});

describe('cartSlice', () => {
  it('binds to a shop and delivery date', () => {
    const state = reducer(
      undefined,
      openCart({ shopId: 's1', deliveryDate: '2026-09-05' }),
    );

    expect(state.shopId).toBe('s1');
    expect(state.deliveryDate).toBe('2026-09-05');
  });

  it('clears the cart when the outlet changes — FR-4', () => {
    // Lines priced for one outlet must never be submitted against another.
    const filled = seed([line({ quantity: 3 })]);
    const switched = reducer(
      filled,
      openCart({ shopId: 's2', deliveryDate: '2026-09-05' }),
    );

    expect(filled.lines).toHaveLength(1);
    expect(switched.lines).toHaveLength(0);
    expect(switched.shopId).toBe('s2');
  });

  it('clears the cart when the delivery date rolls over', () => {
    // An overnight cart belongs to yesterday's cut-off cycle, not today's.
    const filled = seed([line()]);
    const rolled = reducer(
      filled,
      openCart({ shopId: 's1', deliveryDate: '2026-09-06' }),
    );

    expect(rolled.lines).toHaveLength(0);
  });

  it('leaves the cart alone when neither the shop nor the date changed', () => {
    const filled = seed([line({ quantity: 2 })]);
    const same = reducer(
      filled,
      openCart({ shopId: 's1', deliveryDate: '2026-09-05' }),
    );

    expect(same.lines).toHaveLength(1);
  });

  it('tops an existing line up by one pack when it is added again', () => {
    const state = seed([line({ packSize: 4, quantity: 4 })]);
    const again = reducer(
      state,
      addLine({
        line: {
          productId: 'p1',
          name: 'Classic Vanilla',
          unit: 'kg',
          unitPrice: 520,
          moq: 1,
          packSize: 4,
        },
      }),
    );

    expect(again.lines).toHaveLength(1);
    expect(again.lines[0].quantity).toBe(8);
  });

  it('re-snapshots the price when a line is added again', () => {
    // The catalogue is the fresher of the two sources.
    const state = seed([line({ unitPrice: 520 })]);
    const repriced = reducer(
      state,
      addLine({
        line: {
          productId: 'p1',
          name: 'Classic Vanilla',
          unit: 'kg',
          unitPrice: 545,
          moq: 1,
          packSize: 1,
        },
      }),
    );

    expect(repriced.lines[0].unitPrice).toBe(545);
  });

  it('removes a line when its quantity reaches zero', () => {
    const state = seed([line()]);
    const emptied = reducer(state, setQuantity({ productId: 'p1', quantity: 0 }));

    expect(emptied.lines).toHaveLength(0);
  });

  it('normalises a typed quantity against the pack size', () => {
    const state = seed([line({ packSize: 4, quantity: 4 })]);
    const typed = reducer(state, setQuantity({ productId: 'p1', quantity: 5 }));

    expect(typed.lines[0].quantity).toBe(8);
  });

  it('marks the cart dirty on every edit — FR-11', () => {
    const state = seed([line()]);
    expect(state.dirty).toBe(true);

    const synced = reducer(state, markSynced({ draftOrderId: 'o1' }));
    expect(synced.dirty).toBe(false);
    expect(synced.draftOrderId).toBe('o1');

    const edited = reducer(synced, setQuantity({ productId: 'p1', quantity: 3 }));
    expect(edited.dirty).toBe(true);
  });

  it('stores a per-item note and drops an empty one — FR-7', () => {
    const state = seed([line()]);

    const noted = reducer(
      state,
      setLineNote({ productId: 'p1', note: '  eggless  ' }),
    );
    expect(noted.lines[0].note).toBe('eggless');

    const cleared = reducer(noted, setLineNote({ productId: 'p1', note: '   ' }));
    expect(cleared.lines[0].note).toBeUndefined();
  });

  it('adopts a server draft without marking it dirty — FR-10', () => {
    // What is on screen is what the server already holds, so there is nothing
    // to push back.
    const state = reducer(
      reducer(undefined, openCart({ shopId: 's1', deliveryDate: '2026-09-05' })),
      replaceLines({ lines: [line({ quantity: 6 })], draftOrderId: 'o9' }),
    );

    expect(state.lines[0].quantity).toBe(6);
    expect(state.draftOrderId).toBe('o9');
    expect(state.dirty).toBe(false);
  });

  it('keeps the shop binding after submission so the cycle can start again', () => {
    const state = reducer(seed([line()]), clearCart());

    expect(state.lines).toHaveLength(0);
    expect(state.draftOrderId).toBeNull();
    // Clearing these would make the next `openCart` wipe a cart being rebuilt.
    expect(state.shopId).toBe('s1');
    expect(state.deliveryDate).toBe('2026-09-05');
  });

  it('ignores an edit to a product that is not in the cart', () => {
    const state = seed([line()]);

    expect(
      reducer(state, setQuantity({ productId: 'ghost', quantity: 9 })).lines,
    ).toHaveLength(1);
    expect(reducer(state, removeLine('ghost')).lines).toHaveLength(1);
  });
});
