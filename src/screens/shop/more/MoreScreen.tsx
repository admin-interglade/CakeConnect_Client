import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';

import {
  AppButton,
  AppText,
  Avatar,
  ConfirmDialog,
  Icon,
  InfoCard,
  InlineMessage,
  ProgressBar,
  Screen,
  ScreenHeader,
  SectionCard,
} from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import {
  useActiveShop,
  useShopDashboard,
  useUnreadNotificationCount,
} from '../../../hooks';
import { logout } from '../../../store/authSlice';
import type { AppDispatch, RootState } from '../../../store/store';
import { resolveRange } from '../../../utils/dateRange';
import { creditUtilisation, formatCurrency } from '../../../utils/format';
import type {
  ShopMoreStackParamList,
  ShopTabParamList,
} from '../../../navigation/types';

type Navigation = StackNavigationProp<ShopMoreStackParamList> &
  BottomTabNavigationProp<ShopTabParamList>;

/**
 * The More tab — everything that is not the daily ordering job.
 *
 * It carries the FR-4 outlet switcher, which is the one piece of session state
 * a multi-outlet owner changes by hand. Switching is a real action with
 * consequences — it re-scopes every query and clears the cart, since a cart
 * priced for one outlet must never be submitted against another — so it is
 * confirmed rather than being a silent tap.
 */
