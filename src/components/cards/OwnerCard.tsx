import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  spacing,
  strings,
} from '../../constants';
import type { ShopOwner } from '../../types/admin';

type OwnerCardProps = {
  owner: ShopOwner;
  onPress: () => void;
};

/** FR-2 owner directory row: the account, how to reach it, and the shops it holds. */
function OwnerCard({ owner, onPress }: OwnerCardProps) {
  const contact = [owner.phone, owner.email].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${owner.name}, ${owner.phone}`}
      accessibilityHint={strings.owners.cardHint}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <View style={styles.identity}>
          <AppText variant="h3" numberOfLines={1}>
            {owner.name}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {contact}
          </AppText>
        </View>

        <AppText variant="caption" color={colors.textSecondary}>
          {strings.owners.status[owner.status]}
        </AppText>
        <Icon name="pencil-outline" size={iconSize.sm} color={colors.primary} />
      </View>

      <View style={styles.shops}>
        <AppText variant="caption" style={styles.shopsLabel}>
          {`${strings.owners.sectionShops} (${owner.shops.length})`}
        </AppText>

        {owner.shops.length > 0 ? (
          <View style={styles.chips}>
            {owner.shops.map(shop => (
              <View key={shop.id} style={styles.chip}>
                <Icon
                  name="storefront-outline"
                  size={iconSize.sm}
                  color={colors.textSecondary}
                />
                <AppText variant="caption" color={colors.textPrimary} numberOfLines={1}>
                  {`${shop.name} · ${shop.code}`}
                </AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="bodySecondary">{strings.owners.noShopsAssigned}</AppText>
        )}
      </View>
    </Pressable>
  );
}

export default React.memo(OwnerCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...(elevation.card as object),
  },
  pressed: { opacity: 0.85 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  identity: { flex: 1 },
  shops: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  shopsLabel: { marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.surfaceSunken,
  },
});
