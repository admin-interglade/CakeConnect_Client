import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  BrandMark,
  PhoneNumberInput,
  Screen,
} from '../../components';
import { requestOtp } from '../../services/authApi';
import { colors, spacing } from '../../constants';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

const DIAL_CODE = '+91';
const NUMBER_LENGTH = 10;
const OTP_LENGTH = 6;

export default function LoginScreen({ navigation }: Props) {
  const [nationalNumber, setNationalNumber] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  const isValid = nationalNumber.length === NUMBER_LENGTH;

  const handleContinue = React.useCallback(async () => {
    if (!isValid) {
      setError(`Enter a valid ${NUMBER_LENGTH}-digit mobile number.`);
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      const { resendAfterSeconds } = await requestOtp(`${DIAL_CODE}${nationalNumber}`);
      navigation.navigate('Verification', {
        dialCode: DIAL_CODE,
        nationalNumber,
        resendAfterSeconds,
      });
    } catch {
      setError('Could not send the code. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [isValid, nationalNumber, navigation]);

  return (
    <Screen
      scrollable
      footer={
        <View>
          <AppButton
            label="Continue"
            onPress={handleContinue}
            disabled={!isValid}
            loading={submitting}
            testID="login-continue"
          />
          <AppText variant="caption" align="center" style={styles.legal}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </AppText>
        </View>
      }
    >
      <View style={styles.content}>
        <BrandMark caption="Secure Portal" style={styles.brand} />

        <AppText variant="h2" style={styles.title}>
          Enter your mobile number
        </AppText>

        <AppText variant="bodySecondary" style={styles.subtitle}>
          We&apos;ll send a {OTP_LENGTH}-digit OTP to verify your franchise
          credentials.
        </AppText>

        <PhoneNumberInput
          value={nationalNumber}
          onChangeValue={next => {
            setNationalNumber(next);
            if (error) {
              setError(undefined);
            }
          }}
          dialCode={DIAL_CODE}
          maxLength={NUMBER_LENGTH}
          error={error}
          autoFocus
          onSubmit={handleContinue}
          submitDisabled={!isValid || submitting}
          style={styles.field}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  brand: { marginBottom: spacing.giant },
  title: { marginBottom: spacing.sm },
  subtitle: { marginBottom: spacing.xxl },
  field: { marginBottom: spacing.lg },
  legal: { marginTop: spacing.md, color: colors.textMuted },
});
