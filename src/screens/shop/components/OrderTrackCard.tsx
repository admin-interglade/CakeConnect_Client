import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon, Skeleton } from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import { orderStatusLabels } from '../../../utils/format';
import type { Order } from '../../../types/admin';

type OrderTrackCardProps = {
  today?: Order;
  tomorrow?: Order;
  loading?: boolean;
  /** False when the lookup failed, as opposed to there being no order. */
  available: boolean;
  /** Whether tomorrow's cut-off has passed. Today's always has. */
  tomorrowCutoffPassed?: boolean;
  onOpen: (orderId: string) => void;
};

/**
 * FR-22 — where today's and tomorrow's orders stand, in two lines.
 *
 * The status carries its own colour rather than a badge: two badges stacked in
 * a small card read as chips to tap, and only the row is tappable.
 *
 * "No order" and "Not available" are deliberately different strings. The first
 * is a fact about the shop's day; the second is a fact about the request. A
 * card that showed "No order" because a fetch failed would tell a shop it had
 * forgotten to order when it had not.
 *
 * Each row reads its order against that day's cut-off. Today's has always
 * passed, so a draft there was never sent and an empty day had no order
 * placed; tomorrow's reads the same way once its own cut-off passes.
 */
export default function OrderTrackCard({
  today,
  tomorrow,
  loading = false,
  available,
  tomorrowCutoffPassed = false,
  onOpen,
}: OrderTrackCardProps) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Skeleton height={spacing.lg} />
        <Skeleton height={spacing.lg} style={styles.skeletonGap} />
      </View>
    );
  }

  if (!available) {
    return (
      <View style={styles.card}>
        <Row label={strings.shopHome.track.today} unavailable />
        <Row label={strings.shopHome.track.tomorrow} unavailable last />
      </View>
    );
  }

  if (!today && !tomorrow) {
    return (
      <View style={styles.card}>
        <AppText variant="bodySecondary">{strings.shopHome.track.empty}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Row
        label={strings.shopHome.track.today}
        order={today}
        cutoffPassed
        onPress={today ? () => onOpen(today.id) : undefined}
      />
      <Row
        label={strings.shopHome.track.tomorrow}
        order={tomorrow}
        cutoffPassed={tomorrowCutoffPassed}
        onPress={tomorrow ? () => onOpen(tomorrow.id) : undefined}
        last
      />
    </View>
  );
}

/** The FR-40 stages, coloured by how far along the pipeline they are. */
const statusTone: Record<Order['status'], string> = {
  draft: colors.warning,
  submitted: colors.primary,
  accepted: colors.primary,
  in_production: colors.warning,
  dispatched: colors.success,
  delivered: colors.success,
  invoiced: colors.success,
  cancelled: colors.error,
};

function Row({
  label,
  order,
  unavailable = false,
  cutoffPassed = false,
  last = false,
  onPress,
}: {
  label: string;
  order?: Order;
  unavailable?: boolean;
  cutoffPassed?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  // FR-10 — a draft still unsent at its cut-off was never placed.
  const missed = order?.status === 'draft' && cutoffPassed;

  const status = unavailable
    ? strings.shopHome.track.unavailable
    : missed
      ? strings.shopHome.track.notSubmitted
      : order
        ? orderStatusLabels[order.status]
        : cutoffPassed
          ? strings.shopHome.track.noOrderPlaced
          : strings.shopHome.track.notPlacedYet;

  const tone = unavailable
    ? colors.textMuted
    : missed
      ? colors.error
      : order
        ? statusTone[order.status]
        : colors.textMuted;

  const body = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <AppText variant="body" style={styles.label} numberOfLines={1}>
        {label}
      </AppText>

      <View style={styles.status}>
        {order ? <View style={[styles.dot, { backgroundColor: tone }]} /> : null}
        <AppText variant="body" color={tone} numberOfLines={1}>
          {status}
        </AppText>
        {onPress ? (
          <Icon
            name="chevron-right"
            size={iconSize.sm}
            color={colors.textMuted}
          />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${status}`}
      accessibilityHint={strings.shopOrders.detailTitle}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: layout.minTouchTarget,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  pressed: { opacity: 0.7 },
  label: { flex: 1 },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: borderRadius.circle },
  skeletonGap: { marginTop: spacing.md },
});
