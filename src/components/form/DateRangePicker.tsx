import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import InlineMessage from '../ui/InlineMessage';
import LabeledInput from './LabeledInput';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  layout,
  spacing,
} from '../../constants';
import { formatDateRange } from '../../utils/format';
import { isValidRange, rangePresets, resolveRange } from '../../utils/dateRange';
import type { DateRange, DateRangePreset } from '../../types/admin';

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  style?: ViewStyle;
};

/**
 * FR-19 range selector: preset chips plus two `YYYY-MM-DD` fields for the
 * custom case. Built from existing primitives rather than a calendar package,
 * per the project's no-new-dependency constraint.
 */
export default function DateRangePicker({
  value,
  onChange,
  style,
}: DateRangePickerProps) {
  const [customFrom, setCustomFrom] = React.useState(value.from);
  const [customTo, setCustomTo] = React.useState(value.to);

  const isCustom = value.preset === 'custom';
  const customInvalid = isCustom && !isValidRange(customFrom, customTo);

  const selectPreset = (preset: DateRangePreset) => {
    if (preset === 'custom') {
      setCustomFrom(value.from);
      setCustomTo(value.to);
      onChange({ preset: 'custom', from: value.from, to: value.to });
      return;
    }
    onChange(resolveRange(preset));
  };

  /** Only push a custom range upwards once both bounds parse and are ordered. */
  const commitCustom = (from: string, to: string) => {
    if (isValidRange(from, to)) {
      onChange({ preset: 'custom', from, to });
    }
  };

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {rangePresets.map(preset => {
          const selected = preset.key === value.preset;

          return (
            <Pressable
              key={preset.key}
              onPress={() => selectPreset(preset.key)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={preset.label}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="caption"
                color={selected ? colors.onPrimary : colors.textSecondary}
              >
                {preset.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.summary}>
        <Icon name="calendar-range" size={iconSize.sm} color={colors.textSecondary} />
        <AppText variant="caption" style={styles.summaryText}>
          {formatDateRange(value.from, value.to)}
        </AppText>
      </View>

      {isCustom ? (
        <View style={styles.customRow}>
          <LabeledInput
            label="From"
            value={customFrom}
            onChangeText={next => {
              setCustomFrom(next);
              commitCustom(next, customTo);
            }}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            containerStyle={styles.customField}
          />
          <LabeledInput
            label="To"
            value={customTo}
            onChangeText={next => {
              setCustomTo(next);
              commitCustom(customFrom, next);
            }}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            containerStyle={styles.customField}
          />
        </View>
      ) : null}

      {customInvalid ? (
        <InlineMessage tone="error" style={styles.error}>
          Enter both dates as YYYY-MM-DD, with the start on or before the end.
        </InlineMessage>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    minHeight: layout.minTouchTarget - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.circle,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  summary: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  summaryText: { marginLeft: spacing.xs },
  customRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  customField: { flex: 1 },
  error: { marginTop: spacing.sm },
});
