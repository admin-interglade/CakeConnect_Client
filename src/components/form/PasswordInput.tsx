import React from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  controlHeight,
  iconSize,
  layout,
  spacing,
  textVariants,
} from '../../constants';

type PasswordInputProps = {
  value: string;
  onChangeText: (next: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  style?: ViewStyle;
  testID?: string;
};

/**
 * Password field with a reveal toggle.
 *
 * Separate from `LabeledInput` because the toggle has to sit inside the field
 * border and because the field must never inherit autocorrect or capitalisation
 * from the shared text input.
 */
export default function PasswordInput({
  value,
  onChangeText,
  label = 'Password',
  placeholder = 'Enter your password',
  error,
  onSubmit,
  autoFocus = false,
  style,
  testID,
}: PasswordInputProps) {
  const [focused, setFocused] = React.useState(false);
  const [revealed, setRevealed] = React.useState(false);

  const borderColor = error
    ? colors.error
    : focused
    ? colors.borderFocus
    : colors.border;

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <AppText variant="inputLabel" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <View style={[styles.field, { borderColor }]}>
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          secureTextEntry={!revealed}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="password"
          returnKeyType="go"
          autoFocus={autoFocus}
          accessibilityLabel={label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        <Pressable
          onPress={() => setRevealed(current => !current)}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          accessibilityState={{ selected: revealed }}
          style={styles.toggle}
        >
          <Icon
            name={revealed ? 'eye-off-outline' : 'eye-outline'}
            size={iconSize.md}
            color={colors.textSecondary}
          />
        </Pressable>
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
    paddingLeft: spacing.md,
  },
  input: {
    ...textVariants.input,
    flex: 1,
    paddingVertical: spacing.md,
  },
  toggle: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { marginTop: spacing.xs },
});
