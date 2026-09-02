import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import { colors, iconSize, spacing } from '../../constants';

type EmptyStateProps = {
  /** MaterialCommunityIcons glyph; pick one that names the missing thing. */
  icon?: string;
  title: string;
  /** Say *why* it is empty — filters are the usual cause, and are fixable. */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

export default function EmptyState({
  icon = 'inbox-outline',
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]} accessible accessibilityLabel={title}>
      <Icon name={icon} size={iconSize.hero} color={colors.textMuted} />

      <AppText variant="h3" align="center" style={styles.title}>
        {title}
      </AppText>

      {message ? (
        <AppText variant="bodySecondary" align="center" style={styles.message}>
          {message}
        </AppText>
      ) : null}

      {actionLabel && onAction ? (
        <AppButton
          label={actionLabel}
          onPress={onAction}
          variant="outline"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.giant,
    paddingHorizontal: spacing.lg,
  },
  title: { marginTop: spacing.md },
  message: { marginTop: spacing.xs },
  action: { marginTop: spacing.lg, minWidth: 180 },
});
