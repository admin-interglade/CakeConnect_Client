import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { AppButton, AppText, Icon, QuantityStepper } from '../../../components';
import {
  borderRadius,
  borderWidth,
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
 * Pack size is stated on the card rather than only enforced by the stepper —
 * a quantity that jumps from 1 to 12 with no explanation reads as a bug.
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
        <AppText variant="h3" numberOfLines={2} style={styles.name}>
          {product.name}
        </AppText>

        <AppText style={styles.price} color={colors.primary} numberOfLines={1}>
          {strings.shopCatalogue.pricePerUnit(
            formatCurrency(product.price),
            product.unit,
          )}
        </AppText>

        <View style={styles.metaRow}>
          {/* FR-34 — an offer names this product. The discount itself is
              applied by the franchise at invoicing, so this is a flag, not a
              price change. */}
          {product.offerIds.length > 0 ? (
            <View style={styles.offerBadge}>
              <AppText style={styles.chipText} color={colors.primary}>
                {strings.shopCatalogue.offerBadge}
              </AppText>
            </View>
          ) : null}
          <AppText style={styles.metaText} numberOfLines={1}>
            {strings.shopCatalogue.packLabel(formatNumber(product.packSize))}
          </AppText>
        </View>
      </View>

      {inCart ? (
        <QuantityStepper
          variant="pill"
          value={quantity}
          onChange={onChangeQuantity}
          min={0}
          step={product.packSize}
          disabled={disabled}
          accessibilityLabel={product.name}
          decreaseLabel={`${strings.shortSupply.decrease} ${product.name}`}
          increaseLabel={`${strings.shortSupply.increase} ${product.name}`}
          style={styles.action}
        />
      ) : (
        <AppButton
          label={strings.shopCatalogue.add}
          icon="plus"
          variant="outline"
          onPress={onAdd}
          disabled={disabled}
          accessibilityHint={product.name}
          style={styles.addButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    padding: spacing.md,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSunken,
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: spacing.xxs },
  name: { fontSize: 15, lineHeight: 20 },
  price: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  offerBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primarySoft,
  },
  chipText: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  metaText: { fontSize: 11, lineHeight: 14, color: colors.textMuted },
  action: { alignSelf: 'center' },
  // Same height and rounding as the pill stepper that replaces it, so the row
  // does not jump when the product is added.
  addButton: {
    alignSelf: 'center',
    minHeight: 40,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.circle,
  },
});

export default React.memo(CatalogueProductCard);
