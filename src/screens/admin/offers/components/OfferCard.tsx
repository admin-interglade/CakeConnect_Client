import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon } from '../../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  spacing,
  strings,
} from '../../../../constants';
import { formatDate } from '../../../../utils/format';
import { describeDiscount } from '../../../shop/components/ActiveOfferCard';
import OfferBanner from './OfferBanner';
import OfferStatusPill from './OfferStatusPill';
import { describeProducts, describeTargeting, discountBadgeLabel } from './offerPresentation';
import type { Offer } from '../../../../types/shop';

/** Fixed so the dashboard carousel can snap cleanly card to card. */
export const OFFER_CARD_WIDTH = 288;

/** Banner heights: shorter in the strip, where the card is a glance. */
const BANNER_HEIGHT = 132;
const STRIP_BANNER_HEIGHT = 108;

/**
 * Fixed for the strip only, so a one-line title and a wrapped one sit at the
 * same height. The list card is free to grow — there is nothing beside it for
 * an uneven edge to read against.
 *
 * Sized for the tallest the strip card gets: banner, badge row, a two-line
 * title, a one-line description, the footer, and the stranded warning under it.
 * The flexing spacer takes up whatever a shorter card does not use.
 */
export const OFFER_CARD_HEIGHT = 312;

type OfferCardProps = {
  offer: Offer;
  /** True when the offer is live past its end date, or scheduled past its start. */
  stranded?: 'expiry' | 'publication';
  /** Renders the fixed-width variant for the dashboard carousel. */
  compact?: boolean;
  onPress: () => void;
};

/**
 * One offer, as a banner card.
 *
 * The discount line comes from the shop surface's own `describeDiscount` rather
 * than a second wording here: what an admin reads on this card is then exactly
 * the sentence the shop will read on its home screen, and the two cannot drift.
 *
 * The status pill sits over the banner rather than beside the title. The design
 * reference has no such control — it is a shop's view of an offer, and a shop
 * only ever sees live ones — but an admin list mixes live, scheduled, expired
 * and withdrawn offers, and which of those a row is is the first thing that has
 * to be readable.
 *
 * The strip along the bottom is not decoration either. Nothing on this backend
 * moves an offer between states, so "live and three days past its end date" is
 * a condition only a person will ever notice, and it costs the franchise every
 * day it goes unnoticed.
 */
export default function OfferCard({
  offer,
  stranded,
  compact = false,
  onPress,
}: OfferCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${offer.title}, ${describeDiscount(offer)}`}
      accessibilityHint={strings.adminOffers.viewDetails}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compactCard,
        pressed && styles.pressed,
      ]}
    >
      <OfferBanner
        offer={offer}
        height={compact ? STRIP_BANNER_HEIGHT : BANNER_HEIGHT}
        topOnlyRadius
      >
        <OfferStatusPill status={offer.status} style={styles.statusPill} />
      </OfferBanner>

      <View style={styles.body}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <AppText variant="kicker" color={colors.onPrimary} numberOfLines={1}>
              {discountBadgeLabel(offer)}
            </AppText>
          </View>

          {offer.endDate ? (
            <AppText variant="caption" numberOfLines={1} style={styles.validity}>
              {strings.adminOffers.validTill(formatDate(offer.endDate))}
            </AppText>
          ) : null}
        </View>

        <AppText variant="h3" numberOfLines={2} style={styles.title}>
          {offer.title}
        </AppText>

        {offer.description ? (
          <AppText
            variant="bodySecondary"
            // One line in the strip, where the card has a fixed height to keep
            // and the full description is one tap away.
            numberOfLines={compact ? 1 : 2}
            style={styles.description}
          >
            {offer.description}
          </AppText>
        ) : null}

        {/* Pushes the footer to the bottom edge on the fixed-height strip card,
            so a short title does not leave the action floating mid-card. */}
        {compact ? <View style={styles.spacer} /> : null}

        <View style={styles.footer}>
          <View style={styles.meta}>
            <AppText variant="caption" color={colors.primaryDark} numberOfLines={1}>
              {describeProducts(offer)}
            </AppText>
            {!compact ? (
              <AppText variant="caption" numberOfLines={1} style={styles.metaSecond}>
                {describeTargeting(offer)}
              </AppText>
            ) : null}
          </View>

          <View style={styles.action}>
            <AppText variant="link" numberOfLines={1}>
              {strings.adminOffers.viewDetails}
            </AppText>
            <Icon name="chevron-right" size={iconSize.sm} color={colors.primary} />
          </View>
        </View>

        {stranded ? (
          <View style={styles.strandedRow}>
            <Icon name="alert-outline" size={iconSize.xs} color={colors.warning} />
            <AppText
              variant="caption"
              color={colors.warning}
              numberOfLines={compact ? 1 : 2}
              style={styles.strandedLabel}
            >
              {stranded === 'expiry'
                ? strings.adminOffers.pastEndDate
                : strings.adminOffers.startDatePassed}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...(elevation.card as object),
  },
  compactCard: {
    width: OFFER_CARD_WIDTH,
    height: OFFER_CARD_HEIGHT,
    marginBottom: 0,
  },
  pressed: { opacity: 0.9 },
  statusPill: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  body: { flex: 1, padding: spacing.lg },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primary,
  },
  validity: { flex: 1, marginLeft: spacing.sm, textAlign: 'right' },
  title: { marginTop: spacing.sm },
  description: { marginTop: spacing.xs },
  spacer: { flex: 1 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: colors.divider,
  },
  meta: { flex: 1, marginRight: spacing.sm },
  metaSecond: { marginTop: spacing.xxs },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  strandedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  strandedLabel: { flex: 1, marginLeft: spacing.xs },
});
