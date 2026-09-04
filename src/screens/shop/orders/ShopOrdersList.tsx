import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  EmptyState,
  ErrorState,
  InlineMessage,
  OfflineBanner,
  OrderHistoryCard,
  Pagination,
  Screen,
  ScreenHeader,
  SearchInput,
  SegmentedTabs,
  SkeletonCards,
  type SegmentedTab,
} from '../../../components';
import { spacing, strings } from '../../../constants';
import {
  useShopOrders,
  defaultShopOrderFilters,
  defaultShopOrderPagination,
} from '../../../hooks';
import type { OrderStatus, Pagination as PaginationState } from '../../../types/admin';
import type { ShopOrderFilters } from '../../../types/shop';
import type { ShopOrdersStackParamList } from '../../../navigation/types';

/** FR-22 — the stages a shop's own order actually passes through. */
const TAB_STATUSES: Array<OrderStatus | 'all'> = [
  'all',
  'draft',
  'submitted',
  'accepted',
  'in_production',
  'dispatched',
  'delivered',
  'invoiced',
  'cancelled',
];

/**
 * FR-22 — this shop's orders, tracked through the FR-40 pipeline.
 *
 * The same `OrderHistoryCard` the franchise owner's shop detail uses, because
 * it is the same order: the two sides of the app should not disagree about what
 * an order looks like.
 *
 * The tabs carry no counts, unlike the admin queue. The admin's counts come
 * from nine parallel `limit=1` queries (docs/api-gaps.md G9); doing the same on
 * a shop's phone for a badge nobody acts on would be nine requests per tab
 * change on a mobile connection.
 */
export default function ShopOrdersList() {
  const navigation = useNavigation<StackNavigationProp<ShopOrdersStackParamList>>();

  const [filters, setFilters] = React.useState<ShopOrderFilters>(
    defaultShopOrderFilters,
  );
  const [pagination, setPagination] = React.useState<PaginationState>(
    defaultShopOrderPagination,
  );

  const {
    orders,
    total,
    dateFilterApplied,
    isLoading,
    isError,
    error,
    isStale,
    isRefetching,
    refetch,
  } = useShopOrders(filters, pagination);

  const update = (next: Partial<ShopOrderFilters>) => {
    setFilters(current => ({ ...current, ...next }));
    setPagination(current => ({ ...current, page: 1 }));
  };

  const tabs: SegmentedTab<OrderStatus | 'all'>[] = TAB_STATUSES.map(status => ({
    key: status,
    label: strings.shopOrders.tabs[status],
  }));

  return (
    <Screen>
      <ScreenHeader
        title={strings.shopOrders.title}
        subtitle={strings.shopOrders.subtitle}
      />

      <View style={styles.controls}>
        <SearchInput
          value={filters.search}
          onChangeText={search => update({ search })}
          placeholder={strings.shopOrders.searchPlaceholder}
        />
      </View>

      <SegmentedTabs
        tabs={tabs}
        value={filters.status}
        onChange={status => update({ status })}
      />

      <OfflineBanner visible={isStale} />

      {/* The list really is unfiltered by date here, so saying so beats showing
          rows that look filtered and are not. See docs/api-gaps.md G7. */}
      {!dateFilterApplied ? (
        <InlineMessage tone="info" style={styles.notice}>
          {strings.shopOrders.dateFilterUnsupported}
        </InlineMessage>
      ) : null}

      {isLoading && orders.length === 0 ? (
        <SkeletonCards />
      ) : isError ? (
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={order => order.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <OrderHistoryCard
              order={item}
              onPress={() =>
                navigation.navigate('ShopOrderDetails', { orderId: item.id })
              }
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard-text-outline"
              title={
                filters.status === 'all' && !filters.search
                  ? strings.shopOrders.emptyAll
                  : strings.shopOrders.empty
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
  controls: { paddingBottom: spacing.sm },
  notice: { paddingVertical: spacing.sm },
  list: { paddingBottom: spacing.giant, gap: spacing.md },
  pagination: { marginTop: spacing.lg },
});
