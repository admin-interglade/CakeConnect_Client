import type { AssignedShop, UserRole } from '../store/authSlice';
import { apiGet, apiPatch, apiPost, apiGetPaged } from './httpClient';
import { userRoleCodec } from './mappers';
import { getInstallationId } from './device';

/**
 * Auth endpoints (FR-1, FR-2) against `/api/v1/auth` and `/api/v1/users`.
 *
 * Every function here speaks the app's own vocabulary — `phone`, `role`,
 * `shops` — and translates to the backend's field names and UPPER_SNAKE enums
 * at this boundary, so no screen has to know either.
 */

/* -------------------------------------------------------------------------- */
/* Wire shapes (docs/api-endpoints.md → Authentication, Users, Shops)          */
/* -------------------------------------------------------------------------- */

type ApiUser = {
  id: string;
  name: string | null;
  mobileNumber: string;
  email: string | null;
  role: string;
  status: string;
  profileImage: string | null;
};

type ApiSession = {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  /** ISO timestamp; available for proactive refresh, unused for now. */
  expiresAt?: string;
};

/** Only the fields the auth flow needs; the full shape is mapped in Prompt 2. */
type ApiShopSummary = {
  id: string;
  shopCode: string;
  shopName: string;
  city?: string | null;
  address?: string | null;
};

/* -------------------------------------------------------------------------- */
/* Public shapes                                                               */
/* -------------------------------------------------------------------------- */

export type OtpRequestResult = {
  /** Seconds the client must wait before offering "Resend OTP". */
  resendAfterSeconds: number;
  /** Masked destination to echo back to the user. */
  maskedPhone: string;
};

/** The session a successful sign-in yields, whichever flow produced it. */
export type AuthenticatedSession = {
  status: 'ok';
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: UserRole;
  /**
   * The backend has no `profileComplete` flag. A user with no name has never
   * been through the FR-2 "complete your profile on first login" step, so an
   * absent name is the proxy this app uses for it. If the backend later grows a
   * real flag, this is the one place to change.
   */
  profileComplete: boolean;
  fullName?: string;
  email?: string;
  /** Display form, e.g. "+91 98765 43210". */
  phone: string;
  /** FR-4 — an owner may hold several outlets under one login. */
  shops: AssignedShop[];
};

export type PasswordLoginResult =
  | AuthenticatedSession
  | { status: 'invalid_credentials' };

export type ProfilePayload = {
  fullName: string;
  email?: string;
  photoUri?: string;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The backend validates `mobileNumber` as exactly ten digits. The UI carries a
 * "+91" dial code for display, so anything that arrives here is normalised to
 * the bare national number before it goes on the wire.
 */
export function toNationalNumber(input: string): string {
  return input.replace(/\D/g, '').slice(-10);
}

/** "+91 98765 43210" from a bare 10-digit national number. */
function displayPhone(national: string): string {
  return national.length === 10
    ? `+91 ${national.slice(0, 5)} ${national.slice(5)}`
    : national;
}

const maskPhone = (phone: string) =>
  phone.length > 4 ? `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}` : phone;

/**
 * The OTP screens resend on a fixed timer because the backend does not tell us
 * how long its rate limiter will hold. A 429 is surfaced through
 * `describeApiError`, which reads `Retry-After` when the server sends one.
 */
const DEFAULT_RESEND_SECONDS = 30;

function toAssignedShop(shop: ApiShopSummary): AssignedShop {
  return {
    id: shop.id,
    name: shop.shopName,
    code: shop.shopCode,
    // The domain type calls this `area`; the backend has no single field for it,
    // so the city stands in and the street address is the fallback.
    area: shop.city ?? shop.address ?? '',
  };
}

/**
 * FR-4 — the outlets this login can act on. `GET /shops` is already scoped by
 * the server ("owner sees own shops"), so the same call serves both roles; an
 * admin simply sees the whole network and is not tied to any one of them.
 *
 * A failure here must not fail the sign-in: the session is valid regardless,
 * and the shop list can be refetched once the user is inside the app.
 */
async function fetchOwnShops(): Promise<AssignedShop[]> {
  try {
    const page = await apiGetPaged<ApiShopSummary>('/shops', { page: 1, limit: 50 });
    return page.items.map(toAssignedShop);
  } catch {
    return [];
  }
}

async function toSession(payload: ApiSession): Promise<AuthenticatedSession> {
  const role = userRoleCodec.fromApi(payload.user.role);
  const fullName = payload.user.name?.trim() || undefined;

  return {
    status: 'ok',
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    userId: payload.user.id,
    role,
    profileComplete: Boolean(fullName),
    fullName,
    email: payload.user.email ?? undefined,
    phone: displayPhone(payload.user.mobileNumber),
    // Admin and support staff work across the network rather than from a shop.
    shops: role === 'shopOwner' ? await fetchOwnShops() : [],
  };
}

/* -------------------------------------------------------------------------- */
/* Endpoints                                                                   */
/* -------------------------------------------------------------------------- */

/** FR-1 — `POST /auth/send-otp`. Rate limited; do not retry on 429. */
export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  const mobileNumber = toNationalNumber(phone);

  await apiPost<null>('/auth/send-otp', { mobileNumber });

  return {
    resendAfterSeconds: DEFAULT_RESEND_SECONDS,
    maskedPhone: maskPhone(mobileNumber),
  };
}

