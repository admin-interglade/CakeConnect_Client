import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  Avatar,
  BrandMark,
  InfoCard,
  LabeledInput,
  Screen,
} from '../../components';
import { pickProfilePhoto } from '../../services/device';
import { submitProfile } from '../../services/authApi';
import { colors, layout, spacing } from '../../constants';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Profile'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ProfileScreen({ navigation, route }: Props) {
  const { session } = route.params;

  const [fullName, setFullName] = React.useState(session.fullName ?? '');
  const [email, setEmail] = React.useState(session.email ?? '');
  const [photoUri, setPhotoUri] = React.useState<string | undefined>(session.photoUri);
  const [errors, setErrors] = React.useState<{ fullName?: string; email?: string }>({});
  const [submitting, setSubmitting] = React.useState(false);

  const handlePickPhoto = React.useCallback(async () => {
    const picked = await pickProfilePhoto();
    if (picked) {
      setPhotoUri(picked.uri);
    }
  }, []);

  const validate = React.useCallback(() => {
    const next: { fullName?: string; email?: string } = {};

    if (fullName.trim().length < 2) {
      next.fullName = 'Enter your full name as it appears on your franchise agreement.';
    }
    if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
      next.email = 'Enter a valid email address, or leave this blank.';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [email, fullName]);

  const handleSubmit = React.useCallback(async () => {
    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      await submitProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        photoUri,
      });

      navigation.navigate('Biometric', {
        session: {
          ...session,
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          photoUri,
        },
      });
    } catch {
      setErrors({ fullName: 'Could not save your profile. Check your connection and try again.' });
    } finally {
      setSubmitting(false);
    }
  }, [email, fullName, navigation, photoUri, session, validate]);

  return (
    <Screen
      scrollable
      footer={
        <AppButton
          label="Complete Setup"
          onPress={handleSubmit}
          loading={submitting}
          testID="profile-submit"
        />
      }
    >
      <View style={styles.content}>
        <BrandMark caption="Owner Onboarding" style={styles.brand} />

        <AppText variant="h2" style={styles.title}>
          Complete your profile
        </AppText>

        <Pressable
          onPress={handlePickPhoto}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Upload profile photo"
          style={styles.photoRow}
        >
          <Avatar
            source={photoUri ? { uri: photoUri } : null}
            name={fullName}
            backgroundColor={colors.surfaceSunken}
          />
          <View style={styles.photoText}>
            <AppText variant="link">
              {photoUri ? 'Change Profile Photo' : 'Upload Profile Photo'}
            </AppText>
            <AppText variant="caption" style={styles.photoHint}>
              Recommended: Square, JPG/PNG up to 2MB
            </AppText>
          </View>
        </Pressable>

        <LabeledInput
          label="Full name"
          value={fullName}
          onChangeText={next => {
            setFullName(next);
            if (errors.fullName) {
              setErrors(current => ({ ...current, fullName: undefined }));
            }
          }}
          placeholder="Aarav Sharma"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          error={errors.fullName}
          containerStyle={styles.field}
        />

        <LabeledInput
          label="Email address (optional)"
          value={email}
          onChangeText={next => {
            setEmail(next);
            if (errors.email) {
              setErrors(current => ({ ...current, email: undefined }));
            }
          }}
          placeholder="aarav.sharma@partner.cakeconnect.in"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
          error={errors.email}
          containerStyle={styles.field}
        />

        {session.assignedShop ? (
          <View style={styles.field}>
            <AppText variant="inputLabel" style={styles.shopLabel}>
              Assigned franchise shop
            </AppText>
            <InfoCard
              tone="highlight"
              title={session.assignedShop.name}
              subtitle={`Franchise ${session.assignedShop.code}`}
              caption="Assigned by your network administrator. Contact support to request edits."
            />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingTop: spacing.lg },
  brand: { marginBottom: spacing.xxxl },
  title: { marginBottom: spacing.xl },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  photoText: { flex: 1, marginLeft: spacing.md },
  photoHint: { marginTop: spacing.xxs },
  field: { marginBottom: spacing.lg },
  shopLabel: { marginBottom: spacing.sm },
});
