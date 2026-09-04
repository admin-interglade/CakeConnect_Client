import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  DateRangePicker,
  Dropdown,
  EmptyState,
  ErrorState,
  InlineMessage,
  LedgerEntryCard,
  OfflineBanner,
  Pagination,
  Screen,
  ScreenHeader,
  SearchInput,
  SectionCard,
  SkeletonList,
  StatCard,
  type DropdownOption,
} from '../../../components';
import { spacing, strings } from '../../../constants';
import {
  useTransactions,
  defaultTransactionFilters,
  defaultTransactionPagination,
} from '../../../hooks';
import { formatCurrency, formatCurrencyCompact, formatDate } from '../../../utils/format';
import type { LedgerEntry, Pagination as PaginationState } from '../../../types/admin';
import type { TransactionFilters } from '../../../types/shop';
import type { ShopHomeStackParamList } from '../../../navigation/types';

type TransactionType = LedgerEntry['type'] | 'all';

const TYPE_OPTIONS: DropdownOption<TransactionType>[] = [
  { value: 'all', label: strings.transactions.types.all },
  { value: 'order', label: strings.transactions.types.order },
  { value: 'invoice', label: strings.transactions.types.invoice },
  { value: 'payment', label: strings.transactions.types.payment },
  { value: 'credit_note', label: strings.transactions.types.credit_note },
  { value: 'adjustment', label: strings.transactions.types.adjustment },
];

/**
 * FR-23 / FR-24 — the transaction list for any duration.
 *
 * Every order, invoice, payment, credit note and adjustment with its running
 * balance, rendered with the same `LedgerEntryCard` the franchise owner's shop
 * detail uses: it is the one shared ledger, which is the point of FR-23.
 *
 * Two honesty notes carried on the screen rather than hidden:
 *   - the type and text filters run over the fetched page, because the endpoint
 *     accepts neither (docs/api-gaps.md G19);
 *   - FR-24's export is absent rather than broken. No endpoint produces a
 *     shareable file, and a button that always fails is worse than none.
 */
export default function TransactionsScreen() {
  const navigation = useNavigation<StackNavigationProp<ShopHomeStackParamList>>();

  const [filters, setFilters] = React.useState<TransactionFilters>(
    defaultTransactionFilters,
  );
  const [pagination, setPagination] = React.useState<PaginationState>(
    defaultTransactionPagination,
  );
  const [rangeOpen, setRangeOpen] = React.useState(false);

  const {
    transactions,
    total,
    closingBalance,
    billed,
    received,
    filterFullyApplied,
    isLoading,
    isError,
    error,
    isStale,
    isRefetching,
    refetch,
  } = useTransactions(filters, pagination);

  const update = (next: Partial<TransactionFilters>) => {
    setFilters(current => ({ ...current, ...next }));
    setPagination(current => ({ ...current, page: 1 }));
  };

  const header = (
    <View style={styles.header}>
      <SectionCard
        title={strings.orders.dateRangeLabel}
        subtitle={`${formatDate(filters.range.from)} – ${formatDate(filters.range.to)}`}
        actionLabel={rangeOpen ? strings.common.close : strings.common.edit}
        actionIcon={rangeOpen ? 'chevron-up' : 'calendar-range'}
        onAction={() => setRangeOpen(open => !open)}
      >
        {rangeOpen ? (
          <DateRangePicker
            value={filters.range}
            onChange={range => update({ range })}
          />
        ) : null}
      </SectionCard>

      <View style={styles.tiles}>
        <StatCard
          label={strings.transactions.billed}
          value={formatCurrencyCompact(billed)}
          icon="file-document-outline"
          style={styles.tile}
        />
        <StatCard
          label={strings.transactions.received}
          value={formatCurrencyCompact(received)}
          icon="cash-check"
          tone="success"
          style={styles.tile}
        />
      </View>

      <StatCard
        label={strings.transactions.closingBalance}
        value={formatCurrency(closingBalance)}
        caption={strings.shopDetails.ledgerClosing}
        icon="scale-balance"
        tone={closingBalance > 0 ? 'warning' : 'default'}
      />

      <SearchInput
        value={filters.search}
        onChangeText={search => update({ search })}
        placeholder={strings.transactions.searchPlaceholder}
      />

      <Dropdown
        label={strings.transactions.typeLabel}
        value={filters.type}
        options={TYPE_OPTIONS}
        onChange={type => update({ type })}
      />

      {!filterFullyApplied ? (
        <InlineMessage tone="info">
          {strings.transactions.pageFilterNote}
        </InlineMessage>
      ) : null}

      {/* FR-24 — stated rather than offered, because no endpoint serves it. */}
      <InlineMessage tone="info">
        {strings.transactions.exportUnavailable}
      </InlineMessage>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader
        title={strings.transactions.title}
        subtitle={strings.transactions.subtitle}
        onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      />

      <OfflineBanner visible={isStale} />

      {isLoading && transactions.length === 0 ? (
        <SkeletonList />
      ) : isError ? (
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={entry => entry.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListHeaderComponent={header}
          renderItem={({ item }) => <LedgerEntryCard entry={item} />}
          ListEmptyComponent={
            <EmptyState
              icon="file-document-outline"
              title={
                filterFullyApplied
                  ? strings.transactions.empty
                  : strings.transactions.emptyFiltered
              }
            />
          }
          ListFooterComponent={
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={total}
              onChangePage={page => setPagination(current => ({ ...current, page }))}
              style={styles.pagination}
            />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingBottom: spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
  list: {
    paddingBottom: spacing.giant,
    gap: spacing.sm,
  },
  pagination: { marginTop: spacing.lg },
});
