import {
  assignShopsToOwner,
  createShopOwner,
} from '../src/services/admin/owners.api';
import { apiGet, apiPost } from '../src/services/api';
import {
  toApiShopCreate,
  toShop,
  toShopOwner,
  type ApiUser,
} from '../src/services/mappers';
import type { AssignedShopSummary, ShopInput } from '../src/types/admin';

jest.mock('../src/services/api', () => ({
  apiGet: jest.fn(),
  apiGetPaged: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
  describeApiError: jest.fn(() => 'Shop not found'),
}));

/**
 * FR-2 — the three things about owner creation that are decided in this app
 * rather than by the backend, and that an admin cannot check by looking:
 *
 *   - the assignment fan-out, because `POST /shops/:id/assign-owner` takes one
 *     shop and the spec's single transactional endpoint does not exist (G26);
 *   - what a half-succeeded create reports, since the account exists even when
 *     every assignment failed;
 *   - which shops the picker may offer, which is `ownerId` and not `ownerName`.
 */

const getMock = apiGet as jest.MockedFunction<typeof apiGet>;
const postMock = apiPost as jest.MockedFunction<typeof apiPost>;

const shop = (id: string, name: string): AssignedShopSummary => ({
  id,
  name,
  code: id.toUpperCase(),
});

const apiUser = (overrides: Partial<ApiUser> = {}): ApiUser => ({
  id: 'u1',
  name: 'Asha Menon',
  mobileNumber: '9876543210',
  email: 'asha@example.com',
  role: 'SHOP_OWNER',
  status: 'ACTIVE',
  createdAt: '2026-09-09T06:30:00.000Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createShopOwner', () => {
  it('creates the account as a SHOP_OWNER without a password, then links each shop', async () => {
    getMock.mockResolvedValue(apiUser());
    postMock.mockResolvedValue(apiUser());

    await createShopOwner({
      name: 'Asha Menon',
      phone: '9876543210',
      email: 'asha@example.com',
      shops: [shop('s1', 'Indiranagar'), shop('s2', 'Koramangala')],
    });

    expect(postMock).toHaveBeenNthCalledWith(1, '/users', {
      name: 'Asha Menon',
      mobileNumber: '9876543210',
      email: 'asha@example.com',
      role: 'SHOP_OWNER',
    });
    // An admin-chosen password would have to be read out to the owner.
    expect(postMock.mock.calls[0][1]).not.toHaveProperty('password');

    expect(postMock).toHaveBeenNthCalledWith(2, '/shops/s1/assign-owner', {
      userId: 'u1',
    });
    expect(postMock).toHaveBeenNthCalledWith(3, '/shops/s2/assign-owner', {
      userId: 'u1',
    });
  });

  it('returns the owner with the shops that failed, rather than throwing the whole create away', async () => {
    getMock.mockResolvedValue(apiUser());
    postMock
      .mockResolvedValueOnce(apiUser())
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('404'));

    const outcome = await createShopOwner({
      name: 'Asha Menon',
      phone: '9876543210',
      shops: [shop('s1', 'Indiranagar'), shop('s2', 'Koramangala')],
    });

    // The account exists. Reporting a flat failure would have the admin create
    // a duplicate on the same mobile number, which the server 409s.
    expect(outcome.owner.id).toBe('u1');
    expect(outcome.assigned.map(s => s.name)).toEqual(['Indiranagar']);
    expect(outcome.failed.map(entry => entry.shop.name)).toEqual(['Koramangala']);
  });

  it('still reports the owner when the confirming re-read fails', async () => {
    postMock.mockResolvedValue(apiUser());
    getMock.mockRejectedValue(new Error('network'));

    const outcome = await createShopOwner({
      name: 'Asha Menon',
      phone: '9876543210',
      shops: [],
    });

    expect(outcome.owner.name).toBe('Asha Menon');
  });

  it('propagates a failed create — there is no account to report on', async () => {
    postMock.mockRejectedValue(new Error('409'));

    await expect(
      createShopOwner({ name: 'Asha', phone: '9876543210', shops: [] }),
    ).rejects.toThrow();
  });
});

