import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { borderRadius, colors, spacing } from '../../constants';

type ProgressBarProps = {
  /** 0-100. Values outside the range are clamped. */
  value: number;
  /** Fill colour; defaults to the brand terracotta. */
  tone?: string;
  track?: string;
  height?: number;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/**
 * The single meter used for credit utilisation and any other 0-100 figure.
 *
 * A sliver of fill is always shown so an almost-zero value still reads as a
 * bar rather than an empty track.
 */
export default function ProgressBar({
  value,
  tone = colors.primary,
  track = colors.surfaceSunken,
  height = spacing.sm,
  style,
  accessibilityLabel,
}: ProgressBarProps) {
  const percent = Math.min(Math.max(value, 0), 100);

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(percent), min: 0, max: 100 }}
      style={[styles.track, { height, backgroundColor: track }, style]}
    >
      <View
        style={[
          styles.fill,
          { width: `${Math.max(percent, 2)}%`, backgroundColor: tone },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: borderRadius.circle, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: borderRadius.circle },
});
