import React from 'react';
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  layout,
  spacing,
  textVariants,
} from '../../constants';

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  /** Announced on the two buttons, e.g. "Decrease Chocolate Truffle Cake". */
  accessibilityLabel?: string;
  decreaseLabel?: string;
  increaseLabel?: string;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Minus / value / plus control for quantities that are adjusted a unit or two
 * at a time, as on the short-supply screen.
 *
 * The middle is still a text field: correcting 40 down to 12 by tapping minus
 * 28 times is not a control, so typing stays available and is clamped to the
 * same bounds as the buttons on blur.
 */
export default function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  disabled = false,
  accessibilityLabel,
  decreaseLabel = 'Decrease',
  increaseLabel = 'Increase',
  style,
  testID,
}: QuantityStepperProps) {
  const [draft, setDraft] = React.useState(String(value));

  // The parent clamps and can reject a value, so the field follows it rather
  // than holding whatever was typed.
  React.useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (next: number) => Math.min(Math.max(next, min), max);

  const commitDraft = () => {
    const parsed = Number(draft);
    const next = Number.isFinite(parsed) ? clamp(Math.round(parsed)) : value;
    setDraft(String(next));
    if (next !== value) {
      onChange(next);
    }
  };

  return (
    <View style={[styles.container, disabled && styles.disabled, style]}>
      <StepButton
        icon="minus"
        label={decreaseLabel}
        disabled={disabled || value <= min}
        onPress={() => onChange(clamp(value - step))}
      />

      <TextInput
        testID={testID}
        value={draft}
        onChangeText={setDraft}
        onBlur={commitDraft}
        onSubmitEditing={commitDraft}
        editable={!disabled}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
      />

      <StepButton
        icon="plus"
        label={increaseLabel}
        disabled={disabled || value >= max}
        onPress={() => onChange(clamp(value + step))}
      />
    </View>
  );
}

function StepButton({
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
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize.sm}
        color={disabled ? colors.textMuted : colors.primary}
      />
    </Pressable>
  );
}

const stepperHeight = 36;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: stepperHeight,
    paddingHorizontal: spacing.xxs,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  disabled: { opacity: 0.6 },
  button: {
    width: stepperHeight - spacing.sm,
    height: stepperHeight - spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primarySoft,
  },
  buttonDisabled: { backgroundColor: colors.surfaceSunken },
  pressed: { opacity: 0.7 },
  input: {
    ...(textVariants.body as object),
    minWidth: spacing.xxxl,
    paddingVertical: 0,
    marginHorizontal: spacing.xs,
    textAlign: 'center',
    color: colors.textPrimary,
  },
});
