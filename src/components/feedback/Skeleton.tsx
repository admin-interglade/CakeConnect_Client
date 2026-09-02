import React from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { borderRadius, colors, spacing } from '../../constants';

type SkeletonProps = {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: ViewStyle;
};

/**
 * Placeholder block shown while a list or table loads. A slow opacity pulse
 * reads as "loading" without the layout jump a spinner causes when the real
 * rows arrive.
 */
export default function Skeleton({
  height = spacing.lg,
  width = '100%',
  radius = borderRadius.sm,
  style,
}: SkeletonProps) {
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.block, { height, width, borderRadius: radius, opacity }, style]}
    />
  );
}

/** Stacked skeleton rows sized like a `DataTable` body. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <View accessibilityLabel="Loading" accessible>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton height={spacing.md} width="45%" />
          <Skeleton height={spacing.md} width="25%" style={styles.rowSecond} />
        </View>
      ))}
    </View>
  );
}

/** Skeleton shaped like the dashboard's tile grid. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={88} width="47%" radius={borderRadius.lg} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceSunken },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  rowSecond: { marginTop: spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
});
