import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppButton, AppText, Icon, QuantityStepper } from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../../constants';
import { formatCurrency, formatNumber } from '../../../utils/format';
import type { CatalogueProduct } from '../../../types/shop';

type CatalogueProductCardProps = {
  product: CatalogueProduct;
  /** Quantity already in the cart; zero when the product has not been added. */
  quantity: number;
  onAdd: () => void;
  onChangeQuantity: (quantity: number) => void;
  /** True once the cut-off has passed and nothing more can be ordered. */
  disabled?: boolean;
};

/**
 * FR-5 / FR-6 — one catalogue row, at the price this shop pays.
 *
 * The card swaps its action rather than showing both: a product not yet in the
 * order gets an Add button, and one already in it gets the FR-7 stepper in the
 * same place. That keeps the row height stable while scrolling and means the
 * quantity is adjusted where the product is, not only in the cart.
 *
 * MOQ and pack size are stated on the card rather than only enforced by the
 * stepper — a quantity that jumps from 1 to 12 with no explanation reads as a
 * bug.
 */
function CatalogueProductCard({
  product,
  quantity,
  onAdd,
  onChangeQuantity,
  disabled = false,
}: CatalogueProductCardProps) {
  const inCart = quantity > 0;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Icon
              name="cake-variant-outline"
              size={iconSize.lg}
              color={colors.primary}
            />
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <AppText variant="h3" numberOfLines={2} style={styles.name}>
              {product.name}
            </AppText>
            {/* FR-34 — an offer names this product. The discount itself is
                applied by the franchise at invoicing, so this is a flag, not a
                price change. */}
            {product.offerIds.length > 0 ? (
              <View style={styles.offerBadge}>
                <AppText variant="caption" color={colors.primary}>
                  {strings.shopCatalogue.offerBadge}
                </AppText>
              </View>
            ) : null}
          </View>

          <AppText variant="caption" numberOfLines={1}>
            {[
              product.categoryName,
              product.moq > 1
                ? strings.shopCatalogue.moq(formatNumber(product.moq), product.unit)
                : null,
              product.packSize > 1
                ? strings.shopCatalogue.pack(formatNumber(product.packSize))
                : null,
            ]
              .filter(Boolean)
              .join('  ·  ')}
          </AppText>

          <View style={styles.priceRow}>
            <AppText variant="h3">{formatCurrency(product.price)}</AppText>
            <AppText variant="caption">
              {strings.shopCatalogue.perUnit(product.unit)}
            </AppText>
          </View>
        </View>
      </View>

      <View style={styles.action}>
        {inCart ? (
          <QuantityStepper
            value={quantity}
            onChange={onChangeQuantity}
            min={0}
            step={product.packSize}
            disabled={disabled}
            accessibilityLabel={product.name}
            decreaseLabel={`${strings.shortSupply.decrease} ${product.name}`}
            increaseLabel={`${strings.shortSupply.increase} ${product.name}`}
          />
        ) : (
          <AppButton
            label={strings.shopCatalogue.add}
            icon="plus"
            variant="outline"
            onPress={onAdd}
            disabled={disabled}
            accessibilityHint={product.name}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  image: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSunken,
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  name: { flex: 1 },
  offerBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primarySoft,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  action: { alignItems: 'flex-end' },
});

export default React.memo(CatalogueProductCard);
