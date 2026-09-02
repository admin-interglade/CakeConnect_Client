import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import { colors, iconSize, spacing, strings } from '../../constants';

type ErrorStateProps = {
  /** Already-humanised copy — pass `describeApiError(error)`, not the raw error. */
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
  /** Inline form sits within a card; the default fills the screen body. */
  variant?: 'fullscreen' | 'inline';
  style?: ViewStyle;
};

export default function ErrorState({
  message = strings.common.somethingWentWrong,
  onRetry,
  retrying = false,
  variant = 'fullscreen',
  style,
}: ErrorStateProps) {
  return (
    <View
      style={[styles.container, variant === 'fullscreen' && styles.fullscreen, style]}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Icon name="alert-circle-outline" size={iconSize.xl} color={colors.error} />

      <AppText variant="bodySecondary" align="center" style={styles.message}>
        {message}
      </AppText>

      {onRetry ? (
        <AppButton
          label={strings.common.retry}
          onPress={onRetry}
          variant="outline"
          loading={retrying}
          icon="refresh"
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
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  fullscreen: { flex: 1 },
  message: { marginTop: spacing.md },
  action: { marginTop: spacing.lg, minWidth: 160 },
});
