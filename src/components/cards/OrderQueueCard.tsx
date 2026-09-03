import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import StatusBadge, { type BadgeStatus } from '../ui/StatusBadge';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  spacing,
  strings,
} from '../../constants';
import {
  formatCurrency,
  formatRelativeTime,
  orderStatusLabels,
} from '../../utils/format';
import type { Order } from '../../types/admin';

type OrderQueueCardProps = {
  order: Order;
  onPress: () => void;
  /** Overrides the badge, e.g. FR-17's "No order placed" placeholder rows. */
  badgeStatus?: BadgeStatus;
  /** Opens the FR-40 status timeline behind the badge. */
  onStatusPress?: () => void;
  /** Enters the multi-select mode the bulk actions run on. */
  onLongPress?: () => void;
  selected?: boolean;
  /** FR-40 one-tap transition, shown only where the queue offers one. */
  quickActionLabel?: string;
  onQuickAction?: () => void;
  quickActionLoading?: boolean;
  /** FR-17 placeholder rows have no order behind them, so nothing to open. */
  disabled?: boolean;
};

/**
 * FR-40 queue row.
 *
 * The queue is scanned on a phone, so each order is a card rather than a
 * six-column table row: who ordered, what state it is in, how long it has sat
 * there, and — where one exists — the single action that moves it on.
 */
function OrderQueueCard({
  order,
  onPress,
  badgeStatus,
  onStatusPress,
  onLongPress,
  selected = false,
  quickActionLabel,
  onQuickAction,
  quickActionLoading = false,
  disabled = false,
}: OrderQueueCardProps) {
  const items = order.items.length;
  // The queue's "how long has this been waiting" is measured from the last
  // transition, which is the newest entry in the history.
  const latest = order.statusHistory[order.statusHistory.length - 1];

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={onLongPress}
      disabled={disabled && !onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${order.shopName}, ${order.id}`}
      accessibilityState={{ selected }}
      accessibilityHint={disabled ? undefined : 'Opens the order detail'}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.identity}>
          <AppText variant="h3" numberOfLines={1}>
            {order.shopName}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {order.id}
          </AppText>
        </View>

        {selected ? (
          <Icon name="check-circle" size={iconSize.lg} color={colors.primary} />
        ) : (
          <StatusBadge
            status={badgeStatus ?? order.status}
            onPress={onStatusPress}
            compact
          />
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <AppText variant="inputLabel">{strings.orders.itemsAndValue}</AppText>
          <AppText variant="body" numberOfLines={1} style={styles.metaValue}>
            {strings.orders.itemsAndValueCount(items, formatCurrency(order.total))}
          </AppText>
        </View>

        {latest ? (
          <AppText variant="caption" align="right" numberOfLines={2} style={styles.age}>
            {strings.orders.statusAgo(
              orderStatusLabels[latest.status],
              formatRelativeTime(latest.at),
            )}
          </AppText>
        ) : null}
      </View>

      {quickActionLabel && onQuickAction ? (
        <AppButton
          label={quickActionLabel}
          onPress={onQuickAction}
          loading={quickActionLoading}
          style={styles.action}
        />
      ) : null}
    </Pressable>
  );
}

export default React.memo(OrderQueueCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...(elevation.card as object),
  },
  selected: { borderColor: colors.primary, borderWidth: borderWidth.thin },
  pressed: { opacity: 0.85 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1 },
  divider: {
    height: borderWidth.hairline,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  metaLeft: { flex: 1 },
  metaValue: { marginTop: spacing.xxs },
  age: { flexShrink: 0 },
  action: { marginTop: spacing.md },
});
