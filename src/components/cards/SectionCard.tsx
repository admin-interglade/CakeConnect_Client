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

type SectionCardProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned text action, e.g. "Export for kitchen". */
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Removes the inner padding for edge-to-edge children such as tables. */
  flush?: boolean;
};

/** Titled surface that groups a dashboard or detail block. */
export default function SectionCard({
  title,
  subtitle,
  actionLabel,
  onAction,
  actionIcon,
  children,
  style,
  flush = false,
}: SectionCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <AppText variant="h3" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" numberOfLines={2} style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={layout.hitSlop}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            {actionIcon ? (
              <Icon name={actionIcon} size={iconSize.sm} color={colors.primary} />
            ) : null}
            <AppText variant="link" style={styles.actionLabel}>
              {actionLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={flush ? undefined : styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...(elevation.card as object),
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  titleBlock: { flex: 1, marginRight: spacing.sm },
  subtitle: { marginTop: spacing.xxs },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingLeft: spacing.sm,
  },
  actionLabel: { marginLeft: spacing.xs },
  pressed: { opacity: 0.7 },
  body: { marginTop: spacing.md },
});
