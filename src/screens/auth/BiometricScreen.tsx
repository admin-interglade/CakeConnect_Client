import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '../../components/Icon';
import type { StackScreenProps } from '@react-navigation/stack';

import { AppButton, AppText, BrandMark, Screen } from '../../components';
import {
  describeBiometric,
  enableBiometrics,
  getAvailableBiometric,
  type BiometricKind,
} from '../../services/device';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  imageSize,
  spacing,
} from '../../constants';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Biometric'>;

export default function BiometricScreen({ navigation, route }: Props) {
  const { session } = route.params;

  const [kind, setKind] = React.useState<BiometricKind>('none');
  const [enabling, setEnabling] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    let active = true;
    getAvailableBiometric().then(available => {
      if (active) {
        setKind(available);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const goToAllSet = React.useCallback(
    (biometricsEnabled: boolean) =>
      navigation.navigate('AllSet', { session, biometricsEnabled }),
    [navigation, session],
  );

  const handleEnable = React.useCallback(async () => {
    setEnabling(true);
    setError(undefined);

    try {
      const { enabled, reason } = await enableBiometrics();
      if (enabled) {
        goToAllSet(true);
      } else {
        setError(reason ?? 'Biometric setup was cancelled. You can enable it later in Account.');
      }
    } catch {
      setError('Biometric setup is unavailable on this device right now.');
    } finally {
      setEnabling(false);
    }
  }, [goToAllSet]);

  const glyph = kind === 'faceId' ? 'face-recognition' : 'fingerprint';

  return (
    <Screen
      scrollable
      footer={
        <AppButton
          label="Skip for now"
          variant="link"
          onPress={() => goToAllSet(false)}
          style={styles.skip}
          testID="biometric-skip"
        />
      }
    >
      <View style={styles.content}>
        <BrandMark caption="Device Security" style={styles.brand} />

        <AppText variant="h2" align="center" style={styles.title}>
          Quick &amp; Secure Access
        </AppText>

        <AppText variant="bodySecondary" align="center" style={styles.subtitle}>
          Enable Face ID or {describeBiometric(kind)} scan for instant
          authentication on next login, without waiting for SMS codes.
        </AppText>

        <View style={styles.ring}>
          <Icon name={glyph} size={iconSize.hero} color={colors.primary} />
        </View>

        <AppButton
          label="Enable Biometrics"
          onPress={handleEnable}
          loading={enabling}
          style={styles.enable}
          testID="biometric-enable"
        />

        {error ? (
          <AppText variant="caption" align="center" color={colors.error} style={styles.error}>
            {error}
          </AppText>
        ) : null}

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <AppText variant="caption" style={styles.dividerLabel}>
            OR
          </AppText>
          <View style={styles.dividerLine} />
        </View>

        <AppButton
          label="Set up a secure 4-digit PIN"
          variant="link"
          icon="lock-outline"
          onPress={() => goToAllSet(false)}
          testID="biometric-pin"
        />

        <AppText variant="caption" align="center" style={styles.pinHint}>
          Recommended alternative if you prefer not to use biometrics.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  brand: { 
    marginBottom: spacing.giant, 
    alignSelf: 'center' 
  },
  title: { 
    marginBottom: spacing.md 
  },
  subtitle: { 
    marginBottom: spacing.xxl, 
    paddingHorizontal: spacing.sm 
  },
  ring: {
    width: imageSize.biometricRing,
    height: imageSize.biometricRing,
    borderRadius: borderRadius.circle,
    borderWidth: borderWidth.thin,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  enable: { alignSelf: 'stretch' },
  error: { marginTop: spacing.sm },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginVertical: spacing.xl,
  },
  dividerLine: { flex: 1, height: borderWidth.hairline, backgroundColor: colors.divider },
  dividerLabel: {
     marginHorizontal: spacing.md },
  pinHint: {
     marginTop: spacing.xs, 
     paddingHorizontal: spacing.lg 
  },
  skip: { alignSelf: 'center'},
});
