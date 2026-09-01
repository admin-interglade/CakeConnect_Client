import React from 'react';
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import AppText from './AppText';
import Icon from './Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  controlHeight,
  iconSize,
  layout,
  spacing,
} from '../constants';

export type AppButtonVariant = 'primary' | 'outline' | 'link';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** MaterialCommunityIcons glyph name rendered before the label. */
  icon?: string;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
};

export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityHint,
  testID,
}: AppButtonProps) {
  const isDisabled = disabled || loading;
  const scheme = schemes[variant];
  const isLink = variant === 'link';

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={isLink ? layout.hitSlop : undefined}
      android_ripple={
        isLink ? undefined : { color: scheme.ripple, borderless: false }
      }
      style={({ pressed }) => [
        styles.base,
        isLink && styles.link,
        {
          backgroundColor: isDisabled ? scheme.disabledBg : scheme.background,
          borderColor: isDisabled ? scheme.disabledBorder : scheme.border,
        },
        pressed && Platform.OS === 'ios' && !isLink && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={scheme.label} />
        ) : (
          <>
            {icon ? (
              <Icon
                name={icon}
                size={iconSize.md}
                color={isDisabled ? scheme.disabledLabel : scheme.label}
                style={styles.icon}
              />
            ) : null}
            <AppText
              variant="button"
              color={isDisabled ? scheme.disabledLabel : scheme.label}
              style={isLink ? styles.linkLabel : undefined}
            >
              {label}
            </AppText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const schemes: Record<
  AppButtonVariant,
  {
    background: string;
    border: string;
    label: string;
    ripple: string;
    disabledBg: string;
    disabledBorder: string;
    disabledLabel: string;
  }
> = {
  primary: {
    background: colors.primary,
    border: colors.primary,
    label: colors.onPrimary,
    ripple: colors.primaryPressed,
    disabledBg: colors.primaryDisabled,
    disabledBorder: colors.primaryDisabled,
    disabledLabel: colors.surface,
  },
  outline: {
    background: colors.transparent,
    border: colors.primary,
    label: colors.primary,
    ripple: colors.primarySoft,
    disabledBg: colors.transparent,
    disabledBorder: colors.border,
    disabledLabel: colors.textMuted,
  },
  link: {
    background: colors.transparent,
    border: colors.transparent,
    label: colors.primary,
    ripple: colors.transparent,
    disabledBg: colors.transparent,
    disabledBorder: colors.transparent,
    disabledLabel: colors.textMuted,
  },
};

const styles = StyleSheet.create({
  base: {
    minHeight: controlHeight.button,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.hairline,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    overflow: 'hidden',
  },
  link: {
    minHeight: layout.minTouchTarget,
    borderWidth: borderWidth.none,
    paddingHorizontal: 0,
  },
  linkLabel: { textDecorationLine: 'underline' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  icon: { marginRight: spacing.sm },
  pressed: { opacity: 0.85 },
});
