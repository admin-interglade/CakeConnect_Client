import {
  assignShopsToOwner,
  createShopOwner,
  updateShopOwner,
} from '../src/services/admin/owners.api';
import { apiGet, apiPatch, apiPost } from '../src/services/api';
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
const patchMock = apiPatch as jest.MockedFunction<typeof apiPatch>;

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
  it('creates the account and links the shops in one call, without a password', async () => {
    postMock.mockResolvedValue({ user: apiUser(), shops: [], inviteSent: true });

    await createShopOwner({
      name: 'Asha Menon',
      phone: '9876543210',
      email: 'asha@example.com',
      shops: [shop('s1', 'Indiranagar'), shop('s2', 'Koramangala')],
    });

    expect(postMock).toHaveBeenCalledTimes(1);
    expect(postMock).toHaveBeenCalledWith(
      '/users/owners',
      {
        name: 'Asha Menon',
        mobileNumber: '9876543210',
        email: 'asha@example.com',
        shopIds: ['s1', 's2'],
      },
      expect.objectContaining({ timeoutMs: expect.any(Number) }),
    );
    // An admin-chosen password would have to be read out to the owner.
    expect(postMock.mock.calls[0][1]).not.toHaveProperty('password');
  });

  it('returns the owner holding the selected shops without a second round trip', async () => {
    postMock.mockResolvedValue({
      user: apiUser(),
      shops: [],
      inviteSent: false,
      inviteError: 'SMTP down',
    });

    const outcome = await createShopOwner({
      name: 'Asha Menon',
      phone: '9876543210',
      shops: [shop('s1', 'Indiranagar')],
    });

    expect(getMock).not.toHaveBeenCalled();
    expect(outcome.owner).toMatchObject({ id: 'u1', name: 'Asha Menon' });
    expect(outcome.owner.shops.map(s => s.name)).toEqual(['Indiranagar']);
    expect(outcome.failed).toEqual([]);
    expect(outcome.inviteError).toBe('SMTP down');
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

  // Each call waits on the server's email; one at a time, that wait adds up.
  it('sends every assignment without waiting for the one before', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    postMock.mockImplementation((() => gate.then(() => ({}))) as never);

    const pending = assignShopsToOwner('u1', [
      shop('s1', 'Indiranagar'),
      shop('s2', 'Koramangala'),
    ]);

    expect(postMock).toHaveBeenCalledTimes(2);
    release();
    await expect(pending).resolves.toMatchObject({ failed: [] });
  });
});

describe('updateShopOwner', () => {
  it('patches the account with the server field names', async () => {
    patchMock.mockResolvedValue(apiUser({ name: 'Asha M', mobileNumber: '9123456780' }));

    const owner = await updateShopOwner('u1', {
      name: 'Asha M',
      phone: '9123456780',
      email: 'asha@example.com',
    });

    expect(patchMock).toHaveBeenCalledWith('/users/u1', {
      name: 'Asha M',
      mobileNumber: '9123456780',
      email: 'asha@example.com',
    });
    expect(owner).toMatchObject({ id: 'u1', name: 'Asha M', phone: '9123456780' });
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

  it('yields no shops when the payload carries no association', () => {
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
