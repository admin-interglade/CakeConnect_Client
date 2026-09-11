import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import {
  AppButton,
  AppText,
  //Avatar,
  CardCarousel,
  DateRangePicker,
  ErrorState,
  Icon,
  OfflineBanner,
  OrderSummaryCard,
  ORDER_CARD_WIDTH,
  ORDER_CARD_HEIGHT,
  ProductionLineCard,
  Screen,
  ScreenHeader,
  SectionCard,
  SimpleBarChart,
  InlineMessage,
  SimpleLineChart,
  Skeleton,
  SkeletonCards,
  SkeletonList,
  StatCard,
} from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  //imageSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import {
  useAdminDashboard,
  useAdminOffers,
  useOrderMutations,
  useOrders,
} from '../../../hooks';
import useCountdown from '../../../hooks/useCountdown';
import { isOverdueForExpiry } from '../../../services/admin';
import { logout } from '../../../store/authSlice';
import OfferCard, {
  OFFER_CARD_WIDTH,
  OFFER_CARD_HEIGHT,
} from '../offers/components/OfferCard';
import type { Offer } from '../../../types/shop';
import type { RootState } from '../../../store/store';
import { defaultRange } from '../../../utils/dateRange';
import {
  addDays,
  formatCurrencyCompact,
  formatDate,
  formatDuration,
  formatNumber,
  formatShortDate,
  toApiDate,
} from '../../../utils/format';
import type {
  AdminDashboardStackParamList,
  AdminTabParamList,
} from '../../../navigation/types';
import type { DateRange, Order } from '../../../types/admin';

type DashboardNavigation = StackNavigationProp<
  AdminDashboardStackParamList,
  'AdminDashboard'
>;


