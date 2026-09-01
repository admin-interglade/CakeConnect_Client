import React from 'react';
import { Image, Linking, StyleSheet, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import { AppButton, AppText, Screen } from '../../components';
import { bakeryHero } from '../../assets/images';
import { borderRadius, colors, imageSize, spacing } from '../../constants';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'Landing'>;

const LEARN_MORE_URL = 'https://cakeconnect.com/franchise';

export default function LandingScreen({ navigation }: Props) {
  const openLearnMore = React.useCallback(() => {
    Linking.openURL(LEARN_MORE_URL).catch(() => {
      // Nothing to recover here — the marketing site is optional.
    });
  }, []);

  return (
    <Screen
      scrollable
      footer={
        <View>
          <AppButton
            label="Continue with Mobile Number"
            onPress={() => navigation.navigate('Login')}
            testID="landing-continue"
          />
          <AppButton
            label="Learn More"
            variant="outline"
            onPress={openLearnMore}
            style={styles.secondaryButton}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Image
          source={bakeryHero}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel="Freshly baked pastries on a bakery counter"
          style={styles.hero}
        />

        <AppText variant="h1" align="center" style={styles.title}>
          Welcome to{'\n'}CakeConnect
        </AppText>

        <AppText variant="bodySecondary" align="center" style={styles.body}>
          Your franchise ordering and operations hub. Place next-day demand,
          track orders, manage payments — all in one place.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  hero: {
    width: '100%',
    height: imageSize.heroHeight,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceSunken,
  },
  title: { marginTop: spacing.xxxl },
  body: { marginTop: spacing.md, paddingHorizontal: spacing.sm },
  secondaryButton: { marginTop: spacing.md },
});
