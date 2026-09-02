import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../constants';

type OfflineBannerProps = {
  /**
   * True when a refetch failed but cached rows are still on screen. The screen
   * stays usable — context.md §6 requires the ordering flow to survive a
   * connectivity drop — so this is a notice, not an error state.
   */
  visible: boolean;
};

export default function OfflineBanner({ visible }: OfflineBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.banner} accessibilityLiveRegion="polite" accessible>
      <Icon name="cloud-off-outline" size={iconSize.sm} color={colors.warning} />
      <AppText variant="caption" color={colors.warning} style={styles.text}>
        {strings.common.offlineBanner}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  text: { flex: 1, marginLeft: spacing.xs },
});
