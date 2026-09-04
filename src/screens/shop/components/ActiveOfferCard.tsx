import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import { formatCurrency, formatDate } from '../../../utils/format';
import type { Offer } from '../../../types/shop';

type ActiveOfferCardProps = {
  offer: Offer;
  onPress: () => void;
};

/**
 * FR-32 — the three discount shapes, said the way a shop reads them.
 * Exported so the offers screen and the home card describe an offer alike.
 */
export function describeDiscount(offer: Offer): string {
  switch (offer.discountType) {
    case 'percentage':
      return strings.offers.discount.percentage(String(offer.discountValue));
    case 'flat':
      return strings.offers.discount.flat(formatCurrency(offer.discountValue));
    case 'buyXGetY':
      return strings.offers.discount.buyXGetY(
        offer.buyQuantity ?? 0,
        offer.getQuantity ?? 0,
      );
    default:
      return '';
  }
}

/**
 * FR-34 — one live offer on the shop home screen.
 *
 * The pill carries the **discount** rather than a generic "limited" label. The
 * backend has no such flag, and a badge that says "LIMITED" on every offer
 * regardless of its terms is decoration; the discount is the thing a shop
 * decides on, it is real data, and it fills the same slot.
 */
export default function ActiveOfferCard({ offer, onPress }: ActiveOfferCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${offer.title}, ${describeDiscount(offer)}`}
      accessibilityHint={strings.offers.title}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.badge}>
          <AppText variant="caption" color={colors.onPrimary}>
            {describeDiscount(offer)}
          </AppText>
        </View>

        <AppText variant="h3" numberOfLines={1} style={styles.title}>
          {offer.title}
        </AppText>

        <Icon name="chevron-right" size={iconSize.sm} color={colors.textMuted} />
      </View>

      {offer.description ? (
        <AppText variant="bodySecondary" numberOfLines={2} style={styles.body}>
          {offer.description}
        </AppText>
      ) : null}

      <AppText variant="caption" color={colors.textMuted} style={styles.validity}>
        {[
          offer.productIds.length === 0
            ? strings.offers.allProducts
            : strings.offers.someProducts(offer.productIds.length),
          offer.endDate ? strings.offers.validUntil(formatDate(offer.endDate)) : null,
        ]
          .filter(Boolean)
          .join('  ·  ')}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pressed: { opacity: 0.85 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primary,
  },
  title: { flex: 1 },
  body: { marginTop: spacing.sm },
  validity: { marginTop: spacing.sm },
});
