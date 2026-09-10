import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  BrandMark,
  InlineMessage,
  PasswordInput,
  Screen,
} from '../../components';
import { changeMyPassword } from '../../services/auth';
import { describeApiError } from '../../services/api';
import { spacing } from '../../constants';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'SetPassword'>;

const MIN_LENGTH = 8;

/**
 * First-login password setup: the owner signed in with the temporary password
 * the admin's email carried, and must now choose their own. Reachable only in
 * that state — the server skips the current-password check exactly while
 * `mustChangePassword` is set, so this screen never asks for it. The new
 * password replaces the temporary one and the next login uses it.
 *
 * Success moves on to the same onboarding steps a normal first login uses:
 * complete the profile if it is still owed, then biometrics.
 */
export default function SetPasswordScreen({ navigation, route }: Props) {
  const { session } = route.params;

  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [error, setError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = password.length >= MIN_LENGTH && confirm.length > 0;

  const handleSubmit = React.useCallback(async () => {
    if (password.length < MIN_LENGTH) {
      setError(`Choose a password of at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setError(undefined);
    setSubmitting(true);

    try {
      // The store holds no token yet — `setCredentials` runs at the end of
      // onboarding — so the access token must ride along on this explicit call.
      await changeMyPassword(password, undefined, session.token);

      // The server cleared `mustChangePassword` by accepting the new password,
      // so the rest of onboarding continues like any first login.
      navigation.navigate(session.fullName ? 'Biometric' : 'Profile', {
        session: { ...session, mustChangePassword: false },
      });
    } catch (caught) {
      setError(describeApiError(caught));
    } finally {
      setSubmitting(false);
    }
  }, [confirm, navigation, password, session]);

  return (
    <Screen
      scrollable
      footer={
        <AppButton
          label="Set password"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
          testID="set-password-submit"
        />
      }
    >
      <View style={styles.content}>
        <BrandMark caption="Owner Onboarding" style={styles.brand} />

        <AppText variant="h2" style={styles.title}>
          Create your password
        </AppText>

        <AppText variant="bodySecondary" style={styles.subtitle}>
          Your temporary password was emailed to you. Choose the password you
          will sign in with from now on.
        </AppText>

        <PasswordInput
          value={password}
          onChangeText={next => {
            setPassword(next);
            if (error) {
              setError(undefined);
            }
          }}
          label="New password"
          placeholder={`At least ${MIN_LENGTH} characters`}
          autoFocus
          testID="set-password-new"
          style={styles.field}
        />

        <PasswordInput
          value={confirm}
          onChangeText={next => {
            setConfirm(next);
            if (error) {
              setError(undefined);
            }
          }}
          label="Confirm password"
          placeholder="Re-enter your new password"
          onSubmit={handleSubmit}
          testID="set-password-confirm"
          style={styles.field}
        />

        {error ? (
          <InlineMessage tone="error" style={styles.formError}>
            {error}
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
});