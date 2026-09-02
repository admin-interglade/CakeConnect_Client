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
import { loginWithPassword } from '../../services/authApi';
import { colors, spacing } from '../../constants';
import type { AuthStackParamList, PendingSession } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Identifier + password sign-in, shared by both roles.
 *
 * The identifier accepts a mobile number or an email address and the backend
 * resolves which account it belongs to, so admins and shop owners use one form
 * and the screen never has to guess the role. The PRD's OTP flow (FR-1) is
 * still reachable from the link at the foot of the screen.
 */
export default function LoginScreen({ navigation }: Props) {
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fieldError, setFieldError] = React.useState<string | undefined>();
  const [formError, setFormError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  const trimmed = identifier.trim();
  const digits = trimmed.replace(/\D/g, '');
  // Ten digits, or something that at least looks like an address.
  const identifierValid = digits.length >= 10 || emailPattern.test(trimmed);
  const canSubmit = identifierValid && password.length > 0;

  const handleLogin = React.useCallback(async () => {
    if (!identifierValid) {
      setFieldError('Enter a 10-digit mobile number or an email address.');
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
      const result = await loginWithPassword(trimmed, password);

      if (result.status === 'invalid_credentials') {
        // Deliberately vague: naming which half was wrong tells an attacker
        // which accounts exist.
        setFormError('Those credentials do not match an account.');
        setPassword('');
        return;
      }

      const session: PendingSession = {
        userId: result.userId,
        token: result.token,
        role: result.role,
        phone: result.phone,
        fullName: result.fullName,
        email: result.email,
        assignedShop: result.assignedShop,
      };

      // An account that has not finished onboarding still owes us a profile.
      navigation.navigate(result.profileComplete ? 'Biometric' : 'Profile', {
        session,
      });
    } catch {
      setFormError('Could not sign you in. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [identifierValid, navigation, password, trimmed]);

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
          Use the mobile number or email registered with the franchise.
        </AppText>

        <LabeledInput
          label="Mobile number or email"
          value={identifier}
          onChangeText={next => {
            setIdentifier(next);
            if (fieldError) {
              setFieldError(undefined);
            }
          }}
          error={fieldError}
          placeholder="9876543210 or you@example.com"
          keyboardType="email-address"
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
