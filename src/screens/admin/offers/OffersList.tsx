import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  EmptyState,
  ErrorState,
  InlineMessage,
  Pagination,
  Screen,
  ScreenHeader,
  SectionCard,
  SegmentedTabs,
  SkeletonCards,
  type SegmentedTab,
} from '../../../components';
import { colors, spacing, strings } from '../../../constants';
import {
  defaultOfferPagination,
  useAdminOffers,
  useOfferMutations,
} from '../../../hooks';
import { isOverdueForExpiry, isOverdueForPublication } from '../../../services/admin';
import { toApiDate } from '../../../utils/format';
import OfferCard from './components/OfferCard';
import OfferComposer from './OfferComposer';
import type { OfferFilters, Pagination as PageState } from '../../../types/admin';
import type { OfferStatus } from '../../../types/shop';
import type { AdminDashboardStackParamList } from '../../../navigation/types';

type Nav = StackNavigationProp<AdminDashboardStackParamList>;

type OfferTab = OfferStatus | 'all';

/**
 * FR-32 to FR-35 — the offers the franchise has published, and the place they
 * are composed.
 *
 * The card at the top is the screen's most important content, not a disclaimer.
 * An admin publishing an offer here is making three assumptions that this
 * backend does not honour — that scheduling publishes, that regions target, and
 * that redemptions count — and each of them, acted on, produces a decision the
 * network cannot deliver. They are stated before the list rather than after it.
 *
 * The tabs are one status each because `GET /offers` takes one `status` and
 * pages on it. Merging "expired" and "withdrawn" into an "ended" tab would need
 * two queries whose pages cannot be interleaved without inventing an order the
 * server never sent.
 */
export default function OffersList() {
  const navigation = useNavigation<Nav>();

  const [tab, setTab] = React.useState<OfferTab>('all');
  const [page, setPage] = React.useState(defaultOfferPagination.page);
  const [composing, setComposing] = React.useState(false);

  const filters: OfferFilters = { status: tab };
  const pagination: PageState = { ...defaultOfferPagination, page };

  const { offers, total, stranded, isLoading, isError, error, refetch } =
    useAdminOffers(filters, pagination);
  const mutations = useOfferMutations();

  const today = toApiDate(new Date());

  const tabs: SegmentedTab<OfferTab>[] = [
    { key: 'all', label: strings.adminOffers.tabs.all },
    { key: 'active', label: strings.adminOffers.tabs.active },
    { key: 'scheduled', label: strings.adminOffers.tabs.scheduled },
    { key: 'expired', label: strings.adminOffers.tabs.expired },
    { key: 'withdrawn', label: strings.adminOffers.tabs.withdrawn },
  ];

  const changeTab = (next: OfferTab) => {
    setTab(next);
    // Page three of "all" is not page three of "live".
    setPage(1);
  };

  if (isError) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.adminOffers.title}
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
        <ErrorState message={error} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <ScreenHeader
        title={strings.adminOffers.title}
        subtitle={strings.adminOffers.subtitle}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      {/*
        FR-33, FR-35 — said before anything is composed. Each line is a thing
        the backend does not do, in the order an admin would trip over them.
      */}
      <SectionCard
        title={strings.adminOffers.limitsTitle}
        subtitle={strings.adminOffers.limitsSubtitle}
      >
        <InlineMessage tone="warning">
          {strings.adminOffers.schedulingDoesNotPublish}
        </InlineMessage>
        <InlineMessage tone="warning" style={styles.spaced}>
          {strings.adminOffers.noRegionTargeting}
        </InlineMessage>
        <InlineMessage tone="info" style={styles.spaced}>
          {strings.adminOffers.redemptionsAlwaysZero}
        </InlineMessage>
      </SectionCard>

      <AppButton
        label={strings.adminOffers.newOffer}
        icon="plus"
        onPress={() => setComposing(true)}
        style={styles.compose}
      />

      <SegmentedTabs tabs={tabs} value={tab} onChange={changeTab} style={styles.tabs} />

      {/*
        The two states nothing else will ever notice. Scoped to the page that is
        loaded, and labelled that way — the endpoint has no filter for either,
        so a stranded offer further back genuinely cannot be counted from here.
      */}
      {stranded.overdueForExpiry.length > 0 ? (
        <InlineMessage tone="warning" style={styles.notice}>
          {`${strings.adminOffers.strandedLiveTitle(
            stranded.overdueForExpiry.length,
          )}. ${strings.adminOffers.strandedLiveMessage} ${
            strings.adminOffers.strandedScope
          }`}
        </InlineMessage>
      ) : null}

      {stranded.overdueForPublication.length > 0 ? (
        <InlineMessage tone="warning" style={styles.notice}>
          {`${strings.adminOffers.strandedScheduledTitle(
            stranded.overdueForPublication.length,
          )}. ${strings.adminOffers.strandedScheduledMessage} ${
            strings.adminOffers.strandedScope
          }`}
        </InlineMessage>
      ) : null}

      {isLoading && offers.length === 0 ? (
        <SkeletonCards />
      ) : offers.length === 0 ? (
        <EmptyState
          icon="ticket-percent-outline"
          title={
            tab === 'all'
              ? strings.adminOffers.empty
              : strings.adminOffers.emptyFiltered
          }
          message={
            tab === 'all'
              ? strings.adminOffers.emptyMessage
              : strings.adminOffers.emptyFilteredMessage
          }
          actionLabel={tab === 'all' ? strings.adminOffers.newOffer : undefined}
          onAction={tab === 'all' ? () => setComposing(true) : undefined}
        />
      ) : (
        <View>
          <AppText variant="caption" color={colors.textSecondary} style={styles.count}>
            {strings.common.showingCount(offers.length, total)}
          </AppText>

          {offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              stranded={
                isOverdueForExpiry(offer, today)
                  ? 'expiry'
                  : isOverdueForPublication(offer, today)
                  ? 'publication'
                  : undefined
              }
              onPress={() =>
                navigation.navigate('OfferDetails', { offerId: offer.id })
              }
            />
          ))}

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={total}
            onChangePage={setPage}
          />
        </View>
      )}

      <OfferComposer
        visible={composing}
        submitting={mutations.create.isPending}
        onSubmit={input =>
          mutations.create.mutate(input, {
            onSuccess: () => setComposing(false),
          })
        }
        onDismiss={() => setComposing(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  compose: { marginBottom: spacing.lg },
  tabs: { marginBottom: spacing.md },
  spaced: { marginTop: spacing.sm },
  notice: { marginBottom: spacing.md },
  count: { marginBottom: spacing.sm },
});