export default function MoreScreen() {
  const navigation = useNavigation<Navigation>();
  const dispatch = useDispatch<AppDispatch>();

  const user = useSelector((state: RootState) => state.auth.user);
  const cartLines = useSelector((state: RootState) => state.cart.lines.length);
  const { shop, shops, shopId, hasMultipleOutlets, switchTo } = useActiveShop();
  const unread = useUnreadNotificationCount();

  const range = React.useMemo(() => resolveRange('thisMonth'), []);
  const { credit } = useShopDashboard(range);

  const [pendingSwitch, setPendingSwitch] = React.useState<string | undefined>();
  const [confirmSignOut, setConfirmSignOut] = React.useState(false);

  const utilisation = credit
    ? creditUtilisation(credit.currentOutstanding, credit.creditLimit)
    : 0;

  const requestSwitch = (nextShopId: string) => {
    if (nextShopId === shopId) {
      return;
    }
    // A draft in progress is the only reason switching is not instant.
    if (cartLines > 0) {
      setPendingSwitch(nextShopId);
      return;
    }
    switchTo(nextShopId);
  };

  return (
    <Screen>
      <ScreenHeader title={strings.shopMore.title} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <InfoCard
          title={user?.name ?? strings.shopAccount.role}
          subtitle={strings.shopAccount.role}
          caption={
            user?.phone
              ? `${strings.shopAccount.signedInWith} ${user.phone}`
              : undefined
          }
          leading={<Avatar name={user?.name ?? 'CakeConnect'} />}
        />

        {/* FR-4 — every outlet this login can act on. */}
        <SectionCard
          title={strings.shopAccount.outlets}
          subtitle={
            hasMultipleOutlets ? strings.shopAccount.outletsSubtitle : undefined
          }
        >
          {shops.length === 0 ? (
            <InlineMessage tone="warning">
              {strings.shopHome.noShopMessage}
            </InlineMessage>
          ) : (
            shops.map(outlet => {
              const selected = outlet.id === shopId;
              return (
                <Pressable
                  key={outlet.id}
                  onPress={() => requestSwitch(outlet.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={outlet.name}
                  hitSlop={layout.hitSlop}
                  disabled={!hasMultipleOutlets}
                  style={[styles.outlet, selected && styles.outletSelected]}
                >
                  <Icon
                    name={selected ? 'storefront' : 'storefront-outline'}
                    size={iconSize.md}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.outletText}>
                    <AppText variant="body">{outlet.name}</AppText>
                    <AppText variant="caption">
                      {[outlet.code, outlet.area].filter(Boolean).join(' · ')}
                    </AppText>
                  </View>
                  {selected ? (
                    <Icon
                      name="check-circle"
                      size={iconSize.md}
                      color={colors.primary}
                    />
                  ) : null}
                </Pressable>
              );
            })
          )}
        </SectionCard>

        {/* FR-20 — the credit position, repeated here because this is where a
            shop looks when it wants the account rather than the day. */}
        {credit && credit.creditLimit > 0 ? (
          <SectionCard title={strings.shopAccount.creditTitle}>
            <ProgressBar
              value={utilisation}
              tone={
                utilisation >= 100
                  ? colors.error
                  : utilisation >= 80
                    ? colors.warning
                    : colors.success
              }
              accessibilityLabel={strings.shops.creditUtilisation(`${utilisation}%`)}
            />
            <AppText variant="caption" style={styles.creditCaption}>
              {strings.shopAccount.creditUsed(
                formatCurrency(credit.currentOutstanding),
                formatCurrency(credit.creditLimit),
              )}
            </AppText>
          </SectionCard>
        ) : null}

        {/* The screens that have no tab of their own. */}
        <SectionCard title={strings.shopMore.sectionOrdering} flush>
          <MenuRow
            icon="cake-variant-outline"
            label={strings.shopMore.catalogue}
            caption={strings.shopMore.catalogueCaption}
            // The catalogue lives in the Home tab's stack, since browsing is
            // the first step of ordering rather than a destination of its own.
            onPress={() =>
              navigation.navigate('HomeTab', { screen: 'ShopCatalogue' })
            }
          />
          <MenuRow
            icon="tag-outline"
            label={strings.shopMore.offers}
            caption={strings.shopMore.offersCaption}
            onPress={() => navigation.navigate('Offers')}
          />
          <MenuRow
            icon="cash-multiple"
            label={strings.shopMore.payments}
            caption={strings.shopMore.paymentsCaption}
            onPress={() =>
              navigation.navigate('LedgerTab', { screen: 'ShopPayments' })
            }
            last
          />
        </SectionCard>

        <SectionCard title={strings.shopMore.sectionAccount} flush>
          <MenuRow
            icon={unread > 0 ? 'bell-badge-outline' : 'bell-outline'}
            label={strings.shopMore.notifications}
            caption={strings.shopMore.notificationsCaption(unread)}
            onPress={() => navigation.navigate('Notifications')}
          />
          <MenuRow
            icon="bell-cog-outline"
            label={strings.shopMore.notificationSettings}
            onPress={() => navigation.navigate('NotificationSettings')}
            last
          />
        </SectionCard>

        <AppButton
          label={strings.shopAccount.signOut}
          icon="logout"
          variant="outline"
          onPress={() => setConfirmSignOut(true)}
        />

        <AppText variant="caption" align="center" style={styles.version}>
          {`${strings.shopAccount.version}${shop ? ` · ${shop.name}` : ''}`}
        </AppText>
      </ScrollView>

      {/* FR-4 — switching outlets discards the draft, so it is confirmed. */}
      <ConfirmDialog
        visible={Boolean(pendingSwitch)}
        title={strings.shopAccount.outlets}
        message={strings.cart.discardMessage}
        confirmLabel={strings.shopAccount.currentOutlet}
        destructive
        onConfirm={() => {
          if (pendingSwitch) {
            switchTo(pendingSwitch);
          }
          setPendingSwitch(undefined);
        }}
        onDismiss={() => setPendingSwitch(undefined)}
      />

      <ConfirmDialog
        visible={confirmSignOut}
        title={strings.shopAccount.signOutTitle}
        message={strings.shopAccount.signOutMessage}
        confirmLabel={strings.shopAccount.signOut}
        destructive
        onConfirm={() => {
          setConfirmSignOut(false);
          dispatch(logout());
        }}
        onDismiss={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}

function MenuRow({
  icon,
  label,
  caption,
  onPress,
  last = false,
}: {
  icon: string;
  label: string;
  caption?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={caption}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [
        styles.menuRow,
        !last && styles.menuDivider,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.menuIcon}>
        <Icon name={icon} size={iconSize.md} color={colors.primary} />
      </View>

      <View style={styles.menuText}>
        <AppText variant="body">{label}</AppText>
        {caption ? (
          <AppText variant="caption" numberOfLines={1}>
            {caption}
          </AppText>
        ) : null}
      </View>

      <Icon name="chevron-right" size={iconSize.md} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.giant,
    gap: spacing.md,
  },
  outlet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: layout.minTouchTarget,
  },
  outletSelected: { backgroundColor: colors.primarySoft },
  outletText: { flex: 1 },
  creditCaption: { marginTop: spacing.sm },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: layout.minTouchTarget + spacing.sm,
  },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.7 },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: { flex: 1 },
  version: { marginTop: spacing.lg },
});
