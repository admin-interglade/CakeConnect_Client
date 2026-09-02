import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Icon from './Icon';

import AppText from './AppText';
import { colors, iconSize, spacing } from '../../constants';

export type InlineMessageTone = 'info' | 'error' | 'success' | 'warning';

type InlineMessageProps = {
  children: React.ReactNode;
  tone?: InlineMessageTone;
  /** Overrides the tone's default glyph. */
  icon?: string;
  style?: ViewStyle;
};

const tones: Record<InlineMessageTone, { color: string; icon: string }> = {
  info: { color: colors.textSecondary, icon: 'information-outline' },
  error: { color: colors.error, icon: 'alert-circle-outline' },
  success: { color: colors.success, icon: 'check-circle-outline' },
  warning: { color: colors.warning, icon: 'alert-outline' },
};

/** Small icon + text row used for OTP hints, errors and field notes. */
export default function InlineMessage({
  children,
  tone = 'info',
  icon,
  style,
}: InlineMessageProps) {
  const { color, icon: defaultIcon } = tones[tone];

  return (
    <View
      style={[styles.row, style]}
      accessibilityLiveRegion={tone === 'error' ? 'polite' : 'none'}
    >
      <Icon
        name={icon ?? defaultIcon}
        size={iconSize.sm}
        color={color}
        style={styles.icon}
      />
      <AppText variant="caption" color={color} style={styles.text}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { marginRight: spacing.sm, marginTop: 1 },
  text: { flex: 1 },
});
