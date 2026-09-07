import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import StatusBadge, { statusSchemes } from '../ui/StatusBadge';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  spacing,
  strings,
} from '../../constants';
import { formatCurrency, formatShortDate } from '../../utils/format';
import type { Order } from '../../types/admin';

/** Fixed so the parent carousel can snap cleanly from one card to the next. */
export const ORDER_CARD_WIDTH = 258;

/**
 * Fixed too, so a two-word shop name and a long one sit at the same height.
 * Every text block below is capped with `numberOfLines`, and the slack between
 * the meta line and the footer is taken up by a flexing spacer, so the card
 * never grows or shrinks with its content.
 */
export const ORDER_CARD_HEIGHT = 156;

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
  // The badge's own colour, reused as a spine down the card edge, so the strip
  // can be read by status at a glance without a second legend.
  const accent = statusSchemes[order.status]?.text ?? colors.primary;
  const itemCount = order.items?.length ?? 0;

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
      {/* The clipped surface is nested inside the elevated one: `overflow`
          hidden on a shadowed view masks its layer on iOS, and the shadow
          goes with it. */}
      <View style={styles.surface}>
        <View style={[styles.accent, { backgroundColor: accent }]} />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <View style={styles.orderChip}>
              <AppText
                variant="caption"
                color={colors.primaryDark}
                numberOfLines={1}
              >
                {order.orderNumber}
              </AppText>
            </View>
            <StatusBadge status={order.status} compact />
          </View>

          <View style={styles.shopRow}>
            <AppText variant="h3" numberOfLines={1} style={styles.shop}>
              {order.shopName}
            </AppText>
            <Icon
              name="chevron-right"
              size={iconSize.md}
              color={colors.textMuted}
            />
          </View>

          <AppText variant="caption" numberOfLines={1}>
            {itemCount > 0
              ? `${order.shopCode} · ${strings.dashboard.recent.items(itemCount)}`
              : order.shopCode}
          </AppText>

          <View style={styles.spacer} />
          <View style={styles.divider} />

          <View style={styles.footer}>
            <View style={styles.delivery}>
              <Icon
                name="truck-outline"
                size={iconSize.sm}
                color={colors.textMuted}
              />
              <AppText
                variant="caption"
                numberOfLines={1}
                style={styles.deliveryLabel}
              >
                {formatShortDate(order.deliveryDate)}
              </AppText>
            </View>

            <AppText variant="h3" numberOfLines={1}>
              {formatCurrency(order.total)}
            </AppText>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(OrderSummaryCard);

const styles = StyleSheet.create({
  card: {
    width: ORDER_CARD_WIDTH,
    height: ORDER_CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...(elevation.card as object),
  },
  surface: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
  accent: { width: 4 },
  body: { flex: 1, padding: spacing.md },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  orderChip: {
    flexShrink: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.circle,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  shop: { flex: 1, marginRight: spacing.xs },
  /** Absorbs the difference between a one- and two-line block above it. */
  spacer: { flex: 1, minHeight: spacing.sm },
  divider: {
    height: borderWidth.hairline,
    backgroundColor: colors.divider,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  delivery: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  deliveryLabel: { marginLeft: spacing.xs },
});
