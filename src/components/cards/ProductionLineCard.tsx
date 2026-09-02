import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import { borderWidth, colors, iconSize, layout, spacing } from '../../constants';
import { formatNumber } from '../../utils/format';
import type { ProductionLine } from '../../types/admin';

type ProductionLineCardProps = {
  line: ProductionLine;
  onPress?: () => void;
  /** Hides the shop count where the row has to stay compact (the dashboard). */
  showShopCount?: boolean;
  style?: ViewStyle;
};

/**
 * One product in the FR-37 consolidated requirement: what to bake on the left,
 * how many shops want it in the middle, and the quantity the kitchen works to
 * on the right.
 *
 * Stacked vertically rather than scrolled sideways — this is the figure the
 * kitchen produces against, so every line has to be reachable by scrolling the
 * page and the quantities have to line up for comparison down the column.
 */
function ProductionLineCard({
  line,
  onPress,
  showShopCount = true,
  style,
}: ProductionLineCardProps) {
  const body = (
    <>
      <View style={styles.text}>
        <AppText variant="body" numberOfLines={2}>
          {line.name}
        </AppText>
        {line.variant ? (
          <AppText variant="caption" numberOfLines={1}>
            {line.variant}
          </AppText>
        ) : null}
      </View>

      {showShopCount ? (
        <AppText variant="caption" style={styles.shops}>
          {`${line.shopCount} ${line.shopCount === 1 ? 'shop' : 'shops'}`}
        </AppText>
      ) : null}

      <View style={styles.quantityBlock}>
        <AppText variant="h3" color={colors.primary} numberOfLines={1}>
          {`${formatNumber(line.totalQuantity)} ${line.unit}`}
        </AppText>
      </View>

      {onPress ? (
        <Icon name="chevron-right" size={iconSize.md} color={colors.textMuted} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[styles.row, style]}
        accessible
        accessibilityLabel={`${line.name}, ${formatNumber(line.totalQuantity)} ${
          line.unit
        }, ${line.shopCount} shops`}
      >
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${line.name}, ${formatNumber(line.totalQuantity)} ${
        line.unit
      }, ${line.shopCount} shops`}
      accessibilityHint="Opens the shop-by-shop breakdown"
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      {body}
    </Pressable>
  );
}

export default React.memo(ProductionLineCard);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.divider,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  text: { flex: 1, marginRight: spacing.sm },
  shops: { width: 62, textAlign: 'right' },
  quantityBlock: { minWidth: 84, alignItems: 'flex-end', marginLeft: spacing.sm },
});
