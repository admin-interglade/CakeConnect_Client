import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import { AppText, Icon, Screen } from '../../components';
import { borderRadius, colors, iconSize, imageSize, spacing } from '../../constants';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Splash'>;

/** How long the brand mark holds before the welcome screen takes over. */
const SPLASH_DURATION_MS = 1600;

export default function SplashScreen({ navigation }: Props) {
  React.useEffect(() => {
    const timer = setTimeout(() => navigation.replace('Landing'), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <Screen
      centerContent
      footer={
        <AppText variant="kicker" align="center" color={colors.textMuted}>
          Bakery Operations Suite v2.0
        </AppText>
      }
    >
      <View style={styles.content}>
        <View style={styles.mark}>
          <Icon name="cake-variant-outline" size={iconSize.splashGlyph} color={colors.primary} />
        </View>

        <AppText variant="brand" align="center" style={styles.wordmark}>
          CakeConnect
        </AppText>

        <AppText variant="bodySecondary" align="center">
          Franchise ordering, simplified.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center' },
  mark: {
    width: imageSize.splashMark,
    height: imageSize.splashMark,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  wordmark: { marginBottom: spacing.sm },
});
