import React from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  controlHeight,
  elevation,
  iconSize,
  layout,
  spacing,
} from '../../constants';

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  /** Optional right-aligned hint, e.g. a count. */
  meta?: string;
};

type DropdownProps<T extends string> = {
  label?: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Select control built from a modal sheet rather than a picker dependency.
 * The sheet keeps long option lists (the shop selector runs to dozens of rows)
 * scrollable and reachable with one thumb.
 */
export default function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  disabled = false,
  style,
  testID,
}: DropdownProps<T>) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find(option => option.value === value);

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <AppText variant="inputLabel" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <Pressable
        testID={testID}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? placeholder}: ${selected?.label ?? placeholder}`}
        accessibilityState={{ disabled, expanded: open }}
        style={({ pressed }) => [
          styles.field,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <AppText
          variant="body"
          numberOfLines={1}
          color={selected ? colors.textPrimary : colors.placeholder}
          style={styles.value}
        >
          {selected?.label ?? placeholder}
        </AppText>
        <Icon name="chevron-down" size={iconSize.md} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close options"
        >
          <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
            {label ? (
              <AppText variant="h3" style={styles.sheetTitle}>
                {label}
              </AppText>
            ) : null}

            <FlatList
              data={options}
              keyExtractor={option => option.value}
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.value === value;

                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                  >
                    <AppText
                      variant="body"
                      color={isSelected ? colors.primary : colors.textPrimary}
                      style={styles.optionLabel}
                    >
                      {item.label}
                    </AppText>

                    {item.meta ? (
                      <AppText variant="caption" style={styles.meta}>
                        {item.meta}
                      </AppText>
                    ) : null}

                    {isSelected ? (
                      <Icon name="check" size={iconSize.md} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 140 },
  label: { marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: controlHeight.input,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  disabled: { backgroundColor: colors.surfaceSunken },
  pressed: { opacity: 0.8 },
  value: { flex: 1, marginRight: spacing.sm },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    maxHeight: '70%',
    ...(elevation.card as object),
  },
  sheetTitle: { marginBottom: spacing.sm },
  list: { flexGrow: 0 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  optionLabel: { flex: 1 },
  meta: { marginRight: spacing.sm },
});
