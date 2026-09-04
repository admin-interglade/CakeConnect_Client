import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { AppText, Icon } from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  layout,
  spacing,
} from '../../../constants';

export type QuickAction = {
  key: string;
  label: string;
  /** MaterialCommunityIcons glyph. */
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  /** Shows a spinner in place of the glyph — "Repeat Last" hits the network. */
  busy?: boolean;
};

type QuickActionGridProps = {
  actions: QuickAction[];
};

/**
 * The 2×2 grid of things a shop does every day.
 *
 * Two per row is deliberate: at four-up the labels truncate, and these are the
 * shortcuts someone reaches for without reading carefully. Each tile is a full
 * touch target rather than an icon with a caption under it.
 */
export default function QuickActionGrid({ actions }: QuickActionGridProps) {
  return (
    <View style={styles.grid}>
      {actions.map(action => (
        <Pressable
          key={action.key}
          onPress={action.onPress}
          disabled={action.disabled || action.busy}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          accessibilityState={{
            disabled: Boolean(action.disabled),
            busy: Boolean(action.busy),
          }}
          hitSlop={layout.hitSlop}
          style={({ pressed }) => [
            styles.tile,
            action.disabled && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.icon}>
            {action.busy ? (
              <ActivityIndicator size={iconSize.md} color={colors.primary} />
            ) : (
              <Icon name={action.icon} size={iconSize.md} color={colors.primary} />
            )}
          </View>

          <AppText variant="body" numberOfLines={1} style={styles.label}>
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    // Just under half, so two sit per row with the gap between them.
    flexBasis: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: layout.minTouchTarget + spacing.sm,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
});
