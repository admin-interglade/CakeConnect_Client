import { calculateOfferPricing, offerMatchesCart } from '../src/utils/offers';
import type { CartLine, Offer } from '../src/types/shop';

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  productId: 'p1',
  name: 'Cake',
  unit: 'piece',
  unitPrice: 100,
  quantity: 2,
  moq: 1,
  packSize: 1,
  ...overrides,
});

const offer = (overrides: Partial<Offer> = {}): Offer => ({
  id: 'o1',
  title: 'Ten percent',
  discountType: 'percentage',
  discountValue: 10,
  startDate: '2026-09-01',
  endDate: '2026-09-30',
  status: 'active',
  targetAllShops: true,
  productIds: [],
  shopIds: [],
  regions: [],
  ...overrides,
});

describe('offer pricing', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-10T08:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('applies a percentage offer to the eligible cart subtotal', () => {
    expect(calculateOfferPricing(offer(), [line()])).toEqual({
      discount: 20,
      eligible: true,
    });
  });

  it('does not apply a product-scoped offer to another product', () => {
    const scoped = offer({ productIds: ['p2'] });
    expect(offerMatchesCart(scoped, [line()])).toBe(false);
    expect(calculateOfferPricing(scoped, [line()])).toEqual({
      discount: 0,
      eligible: false,
    });
  });

  it('caps a flat discount at the eligible subtotal', () => {
    const flat = offer({ discountType: 'flat', discountValue: 500 });
    expect(calculateOfferPricing(flat, [line()])).toEqual({
      discount: 200,
      eligible: true,
    });
  });

  it('does not apply an expired offer', () => {
    const expired = offer({ endDate: '2026-09-09' });
    expect(offerMatchesCart(expired, [line()])).toBe(false);
  });
});
