import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, InlineMessage, Skeleton } from '../../../components';
import { borderRadius, colors, spacing, strings } from '../../../constants';
import { formatCurrencyCompact } from '../../../utils/format';
import type { ShopCredit, ShopDashboard } from '../../../types/shop';

type FinancialSummaryProps = {
  dashboard?: ShopDashboard;
  credit?: ShopCredit;
  loading?: boolean;
  /** False when the figures could not be loaded at all. */
  available: boolean;
};

/**
 * FR-20 — outstanding, available credit and what has been paid this month.
 *
 * Three tiles rather than the PRD's six: this is a glance, and the full set
 * with its FR-19 range selector lives on the statement. "Paid (Mo)" is the
 * month to date, which is why the dashboard behind it is queried for the
 * month rather than for a range the shop picks here.
 *
 * A figure the server did not send renders as "Not available", never as zero.
 * Zero is a claim — "you owe nothing" — and it is the wrong one to make on
 * someone's behalf.
 */
export default function FinancialSummary({
  dashboard,
  credit,
  loading = false,
  available,
}: FinancialSummaryProps) {
  if (loading) {
    return (
      <View style={styles.row}>
        {[0, 1, 2].map(key => (
          <View key={key} style={styles.tile}>
            <Skeleton height={spacing.md} width="70%" />
            <Skeleton height={spacing.xl} width="85%" style={styles.skeletonGap} />
          </View>
        ))}
      </View>
    );
  }

  if (!available) {
    return (
      <InlineMessage tone="error">
        {strings.shopHome.financialUnavailable}
      </InlineMessage>
    );
  }

  // The dashboard and the outstanding route both report these; the dashboard
  // is the one scoped to the month on screen, so it leads.
  const outstanding = dashboard?.currentOutstanding ?? credit?.currentOutstanding;
  const availableCredit = dashboard?.availableCredit ?? credit?.availableCredit;
  const limit = credit?.creditLimit ?? dashboard?.shop.creditLimit;
  const paid = dashboard?.amountPaid;

  return (
    <View style={styles.row}>
      <Tile
        label={strings.shopHome.financial.outstanding}
        value={outstanding}
        tone={outstanding && outstanding > 0 ? colors.error : colors.textPrimary}
      />
      <Tile
        label={strings.shopHome.financial.availableCredit}
        value={availableCredit}
        caption={
          limit && limit > 0
            ? strings.shopHome.financial.limit(formatCurrencyCompact(limit))
            : strings.shopHome.financial.noLimit
        }
      />
      <Tile label={strings.shopHome.financial.paidThisMonth} value={paid} />
    </View>
  );
}

function Tile({
  label,
  value,
  caption,
  tone = colors.textPrimary,
}: {
  label: string;
  /** Undefined means the payload did not carry it — not that it is zero. */
  value?: number;
  caption?: string;
  tone?: string;
}) {
  return (
    <View style={styles.tile}>
      <AppText variant="caption" numberOfLines={1}>
        {label}
      </AppText>

      {value === undefined ? (
        <AppText variant="body" color={colors.textMuted} style={styles.value}>
          {strings.shopHome.financial.unavailable}
        </AppText>
      ) : (
        <AppText variant="h3" color={tone} numberOfLines={1} style={styles.value}>
          {/* Two decimals: these are amounts a shop reconciles against its
              statement, and one decimal hides up to ₹5,000 of a lakh. */}
          {formatCurrencyCompact(value, { precision: 2 })}
        </AppText>
      )}

      {caption ? (
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  value: { marginTop: spacing.xs },
  skeletonGap: { marginTop: spacing.sm },
});
