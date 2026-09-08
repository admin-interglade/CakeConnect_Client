import React from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';

import { AppText, Icon } from '../../../../components';
import { borderRadius, colors, iconSize, spacing } from '../../../../constants';
import { describeDiscount } from '../../../shop/components/ActiveOfferCard';
import type { Offer } from '../../../../types/shop';

type OfferBannerProps = {
  offer: Offer;
  height: number;
  /** Rounded on all corners for the detail hero, top-only on a card. */
  topOnlyRadius?: boolean;
  style?: ViewStyle;
  /** Rendered over the image, e.g. the status pill. */
  children?: React.ReactNode;
};

/**
 * The photograph at the head of an offer card.
 *
 * `bannerUrl` is optional on every offer and empty on most of them, and a
 * remote URL can also simply fail to load. Neither case gets a stock
 * photograph: a picture of a cake that has nothing to do with this offer is a
 * claim about it. The fallback is a plain branded panel carrying the discount,
 * which is the one thing about the offer that is always known.
 */
export default function OfferBanner({
  offer,
  height,
  topOnlyRadius = false,
  style,
  children,
}: OfferBannerProps) {
  // Reset per offer, so a card recycled onto a different offer does not
  // inherit the previous one's failure.
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [offer.bannerUrl]);

  const radius = topOnlyRadius
    ? {
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
      }
    : { borderRadius: borderRadius.lg };

  const showImage = Boolean(offer.bannerUrl) && !failed;

  return (
    <View style={[styles.frame, { height }, radius, style]}>
      {showImage ? (
        <Image
          source={{ uri: offer.bannerUrl }}
          style={[styles.image, radius]}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessible
          accessibilityLabel={offer.title}
        />
      ) : (
        <View style={styles.fallback}>
          <Icon name="tag-outline" size={iconSize.xl} color={colors.primary} />
          <AppText
            variant="h3"
            color={colors.primaryDark}
            numberOfLines={1}
            style={styles.fallbackLabel}
          >
            {describeDiscount(offer)}
          </AppText>
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  image: { width: '100%', height: '100%' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  fallbackLabel: { marginTop: spacing.xs },
});
