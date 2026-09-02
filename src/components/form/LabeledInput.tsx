import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import AppText from '../ui/AppText';
import {
  borderRadius,
  borderWidth,
  colors,
  controlHeight,
  spacing,
  textVariants,
} from '../../constants';

export type LabeledInputProps = TextInputProps & {
  /** Uppercase label rendered above the field. */
  label?: string;
  /** Error copy shown under the field; also turns the border red. */
  error?: string;
  containerStyle?: ViewStyle;
};

export default function LabeledInput({
  label,
  error,
  containerStyle,
  onFocus,
  onBlur,
  style,
  ...inputProps
}: LabeledInputProps) {
  const [focused, setFocused] = React.useState(false);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.borderFocus
    : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText variant="inputLabel" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View style={[styles.field, { borderColor }]}>
        <TextInput
          {...inputProps}
          style={[styles.input, style]}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
      </View>

      {error ? (
        <AppText variant="caption" color={colors.error} style={styles.message}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: controlHeight.input,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    ...textVariants.input,
    flex: 1,
    paddingVertical: spacing.md,
    // Android adds its own vertical padding on top of ours.
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  message: { marginTop: spacing.xs },
});
