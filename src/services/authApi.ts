import type { UserRole } from '../store/authSlice';

/**
 * Auth endpoints for the login flows.
 *
 * NOTE: these are stubs with simulated latency so the auth screens are runnable
 * end to end. Swap each body for the matching axios call against
 * https://api.cakeconnect.com when the backend is ready — the screens depend
 * only on the shapes declared here.
 *
 * `demoAccounts` exists so both shells can be reached before the backend lands.
 * Once the API is live, `loginWithPassword` must post the credentials and let
 * the server verify them: a password list bundled in the app is readable by
 * anyone who unpacks the build. Delete `demoAccounts` with that change.
 */

/** Dev-only sign-ins. Either the phone or the email works as the identifier. */
export const demoAccounts = [
  {
    userId: 'usr_admin_1',
    role: 'admin' as UserRole,
    name: 'Franchise Owner',
    phone: '9000000000',
    email: 'admin@cakeconnect.com',
    password: 'Admin@123',
    profileComplete: true,
  },
  {
    userId: 'usr_shop_1',
    role: 'shopOwner' as UserRole,
    name: 'Aarav Sharma',
    phone: '9876543210',
    email: 'shop@cakeconnect.com',
    password: 'Shop@123',
    profileComplete: true,
    assignedShop: {
      id: 'shop_204',
      name: 'CakeConnect - Sector 15, Gurgaon',
      code: '#204',
      area: 'Sector 15, Gurgaon',
    },
  },
] as const;

export type OtpRequestResult = {
  /** Seconds the client must wait before offering "Resend OTP". */
  resendAfterSeconds: number;
  /** Masked destination to echo back to the user. */
  maskedPhone: string;
};

/** The session a successful sign-in yields, whichever flow produced it. */
export type AuthenticatedSession = {
  status: 'ok';
  token: string;
  userId: string;
  role: UserRole;
  /** False when the account still needs the profile-setup step. */
  profileComplete: boolean;
  fullName?: string;
  email?: string;
  /** Display form, e.g. "+91 98765 43210". */
  phone: string;
  assignedShop?: { id: string; name: string; code: string; area: string };
};

export type OtpVerifyResult =
  | AuthenticatedSession
  | { status: 'invalid'; attemptsLeft: number };

export type PasswordLoginResult =
  | AuthenticatedSession
  | { status: 'invalid_credentials' };

export type ProfilePayload = {
  fullName: string;
  email?: string;
  photoUri?: string;
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const maskPhone = (phone: string) =>
  phone.length > 4 ? `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}` : phone;

/** "+91 98765 43210" from a bare 10-digit national number. */
const displayPhone = (national: string) =>
  `+91 ${national.slice(0, 5)} ${national.slice(5)}`;

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  await delay(600);
  return { resendAfterSeconds: 30, maskedPhone: maskPhone(phone) };
}

/**
 * Identifier + password sign-in. The identifier is whatever the user typed —
 * a 10-digit mobile number or an email address — and the backend resolves it,
 * so the screen never has to decide which kind of account it is dealing with.
 */
export async function loginWithPassword(
  identifier: string,
  password: string,
): Promise<PasswordLoginResult> {
  // TODO: httpClient.post('/auth/login', { identifier, password })
  await delay(700);

  const normalised = identifier.trim().toLowerCase();
  const digits = normalised.replace(/\D/g, '');

  const account = demoAccounts.find(
    candidate =>
      candidate.email === normalised ||
      candidate.phone === digits ||
      // Tolerate a pasted number that still carries its +91 country code.
      candidate.phone === digits.slice(-10),
  );

  if (!account || account.password !== password) {
    return { status: 'invalid_credentials' };
  }

  return {
    status: 'ok',
    token: `demo-jwt-${account.role}`,
    userId: account.userId,
    role: account.role,
    profileComplete: account.profileComplete,
    fullName: account.name,
    email: account.email,
    phone: displayPhone(account.phone),
    assignedShop: 'assignedShop' in account ? account.assignedShop : undefined,
  };
}

export async function verifyOtp(
  phone: string,
  code: string,
  attemptsLeft: number,
): Promise<OtpVerifyResult> {
  await delay(700);

  // Stub rule: any code other than 000000 is accepted.
  if (code === '000000') {
    return { status: 'invalid', attemptsLeft: Math.max(attemptsLeft - 1, 0) };
  }

  // The OTP path resolves the same demo accounts, so signing in with the admin
  // number reaches the admin shell here too (FR-1 stays the PRD's login).
  const digits = phone.replace(/\D/g, '').slice(-10);
  const account =
    demoAccounts.find(candidate => candidate.phone === digits) ?? demoAccounts[1];

  return {
    status: 'ok',
    token: `demo-jwt-${account.role}`,
    userId: account.userId,
    role: account.role,
    // The OTP flow keeps its profile-setup step, which is where a newly
    // invited owner completes their details (FR-2).
    profileComplete: false,
    fullName: account.name,
    email: account.email,
    phone: displayPhone(account.phone),
    assignedShop: 'assignedShop' in account ? account.assignedShop : undefined,
  };
}

export async function submitProfile(_payload: ProfilePayload): Promise<{ ok: boolean }> {
  await delay(600);
  return { ok: true };
}
