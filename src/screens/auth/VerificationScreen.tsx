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
import { requestOtp, verifyOtp } from '../../services/authApi';
import { colors, fontWeight, spacing } from '../../constants';
import type { AuthStackParamList, PendingSession } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Verification'>;

const OTP_LENGTH = 6;
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
        const result = await verifyOtp(`${dialCode}${nationalNumber}`, submitted, attemptsLeft);

        if (result.status === 'invalid') {
          setAttemptsLeft(result.attemptsLeft);
          setError(
            result.attemptsLeft > 0
              ? `Invalid OTP. Please try again. (${result.attemptsLeft} attempt${
                  result.attemptsLeft === 1 ? '' : 's'
                } left)`
              : 'Too many incorrect attempts. Request a new code to continue.',
          );
          setCode('');
          return;
        }

        const session: PendingSession = {
          userId: result.userId,
          token: result.token,
          role: result.role,
          phone: displayPhone,
          assignedShop: result.assignedShop,
        };

        navigation.navigate(
          result.profileComplete ? 'Biometric' : 'Profile',
          { session },
        );
      } catch {
        setError('Could not verify the code. Check your connection and try again.');
      } finally {
        setVerifying(false);
      }
    },
    [attemptsLeft, dialCode, displayPhone, isLockedOut, nationalNumber, navigation],
  );

  const handleResend = React.useCallback(async () => {
    if (isRunning || resending) {
      return;
    }

    setResending(true);
    setError(undefined);
    setCode('');

    try {
      const { resendAfterSeconds: nextDelay } = await requestOtp(`${dialCode}${nationalNumber}`);
      setAttemptsLeft(MAX_ATTEMPTS);
      restart(nextDelay);
    } catch {
      setError('Could not resend the code. Try again in a moment.');
    } finally {
      setResending(false);
    }
  }, [dialCode, isRunning, nationalNumber, resending, restart]);

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
