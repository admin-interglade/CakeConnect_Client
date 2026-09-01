import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';
import Icon from './Icon';

import AppText from './AppText';
import {
  borderRadius,
  borderWidth,
  colors,
  controlHeight,
  iconSize,
  layout,
  spacing,
  textVariants,
} from '../constants';

type PhoneNumberInputProps = {
  value: string;
  onChangeValue: (next: string) => void;
  /** Dial code shown in the leading chip, e.g. "+91". */
  dialCode?: string;
  onPressDialCode?: () => void;
  /** Digits allowed after the dial code. */
  maxLength?: number;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
  /** Renders the trailing circular submit affordance from the design. */
  onSubmit?: () => void;
  submitDisabled?: boolean;
  style?: ViewStyle;
};

/** Split phone field: dial-code chip, divider, number, inline submit arrow. */
export default function PhoneNumberInput({
  value,
  onChangeValue,
  dialCode = '+91',
  onPressDialCode,
  maxLength = 10,
  placeholder = '98765 43210',
  error,
  autoFocus = false,
  onSubmit,
  submitDisabled = false,
  style,
}: PhoneNumberInputProps) {
  const [focused, setFocused] = React.useState(false);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.borderFocus
    : colors.border;

  const handleChange = (next: string) => {
    onChangeValue(next.replace(/[^0-9]/g, '').slice(0, maxLength));
  };

  return (
    <View style={style}>
      <View style={[styles.field, { borderColor }]}>
        <Pressable
          onPress={onPressDialCode}
          disabled={!onPressDialCode}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={`Country dial code ${dialCode}`}
          style={styles.dialCode}
        >
          <AppText variant="input">{dialCode}</AppText>
          <Icon
            name="chevron-down"
            size={iconSize.sm}
            color={colors.textMuted}
            style={styles.chevron}
          />
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          value={value}
          onChangeText={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmit}
          autoFocus={autoFocus}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={maxLength}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel="Mobile number"
          textContentType="telephoneNumber"
          autoComplete={Platform.OS === 'android' ? 'tel' : 'tel'}
          style={styles.input}
        />

        {onSubmit ? (
          <Pressable
            onPress={onSubmit}
            disabled={submitDisabled}
            hitSlop={layout.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Continue"
            accessibilityState={{ disabled: submitDisabled }}
            style={styles.submit}
          >
            <Icon
              name="arrow-right"
              size={iconSize.md}
              color={submitDisabled ? colors.textMuted : colors.primary}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: controlHeight.input,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  dialCode: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  chevron: { marginLeft: spacing.xs },
  divider: {
    width: borderWidth.hairline,
    alignSelf: 'stretch',
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    backgroundColor: colors.border,
  },
  input: { ...textVariants.input, flex: 1, paddingVertical: spacing.md },
  submit: { paddingLeft: spacing.sm },
  error: { marginTop: spacing.xs },
});
