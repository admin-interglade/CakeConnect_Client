import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  Screen,
  ScreenHeader,
  SkeletonList,
} from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import { useNotifications, defaultNotificationPagination } from '../../../hooks';
import { formatRelativeTime } from '../../../utils/format';
import type { AppNotification, NotificationType } from '../../../types/shop';
import type {
  ShopHomeStackParamList,
  ShopTabParamList,
} from '../../../navigation/types';

type Navigation = StackNavigationProp<ShopHomeStackParamList> &
  BottomTabNavigationProp<ShopTabParamList>;

/** FR-44 — a glyph per event, so the list scans without reading every title. */
const ICONS: Record<NotificationType, string> = {
  cutoffReminder: 'timer-outline',
  orderSubmitted: 'send-outline',
  orderAccepted: 'check-circle-outline',
  orderInProduction: 'chef-hat',
  orderDispatched: 'truck-outline',
  orderDelivered: 'truck-check-outline',
  invoiceGenerated: 'file-document-outline',
  paymentSuccess: 'cash-check',
  paymentFailed: 'cash-remove',
  paymentOverdue: 'alert-circle-outline',
  newOffer: 'tag-outline',
  creditLimitWarning: 'credit-card-off-outline',
};

/**
 * FR-43 / FR-44 — the notification centre.
 *
 * Tapping a row marks it read and, where the payload names one, opens the thing
 * it is about. The banner at the top is not decoration: FR-43 asks for push
 * with SMS fallback, and neither is wired anywhere, so these arrive when the
 * app is opened rather than on a locked phone. A shop relying on a cut-off
 * reminder needs to know that. See docs/api-gaps.md G21.
 */
export default function NotificationsScreen() {
  const navigation = useNavigation<Navigation>();

  const {
    notifications,
    unreadCount,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    markRead,
    markAllRead,
    isMarkingAll,
  } = useNotifications(defaultNotificationPagination);

  /**
   * The backend attaches a free-form `data` payload per event. Only the keys
   * that actually route anywhere are read, and an unrecognised payload simply
   * marks the row read rather than navigating somewhere arbitrary.
   */
  const open = (notification: AppNotification) => {
    if (!notification.isRead) {
      markRead(notification.id);
    }

    const data = notification.data ?? {};
    const orderId = typeof data.orderId === 'string' ? data.orderId : undefined;
    const invoiceId = typeof data.invoiceId === 'string' ? data.invoiceId : undefined;
    const offerId = typeof data.offerId === 'string' ? data.offerId : undefined;

    if (invoiceId) {
      navigation.navigate('InvoiceDetails', { invoiceId });
      return;
    }
    if (offerId || notification.type === 'newOffer') {
      navigation.navigate('Offers', offerId ? { offerId } : undefined);
      return;
    }
    // An order lives in the Orders tab's own stack, so this crosses navigators
    // rather than pushing onto the home stack — a notification about an order
    // should open that order, not drop the reader on a list to find it.
    if (orderId) {
      navigation.navigate('OrdersTab', {
        screen: 'ShopOrderDetails',
        params: { orderId },
      });
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title={strings.notifications.title}
        subtitle={
          unreadCount > 0 ? strings.notifications.unread(unreadCount) : undefined
        }
        onBack={navigation.canGoBack() ? navigation.goBack : undefined}
        actions={[
          {
            icon: 'cog-outline',
            label: strings.notifications.settingsTitle,
            // Settings live in the More tab; this screen is reachable from
            // both Home and More, so it crosses to the tab that owns them.
            onPress: () =>
              navigation.navigate('MoreTab', { screen: 'NotificationSettings' }),
          },
        ]}
      />

      {isLoading && notifications.length === 0 ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <InlineMessage tone="info">
                {strings.notifications.pushUnavailable}
              </InlineMessage>
              {unreadCount > 0 ? (
                <AppButton
                  label={strings.notifications.markAllRead}
                  icon="email-open-outline"
                  variant="outline"
                  onPress={markAllRead}
                  loading={isMarkingAll}
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => open(item)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="bell-outline"
              title={strings.notifications.empty}
              message={strings.notifications.emptyMessage}
            />
          }
        />
      )}
    </Screen>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: AppNotification;
  onPress: () => void;
}) {
  const critical =
    notification.category === 'financial' || notification.category === 'cutoff';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      accessibilityHint={notification.body}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [
        styles.row,
        !notification.isRead && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, critical && styles.iconCritical]}>
        <Icon
          name={ICONS[notification.type]}
          size={iconSize.md}
          color={critical ? colors.warning : colors.primary}
        />
      </View>

      <View style={styles.body}>
        <AppText variant={notification.isRead ? 'body' : 'h3'} numberOfLines={2}>
          {notification.title}
        </AppText>
        <AppText variant="bodySecondary" numberOfLines={3}>
          {notification.body}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {notification.createdAt
            ? formatRelativeTime(notification.createdAt)
            : ''}
        </AppText>
      </View>

      {!notification.isRead ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingBottom: spacing.md },
  list: {
    paddingBottom: spacing.giant,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.primary, backgroundColor: colors.surfaceMuted },
  pressed: { opacity: 0.85 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCritical: { backgroundColor: colors.warningSoft },
  body: { flex: 1, gap: spacing.xxs },
  dot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
  },
});
