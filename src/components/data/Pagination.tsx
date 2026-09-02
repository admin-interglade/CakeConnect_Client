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

type PaginationProps = {
  page: number;
  limit: number;
  total: number;
  onChangePage: (page: number) => void;
  style?: ViewStyle;
};

/** Page indicator with prev/next, sized to the 44pt minimum touch target. */
export default function Pagination({
  page,
  limit,
  total,
  onChangePage,
  style,
}: PaginationProps) {
  const pageCount = Math.max(Math.ceil(total / limit), 1);
  const shown = Math.min(page * limit, total);

  if (total === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <AppText variant="caption">{strings.common.showingCount(shown, total)}</AppText>

      <View style={styles.controls}>
        <PageButton
          icon="chevron-left"
          label="Previous page"
          disabled={page <= 1}
          onPress={() => onChangePage(page - 1)}
        />

        <AppText variant="caption" style={styles.indicator}>
          {strings.common.page(page, pageCount)}
        </AppText>

        <PageButton
          icon="chevron-right"
          label="Next page"
          disabled={page >= pageCount}
          onPress={() => onChangePage(page + 1)}
        />
      </View>
    </View>
  );
}

function PageButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize.md}
        color={disabled ? colors.textMuted : colors.primary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonDisabled: { backgroundColor: colors.surfaceSunken, borderColor: colors.divider },
  pressed: { opacity: 0.8 },
  indicator: { minWidth: 80, textAlign: 'center' },
});
