import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  Dropdown,
  EmptyState,
  ErrorState,
  InlineMessage,
  Pagination,
  SectionCard,
  SkeletonCards,
  type DropdownOption,
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
import type { AdminCatalogueStackParamList } from '../../../navigation/types';

type Nav = StackNavigationProp<AdminCatalogueStackParamList>;

type OfferTab = OfferStatus | 'all';

/**
 * FR-32 to FR-35 — the offers the franchise has published, and the place they
 * are composed. Rendered inside the catalogue's "Offers" tab rather than as a
 * screen of its own, so it brings no header and relies on the catalogue's
 * scroll view.
 *
 * "New offer" comes first because composing is what an admin opens this tab
 * for; the list follows, and the backend's limits close the tab the way the
 * region notice closes the price-list tab.
 *
 * The status filter is one status at a time because `GET /offers` takes one
 * `status` and pages on it. Merging "expired" and "withdrawn" into an "ended"
 * option would need two queries whose pages cannot be interleaved without
 * inventing an order the server never sent. It is a dropdown rather than a
 * second tab strip so it does not stack under the catalogue's own tabs.
 */
export default function OffersList() {
  const navigation = useNavigation<Nav>();

  const [tab, setTab] = React.useState<OfferTab>('all');
  const [page, setPage] = React.useState(defaultOfferPagination.page);
  const [composing, setComposing] = React.useState(false);

  const filters: OfferFilters = { status: tab };
  const pagination: PageState = { ...defaultOfferPagination, page };

  const { offers, total, stranded, isLoading, isError, error, isRefetching, refetch } =
    useAdminOffers(filters, pagination);
  const mutations = useOfferMutations();

  const today = toApiDate(new Date());

  const changeTab = (next: OfferTab) => {
    setTab(next);
    // Page three of "all" is not page three of "live".
    setPage(1);
  };

  const composeButton = (
    <AppButton
      label={strings.adminOffers.newOffer}
      icon="plus"
      onPress={() => setComposing(true)}
      style={styles.compose}
    />
  );

  if (isError) {
    return (
      <View>
        {composeButton}
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
        {renderComposer()}
      </View>
    );
  }

  return (
    <View>
      {composeButton}

      <Dropdown
        label={strings.catalogue.statusLabel}
        value={tab}
        options={statusOptions}
        onChange={changeTab}
        style={styles.filter}
      />

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

      {/*
        FR-33, FR-35 — each line is a thing the backend does not do, in the
        order an admin would trip over them.
      */}
      <SectionCard
        title={strings.adminOffers.limitsTitle}
        subtitle={strings.adminOffers.limitsSubtitle}
        style={styles.limits}
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

      {renderComposer()}
    </View>
  );

  function renderComposer() {
    return (
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
    );
  }
}

const statusOptions: DropdownOption<OfferTab>[] = [
  { value: 'all', label: strings.adminOffers.tabs.all },
  { value: 'active', label: strings.adminOffers.tabs.active },
  { value: 'scheduled', label: strings.adminOffers.tabs.scheduled },
  { value: 'expired', label: strings.adminOffers.tabs.expired },
  { value: 'withdrawn', label: strings.adminOffers.tabs.withdrawn },
];

const styles = StyleSheet.create({
  compose: { marginVertical: spacing.md },
  filter: { marginBottom: spacing.md },
  spaced: { marginTop: spacing.sm },
  notice: { marginBottom: spacing.md },
  count: { marginBottom: spacing.sm },
  limits: { marginTop: spacing.md },
});
