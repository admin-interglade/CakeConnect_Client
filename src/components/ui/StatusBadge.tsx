import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from './AppText';
import { borderRadius, borderWidth, colors, layout, spacing } from '../../constants';
import {
  orderStatusLabels,
  productStatusLabels,
  shopStatusLabels,
} from '../../utils/format';
import type { OrderStatus, ProductStatus, ShopStatus } from '../../types/admin';

/** `no_order` is FR-17's "No order placed", not a stored order status. */
export type BadgeStatus = OrderStatus | ShopStatus | ProductStatus | 'no_order';

type StatusBadgeProps = {
  status: BadgeStatus;
  /** Tapping opens the status timeline on the orders list. */
  onPress?: () => void;
  compact?: boolean;
  style?: ViewStyle;
};

type Scheme = { background: string; text: string };

/**
 * One colour map for every status in the app, so an order badge on the
 * dashboard and the same badge on the orders list can never diverge.
 */
const schemes: Record<BadgeStatus, Scheme> = {
  // FR-5 — a product withdrawn for a date, distinct from INACTIVE.
  unavailable: { background: colors.warningSoft, text: colors.textPrimary },

  // Order lifecycle (FR-40).
  draft: { background: colors.surfaceSunken, text: colors.textSecondary },
  submitted: { background: colors.primarySoft, text: colors.primaryDark },
  accepted: { background: colors.primarySoft, text: colors.primaryDark },
  in_production: { background: colors.warningSoft, text: colors.warning },
  dispatched: { background: colors.warningSoft, text: colors.warning },
  delivered: { background: colors.successSoft, text: colors.success },
  invoiced: { background: colors.successSoft, text: colors.success },
  cancelled: { background: colors.errorSoft, text: colors.error },

  // Shop lifecycle (FR-3).
  active: { background: colors.successSoft, text: colors.success },
  suspended: { background: colors.warningSoft, text: colors.warning },
  inactive: { background: colors.surfaceSunken, text: colors.textSecondary },

  no_order: { background: colors.surfaceSunken, text: colors.textMuted },
};

const labels: Record<BadgeStatus, string> = {
  ...orderStatusLabels,
  ...shopStatusLabels,
  ...productStatusLabels,
  no_order: 'No order placed',
};

export default function StatusBadge({
  status,
  onPress,
  compact = false,
  style,
}: StatusBadgeProps) {
  const scheme = schemes[status] ?? schemes.draft;
  const label = labels[status] ?? status;

  const pill = (
    <View
      style={[
        styles.badge,
        compact && styles.compact,
        { backgroundColor: scheme.background, borderColor: scheme.text },
        style,
      ]}
    >
      <AppText variant="caption" color={scheme.text} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );

  if (!onPress) {
    return pill;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Status ${label}`}
      accessibilityHint="Shows the status timeline"
      hitSlop={layout.hitSlop}
    >
      {pill}
    </Pressable>
  );
}

export { labels as statusLabels };

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.circle,
    borderWidth: borderWidth.hairline,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  compact: { paddingHorizontal: spacing.xs },
});
