import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import {
  AppButton,
  AppText,
  Avatar,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  OfflineBanner,
  Screen,
  Skeleton,
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
  useCart,
  useCutoff,
  useShopDashboard,
  useUnreadNotificationCount,
} from '../../../hooks';
import type { RootState } from '../../../store/store';
import { resolveRange } from '../../../utils/dateRange';
import { timeOfDay } from '../../../utils/format';
import type {
  ShopHomeStackParamList,
  ShopTabParamList,
} from '../../../navigation/types';
import TomorrowOrderCard from '../components/TomorrowOrderCard';
import FinancialSummary from '../components/FinancialSummary';
import OrderTrackCard from '../components/OrderTrackCard';
import QuickActionGrid, { type QuickAction } from '../components/QuickActionGrid';
import ActiveOfferCard from '../components/ActiveOfferCard';

type Navigation = StackNavigationProp<ShopHomeStackParamList> &
  BottomTabNavigationProp<ShopTabParamList>;

/**
 * The shop owner's home screen — FR-9, FR-20, FR-22, FR-34.
 *
 * Reads top to bottom in the order the day actually runs: the order you are
 * racing a cut-off to place, then what you owe, then where your orders are,
 * then the four things you do most, then what the franchise is running.
 *
 * Two decisions worth knowing about:
 *
 * **The range is fixed to this month.** FR-19's selector, and the full FR-20
 * tile set it drives, live on the statement (Ledger tab) where a range is what
 * the screen is *for*. Here the figures are the ones on the design — and "Paid
 * (Mo)" is a month-to-date figure by definition, so a picker above it would
 * make the label a lie.
 *
 * **Every section states its own absence.** "No offers" and "offers could not
 * be loaded" look identical on a blank card and mean opposite things, so each
 * section carries both an empty state and an unavailable state, and only the
 * two queries that return *figures* can fail the screen as a whole.
 */
