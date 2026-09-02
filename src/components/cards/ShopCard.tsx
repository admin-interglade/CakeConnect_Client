import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import StatusBadge from '../ui/StatusBadge';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../constants';
import {
  creditUtilisation,
  formatCurrencyCompact,
  formatPercent,
} from '../../utils/format';
import type { Shop } from '../../types/admin';

type ShopCardProps = {
  shop: Shop;
  onPress: () => void;
  onEdit: () => void;
  /** Suspend for an active shop, reactivate otherwise (FR-3). */
  onToggleSuspend: () => void;
  onDeactivate: () => void;
};

/** FR-38 row: identity, owner, today's order state, money and credit at a glance. */
function ShopCard({
  shop,
  onPress,
  onEdit,
  onToggleSuspend,
  onDeactivate,
}: ShopCardProps) {
  const utilisation = creditUtilisation(shop.creditUsed, shop.creditLimit);
  // Over 80% of the limit is the point at which the admin needs to notice.
  const utilisationColor =
    utilisation >= 90 ? colors.error : utilisation >= 80 ? colors.warning : colors.success;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${shop.name}, ${shop.code}`}
      accessibilityHint="Opens the shop detail"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <View style={styles.identity}>
          <AppText variant="h3" numberOfLines={1}>
            {shop.name}
          </AppText>
          <AppText variant="caption">{`${shop.code} · ${shop.region ?? '-'}`}</AppText>
        </View>

        <StatusBadge status={shop.status} />
      </View>

      <View style={styles.ownerRow}>
        <Icon name="account-outline" size={iconSize.sm} color={colors.textSecondary} />
        <AppText variant="bodySecondary" numberOfLines={1} style={styles.ownerText}>
          {`${shop.ownerName} · ${shop.ownerPhone}`}
        </AppText>
      </View>

      <View style={styles.metrics}>
        <Metric label={strings.shops.outstanding} value={formatCurrencyCompact(shop.outstanding)} />
        <Metric label={strings.shops.paidToDate} value={formatCurrencyCompact(shop.paidToDate)} />
        <Metric
          label={strings.shops.todaysOrder}
          value={
            shop.todaysOrderStatus === 'no_order'
              ? strings.shops.noOrderToday
              : undefined
          }
          badge={
            shop.todaysOrderStatus === 'no_order' ? undefined : (
              <StatusBadge status={shop.todaysOrderStatus} compact />
            )
          }
        />
      </View>

      <View style={styles.creditBlock}>
        <View style={styles.creditHeader}>
          <AppText variant="caption">
            {strings.shops.creditUtilisation(formatPercent(utilisation))}
          </AppText>
          <AppText variant="caption" color={colors.textPrimary}>
            {`${formatCurrencyCompact(shop.creditUsed)} / ${formatCurrencyCompact(shop.creditLimit)}`}
          </AppText>
        </View>

        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.max(utilisation, 2)}%`, backgroundColor: utilisationColor },
            ]}
          />
        </View>
      </View>

      <View style={styles.actions}>
        <CardAction icon="pencil-outline" label={strings.common.edit} onPress={onEdit} />
        <CardAction
          icon={shop.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'}
          label={shop.status === 'active' ? strings.shops.suspend : strings.shops.reactivate}
          onPress={onToggleSuspend}
        />
        <CardAction
          icon="account-off-outline"
          label={strings.shops.deactivate}
          tone={colors.error}
          onPress={onDeactivate}
          disabled={shop.status === 'inactive'}
        />
      </View>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  badge,
}: {
  label: string;
  value?: string;
  badge?: React.ReactNode;
}) {
  return (
    <View style={styles.metric}>
      <AppText variant="caption" numberOfLines={1}>
        {label}
      </AppText>
      {badge ?? (
        <AppText variant="body" numberOfLines={1} style={styles.metricValue}>
          {value}
        </AppText>
      )}
    </View>
  );
}

function CardAction({
  icon,
  label,
  onPress,
  tone = colors.primary,
  disabled = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  tone?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.action, pressed && !disabled && styles.pressed]}
    >
      <Icon
        name={icon}
        size={iconSize.sm}
        color={disabled ? colors.textMuted : tone}
      />
      <AppText
        variant="caption"
        color={disabled ? colors.textMuted : tone}
        style={styles.actionLabel}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export default React.memo(ShopCard);

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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  ownerText: { flex: 1, marginLeft: spacing.xs },
  metrics: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  metric: { flex: 1 },
  metricValue: { marginTop: spacing.xxs },
  creditBlock: { marginTop: spacing.md },
  creditHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  track: {
    height: spacing.sm,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.surfaceSunken,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: borderRadius.circle },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  action: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { marginLeft: spacing.xs },
});