export default function AdminDashboard() {
  const navigation = useNavigation<DashboardNavigation>();
  // Cross-tab jumps (a tile into the orders queue) go through the tab parent.
  const tabNavigation =
    navigation.getParent<BottomTabNavigationProp<AdminTabParamList>>();

  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const [range, setRange] = React.useState<DateRange>(defaultRange);

  const {
    stats,
    trends,
    topProducts,
    production,
    trendsAvailable,
    chartsError,
    productionNeedsGenerating,
    isLoading,
    isError,
    error,
    isStale,
    isRefetching,
    refetch,
  } = useAdminDashboard(range);

  // The ten most recent orders across the network, independent of the range.
  const recent = useOrders(
    {
      search: '',
      status: 'all',
      shopId: 'all',
      range: {
        preset: 'custom',
        from: addDays(toApiDate(new Date()), -7),
        to: toApiDate(new Date()),
      },
      dateField: 'orderDate',
    },
    { page: 1, limit: 10 },
  );

  /*
   * FR-32 to FR-35 — the offers behind the strip. Live ones only, and five of
   * them: the strip is a glance, and the whole list is one tap away.
   */
  const liveOffers = useAdminOffers({ status: 'active' }, { page: 1, limit: 5 });

  const { exportProduction } = useOrderMutations();

  const goToOrders = (status?: 'pending_cutoff' | 'submitted') =>
    tabNavigation?.navigate('OrdersTab', {
      screen: 'OrdersList',
      params: status ? { status } : undefined,
    } as never);

  const goToOrder = (orderId: string) =>
    tabNavigation?.navigate('OrdersTab', {
      screen: 'OrderDetails',
      params: { orderId },
    } as never);

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title={strings.dashboard.title} />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={strings.dashboard.title}
        subtitle={strings.dashboard.greeting(user?.name ?? 'Franchise owner')}
        actions={[
          // FR-13 to FR-16 — the only way in to the cut-off configuration: the
          // dashboard's quick-action block is commented out, and the cut-off
          // strip below already spends its action on the pending-orders queue.
          {
            icon: 'clock-edit-outline',
            label: strings.cutoff.title,
            onPress: () => navigation.navigate('CutoffSettings'),
            tone: colors.textSecondary,
          },
          {
            icon: 'logout',
            label: strings.dashboard.logout,
            onPress: () => dispatch(logout()),
            tone: colors.textSecondary,
          },
        ]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <OfflineBanner visible={isStale} />

        <View style={styles.identity}>
          {/* <Avatar
            name={user?.name ?? 'Admin'}
            source={user?.photoUri ? { uri: user.photoUri } : undefined}
            size={imageSize.avatarSmall}
          /> */}
          <DateRangePicker
            value={range}
            onChange={setRange}
            style={styles.rangePicker}
          />
        </View>

        {isLoading || !stats ? (
          <SkeletonCards count={6} />
        ) : (
          <>
            <CutoffStrip
              nextCutoffAt={stats.nextCutoffAt}
              cutoffTime={stats.cutoffTime}
              submitted={stats.shopsSubmitted}
              expected={stats.shopsExpected}
              noOrderCount={stats.noOrderPlacedCount}
              onPress={() => goToOrders('pending_cutoff')}
            />

            {/* FR-36 — the PRD's six network tiles, each deep-linking onward. */}
            <View style={styles.tiles}>
              <StatCard
                label={strings.dashboard.tiles.totalShops}
                value={formatNumber(stats.totalShops)}
                caption={strings.dashboard.tiles.shopsSplit(
                  stats.activeShops,
                  stats.suspendedShops,
                )}
                icon="storefront-outline"
                onPress={() => tabNavigation?.navigate('ShopsTab' as never)}
                accessibilityHint="Opens the shop directory"
              />
              <StatCard
                label={strings.dashboard.tiles.ordersToday}
                value={formatNumber(stats.ordersReceivedToday)}
                icon="clipboard-check-outline"
                onPress={() => goToOrders('submitted')}
                accessibilityHint="Opens today's submitted orders"
              />
              <StatCard
                label={strings.dashboard.tiles.pendingCutoff}
                value={formatNumber(stats.ordersPendingAgainstCutoff)}
                tone={
                  stats.ordersPendingAgainstCutoff > 0 ? 'warning' : 'success'
                }
                icon="timer-sand"
                onPress={() => goToOrders('pending_cutoff')}
                accessibilityHint="Opens the shops that have not submitted"
              />
              <StatCard
                label={strings.dashboard.tiles.todaysValue}
                value={formatCurrencyCompact(stats.todaysOrderValue)}
                icon="cash-multiple"
                tone="primary"
              />
              <StatCard
                label={strings.dashboard.tiles.networkOutstanding}
                value={formatCurrencyCompact(stats.networkOutstanding)}
                icon="scale-balance"
                tone="warning"
                onPress={() => tabNavigation?.navigate('ShopsTab' as never)}
                accessibilityHint="Opens the shop directory with outstanding balances"
              />
              <StatCard
                label={strings.dashboard.tiles.collectionsToday}
                value={formatCurrencyCompact(stats.collectionsReceivedToday)}
                icon="hand-coin-outline"
                tone="success"
              />
            </View>
          </>
        )}

        {/* FR-37 — the number the central kitchen actually runs on. */}
        <SectionCard
          title={strings.dashboard.production.title}
          subtitle={
            production
              ? `${strings.dashboard.production.subtitle(
                  formatDate(production.deliveryDate),
                )} · ${
                  production.frozen
                    ? strings.dashboard.production.frozen
                    : strings.dashboard.production.provisional
                }`
              : undefined
          }
          actionLabel={strings.dashboard.production.exportForKitchen}
          actionIcon="tray-arrow-down"
          onAction={
            production && production.lines.length > 0
              ? () =>
                  exportProduction.mutate({
                    deliveryDate: production.deliveryDate,
                    format: 'csv',
                  })
              : undefined
          }
          style={styles.section}
        >
          {isLoading ? (
            <SkeletonList rows={4} />
          ) : production && production.lines.length > 0 ? (
            <>
              {/* Only the heaviest few items: the full schedule is one tap away
                  and the dashboard is for a glance, not for working from. */}
              {production.lines
                .slice(0, DASHBOARD_PRODUCTION_LINES)
                .map(line => (
                  <ProductionLineCard
                    key={line.productId}
                    line={line}
                    showShopCount={false}
                    onPress={() =>
                      navigation.navigate('ProductionDetail', {
                        deliveryDate: production.deliveryDate,
                        productId: line.productId,
                      })
                    }
                  />
                ))}

              {production.lines.length > DASHBOARD_PRODUCTION_LINES ? (
                <AppText variant="caption" style={styles.moreItems}>
                  {strings.dashboard.production.moreItems(
                    production.lines.length - DASHBOARD_PRODUCTION_LINES,
                  )}
                </AppText>
              ) : null}

              <AppButton
                label={strings.dashboard.production.viewFullPlan}
                onPress={() =>
                  navigation.navigate('ProductionPlan', {
                    deliveryDate: production.deliveryDate,
                  })
                }
                style={styles.viewPlan}
              />
            </>
          ) : productionNeedsGenerating ? (
            /* FR-37 — the plan is generated on demand, so "not generated yet"
               is a normal state with an action, not an error. */
            <InlineMessage tone="info" icon="information-outline">
              {strings.dashboard.production.notGenerated}
            </InlineMessage>
          ) : (
            <EmptyLine message={strings.dashboard.production.empty} />
          )}
        </SectionCard>

        {/* FR-21 — trend and ranking for the selected range. */}
        <SectionCard
          title={strings.dashboard.charts.trendTitle}
          style={styles.section}
        >
          {isLoading ? (
            <SkeletonList rows={3} />
          ) : chartsError ? (
            <InlineMessage tone="error" icon="alert-circle-outline">
              {chartsError}
            </InlineMessage>
          ) : trendsAvailable ? (
            <SimpleLineChart
              data={trends.map(point => ({
                label: formatShortDate(point.date),
                value: point.orderValue,
              }))}
              formatValue={formatCurrencyCompact}
              emptyMessage={strings.dashboard.charts.empty}
            />
          ) : (
            /* Says the figure cannot be fetched, rather than drawing an empty
               chart that reads as a week of zero trade. See api-gaps.md G5. */
            <InlineMessage tone="info" icon="information-outline">
              {strings.dashboard.charts.unavailable}
            </InlineMessage>
          )}
        </SectionCard>

        <SectionCard
          title={strings.dashboard.charts.topProductsTitle}
          style={styles.section}
        >
          {isLoading ? (
            <SkeletonList rows={3} />
          ) : chartsError ? (
            <InlineMessage tone="error" icon="alert-circle-outline">
              {chartsError}
            </InlineMessage>
          ) : (
            <SimpleBarChart
              data={topProducts.map(product => ({
                label: product.name,
                value: product.quantity,
                valueLabel: `${formatNumber(product.quantity)} ${product.unit}`,
              }))}
              emptyMessage={strings.dashboard.charts.empty}
            />
          )}
        </SectionCard>

        {/* Deliberately not a SectionCard: a bordered surface around a
            horizontal strip boxes the cards in and stops them at the gutter,
            which reads as a broken row rather than "there is more, scroll".
            A plain heading plus a bled-out carousel lets the last card run off
            the screen edge, which is what invites the swipe. */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={styles.recentTitle}>
              <AppText variant="h3" numberOfLines={1}>
                {strings.dashboard.recentOrders}
              </AppText>
              <AppText variant="caption" numberOfLines={1} style={styles.recentSubtitle}>
                {strings.dashboard.recent.subtitle}
              </AppText>
            </View>

            <Pressable
              onPress={() => goToOrders()}
              accessibilityRole="button"
              accessibilityLabel={strings.dashboard.actionOrders}
              hitSlop={layout.hitSlop}
              style={({ pressed }) => [
                styles.recentAction,
                pressed && styles.recentActionPressed,
              ]}
            >
              <AppText variant="link">{strings.dashboard.actionOrders}</AppText>
              <Icon
                name="chevron-right"
                size={iconSize.sm}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {recent.isLoading ? (
            /* Card-shaped placeholders, so the strip does not reflow into a
               different height when the real orders land. */
            <View style={styles.recentSkeleton}>
              {[0, 1].map(index => (
                <Skeleton
                  key={index}
                  height={ORDER_CARD_HEIGHT}
                  width={ORDER_CARD_WIDTH}
                  radius={borderRadius.lg}
                />
              ))}
            </View>
          ) : (
            <CardCarousel<Order>
              data={recent.orders}
              keyExtractor={order => order.id}
              itemWidth={ORDER_CARD_WIDTH}
              emptyMessage={strings.dashboard.recent.empty}
              style={styles.recentCarousel}
              contentContainerStyle={styles.recentCarouselContent}
              renderItem={order => (
                <OrderSummaryCard
                  order={order}
                  onPress={() => goToOrder(order.id)}
                />
              )}
            />
          )}
        </View>

        {/* FR-32 to FR-35 — what the network is being offered right now.
            Same shape as the recent-orders strip above, and for the same
            reason: this is a glance, and the whole list is one tap away.

            It carries its own loading and failure states rather than joining
            the dashboard's, so an offers endpoint having a bad day costs the
            franchise owner a strip rather than the screen. */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View style={styles.recentTitle}>
              <AppText variant="h3" numberOfLines={1}>
                {strings.dashboard.offers.title}
              </AppText>
              <AppText variant="caption" numberOfLines={1} style={styles.recentSubtitle}>
                {strings.dashboard.offers.subtitle}
              </AppText>
            </View>

            <Pressable
              onPress={() => navigation.navigate('Offers')}
              accessibilityRole="button"
              accessibilityLabel={strings.dashboard.actionAllOffers}
              hitSlop={layout.hitSlop}
              style={({ pressed }) => [
                styles.recentAction,
                pressed && styles.recentActionPressed,
              ]}
            >
              <AppText variant="link">{strings.dashboard.actionAllOffers}</AppText>
              <Icon name="chevron-right" size={iconSize.sm} color={colors.primary} />
            </Pressable>
          </View>

          {liveOffers.isLoading ? (
            /* Card-shaped, so the strip does not reflow into a different
               height when the real offers land. */
            <View style={styles.recentSkeleton}>
              {[0, 1].map(index => (
                <Skeleton
                  key={index}
                  height={OFFER_CARD_HEIGHT}
                  width={OFFER_CARD_WIDTH}
                  radius={borderRadius.lg}
                />
              ))}
            </View>
          ) : liveOffers.isError ? (
            <InlineMessage tone="warning" style={styles.offersNotice}>
              {strings.dashboard.offers.unavailable}
            </InlineMessage>
          ) : (
            <CardCarousel<Offer>
              data={liveOffers.offers}
              keyExtractor={offer => offer.id}
              itemWidth={OFFER_CARD_WIDTH}
              emptyMessage={strings.dashboard.offers.empty}
              style={styles.recentCarousel}
              contentContainerStyle={styles.recentCarouselContent}
              renderItem={offer => (
                <OfferCard
                  offer={offer}
                  compact
                  stranded={
                    isOverdueForExpiry(offer) ? 'expiry' : undefined
                  }
                  onPress={() =>
                    navigation.navigate('OfferDetails', { offerId: offer.id })
                  }
                />
              )}
            />
          )}
        </View>

      </ScrollView>
    </Screen>
  );
}

/**
 * FR-9 / FR-13 / FR-17 — the live countdown to the cut-off, how many shops have
 * submitted, and once it passes, how many were marked "No order placed".
 */
function CutoffStrip({
  nextCutoffAt,
  cutoffTime,
  submitted,
  expected,
  noOrderCount,
  onPress,
}: {
  nextCutoffAt: string;
  cutoffTime: string;
  submitted: number;
  expected: number;
  noOrderCount: number;
  onPress: () => void;
}) {
  const secondsToCutoff = Math.max(
    Math.floor((new Date(nextCutoffAt).getTime() - Date.now()) / 1000),
    0,
  );
  const { secondsLeft, restart } = useCountdown(secondsToCutoff);

  // The API always returns the *next* cut-off, so once today's has gone by it
  // points at tomorrow. Whether today's window is closed has to be asked
  // separately, or the strip would never report the freeze (FR-17).
  const passed =
    new Date(`${toApiDate(new Date())}T${cutoffTime}:00+05:30`).getTime() <
    Date.now();

  // Re-seed when a refresh moves the cut-off (a new day, or an admin change).
  React.useEffect(() => {
    restart(secondsToCutoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextCutoffAt]);

  return (
    <SectionCard
      title={strings.dashboard.cutoff.title}
      subtitle={strings.dashboard.cutoff.countdownLabel(cutoffTime)}
      actionLabel={strings.dashboard.actionOrders}
      onAction={onPress}
      style={styles.section}
    >
      <View style={styles.cutoffRow}>
        <Icon
          name={passed ? 'lock-clock' : 'timer-outline'}
          size={iconSize.lg}
          color={passed ? colors.error : colors.primary}
        />

        <View style={styles.cutoffText}>
          <AppText variant="h3" numberOfLines={2}>
            {passed
              ? strings.dashboard.cutoff.passed
              : strings.dashboard.cutoff.remaining(formatDuration(secondsLeft))}
          </AppText>
          {passed ? (
            <AppText variant="caption">
              {strings.dashboard.cutoff.remaining(formatDuration(secondsLeft))}
            </AppText>
          ) : null}
          <AppText variant="bodySecondary">
            {strings.dashboard.cutoff.submitted(submitted, expected)}
          </AppText>
          {passed && noOrderCount > 0 ? (
            <AppText variant="bodySecondary">
              {strings.dashboard.cutoff.noOrder(noOrderCount)}
            </AppText>
          ) : null}
        </View>
      </View>
    </SectionCard>
  );
}

function EmptyLine({ message }: { message: string }) {
  return (
    <AppText variant="bodySecondary" align="center" style={styles.emptyLine}>
      {message}
    </AppText>
  );
}

/** Heaviest items shown on the dashboard before "view full plan" takes over. */
const DASHBOARD_PRODUCTION_LINES = 3;

const styles = StyleSheet.create({
  content: {  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    //marginBottom: spacing.lg,
  },
  rangePicker: { flex: 1, marginLeft: spacing.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  section: { marginTop: spacing.lg },
  cutoffRow: { flexDirection: 'row', alignItems: 'center' },
  cutoffText: { flex: 1, marginLeft: spacing.md },
  moreItems: { paddingTop: spacing.md },
  viewPlan: { marginTop: spacing.md },
  recentSection: { marginTop: spacing.lg, marginBottom: spacing.lg },
  recentHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  recentTitle: { flex: 1, marginRight: spacing.sm },
  recentSubtitle: { marginTop: spacing.xxs },
  recentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    minHeight: layout.minTouchTarget,
    paddingLeft: spacing.sm,
  },
  recentActionPressed: { opacity: 0.7 },
  // Cancels the screen gutter so the strip runs edge to edge, then re-inset on
  // the content so the first card still lines up with the heading above it.
  recentCarousel: {
    marginTop: spacing.sm,
    marginHorizontal: -layout.screenPaddingHorizontal,
  },
  recentCarouselContent: {
    paddingLeft: layout.screenPaddingHorizontal,
    paddingRight: layout.screenPaddingHorizontal,
  },
  recentSkeleton: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  offersNotice: { marginTop: spacing.sm },
  quickActions: { gap: spacing.sm },
  quickAction: { width: '100%' },
  emptyLine: { paddingVertical: spacing.lg },
});
