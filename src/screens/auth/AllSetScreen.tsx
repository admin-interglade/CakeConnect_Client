import React from 'react';
import { StyleSheet, View } from 'react-native';
import Icon from '../../components/Icon';
import { useDispatch } from 'react-redux';
import type { StackScreenProps } from '@react-navigation/stack';

import { AppButton, AppText, Avatar, InfoCard, Screen } from '../../components';
import { setCredentials } from '../../store/authSlice';
import type { AppDispatch } from '../../store/store';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  imageSize,
  spacing,
} from '../../constants';
import type { AuthStackParamList } from '../../navigation/types';

type Props = StackScreenProps<AuthStackParamList, 'AllSet'>;

const roleLabels: Record<string, string> = {
  shopOwner: 'Store Manager',
  admin: 'Network Administrator',
};

export default function AllSetScreen({ route }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const { session, biometricsEnabled } = route.params;

  /**
   * This is the only place the flow authenticates. Flipping `isAuthenticated`
   * swaps the root navigator over to the app tabs, so it must not happen until
   * the user has been through every onboarding step.
   */
  const enterDashboard = React.useCallback(() => {
    dispatch(
      setCredentials({
        token: session.token,
        biometricsEnabled,
        user: {
          id: session.userId,
          phone: session.phone,
          email: session.email,
          role: session.role,
          name: session.fullName,
          photoUri: session.photoUri,
          assignedShop: session.assignedShop,
        },
      }),
    );
  }, [biometricsEnabled, dispatch, session]);

  return (
    <Screen
      centerContent
      footer={
        <AppButton
          label="Go to Dashboard"
          icon="view-grid-outline"
          onPress={enterDashboard}
          testID="allset-continue"
        />
      }
    >
      <View style={styles.content}>
        <View style={styles.ring}>
          <Icon name="check" size={iconSize.xl} color={colors.success} />
        </View>

        <AppText variant="h1" align="center" style={styles.title}>
          You&apos;re all set!
        </AppText>

        <AppText variant="bodySecondary" align="center" style={styles.subtitle}>
          {biometricsEnabled
            ? 'Your device is now securely authorized.'
            : 'Your account is ready. You can enable biometric unlock any time from Account.'}
        </AppText>

        <InfoCard
          style={styles.card}
          leading={
            <Avatar
              source={session.photoUri ? { uri: session.photoUri } : null}
              name={session.fullName}
              size={imageSize.avatarSmall}
            />
          }
          title={session.fullName ?? session.phone}
          subtitle={roleLabels[session.role] ?? 'Franchise user'}
        />

        {session.assignedShop ? (
          <View style={styles.shopRow}>
            <Icon
              name="storefront-outline"
              size={iconSize.sm}
              color={colors.textMuted}
              style={styles.shopIcon}
            />
            <AppText variant="caption">
              {session.assignedShop.area} ({session.assignedShop.code})
            </AppText>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { 
    alignItems: 'center'
  },
  ring: {
    width: imageSize.successRing,
    height: imageSize.successRing,
    borderRadius: borderRadius.circle,
    borderWidth: borderWidth.thick,
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: { marginBottom: spacing.sm },
  subtitle: { 
    marginBottom: spacing.xxl, 
    paddingHorizontal: spacing.md 
  },
  card: { 
    alignSelf: 'stretch' 
  },
  shopRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: spacing.md 
  },
  shopIcon: { 
    marginRight: spacing.xs 
  },
});
