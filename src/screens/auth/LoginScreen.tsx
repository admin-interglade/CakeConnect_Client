import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  BrandMark,
  InlineMessage,
  LabeledInput,
  PasswordInput,
  Screen,
} from '../../components';

import { describeApiError } from '../../services/api';
import { colors, spacing } from '../../constants';
import type { AuthStackParamList, PendingSession } from '../../navigation/types';
import { loginWithPassword } from '../../services/auth/auth.api';

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

const NUMBER_LENGTH = 10;

/**
 * Mobile number + password sign-in.
 *
 * `POST /auth/login` resolves accounts by mobile number only — there is no
 * email sign-in — so the field validates for ten digits rather than accepting
 * an address the server would reject with a 400. The PRD's OTP flow (FR-1) is
 * still reachable from the link at the foot of the screen.
 */
export default function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [formError, setFormError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  const trimmed = identifier.trim();
  // Tolerate a pasted number that still carries its +91 country code.
  const digits = trimmed.replace(/\D/g, '').slice(-NUMBER_LENGTH);
  const identifierValid = digits.length === NUMBER_LENGTH;
  const canSubmit = identifierValid && password.length > 0;

  const handleLogin = React.useCallback(async () => {
    if (!identifierValid) {
      setFieldError(`Enter your ${NUMBER_LENGTH}-digit registered mobile number.`);
      return;
    }
    if (!password) {
      setFormError('Enter your password to continue.');
      return;
    }

    setFieldError(undefined);
    setFormError(undefined);
    setSubmitting(true);

    try {
      const result = await loginWithPassword(digits, password);
      if (result.status === 'invalid_credentials') {
        // Deliberately vague: naming which half was wrong tells an attacker
        // which accounts exist.
        setFormError('Those credentials do not match an account.');
        setPassword('');
        return;
      }

      const session: PendingSession = {
        userId: result.userId,
        token: result.accessToken,
        refreshToken: result.refreshToken,
        role: result.role,
        phone: result.phone,
        fullName: result.fullName,
        email: result.email,
        shops: result.shops,
      };

      // An account that has not finished onboarding still owes us a profile.
      navigation.navigate(result.profileComplete ? 'Biometric' : 'Profile', {
        session,
      });
    } catch (caught) {
      setFormError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }, [digits, identifierValid, navigation, password]);

  return (
    <Screen
      scrollable
      footer={
        <View>
          <AppButton
            label="Sign in"
            onPress={handleLogin}
            disabled={!canSubmit}
            loading={submitting}
            testID="login-submit"
          />

          <AppButton
            label="Sign in with OTP instead"
            onPress={() => navigation.navigate('OtpLogin')}
            variant="link"
            style={styles.alternate}
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
          Sign in to your account
        </AppText>

        <AppText variant="bodySecondary" style={styles.subtitle}>
          Use the mobile number registered with the franchise.
        </AppText>

        <LabeledInput
          label="Mobile number"
          value={identifier}
          onChangeText={next => {
            setIdentifier(next);
            if (fieldError) {
              setFieldError(undefined);
            }
          }}
          error={fieldError}
          placeholder="9876543210"
          keyboardType="number-pad"
          maxLength={13}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          containerStyle={styles.field}
        />

        <PasswordInput
          value={password}
          onChangeText={next => {
            setPassword(next);
            if (formError) {
              setFormError(undefined);
            }
          }}
          onSubmit={handleLogin}
          testID="login-password"
          style={styles.field}
        />

        {formError ? (
          <InlineMessage tone="error" style={styles.formError}>
            {formError}
          </InlineMessage>
        ) : null}
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
  formError: { marginTop: spacing.xs },
  alternate: { alignSelf: 'center', marginTop: spacing.md },
  legal: { marginTop: spacing.md, color: colors.textMuted },
});
