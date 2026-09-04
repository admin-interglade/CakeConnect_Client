/**
 * FR-4 — the outlets a sign-in resolves, and the credential it uses to ask.
 *
 * The bug these cover: `toSession` fetches the owner's shops *during* sign-in,
 * but `setCredentials` is not dispatched until the end of onboarding — so the
 * store holds no token yet. A request that relied on the ambient session went
 * out unauthenticated, came back 401, and the shop list arrived empty. The
 * owner then landed on "No outlet assigned" for a shop the admin had correctly
 * assigned, with no way back: signing in again failed identically.
 *
 * Worse, the 401 handler treated it as an expired session and dispatched a
 * logout in the middle of a login.
 */
import {
  apiGet,
  apiGetPaged,
  configureHttpClient,
  httpClient,
} from '../src/services/api';

type CapturedRequest = {
  url?: string;
  authorization?: string;
};

const captured: CapturedRequest[] = [];

/** Records what actually went on the wire, then answers as the server would. */
function stubAdapter(respond: (url: string) => { status: number; body?: unknown }) {
  return jest.fn(async (config: Record<string, unknown>) => {
    const headers = config.headers as
      | { get?: (name: string) => unknown; Authorization?: string }
      | undefined;

    const authorization =
      (typeof headers?.get === 'function'
        ? (headers.get('Authorization') as string | undefined)
        : undefined) ?? (headers?.Authorization as string | undefined);

    captured.push({ url: config.url as string, authorization });

    const { status, body } = respond(String(config.url));

    if (status >= 400) {
      const error = new Error(`Request failed with status code ${status}`) as Error & {
        response?: unknown;
        config?: unknown;
        isAxiosError?: boolean;
      };
      error.isAxiosError = true;
      error.config = config;
      error.response = { status, data: body, headers: {}, config };
      throw error;
    }

    return { status, data: body, headers: {}, config };
  });
}

const shopsPayload = {
  success: true,
  message: 'ok',
  data: [{ id: 'shop_204', shopCode: '#204', shopName: 'Sweet Delights', city: 'Koramangala' }],
  meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
};

let onUnauthorized: jest.Mock;

beforeEach(() => {
  captured.length = 0;
  onUnauthorized = jest.fn();

  // The store holds nothing yet — exactly the state the sign-in flow is in
  // between receiving tokens and dispatching them.
  configureHttpClient({
    getToken: () => null,
    getRefreshToken: () => null,
    onUnauthorized,
    onTokensRefreshed: jest.fn(),
  });
});

afterEach(() => {
  httpClient.defaults.adapter = undefined as never;
});

describe('an explicitly supplied access token', () => {
  it('is sent even when the store holds none', async () => {
    httpClient.defaults.adapter = stubAdapter(() => ({
      status: 200,
      body: shopsPayload,
    })) as never;

    const page = await apiGetPaged('/shops', { page: 1, limit: 50 }, {
      authToken: 'fresh-token-from-verify-otp',
    });

    expect(page.items).toHaveLength(1);
    expect(captured[0].url).toBe('/shops');
    expect(captured[0].authorization).toBe('Bearer fresh-token-from-verify-otp');
  });

  it('wins over a stale token still sitting in the store', async () => {
    // Signing in as a second user before the first session was cleared.
    configureHttpClient({
      getToken: () => 'stale-token-from-previous-session',
      getRefreshToken: () => 'stale-refresh',
      onUnauthorized,
      onTokensRefreshed: jest.fn(),
    });

    httpClient.defaults.adapter = stubAdapter(() => ({
      status: 200,
      body: shopsPayload,
    })) as never;

    await apiGetPaged('/shops', undefined, { authToken: 'fresh-token' });

    expect(captured[0].authorization).toBe('Bearer fresh-token');
  });

  it('does not log the user out when it is rejected', async () => {
    // A 401 here means that token was refused, not that a session expired —
    // and there is no session to end, because one is still being created.
    httpClient.defaults.adapter = stubAdapter(() => ({ status: 401 })) as never;

    await expect(
      apiGetPaged('/shops', undefined, { authToken: 'rejected-token' }),
    ).rejects.toBeDefined();

    expect(onUnauthorized).not.toHaveBeenCalled();
    // No refresh was attempted either, so exactly one request went out.
    expect(captured).toHaveLength(1);
  });

  it('is ignored when empty, so the stored session still applies', async () => {
    // `getCurrentUser` echoes an empty token back into `toSession`; sending
    // "Bearer " would suppress the perfectly good session token.
    configureHttpClient({
      getToken: () => 'stored-session-token',
      getRefreshToken: () => null,
      onUnauthorized,
      onTokensRefreshed: jest.fn(),
    });

    httpClient.defaults.adapter = stubAdapter(() => ({
      status: 200,
      body: { success: true, message: 'ok', data: {} },
    })) as never;

    await apiGet('/auth/me', undefined, { authToken: '' });

    expect(captured[0].authorization).toBe('Bearer stored-session-token');
  });
});

