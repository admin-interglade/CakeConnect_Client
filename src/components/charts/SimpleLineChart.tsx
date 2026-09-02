import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import { borderRadius, colors, fontSize, spacing } from '../../constants';

export type LinePoint = {
  label: string;
  value: number;
};

type SimpleLineChartProps = {
  data: LinePoint[];
  height?: number;
  /** Formats the y-axis caps and the peak marker, e.g. `formatCurrencyCompact`. */
  formatValue?: (value: number) => string;
  emptyMessage: string;
  style?: ViewStyle;
};

/**
 * Trend chart drawn as a filled column series rather than a stroked path.
 *
 * The project carries no charting or SVG dependency, and a column series
 * conveys the same day-to-day trend as a polyline while staying readable at
 * phone width. Bars are laid out with flex, so no measurement pass is needed.
 */
export default function SimpleLineChart({
  data,
  height = 160,
  formatValue = value => String(Math.round(value)),
  emptyMessage,
  style,
}: SimpleLineChartProps) {
  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }, style]}>
        <AppText variant="bodySecondary">{emptyMessage}</AppText>
      </View>
    );
  }

  const max = Math.max(...data.map(point => point.value), 1);
  const peakIndex = data.findIndex(point => point.value === max);

  // Past a couple of weeks the labels collide, so thin them to first/mid/last.
  const labelStride = Math.max(Math.ceil(data.length / 4), 1);

  return (
    <View style={style}>
      <View style={styles.axisRow}>
        <AppText variant="caption">{formatValue(max)}</AppText>
        <AppText variant="caption">{formatValue(0)}</AppText>
      </View>

      <View
        style={[styles.plot, { height }]}
        accessible
        accessibilityLabel={`Trend chart, peak ${formatValue(max)} on ${data[peakIndex]?.label}`}
      >
        {data.map((point, index) => (
          <View key={`${point.label}-${index}`} style={styles.column}>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max((point.value / max) * (height - spacing.lg), 2),
                  backgroundColor: index === peakIndex ? colors.primary : colors.primarySoft,
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.labels}>
        {data.map((point, index) => (
          <View key={`label-${point.label}-${index}`} style={styles.column}>
            {index % labelStride === 0 || index === data.length - 1 ? (
              <AppText variant="caption" numberOfLines={1} style={styles.label}>
                {point.label}
              </AppText>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xxs,
  },
  column: { flex: 1, alignItems: 'center' },
  bar: {
    width: '70%',
    minWidth: 3,
    borderTopLeftRadius: borderRadius.xs,
    borderTopRightRadius: borderRadius.xs,
  },
  labels: { flexDirection: 'row', marginTop: spacing.xs },
  label: { fontSize: fontSize.xxs },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: borderRadius.md,
  },
});
