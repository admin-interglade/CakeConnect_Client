import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  BrandMark,
  InlineMessage,
  OtpInput,
  Screen,
} from '../../components';
import useCountdown from '../../hooks/useCountdown';
import { requestOtp, verifyOtp } from '../../services/auth';
import { describeApiError } from '../../services/api';
import { colors, fontWeight, spacing } from '../../constants';
import type { AuthStackParamList, PendingSession } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Verification'>;

const OTP_LENGTH = 6;

/**
 * A local guard only. The backend reports a wrong code as an HTTP error and
 * exposes no attempt counter, so this is a UI affordance that nudges the user
 * toward a fresh code — not a server-enforced limit. The real protection is the
 * rate limiter on `/auth/verify-otp`.
 */
const MAX_ATTEMPTS = 3;

export default function VerificationScreen({ navigation, route }: Props) {
  const { dialCode, nationalNumber, resendAfterSeconds } = route.params;
  const displayPhone = `${dialCode} ${nationalNumber.slice(0, 5)} ${nationalNumber.slice(5)}`;

  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [attemptsLeft, setAttemptsLeft] = React.useState(MAX_ATTEMPTS);
  const [verifying, setVerifying] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  const { formatted, isRunning, restart } = useCountdown(resendAfterSeconds);

  const isComplete = code.length === OTP_LENGTH;
  const isLockedOut = attemptsLeft <= 0;

  const handleVerify = React.useCallback(
    async (submitted: string) => {
      if (submitted.length !== OTP_LENGTH || isLockedOut) {
        return;
      }

      setVerifying(true);
      setError(undefined);

      try {
        const result = await verifyOtp(nationalNumber, submitted);

        const session: PendingSession = {
          userId: result.userId,
          token: result.accessToken,
          refreshToken: result.refreshToken,
          role: result.role,
          phone: displayPhone,
          fullName: result.fullName,
          email: result.email,
          shops: result.shops,
        };

        navigation.navigate(
          result.profileComplete ? 'Biometric' : 'Profile',
          { session },
        );
      } catch (caught) {
        // A rejected code arrives as an HTTP error rather than a success body,
        // so the attempt counter is decremented here rather than read back.
        const status = (caught as { response?: { status?: number } })?.response
          ?.status;
        const isRejectedCode = status === 400 || status === 401;

        if (isRejectedCode) {
          const remaining = Math.max(attemptsLeft - 1, 0);
          setAttemptsLeft(remaining);
          setError(
            remaining > 0
              ? `Invalid OTP. Please try again. (${remaining} attempt${
                  remaining === 1 ? '' : 's'
                } left)`
              : 'Too many incorrect attempts. Request a new code to continue.',
          );
          setCode('');
          return;
        }

        setError(describeApiError(caught));
      } finally {
        setVerifying(false);
      }
    },
    [attemptsLeft, displayPhone, isLockedOut, nationalNumber, navigation],
  );

  const handleResend = React.useCallback(async () => {
    if (isRunning || resending) {
      return;
    }

    setResending(true);
    setError(undefined);
    setCode('');

    try {
      const { resendAfterSeconds: nextDelay } = await requestOtp(nationalNumber);
      setAttemptsLeft(MAX_ATTEMPTS);
      restart(nextDelay);
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setResending(false);
    }
  }, [isRunning, nationalNumber, resending, restart]);

  return (
    <Screen
      scrollable
      footer={
        <AppButton
          label="Verify & Proceed"
          onPress={() => handleVerify(code)}
          disabled={!isComplete || isLockedOut}
          loading={verifying}
          testID="verification-submit"
        />
      }
    >
      <View style={styles.content}>
        <BrandMark caption="Verification" style={styles.brand} />

        <AppText variant="h2" style={styles.title}>
          Verify your number
        </AppText>

        <AppText variant="bodySecondary" style={styles.subtitle}>
          We sent a code to{' '}
          <AppText variant="bodySecondary" style={styles.phone}>
            {displayPhone}
          </AppText>
        </AppText>

        <OtpInput
          value={code}
          onChangeValue={next => {
            setCode(next);
            if (error) {
              setError(undefined);
            }
          }}
          length={OTP_LENGTH}
          hasError={Boolean(error)}
          editable={!verifying && !isLockedOut}
          autoFocus
          onFilled={handleVerify}
          style={styles.otp}
        />

        {error ? (
          <InlineMessage tone="error">{error}</InlineMessage>
        ) : (
          <InlineMessage tone="info" icon="message-text-outline">
            Detecting OTP automatically…
          </InlineMessage>
        )}

        <View style={styles.resend}>
          {isRunning ? (
            <>
              <AppText variant="bodySecondary" align="center">
                Resend OTP in{' '}
                <AppText variant="bodySecondary" style={styles.timer}>
                  {formatted}
                </AppText>
              </AppText>
              <AppText variant="link" align="center" color={colors.textMuted} style={styles.resendDisabled}>
                Resend OTP
              </AppText>
            </>
          ) : (
            <>
              <AppText variant="bodySecondary" align="center">
                Didn&apos;t receive code?
              </AppText>
              <AppButton
                label="Resend OTP"
                variant="link"
                onPress={handleResend}
                loading={resending}
                style={styles.resendButton}
                testID="verification-resend"
              />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  brand: { marginBottom: spacing.giant },
  title: { marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.xxl },
  phone: { color: colors.textPrimary, fontWeight: fontWeight.bold },
  timer: { color: colors.textPrimary, fontWeight: fontWeight.bold },
  otp: { marginBottom: spacing.lg },
  resend: { marginTop: spacing.xxl, alignItems: 'center' },
  resendDisabled: { marginTop: spacing.xs },
  resendButton: { marginTop: spacing.xxs },
});
