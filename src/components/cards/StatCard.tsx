import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  layout,
  spacing,
} from '../../constants';

export type StatCardTone = 'default' | 'primary' | 'warning' | 'success';

type StatCardProps = {
  label: string;
  value: string;
  caption?: string;
  /** MaterialCommunityIcons glyph shown in the corner. */
  icon?: string;
  tone?: StatCardTone;
  /** Makes the whole tile a button — FR-36 tiles deep-link into their screen. */
  onPress?: () => void;
  accessibilityHint?: string;
  style?: ViewStyle;
  testID?: string;
};

const tones: Record<StatCardTone, { accent: string; background: string }> = {
  default: { accent: colors.textSecondary, background: colors.surface },
  primary: { accent: colors.primary, background: colors.surface },
  warning: { accent: colors.warning, background: colors.warningSoft },
  success: { accent: colors.success, background: colors.successSoft },
};

/** Headline figure tile used across both dashboards. */
export default function StatCard({
  label,
  value,
  caption,
  icon,
  tone = 'default',
  onPress,
  accessibilityHint,
  style,
  testID,
}: StatCardProps) {
  const scheme = tones[tone];

  const body = (
    <View style={[styles.card, { backgroundColor: scheme.background }, style]}>
      <View style={styles.header}>
        <AppText variant="caption" numberOfLines={2} style={styles.label}>
          {label}
        </AppText>
        {icon ? <Icon name={icon} size={iconSize.md} color={scheme.accent} /> : null}
      </View>

      <AppText variant="h2" color={scheme.accent} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>

      {caption ? (
        <AppText variant="caption" numberOfLines={1} style={styles.caption}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.wrapper}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, minWidth: 140 },
  card: {
    minHeight: layout.minTouchTarget * 2,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    justifyContent: 'space-between',
    ...(elevation.card as object),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: { flex: 1, marginRight: spacing.xs },
  caption: { marginTop: spacing.xxs },
  pressed: { opacity: 0.75 },
});
