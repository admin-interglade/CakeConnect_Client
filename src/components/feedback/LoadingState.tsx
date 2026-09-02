import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import AppText from '../ui/AppText';
import { colors, spacing, strings } from '../../constants';

type LoadingStateProps = {
  label?: string;
  /** Fills the remaining space and centres — used on detail screens. */
  fullscreen?: boolean;
  style?: ViewStyle;
};

/** Centred spinner for detail screens; lists use `SkeletonList` instead. */
export default function LoadingState({
  label = strings.common.loading,
  fullscreen = true,
  style,
}: LoadingStateProps) {
  return (
    <View
      style={[styles.container, fullscreen && styles.fullscreen, style]}
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="bodySecondary" style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  fullscreen: { flex: 1 },
  label: { marginTop: spacing.md },
});
