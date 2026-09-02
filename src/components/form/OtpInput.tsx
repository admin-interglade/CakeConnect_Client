import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import AppText from '../ui/AppText';
import {
  borderRadius,
  borderWidth,
  colors,
  controlHeight,
  spacing,
} from '../../constants';

type OtpInputProps = {
  value: string;
  onChangeValue: (next: string) => void;
  length?: number;
  /** Paints every box red — used for the invalid-OTP state. */
  hasError?: boolean;
  autoFocus?: boolean;
  onFilled?: (code: string) => void;
  editable?: boolean;
  style?: ViewStyle;
};

/**
 * Six segmented OTP boxes.
 *
 * A single transparent TextInput sits on top of the whole row rather than one
 * input per box: that keeps iOS `oneTimeCode` autofill and Android SMS
 * retrieval working, and makes paste fill every box at once.
 */
export default function OtpInput({
  value,
  onChangeValue,
  length = 6,
  hasError = false,
  autoFocus = false,
  onFilled,
  editable = true,
  style,
}: OtpInputProps) {
  const inputRef = React.useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = React.useState(false);

  const handleChange = (next: string) => {
    const digits = next.replace(/[^0-9]/g, '').slice(0, length);
    onChangeValue(digits);
    if (digits.length === length) {
      onFilled?.(digits);
    }
  };

  const focus = () => inputRef.current?.focus();

  return (
    <Pressable
      onPress={focus}
      disabled={!editable}
      accessible
      accessibilityRole="none"
      accessibilityLabel={`Enter the ${length} digit code`}
      accessibilityValue={{ text: value.split('').join(' ') }}
      style={[styles.row, style]}
    >
      {Array.from({ length }).map((_, index) => {
        const digit = value[index] ?? '';
        const isActive = focused && editable && index === Math.min(value.length, length - 1);

        return (
          <View
            key={index}
            style={[
              styles.box,
              digit ? styles.boxFilled : null,
              isActive ? styles.boxActive : null,
              hasError ? styles.boxError : null,
              !editable ? styles.boxDisabled : null,
            ]}
          >
            <AppText
              variant="otpDigit"
              color={hasError ? colors.error : colors.textPrimary}
            >
              {digit}
            </AppText>
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        editable={editable}
        keyboardType="number-pad"
        returnKeyType="done"
        maxLength={length}
        caretHidden
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        importantForAutofill="yes"
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    flex: 1,
    marginHorizontal: spacing.xs,
    height: controlHeight.otpBox,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  boxFilled: { borderColor: colors.borderStrong },
  boxActive: { borderColor: colors.borderFocus, borderWidth: borderWidth.thin },
  boxError: { borderColor: colors.error, backgroundColor: colors.errorSoft },
  boxDisabled: { backgroundColor: colors.surfaceMuted },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: controlHeight.otpBox,
    opacity: 0,
    // Keeps the (invisible) caret from scrolling the row on Android.
    color: colors.transparent,
  },
});
