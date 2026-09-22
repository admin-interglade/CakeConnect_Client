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
  /**
   * `pill` is the rounded catalogue look: a soft minus, a filled plus and a
   * fully rounded track. Behaviour is identical to the default.
   */
  variant?: 'default' | 'pill';
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
  variant = 'default',
}: QuantityStepperProps) {
  const pill = variant === 'pill';
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
    <View
      style={[
        styles.container,
        pill && styles.pillContainer,
        disabled && styles.disabled,
        style,
      ]}
    >
      <StepButton
        icon="minus"
        pill={pill}
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
        style={[styles.input, pill && styles.pillInput]}
      />

      <StepButton
        icon="plus"
        pill={pill}
        filled={pill}
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
  pill = false,
  filled = false,
}: {
  icon: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
  pill?: boolean;
  /** Solid primary background with a light icon — the pill's plus. */
  filled?: boolean;
}) {
  const iconColor = filled
    ? colors.onPrimary
    : disabled
      ? colors.textMuted
      : colors.primary;

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
        pill && styles.pillButton,
        disabled && (pill ? styles.pillButtonDisabled : styles.buttonDisabled),
        filled && styles.filledButton,
        filled && disabled && styles.filledButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Icon
        name={icon}
        size={iconSize.sm}
        color={iconColor}
      />
    </Pressable>
  );
}

const stepperHeight = 36;
const pillHeight = 40;

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
  pillContainer: {
    height: pillHeight,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.circle,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillButton: {
    width: pillHeight - spacing.sm,
    height: pillHeight - spacing.sm,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primarySoft,
  },
  pillButtonDisabled: { backgroundColor: colors.surfaceMuted },
  filledButton: { backgroundColor: colors.primary },
  filledButtonDisabled: { backgroundColor: colors.primaryDisabled },
  pillInput: {
    minWidth: spacing.xxxl + spacing.sm,
    fontWeight: '600',
  },
  input: {
    ...(textVariants.body as object),
    minWidth: spacing.xxxl,
    paddingVertical: 0,
    marginHorizontal: spacing.xs,
    textAlign: 'center',
    color: colors.textPrimary,
  },
});
