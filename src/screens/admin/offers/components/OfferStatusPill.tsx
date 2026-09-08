import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText } from '../../../../components';
import { borderRadius, colors, spacing } from '../../../../constants';
import { offerStatusLabels } from '../../../../utils/format';
import type { OfferStatus } from '../../../../types/shop';

type OfferStatusPillProps = {
  status: OfferStatus;
  style?: ViewStyle;
};

/**
 * An offer's status, as its own pill rather than through `StatusBadge`.
 *
 * `StatusBadge` merges one label map across orders, shops and products, and an
 * offer's `active` collides with a shop's: there it means "Active", here it
 * means "Live, and every targeted shop can see it right now". Adding offers to
 * that map would relabel every shop badge in the app to say the wrong thing.
 */
export default function OfferStatusPill({ status, style }: OfferStatusPillProps) {
  const scheme = schemes[status];

  return (
    <View style={[styles.pill, { backgroundColor: scheme.background }, style]}>
      <AppText variant="caption" color={scheme.text} numberOfLines={1}>
        {offerStatusLabels[status]}
      </AppText>
    </View>
  );
}

/**
 * Scheduled is drawn as a warning rather than as neutral information. On this
 * backend a scheduled offer is not "waiting" — nothing is coming for it — so
 * the colour matches the fact that it needs an admin.
 */
const schemes: Record<OfferStatus, { background: string; text: string }> = {
  active: { background: colors.successSoft, text: colors.success },
  scheduled: { background: colors.warningSoft, text: colors.warning },
  expired: { background: colors.surfaceSunken, text: colors.textSecondary },
  withdrawn: { background: colors.errorSoft, text: colors.error },
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.circle,
  },
});
