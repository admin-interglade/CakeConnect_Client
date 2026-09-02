import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../constants';
import { formatCurrency, formatShortDate } from '../../utils/format';
import type { LedgerEntry } from '../../types/admin';

type LedgerEntryCardProps = {
  entry: LedgerEntry;
  /** Hides the running balance on the payments view, where it adds noise. */
  showBalance?: boolean;
};

type Presentation = { icon: string; tint: string; background: string };

const presentation: Record<LedgerEntry['type'], Presentation> = {
  order: {
    icon: 'clipboard-text-outline',
    tint: colors.primary,
    background: colors.primarySoft,
  },
  invoice: {
    icon: 'file-document-outline',
    tint: colors.primary,
    background: colors.primarySoft,
  },
  payment: {
    icon: 'cash-check',
    tint: colors.success,
    background: colors.successSoft,
  },
  credit_note: {
    icon: 'receipt-text-outline',
    tint: colors.success,
    background: colors.successSoft,
  },
  adjustment: {
    icon: 'tune-variant',
    tint: colors.warning,
    background: colors.warningSoft,
  },
};

/**
 * FR-23 / FR-39 ledger row.
 *
 * Replaces the horizontally scrolling table: the entry type is carried by a
 * tinted glyph, money in is green against neutral money out, and the running
 * balance sits under the amount so no column has to be scrolled into view.
 */
function LedgerEntryCard({ entry, showBalance = true }: LedgerEntryCardProps) {
  const scheme = presentation[entry.type] ?? presentation.order;
  // Negative amounts reduce what the shop owes, so they read as money in.
  const isCredit = entry.amount < 0;

  return (
    <View style={styles.card}>
      <View style={[styles.glyph, { backgroundColor: scheme.background }]}>
        <Icon name={scheme.icon} size={iconSize.md} color={scheme.tint} />
      </View>

      <View style={styles.body}>
        <AppText variant="body" numberOfLines={1} style={styles.title}>
          {entry.description}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {`${strings.shopDetails.ledgerTypes[entry.type]} · ${entry.reference}`}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {formatShortDate(entry.date)}
        </AppText>
      </View>

      <View style={styles.amountBlock}>
        <AppText
          variant="body"
          align="right"
          color={isCredit ? colors.success : colors.textPrimary}
          numberOfLines={1}
          style={styles.amount}
        >
          {`${isCredit ? '' : '+'}${formatCurrency(entry.amount)}`}
        </AppText>

        {showBalance ? (
          <AppText variant="caption" align="right" numberOfLines={1}>
            {strings.shopDetails.balanceAfter(formatCurrency(entry.runningBalance))}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export default React.memo(LedgerEntryCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.circle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1, marginRight: spacing.sm },
  title: { fontWeight: '600' },
  amountBlock: { alignItems: 'flex-end', maxWidth: 130 },
  amount: { fontWeight: '700' },
});