describe('assignShopsToOwner', () => {
  it('names every shop it could not assign', async () => {
    postMock
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('404'));

    const outcome = await assignShopsToOwner('u1', [
      shop('s1', 'Indiranagar'),
      shop('s2', 'Koramangala'),
      shop('s3', 'Jayanagar'),
    ]);

    expect(outcome.assigned.map(s => s.name)).toEqual(['Koramangala']);
    expect(outcome.failed.map(entry => entry.shop.name)).toEqual([
      'Indiranagar',
      'Jayanagar',
    ]);
    expect(outcome.failed[0].message).toBe('Shop not found');
  });
});

describe('owner mapping', () => {
  it('round-trips a user, reading the assigned shops from the detail payload', () => {
    const owner = toShopOwner(
      apiUser({
        shopUsers: [
          {
            shopId: 's1',
            isPrimary: true,
            shop: { id: 's1', shopName: 'Indiranagar', shopCode: 'IND' },
          },
        ],
      }),
    );

    expect(owner).toMatchObject({
      id: 'u1',
      name: 'Asha Menon',
      phone: '9876543210',
      email: 'asha@example.com',
      status: 'active',
      createdAt: '2026-09-09',
    });
    expect(owner.shops).toEqual([{ id: 's1', name: 'Indiranagar', code: 'IND' }]);
  });

  it('maps INVITED, which the backend does not write yet, rather than throwing', () => {
    expect(toShopOwner(apiUser({ status: 'INVITED' })).status).toBe('invited');
  });

  it('yields no shops for a list row, which carries no association', () => {
    expect(toShopOwner(apiUser()).shops).toEqual([]);
  });
});

describe('shop availability', () => {
  const apiShop = (overrides: Record<string, unknown> = {}) => ({
    id: 's1',
    shopCode: 'IND',
    shopName: 'Indiranagar',
    status: 'ACTIVE',
    ...overrides,
  });

  it('treats a shop with an owner account as unavailable', () => {
    expect(toShop(apiShop({ ownerId: 'u1' })).ownerId).toBe('u1');
  });

  /*
   * The case the picker exists for: `POST /shops` records `ownerName` without
   * creating an account, so a named-but-unlinked shop is exactly the one an
   * admin is trying to place, and must not be filtered out.
   */
  it('treats a shop that only names an owner as available', () => {
    const mapped = toShop(apiShop({ owner: { name: 'Asha Menon' } }));

    expect(mapped.ownerName).toBe('Asha Menon');
    expect(mapped.ownerId).toBeUndefined();
  });
});

/**
 * The shop form picks an owner; it never types one. `POST /shops` resolves the
 * owner from `ownerMobileNumber` alone — an unmatched number silently creates a
 * second account for the same person — so what leaves for the wire matters more
 * than what the form looks like.
 */
describe('creating a shop with an owner', () => {
  const input = (overrides: Partial<ShopInput> = {}): ShopInput => ({
    name: 'Indiranagar',
    code: 'IND',
    mobileNumber: '9000000001',
    address: '100ft Road',
    creditLimit: 50000,
    priceListId: 'p1',
    ...overrides,
  });

  it("sends the chosen owner's recorded name and number", () => {
    const payload = toApiShopCreate(
      input({ ownerName: 'Asha Menon', ownerPhone: '9876543210' }),
    );

    expect(payload).toMatchObject({
      ownerName: 'Asha Menon',
      ownerMobileNumber: '9876543210',
    });
  });

  /*
   * The field is validated as ten digits *when present*, so a blank is a 400,
   * and the service reads an absent number as "no owner" — which is the state
   * that puts this shop in the owner profile's list of shops to assign.
   */
  it('omits both owner fields entirely when no owner was picked', () => {
    const payload = toApiShopCreate(input());

    expect(payload).not.toHaveProperty('ownerName');
    expect(payload).not.toHaveProperty('ownerMobileNumber');
  });

  it('still sends the rest of the shop', () => {
    expect(toApiShopCreate(input())).toMatchObject({
      shopCode: 'IND',
      shopName: 'Indiranagar',
      mobileNumber: '9000000001',
    });
  });
});
