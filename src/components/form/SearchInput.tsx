import React from 'react';
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

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

type SearchInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** Fires on submit as well as on change, for list screens that debounce. */
  onSubmit?: () => void;
  style?: ViewStyle;
  testID?: string;
};

/** Search field with a clear affordance, used by the shops and orders lists. */
export default function SearchInput({
  value,
  onChangeText,
  placeholder,
  onSubmit,
  style,
  testID,
}: SearchInputProps) {
  return (
    <View style={[styles.container, style]}>
      <Icon name="magnify" size={iconSize.md} color={colors.textMuted} />

      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={placeholder}
      />

      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon name="close-circle" size={iconSize.md} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: controlHeight.input,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    ...textVariants.input,
    flex: 1,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.sm,
  },
});