export default function ShopHome() {
  const navigation = useNavigation<Navigation>();
  const user = useSelector((state: RootState) => state.auth.user);
  const { shop, shopId, refresh: refreshShops } = useActiveShop();
  const unread = useUnreadNotificationCount();

  // Month to date, matching the "Paid (Mo)" tile. Memoised so the query key is
  // stable across renders rather than resolving a new range object each time.
  const range = React.useMemo(() => resolveRange('thisMonth'), []);

  const { cutoff, secondsRemaining, passed, isError: cutoffFailed } = useCutoff();
  const cart = useCart();
  const {
    dashboard,
    credit,
    track,
    offers,
    offersAvailable,
    isLoading,
    isError,
    error,
    isStale,
    isRefetching,
    refetch,
  } = useShopDashboard(range);


  /**
   * A shop owner with no outlet assigned is a real state, not an error: the
   * admin has created the login but not linked a shop yet (FR-2). Everything
   * below would query with an empty id, so the screen stops here and says so.
   *
   * It offers a refresh rather than being a dead end. The outlet list is
   * resolved once at sign-in and then persisted, so an assignment the admin
   * makes *after* the owner logged in is otherwise invisible until they sign
   * out and back in — and there is no way for them to know that is what is
   * needed.
   */
  if (!shopId) {
    return (
      <Screen>
        <Header
          greeting={greetingFor(user?.name)}
          shopName={strings.shopHome.noShop}
          unread={unread}
          onNotifications={() => navigation.navigate('Notifications')}
          onAccount={() => navigation.navigate('MoreTab')}
        />
        <EmptyState
          icon="storefront-outline"
          title={strings.shopHome.noShop}
          message={strings.shopHome.noShopMessage}
          actionLabel={strings.shopHome.checkAgain}
          onAction={refreshShops}
        />
      </Screen>
    );
  }

  /* A hard failure of both figure queries is the one case where the screen
     cannot render anything useful. Everything softer degrades in place. */
  if (isError && !dashboard && !credit) {
    return (
      <Screen>
        <Header
          greeting={greetingFor(user?.name)}
          shopName={shop?.name}
          unread={unread}
          onNotifications={() => navigation.navigate('Notifications')}
          onAccount={() => navigation.navigate('MoreTab')}
        />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  const quickActions: QuickAction[] = [
    {
      key: 'place',
      label: strings.shopHome.actionPlaceOrder,
      icon: 'plus-circle-outline',
      onPress: () => navigation.navigate('ShopCatalogue'),
      // FR-10 — nothing more can be added to tomorrow's order after cut-off.
      disabled: passed || cart.alreadySubmitted,
    },
    {
      key: 'repeat',
      label: strings.shopHome.actionRepeatLast,
      icon: 'refresh',
      // FR-8 — demand is repetitive, so this is one tap from the dashboard.
      // It builds the draft server-side, then opens the cart on what it built.
      onPress: () => {
        cart.repeat('last');
        navigation.navigate('Cart');
      },
      busy: cart.isRepeating,
      disabled: passed || cart.alreadySubmitted,
    },
    {
      key: 'pay',
      label: strings.shopHome.actionPayNow,
      icon: 'credit-card-outline',
      onPress: () =>
        navigation.navigate('LedgerTab', { screen: 'ShopPayments' }),
    },
    {
      key: 'ledger',
      label: strings.shopHome.actionViewLedger,
      icon: 'book-open-outline',
      onPress: () => navigation.navigate('LedgerTab', { screen: 'Transactions' }),
    },
  ];

  return (
    <Screen>
      <Header
        greeting={greetingFor(user?.name)}
        shopName={shop?.name}
        shopArea={shop?.area}
        unread={unread}
        onNotifications={() => navigation.navigate('Notifications')}
        onAccount={() => navigation.navigate('MoreTab')}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <OfflineBanner visible={isStale} />

        {/* FR-9, FR-22 — the order and the deadline it is racing. */}
        <TomorrowOrderCard
          order={track.tomorrow}
          deliveryDate={cutoff?.deliveryDate}
          secondsToCutoff={secondsRemaining}
          cutoffPassed={passed}
          cutoffAvailable={!cutoffFailed}
          loading={isLoading && !track.tomorrow}
          onPlaceOrder={() => navigation.navigate('ShopCatalogue')}
          onContinueOrder={() => navigation.navigate('Cart')}
          onViewOrder={() =>
            track.tomorrow
              ? navigation.navigate('OrdersTab', {
                  screen: 'ShopOrderDetails',
                  params: { orderId: track.tomorrow.id },
                })
              : navigation.navigate('OrdersTab')
          }
        />

        {/* FR-20 — outstanding, credit and what has been paid this month. */}
        <Section title={strings.shopHome.financialTitle}>
          <FinancialSummary
            dashboard={dashboard}
            credit={credit}
            loading={isLoading && !dashboard}
            available={Boolean(dashboard || credit)}
          />
        </Section>

        {/* FR-22 — today's and tomorrow's orders, side by side. */}
        <Section title={strings.shopHome.trackTitle}>
          <OrderTrackCard
            today={track.today}
            tomorrow={track.tomorrow}
            loading={isLoading && !track.today && !track.tomorrow}
            available={track.available}
            onOpen={orderId =>
              navigation.navigate('OrdersTab', {
                screen: 'ShopOrderDetails',
                params: { orderId },
              })
            }
          />
        </Section>

        <Section title={strings.shopHome.quickActionsTitle}>
          <QuickActionGrid actions={quickActions} />
        </Section>

        {/* FR-34 — published offers appear on the shop home screen. */}
        <Section
          title={strings.shopHome.offersTitle}
          action={
            offers.length > 0
              ? {
                  label: strings.shopHome.viewAllOffers,
                  onPress: () => navigation.navigate('Offers'),
                }
              : undefined
          }
        >
          {isLoading && offers.length === 0 ? (
            <Skeleton height={96} radius={borderRadius.lg} />
          ) : !offersAvailable ? (
            <InlineMessage tone="warning">
              {strings.shopHome.offersUnavailable}
            </InlineMessage>
          ) : offers.length === 0 ? (
            <View style={styles.offersEmpty}>
              <AppText variant="body">{strings.shopHome.offersEmpty}</AppText>
              <AppText variant="caption" style={styles.offersEmptyBody}>
                {strings.shopHome.offersEmptyMessage}
              </AppText>
            </View>
          ) : (
            <View style={styles.offers}>
              {/* Two at most — this is a glance, and the rest are one tap away. */}
              {offers.slice(0, 2).map(offer => (
                <ActiveOfferCard
                  key={offer.id}
                  offer={offer}
                  onPress={() => navigation.navigate('Offers', { offerId: offer.id })}
                />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}

/** Time-of-day greeting, resolved on the shop's own IST clock. */
function greetingFor(name?: string): string {
  // A missing name is not worth a blank line: the greeting still works without
  // it, so the trailing comma is trimmed rather than rendering "Good Morning, ".
  const who = name?.trim() ?? '';

  switch (timeOfDay()) {
    case 'morning':
      return who ? strings.shopHome.greetingMorning(who) : 'Good Morning';
    case 'afternoon':
      return who ? strings.shopHome.greetingAfternoon(who) : 'Good Afternoon';
    default:
      return who ? strings.shopHome.greetingEvening(who) : 'Good Evening';
  }
}

function Header({
  greeting,
  shopName,
  shopArea,
  unread,
  onNotifications,
  onAccount,
}: {
  greeting: string;
  shopName?: string;
  shopArea?: string;
  unread: number;
  onNotifications: () => void;
  onAccount: () => void;
}) {
  const subtitle = [shopName, shopArea].filter(Boolean).join(' · ');

  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <AppText variant="h2" numberOfLines={1}>
          {greeting}
        </AppText>
        <AppText variant="bodySecondary" numberOfLines={1}>
          {subtitle || strings.shopHome.noShopName}
        </AppText>
      </View>

      <Pressable
        onPress={onNotifications}
        accessibilityRole="button"
        accessibilityLabel={strings.shopHome.notifications}
        accessibilityHint={
          unread > 0 ? strings.notifications.unread(unread) : undefined
        }
        hitSlop={layout.hitSlop}
        style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
      >
        <Icon
          name={unread > 0 ? 'bell-badge-outline' : 'bell-outline'}
          size={iconSize.md}
          color={colors.textPrimary}
        />
      </Pressable>

      <Pressable
        onPress={onAccount}
        accessibilityRole="button"
        accessibilityLabel={strings.shopHome.account}
        hitSlop={layout.hitSlop}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Avatar name={shopName ?? 'CakeConnect'} />
      </Pressable>
    </View>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="kicker" color={colors.textSecondary}>
          {title}
        </AppText>
        {action ? (
          <AppButton
            label={action.label}
            variant="link"
            onPress={action.onPress}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerText: { flex: 1 },
  headerButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: borderRadius.circle,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  content: { paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  offers: { gap: spacing.sm },
  offersEmpty: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  offersEmptyBody: { marginTop: spacing.xs },
});
