import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import { borderRadius, colors, spacing } from '../../constants';

export type BarDatum = {
  label: string;
  value: number;
  /** Right-aligned figure; falls back to the raw value. */
  valueLabel?: string;
};

type SimpleBarChartProps = {
  data: BarDatum[];
  emptyMessage: string;
  style?: ViewStyle;
};

/**
 * Horizontal bars for ranked categories (top products, ageing buckets).
 * Horizontal is deliberate: product names are long, and this way they get a
 * full line each instead of being truncated under a vertical column.
 */
export default function SimpleBarChart({
  data,
  emptyMessage,
  style,
}: SimpleBarChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.empty, style]}>
        <AppText variant="bodySecondary">{emptyMessage}</AppText>
      </View>
    );
  }

  const max = Math.max(...data.map(datum => datum.value), 1);

  return (
    <View style={style}>
      {data.map((datum, index) => (
        <View
          key={`${datum.label}-${index}`}
          style={styles.row}
          accessible
          accessibilityLabel={`${datum.label}: ${datum.valueLabel ?? datum.value}`}
        >
          <View style={styles.header}>
            <AppText variant="bodySecondary" numberOfLines={1} style={styles.label}>
              {datum.label}
            </AppText>
            <AppText variant="caption" color={colors.textPrimary}>
              {datum.valueLabel ?? String(datum.value)}
            </AppText>
          </View>

          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.max((datum.value / max) * 100, 2)}%` },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: spacing.xl, alignItems: 'center' },
  row: { marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  label: { flex: 1, marginRight: spacing.sm },
  track: {
    height: spacing.sm,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: borderRadius.circle, backgroundColor: colors.primary },
});
