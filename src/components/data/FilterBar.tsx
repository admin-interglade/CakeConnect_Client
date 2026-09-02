import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../constants';

type FilterBarProps = {
  /** The always-visible row — usually the search field. */
  primary: React.ReactNode;
  /** Revealed by the Filters toggle, so the list keeps its vertical space. */
  children?: React.ReactNode;
  /** Count of non-default filters; drives the badge and the clear action. */
  activeCount?: number;
  onClear?: () => void;
  style?: ViewStyle;
};

/**
 * Collapsible filter surface shared by the shops and orders lists. Filters stay
 * hidden until asked for because on a phone the rows matter more than the
 * controls, but the active count keeps the hidden state honest.
 */
export default function FilterBar({
  primary,
  children,
  activeCount = 0,
  onClear,
  style,
}: FilterBarProps) {
  const [expanded, setExpanded] = React.useState(false);
  const hasFilters = Boolean(children);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.primaryRow}>
        <View style={styles.primary}>{primary}</View>

        {hasFilters ? (
          <Pressable
            onPress={() => setExpanded(current => !current)}
            accessibilityRole="button"
            accessibilityLabel={strings.common.filters}
            accessibilityState={{ expanded }}
            hitSlop={layout.hitSlop}
            style={({ pressed }) => [
              styles.toggle,
              expanded && styles.toggleActive,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              name="tune-variant"
              size={iconSize.md}
              color={expanded ? colors.onPrimary : colors.textSecondary}
            />
            {activeCount > 0 ? (
              <View style={styles.badge}>
                <AppText variant="caption" color={colors.onPrimary}>
                  {activeCount}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {hasFilters && expanded ? (
        <View style={styles.panel}>
          {children}

          {activeCount > 0 && onClear ? (
            <Pressable
              onPress={onClear}
              accessibilityRole="button"
              accessibilityLabel={strings.common.clearFilters}
              hitSlop={layout.hitSlop}
              style={styles.clear}
            >
              <AppText variant="link">{strings.common.clearFilters}</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  primary: { flex: 1 },
  toggle: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  badge: {
    position: 'absolute',
    top: -spacing.xs,
    right: -spacing.xs,
    minWidth: spacing.lg,
    height: spacing.lg,
    paddingHorizontal: spacing.xxs,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.circle,
    backgroundColor: colors.error,
  },
  panel: { marginTop: spacing.md, gap: spacing.md },
  clear: { alignSelf: 'flex-start', minHeight: layout.minTouchTarget, justifyContent: 'center' },
});
