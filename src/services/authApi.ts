import type { UserRole } from '../store/authSlice';

/**
 * Auth endpoints for the OTP login flow.
 *
 * NOTE: these are stubs with simulated latency so the seven auth screens are
 * runnable end to end. Swap each body for the matching axios call against
 * https://api.cakeconnect.com when the backend is ready — the screens depend
 * only on the shapes declared here.
 */

export type OtpRequestResult = {
  /** Seconds the client must wait before offering "Resend OTP". */
  resendAfterSeconds: number;
  /** Masked destination to echo back to the user. */
  maskedPhone: string;
};

export type OtpVerifyResult =
  | {
      status: 'ok';
      token: string;
      userId: string;
      role: UserRole;
      /** False when the account still needs the profile-setup step. */
      profileComplete: boolean;
      assignedShop?: { id: string; name: string; code: string; area: string };
    }
  | { status: 'invalid'; attemptsLeft: number };

export type ProfilePayload = {
  fullName: string;
  email?: string;
  photoUri?: string;
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const maskPhone = (phone: string) =>
  phone.length > 4 ? `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}` : phone;

export async function requestOtp(phone: string): Promise<OtpRequestResult> {
  await delay(600);
  return { resendAfterSeconds: 30, maskedPhone: maskPhone(phone) };
}

export async function verifyOtp(
  _phone: string,
  code: string,
  attemptsLeft: number,
): Promise<OtpVerifyResult> {
  await delay(700);

  // Stub rule: any code other than 000000 is accepted.
  if (code === '000000') {
    return { status: 'invalid', attemptsLeft: Math.max(attemptsLeft - 1, 0) };
  }

  return {
    status: 'ok',
    token: 'demo-jwt-token',
    userId: 'usr_demo_1',
    role: 'shopOwner',
    profileComplete: false,
    assignedShop: {
      id: 'shop_204',
      name: 'CakeConnect - Sector 15, Gurgaon',
      code: '#204',
      area: 'Sector 15, Gurgaon',
    },
  };
}

export async function submitProfile(_payload: ProfilePayload): Promise<{ ok: boolean }> {
  await delay(600);
  return { ok: true };
}
