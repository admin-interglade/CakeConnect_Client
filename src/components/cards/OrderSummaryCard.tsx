import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import StatusBadge from '../ui/StatusBadge';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  spacing,
} from '../../constants';
import { formatCurrency, formatShortDate } from '../../utils/format';
import type { Order } from '../../types/admin';

/** Fixed so the parent carousel can snap cleanly from one card to the next. */
export const ORDER_CARD_WIDTH = 240;

type OrderSummaryCardProps = {
  order: Order;
  onPress: () => void;
};

/**
 * Compact order card for the dashboard's recent-activity strip.
 *
 * Carries only what someone glancing at the dashboard needs — who ordered,
 * how much, and where it sits in the FR-40 flow. The full picture is one tap
 * away on the order detail, so nothing here needs to be exhaustive.
 */
function OrderSummaryCard({ order, onPress }: OrderSummaryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.orderNumber}, ${order.shopName}, ${formatCurrency(
        order.total,
      )}`}
      accessibilityHint="Opens the order detail"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <AppText variant="caption" color={colors.primary}>
          {order.orderNumber}
        </AppText>
        <Icon name="chevron-right" size={iconSize.sm} color={colors.textMuted} />
      </View>

      <AppText variant="h3" numberOfLines={2} style={styles.shop}>
        {order.shopName}
      </AppText>

      <AppText variant="caption" numberOfLines={1}>
        {`${order.shopCode} · ${formatShortDate(order.deliveryDate)}`}
      </AppText>

      <View style={styles.footer}>
        <AppText variant="h3" numberOfLines={1}>
          {formatCurrency(order.total)}
        </AppText>
        <StatusBadge status={order.status} compact style={styles.badge} />
      </View>
    </Pressable>
  );
}

export default React.memo(OrderSummaryCard);

const styles = StyleSheet.create({
  card: {
    width: ORDER_CARD_WIDTH,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...(elevation.card as object),
  },
  pressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  shop: { marginBottom: spacing.xxs },
  footer: { marginTop: spacing.md },
  badge: { marginTop: spacing.xs },
});
