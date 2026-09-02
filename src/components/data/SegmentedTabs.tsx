import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import {
  borderRadius,
  borderWidth,
  colors,
  layout,
  spacing,
} from '../../constants';

export type SegmentedTab<T extends string> = {
  key: T;
  label: string;
  /** Optional count rendered as a pill after the label. */
  badge?: number;
};

type SegmentedTabsProps<T extends string> = {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (key: T) => void;
  style?: ViewStyle;
};

/**
 * Underlined tab strip for detail screens that split one record across several
 * views. It scrolls horizontally, so adding a tab never squeezes the labels.
 */
export default function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  style,
}: SegmentedTabsProps<T>) {
  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {tabs.map(tab => {
          const selected = tab.key === value;

          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <View style={styles.labelRow}>
                <AppText
                  variant="body"
                  color={selected ? colors.primary : colors.textSecondary}
                  numberOfLines={1}
                  style={selected ? styles.selectedLabel : undefined}
                >
                  {tab.label}
                </AppText>

                {tab.badge !== undefined && tab.badge > 0 ? (
                  <View
                    style={[styles.badge, selected && styles.badgeSelected]}
                  >
                    <AppText
                      variant="caption"
                      color={selected ? colors.onPrimary : colors.textSecondary}
                    >
                      {tab.badge}
                    </AppText>
                  </View>
                ) : null}
              </View>

              <View
                style={[styles.underline, selected && styles.underlineSelected]}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.divider,
    marginBottom: spacing.lg,
  },
  row: { gap: spacing.xl, paddingRight: spacing.lg },
  tab: { minHeight: layout.minTouchTarget, justifyContent: 'flex-end' },
  pressed: { opacity: 0.6 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  selectedLabel: { fontWeight: '700' },
  badge: {
    minWidth: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.surfaceSunken,
  },
  badgeSelected: { backgroundColor: colors.primary },
  underline: { height: borderWidth.thick, backgroundColor: colors.transparent },
  underlineSelected: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: borderRadius.circle,
    borderTopRightRadius: borderRadius.circle,
  },
});
