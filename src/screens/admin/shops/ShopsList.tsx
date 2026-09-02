import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  ConfirmDialog,
  Dropdown,
  EmptyState,
  ErrorState,
  FilterBar,
  OfflineBanner,
  Pagination,
  Screen,
  ScreenHeader,
  SearchInput,
  SectionCard,
  SimpleBarChart,
  ShopCard,
  SkeletonList,
  type DropdownOption,
} from '../../../components';
import { colors, spacing, strings } from '../../../constants';
import { defaultPagination, defaultShopFilters, useShopMutations, useShops } from '../../../hooks';
import { formatCurrencyCompact } from '../../../utils/format';
import type { AdminShopsStackParamList } from '../../../navigation/types';
import type { Pagination as PaginationState, Shop, ShopFilters, ShopStatus } from '../../../types/admin';

type ShopsNavigation = StackNavigationProp<AdminShopsStackParamList, 'ShopsList'>;

/** The confirm dialog serves three FR-3 transitions, so it carries its intent. */
type PendingAction = {
  shop: Shop;
  status: ShopStatus;
  title: string;
  message: string;
  destructive: boolean;
};

const statusOptions: DropdownOption<ShopStatus | 'all'>[] = [
  { value: 'all', label: strings.common.all },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
];

const sortOptions: DropdownOption<ShopFilters['sort']>[] = [
  { value: 'name', label: 'Name' },
  { value: 'outstanding', label: 'Outstanding' },
  { value: 'creditUtilisation', label: 'Credit utilisation' },
];

/** FR-38 shop directory, with the FR-2 create entry point and FR-3 lifecycle actions. */
export default function ShopsList() {
  const navigation = useNavigation<ShopsNavigation>();

  const [filters, setFilters] = React.useState<ShopFilters>(defaultShopFilters);
  const [pagination, setPagination] = React.useState<PaginationState>(defaultPagination);
  const [showAgeing, setShowAgeing] = React.useState(false);
  const [pending, setPending] = React.useState<PendingAction | null>(null);

  const { shops, total, ageing, regions, isLoading, isError, error, isStale, isRefetching, refetch } =
    useShops(filters, pagination);

  const { changeStatus } = useShopMutations();

  /** Any filter change resets to page 1, or the user lands on an empty page. */
  const updateFilters = (partial: Partial<ShopFilters>) => {
    setFilters(current => ({ ...current, ...partial }));
    setPagination(current => ({ ...current, page: 1 }));
  };

  const activeFilterCount =
    (filters.status === 'all' ? 0 : 1) +
    (filters.region === 'all' ? 0 : 1) +
    (filters.sort === 'name' ? 0 : 1);

  const regionOptions: DropdownOption<string>[] = [
    { value: 'all', label: strings.common.all },
    ...regions.map(region => ({ value: region, label: region })),
  ];

  const confirmSuspend = (shop: Shop) =>
    setPending(
      shop.status === 'active'
        ? {
            shop,
            status: 'suspended',
            title: strings.shops.suspendTitle,
            message: strings.shops.suspendMessage(shop.name),
            destructive: true,
          }
        : {
            shop,
            status: 'active',
            title: strings.shops.reactivateTitle,
            message: strings.shops.reactivateMessage(shop.name),
            destructive: false,
          },
    );

  const confirmDeactivate = (shop: Shop) =>
    setPending({
      shop,
      status: 'inactive',
      title: strings.shops.deactivateTitle,
      message: strings.shops.deactivateMessage(shop.name),
      destructive: true,
    });

  const applyPendingAction = () => {
    if (!pending) {
      return;
    }
    changeStatus.mutate(
      { shopId: pending.shop.id, status: pending.status },
      { onSettled: () => setPending(null) },
    );
  };

  const renderHeader = () => (
    <View>
      <OfflineBanner visible={isStale} />

      <FilterBar
        activeCount={activeFilterCount}
        onClear={() => updateFilters({ status: 'all', region: 'all', sort: 'name' })}
        primary={
          <SearchInput
            value={filters.search}
            onChangeText={search => updateFilters({ search })}
            placeholder={strings.shops.searchPlaceholder}
            testID="shops-search"
          />
        }
      >
        <View style={styles.filterRow}>
          <Dropdown
            label={strings.shops.statusLabel}
            value={filters.status}
            options={statusOptions}
            onChange={status => updateFilters({ status })}
          />
          <Dropdown
            label={strings.shops.regionLabel}
            value={filters.region}
            options={regionOptions}
            onChange={region => updateFilters({ region })}
          />
        </View>

        <Dropdown
          label={strings.shops.sortLabel}
          value={filters.sort}
          options={sortOptions}
          onChange={sort => updateFilters({ sort })}
        />
      </FilterBar>

      {/* FR-38 — outstanding split into the PRD's three ageing buckets. */}
      <SectionCard
        title={strings.shops.ageingTitle}
        actionLabel={showAgeing ? strings.common.close : strings.shops.ageingToggle}
        actionIcon={showAgeing ? 'chevron-up' : 'chevron-down'}
        onAction={() => setShowAgeing(current => !current)}
        style={styles.ageingCard}
      >
        {showAgeing ? (
          <SimpleBarChart
            data={ageing.map(bucket => ({
              label: `${strings.shops.ageingBucket(bucket.label)} · ${strings.shops.ageingShops(
                bucket.shopCount,
              )}`,
              value: bucket.amount,
              valueLabel: formatCurrencyCompact(bucket.amount),
            }))}
            emptyMessage={strings.dashboard.charts.empty}
          />
        ) : null}
      </SectionCard>
    </View>
  );

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title={strings.shops.title} />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={strings.shops.title}
        actions={[
          {
            icon: 'plus-circle-outline',
            label: strings.shops.add,
            onPress: () => navigation.navigate('ShopDetails', { mode: 'create' }),
          },
        ]}
      />

      <FlatList
        data={shops}
        keyExtractor={shop => shop.id}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <ShopCard
            shop={item}
            onPress={() =>
              navigation.navigate('ShopDetails', { shopId: item.id, mode: 'view' })
            }
            onEdit={() =>
              navigation.navigate('ShopDetails', { shopId: item.id, mode: 'edit' })
            }
            onToggleSuspend={() => confirmSuspend(item)}
            onDeactivate={() => confirmDeactivate(item)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList rows={6} />
          ) : (
            <EmptyState
              icon="storefront-outline"
              title={strings.shops.empty}
              message={
                activeFilterCount > 0 || filters.search
                  ? 'Try clearing the filters or searching for a different name.'
                  : undefined
              }
              actionLabel={
                activeFilterCount > 0 || filters.search
                  ? strings.common.clearFilters
                  : strings.shops.add
              }
              onAction={() =>
                activeFilterCount > 0 || filters.search
                  ? updateFilters({ search: '', status: 'all', region: 'all', sort: 'name' })
                  : navigation.navigate('ShopDetails', { mode: 'create' })
              }
            />
          )
        }
        ListFooterComponent={
          shops.length > 0 ? (
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={total}
              onChangePage={page => setPagination(current => ({ ...current, page }))}
            />
          ) : undefined
        }
      />

      <ConfirmDialog
        visible={pending !== null}
        title={pending?.title ?? ''}
        message={pending?.message ?? ''}
        confirmLabel={strings.common.confirm}
        destructive={pending?.destructive}
        loading={changeStatus.isPending}
        onConfirm={applyPendingAction}
        onDismiss={() => setPending(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  filterRow: { flexDirection: 'row', gap: spacing.md },
  ageingCard: { marginBottom: spacing.md },
});