/**
 * FR-1 — `POST /auth/verify-otp`.
 *
 * A wrong code comes back as an HTTP error, not as a success body, so the
 * caller distinguishes the two by catching rather than by inspecting a status
 * field. There is no server-side attempt counter to report.
 */
export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<AuthenticatedSession> {
  const payload = await apiPost<ApiSession>('/auth/verify-otp', {
    mobileNumber: toNationalNumber(phone),
    otp,
    deviceId: await getInstallationId(),
  });

  return toSession(payload);
}

/**
 * `POST /auth/login` — mobile number + password.
 *
 * The backend resolves accounts by mobile number only; there is no email
 * sign-in, so `LoginScreen` validates for ten digits before calling this.
 */
export async function loginWithPassword(
  mobileNumber: string,
  password: string,
): Promise<PasswordLoginResult> {
  try {
    const payload = await apiPost<ApiSession>('/auth/login', {
      mobileNumber: toNationalNumber(mobileNumber),
      password,
      deviceId: await getInstallationId(),
    });
    return await toSession(payload);
  } catch (error) {
    // 401/403 is a rejected credential pair. Anything else — a network drop, a
    // 500, a rate limit — is a real failure the screen should report as such.
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      return { status: 'invalid_credentials' };
    }
    throw error;
  }
}

/** `GET /auth/me` — the current profile, for rehydrating a persisted session. */
export async function getCurrentUser(): Promise<AuthenticatedSession> {
  const user = await apiGet<ApiUser>('/auth/me');

  // `/auth/me` returns the profile without tokens; the caller already holds
  // those, so they are echoed back empty rather than invented here.
  return toSession({ user, accessToken: '', refreshToken: '' });
}

/**
 * FR-2 — `PATCH /users/profile`.
 *
 * `photoUri` is a local file URI until an upload endpoint exists; the backend
 * wants a URL for `profileImage`, so a local path is deliberately not sent.
 * See docs/api-gaps.md.
 */
export async function submitProfile(payload: ProfilePayload): Promise<{ ok: boolean }> {
  await apiPatch<ApiUser>('/users/profile', {
    name: payload.fullName,
    ...(payload.email ? { email: payload.email } : {}),
  });

  return { ok: true };
}

/**
 * `POST /auth/logout` — revokes the refresh token server-side.
 *
 * Resolves either way: if the call fails the local session must still be
 * cleared, or a network blip would leave the user unable to sign out.
 */
export async function logoutSession(refreshToken: string | null): Promise<void> {
  if (!refreshToken) {
    return;
  }

  try {
    await apiPost<null>('/auth/logout', { refreshToken });
  } catch {
    // Deliberately swallowed — see above.
  }
}
