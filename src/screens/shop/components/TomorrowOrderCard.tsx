import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppText, Icon, Skeleton, StatusBadge } from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../../constants';
import { formatCurrency, formatDuration, formatShortDate } from '../../../utils/format';
import type { Order } from '../../../types/admin';

type TomorrowOrderCardProps = {
  /** The draft or submitted order for tomorrow, if one exists. */
  order?: Order;
  /** `YYYY-MM-DD`; absent while the effective cut-off is still loading. */
  deliveryDate?: string;
  secondsToCutoff: number;
  cutoffPassed: boolean;
  /** False when the cut-off lookup failed, as opposed to having passed. */
  cutoffAvailable: boolean;
  /** True while either the order or the cut-off is still in flight. */
  loading?: boolean;
  onPlaceOrder: () => void;
  onContinueOrder: () => void;
  onViewOrder: () => void;
};

/** Under half an hour left is worth colouring differently. */
const URGENT_SECONDS = 30 * 60;

/**
 * The hero card: what is happening with tomorrow's order, and the one action
 * that follows from it.
 *
 * Three states, and the action changes with each because the next step does:
 *
 *   nothing yet  -> "Place Order", into the catalogue
 *   draft        -> "Continue Order", into the cart
 *   submitted    -> "View Order", into the order detail
 *
 * The cut-off sits between the date and the action for a reason: it is the
 * constraint that makes the action urgent, and burying it below the button
 * would be showing someone a deadline after they have already decided.
 *
 * A failed cut-off lookup says so rather than falling back to "passed" — those
 * mean opposite things, and defaulting to the pessimistic one would tell a shop
 * that ordering is closed when it is not.
 */
export default function TomorrowOrderCard({
  order,
  deliveryDate,
  secondsToCutoff,
  cutoffPassed,
  cutoffAvailable,
  loading = false,
  onPlaceOrder,
  onContinueOrder,
  onViewOrder,
}: TomorrowOrderCardProps) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Skeleton height={spacing.lg} width="55%" />
        <Skeleton height={spacing.xxl} width="45%" style={styles.skeletonGap} />
        <Skeleton height={48} radius={borderRadius.md} style={styles.skeletonGap} />
      </View>
    );
  }

  const submitted = Boolean(order) && order?.status !== 'draft';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppText variant="kicker">{strings.shopHome.tomorrow.kicker}</AppText>
        {order ? <StatusBadge status={order.status} compact /> : null}
      </View>

      <AppText variant="h1" style={styles.date}>
        {deliveryDate
          ? formatShortDate(deliveryDate)
          : strings.shopHome.tomorrow.dateUnknown}
      </AppText>

      {submitted && order ? (
        /* Once submitted, the value is the fact that matters and the countdown
           becomes context — so they sit on one row, value first. */
        <View style={styles.valueRow}>
          <View>
            <AppText variant="caption">
              {strings.shopHome.tomorrow.orderValue}
            </AppText>
            <AppText variant="h2" style={styles.value}>
              {order.total > 0
                ? formatCurrency(order.total)
                : strings.shopHome.tomorrow.valueUnavailable}
            </AppText>
          </View>
          <Cutoff
            secondsToCutoff={secondsToCutoff}
            passed={cutoffPassed}
            available={cutoffAvailable}
            align="right"
          />
        </View>
      ) : (
        <Cutoff
          secondsToCutoff={secondsToCutoff}
          passed={cutoffPassed}
          available={cutoffAvailable}
        />
      )}

      {!order ? (
        <AppText variant="bodySecondary" style={styles.empty}>
          {cutoffPassed
            ? strings.shopHome.tomorrow.closed
            : strings.shopHome.tomorrow.noneMessage}
        </AppText>
      ) : null}

      {submitted ? (
        <AppButton
          label={strings.shopHome.tomorrow.viewOrder}
          variant="outline"
          onPress={onViewOrder}
          style={styles.action}
        />
      ) : (
        <AppButton
          label={
            order
              ? strings.shopHome.tomorrow.continueOrder
              : strings.shopHome.tomorrow.placeOrder
          }
          onPress={order ? onContinueOrder : onPlaceOrder}
          // FR-10 — after the cut-off tomorrow's order is closed to edits.
          disabled={cutoffPassed}
          style={styles.action}
        />
      )}
    </View>
  );
}

function Cutoff({
  secondsToCutoff,
  passed,
  available,
  align = 'left',
}: {
  secondsToCutoff: number;
  passed: boolean;
  available: boolean;
  align?: 'left' | 'right';
}) {
  if (!available) {
    return (
      <View style={[styles.cutoff, align === 'right' && styles.cutoffRight]}>
        <Icon
          name="clock-alert-outline"
          size={iconSize.sm}
          color={colors.textMuted}
        />
        <AppText variant="caption" color={colors.textMuted}>
          {strings.shopHome.tomorrow.cutoffUnavailable}
        </AppText>
      </View>
    );
  }

  const urgent = !passed && secondsToCutoff <= URGENT_SECONDS;
  const tone = passed ? colors.error : urgent ? colors.error : colors.primary;

  return (
    <View style={[styles.cutoff, align === 'right' && styles.cutoffRight]}>
      <Icon
        name={passed ? 'lock-clock' : 'clock-outline'}
        size={iconSize.sm}
        color={tone}
      />
      <AppText variant="caption" color={tone}>
        {passed
          ? strings.shopHome.tomorrow.cutoffPassed
          : strings.shopHome.tomorrow.cutoffIn(formatDuration(secondsToCutoff))}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  date: { marginTop: spacing.xs },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  value: { marginTop: spacing.xxs },
  cutoff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cutoffRight: { marginTop: 0 },
  empty: { marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
  skeletonGap: { marginTop: spacing.md },
});
