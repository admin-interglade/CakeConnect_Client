import {
  createOffer,
  isOverdueForExpiry,
  isOverdueForPublication,
  isValidBannerUrl,
  reachesNoShop,
  withdrawOffer,
} from '../src/services/admin/offers.api';
import { apiPost } from '../src/services/api';
import type { OfferInput } from '../src/types/admin';
import type { Offer } from '../src/types/shop';

jest.mock('../src/services/api', () => ({
  apiGet: jest.fn(),
  apiGetPaged: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
}));

/**
 * FR-32 to FR-35 — the three parts of offer authoring that are decided in code
 * rather than by the backend, and that an admin cannot check by looking:
 *
 *   - the window this app sends, which has to survive the mapper reading it
 *     back by slicing an ISO string;
 *   - the status it sends with it, because the endpoint's own inference
 *     disagrees with the admin for the first five and a half hours of an IST
 *     day and nothing would ever publish the offer afterwards (G22);
 *   - the two stranded states nothing on the backend will ever notice.
 */

const postMock = apiPost as jest.MockedFunction<typeof apiPost>;

const baseInput: OfferInput = {
  title: 'Festive 10%',
  discountType: 'percentage',
  discountValue: 10,
  startDate: '2026-09-07',
  endDate: '2026-09-14',
  targetAllShops: true,
  shopIds: [],
  productIds: [],
};

const offer = (overrides: Partial<Offer>): Offer => ({
  id: 'o1',
  title: 'Festive 10%',
  discountType: 'percentage',
  discountValue: 10,
  startDate: '2026-09-07',
  endDate: '2026-09-14',
  status: 'active',
  targetAllShops: true,
  productIds: [],
  shopIds: [],
  regions: [],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  postMock.mockResolvedValue({ id: 'o1', status: 'ACTIVE' } as never);
  jest.useFakeTimers().setSystemTime(new Date('2026-09-07T04:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('createOffer — the window and the status it sends', () => {
  it('frames the window in UTC so the mapper reads back the dates that were typed', async () => {
    await createOffer(baseInput);

    const [, body] = postMock.mock.calls[0] as [string, Record<string, unknown>];

    // An IST midnight would be stored as 18:30 the previous day, and `dateOnly`
    // slices the first ten characters — so the offer would read back a day out.
    expect(body.startDate).toBe('2026-09-07T00:00:00.000Z');
    // Last millisecond of the day, so a one-day offer lasts a day.
    expect(body.endDate).toBe('2026-09-14T23:59:59.999Z');
  });

  it('sends ACTIVE for an offer starting today, even before 05:30 IST', async () => {
    // 04:00 UTC is 09:30 IST on the 7th; the fixed clock above also covers the
    // window where the server's own inference would say SCHEDULED.
    jest.setSystemTime(new Date('2026-09-06T22:00:00.000Z')); // 03:30 IST, 7th

    await createOffer(baseInput);

    const [, body] = postMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(body.status).toBe('ACTIVE');
  });

  it('sends SCHEDULED only when the start date is genuinely in the future', async () => {
    await createOffer({ ...baseInput, startDate: '2026-09-20' });

    const [, body] = postMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(body.status).toBe('SCHEDULED');
  });

  it('never sends regions, which reach no shop', async () => {
    await createOffer({ ...baseInput, targetAllShops: false, shopIds: ['s1'] });

    const [, body] = postMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(body).not.toHaveProperty('regions');
    expect(body.shopIds).toEqual(['s1']);
  });

  it('sends the buy-X-get-Y quantities only for that discount shape', async () => {
    await createOffer({
      ...baseInput,
      discountType: 'buyXGetY',
      discountValue: 0,
      buyQuantity: 2,
      getQuantity: 1,
    });

    const [, buyBody] = postMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(buyBody.discountType).toBe('BUY_X_GET_Y');
    expect(buyBody.buyQuantity).toBe(2);
    expect(buyBody.getQuantity).toBe(1);

    postMock.mockClear();
    await createOffer(baseInput);

    const [, flatBody] = postMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(flatBody).not.toHaveProperty('buyQuantity');
  });
});

describe('withdrawOffer', () => {
  it('sends the reason, which the backend accepts and stores nowhere', async () => {
    await withdrawOffer('o1', '  supplier pulled out  ');

    expect(postMock).toHaveBeenCalledWith('/offers/o1/withdraw', {
      reason: 'supplier pulled out',
    });
  });

  it('omits an empty reason rather than sending a blank one', async () => {
    await withdrawOffer('o1', '   ');

    expect(postMock).toHaveBeenCalledWith('/offers/o1/withdraw', {});
  });
});

describe('the states nothing on the backend will ever notice', () => {
  it('flags an offer that is live past its end date', () => {
    // The expensive one: the shop app lists status=ACTIVE, so this is still on
    // every targeted shop's home screen on terms that have ended.
    expect(
      isOverdueForExpiry(offer({ status: 'active', endDate: '2026-09-01' }), '2026-09-07'),
    ).toBe(true);
  });

  it('does not flag a live offer still inside its window', () => {
    expect(
      isOverdueForExpiry(offer({ status: 'active', endDate: '2026-09-14' }), '2026-09-07'),
    ).toBe(false);
  });

  it('does not flag an expired offer, which is where it belongs', () => {
    expect(
      isOverdueForExpiry(
        offer({ status: 'expired', endDate: '2026-09-01' }),
        '2026-09-07',
      ),
    ).toBe(false);
  });

  it('flags a scheduled offer whose start date has arrived', () => {
    expect(
      isOverdueForPublication(
        offer({ status: 'scheduled', startDate: '2026-09-07' }),
        '2026-09-07',
      ),
    ).toBe(true);
  });

  it('leaves a scheduled offer alone until its start date', () => {
    expect(
      isOverdueForPublication(
        offer({ status: 'scheduled', startDate: '2026-09-20' }),
        '2026-09-07',
      ),
    ).toBe(false);
  });

  it('flags an offer that names no shops and is not network-wide', () => {
    expect(reachesNoShop(offer({ targetAllShops: false, shopIds: [] }))).toBe(true);
    expect(reachesNoShop(offer({ targetAllShops: false, shopIds: ['s1'] }))).toBe(
      false,
    );
    expect(reachesNoShop(offer({ targetAllShops: true, shopIds: [] }))).toBe(false);
  });
});

describe('isValidBannerUrl', () => {
  it('accepts a full http or https address and an empty field', () => {
    expect(isValidBannerUrl('https://cdn.example.com/a.png')).toBe(true);
    expect(isValidBannerUrl('http://cdn.example.com/a.png')).toBe(true);
    expect(isValidBannerUrl('')).toBe(true);
  });

  it('rejects what the endpoint would reject with a 400', () => {
    expect(isValidBannerUrl('/uploads/banner.png')).toBe(false);
    expect(isValidBannerUrl('cdn.example.com/a.png')).toBe(false);
  });
});
