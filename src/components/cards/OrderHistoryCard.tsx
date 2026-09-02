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
  strings,
} from '../../constants';
import { formatCurrency, formatNumber, formatShortDate } from '../../utils/format';
import type { Order } from '../../types/admin';

type OrderHistoryCardProps = {
  order: Order;
  onPress: () => void;
};

/**
 * FR-39 order history row.
 *
 * Everything an admin scans for — reference, state, delivery date, line count
 * and value — reads top to bottom inside one tap target, instead of across a
 * five-column table that has to be scrolled sideways.
 */
function OrderHistoryCard({ order, onPress }: OrderHistoryCardProps) {
  const lines = order.items.length;
  const units = order.items.reduce((total, item) => total + item.orderedQty, 0);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Order ${order.id}`}
      accessibilityHint="Opens the order detail"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <AppText variant="h3" numberOfLines={1} style={styles.reference}>
          {order.id}
        </AppText>
        <StatusBadge status={order.status} compact />
      </View>

      <View style={styles.metaRow}>
        <Meta icon="truck-delivery-outline" label={formatShortDate(order.deliveryDate)} />
        <Meta
          icon="package-variant-closed"
          label={strings.shopDetails.orderLines(lines, formatNumber(units))}
        />
      </View>

      <View style={styles.footerRow}>
        <View>
          <AppText variant="caption">{strings.shopDetails.orderValue}</AppText>
          <AppText variant="h3" numberOfLines={1}>
            {formatCurrency(order.total)}
          </AppText>
        </View>

        <View style={styles.footerRight}>
          {order.shortSupply ? (
            <View style={styles.flag}>
              <Icon
                name="alert-circle-outline"
                size={iconSize.xs}
                color={colors.warning}
              />
              <AppText variant="caption" color={colors.warning} style={styles.flagLabel}>
                {strings.shopDetails.shortSupply}
              </AppText>
            </View>
          ) : null}

          <Icon name="chevron-right" size={iconSize.lg} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

function Meta({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={iconSize.sm} color={colors.textSecondary} />
      <AppText variant="caption" numberOfLines={1} style={styles.metaLabel}>
        {label}
      </AppText>
    </View>
  );
}

export default React.memo(OrderHistoryCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...(elevation.card as object),
  },
  pressed: { opacity: 0.85 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reference: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaLabel: { marginLeft: spacing.xs },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flag: { flexDirection: 'row', alignItems: 'center' },
  flagLabel: { marginLeft: spacing.xxs },
});
