import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppText,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  Screen,
  ScreenHeader,
  SectionCard,
  SkeletonCards,
} from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../../constants';
import { useOffers } from '../../../hooks';
import { formatDate } from '../../../utils/format';
import type { Offer } from '../../../types/shop';
import type { ShopHomeStackParamList } from '../../../navigation/types';
import { describeDiscount } from '../components/ActiveOfferCard';

type Route = RouteProp<ShopHomeStackParamList, 'Offers'>;

/**
 * FR-34 — the offers the franchise has published to this shop.
 *
 * The half of FR-34 that cannot be honoured is stated at the top rather than
 * discovered at checkout: the backend's order pricer never consults an offer,
 * so no discount reaches an order total. Showing a reduced price here and a
 * full one on the invoice would be the worst of both. See docs/api-gaps.md G20.
 *
 * Opening the screen with an `offerId` (from the home strip or a notification)
 * records the FR-35 view for that offer.
 */
export default function OffersScreen() {
  const navigation = useNavigation<StackNavigationProp<ShopHomeStackParamList>>();
  const { params } = useRoute<Route>();

  const {
    active,
    scheduled,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    trackView,
  } = useOffers();

  const focusedId = params?.offerId;

  /* FR-35 — reach is counted when a shop actually opens an offer. */
  React.useEffect(() => {
    if (focusedId) {
      trackView(focusedId);
    }
    // `trackView` is stable; including it would re-fire on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId]);

  if (isLoading && active.length === 0) {
    return (
      <Screen>
        <ScreenHeader title={strings.offers.title} onBack={navigation.goBack} />
        <SkeletonCards />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title={strings.offers.title} onBack={navigation.goBack} />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  const nothing = active.length === 0 && scheduled.length === 0;

  return (
    <Screen>
      <ScreenHeader
        title={strings.offers.title}
        subtitle={strings.offers.subtitle}
        onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {nothing ? (
          <EmptyState
            icon="tag-outline"
            title={strings.offers.empty}
            message={strings.offers.emptyMessage}
          />
        ) : (
          <>
            {/* Said once, at the top, rather than repeated on every card. */}
            <InlineMessage tone="info">
              {strings.offers.notAutoApplied}
            </InlineMessage>

            {active.length > 0 ? (
              <SectionCard title={strings.offers.activeTitle}>
                {active.map(offer => (
                  <OfferRow
                    key={offer.id}
                    offer={offer}
                    highlighted={offer.id === focusedId}
                  />
                ))}
              </SectionCard>
            ) : null}

            {scheduled.length > 0 ? (
              <SectionCard title={strings.offers.scheduledTitle}>
                {scheduled.map(offer => (
                  <OfferRow key={offer.id} offer={offer} upcoming />
                ))}
              </SectionCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function OfferRow({
  offer,
  upcoming = false,
  highlighted = false,
}: {
  offer: Offer;
  upcoming?: boolean;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.row, highlighted && styles.highlighted]}>
      <View style={styles.icon}>
        <Icon name="tag-outline" size={iconSize.md} color={colors.primary} />
      </View>

      <View style={styles.body}>
        <AppText variant="h3" numberOfLines={2}>
          {offer.title}
        </AppText>

        <AppText variant="body" color={colors.primary}>
          {describeDiscount(offer)}
        </AppText>

        {offer.description ? (
          <AppText variant="bodySecondary" numberOfLines={3}>
            {offer.description}
          </AppText>
        ) : null}

        <AppText variant="caption">
          {offer.productIds.length === 0
            ? strings.offers.allProducts
            : strings.offers.someProducts(offer.productIds.length)}
        </AppText>

        <AppText variant="caption" color={colors.textMuted}>
          {upcoming
            ? strings.offers.startsOn(formatDate(offer.startDate))
            : strings.offers.validUntil(formatDate(offer.endDate))}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.giant,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  highlighted: {
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xxs },
});