describe('the stored session token', () => {
  it('is still used when no explicit token is supplied', async () => {
    configureHttpClient({
      getToken: () => 'stored-session-token',
      getRefreshToken: () => null,
      onUnauthorized,
      onTokensRefreshed: jest.fn(),
    });

    httpClient.defaults.adapter = stubAdapter(() => ({
      status: 200,
      body: shopsPayload,
    })) as never;

    await apiGetPaged('/shops');

    expect(captured[0].authorization).toBe('Bearer stored-session-token');
  });
});

/* The auth module is exercised against the same stubbed transport, so this
   asserts the wiring end to end rather than just the helper it calls. */
describe('verifyOtp — FR-1, FR-4', () => {
  it('resolves the owner\'s shops using the token it was just issued', async () => {
    const { verifyOtp } = require('../src/services/auth/auth.api');

    httpClient.defaults.adapter = stubAdapter(url => {
      if (url.includes('/auth/verify-otp')) {
        return {
          status: 200,
          body: {
            success: true,
            message: 'ok',
            data: {
              user: {
                id: 'usr_ramesh',
                name: 'Ramesh',
                mobileNumber: '9876543210',
                email: null,
                role: 'SHOP_OWNER',
                status: 'ACTIVE',
                profileImage: null,
              },
              accessToken: 'issued-at-verify',
              refreshToken: 'refresh-at-verify',
            },
          },
        };
      }
      return { status: 200, body: shopsPayload };
    }) as never;

    const session = await verifyOtp('9876543210', '123456');

    // The assignment the admin made actually reaches the app.
    expect(session.shops).toHaveLength(1);
    expect(session.shops[0].id).toBe('shop_204');
    expect(session.shops[0].area).toBe('Koramangala');

    // And the shop lookup was authenticated with the token the login returned,
    // not with whatever the store happened to hold.
    const shopsRequest = captured.find(entry => entry.url === '/shops');
    expect(shopsRequest?.authorization).toBe('Bearer issued-at-verify');
  });

  it('does not ask for shops when an admin signs in', async () => {
    const { verifyOtp } = require('../src/services/auth/auth.api');

    httpClient.defaults.adapter = stubAdapter(() => ({
      status: 200,
      body: {
        success: true,
        message: 'ok',
        data: {
          user: {
            id: 'usr_admin',
            name: 'Super Admin',
            mobileNumber: '9000000000',
            email: null,
            role: 'ADMIN',
            status: 'ACTIVE',
            profileImage: null,
          },
          accessToken: 'admin-token',
          refreshToken: 'admin-refresh',
        },
      },
    })) as never;

    const session = await verifyOtp('9000000000', '123456');

    expect(session.shops).toEqual([]);
    expect(captured.some(entry => entry.url === '/shops')).toBe(false);
  });
});
