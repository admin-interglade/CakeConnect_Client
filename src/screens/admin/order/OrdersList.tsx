import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  DataTable,
  DateRangePicker,
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
  SkeletonList,
  StatusBadge,
  type DataTableColumn,
  type DropdownOption,
} from '../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  layout,
  spacing,
  strings,
} from '../../../constants';
import {
  defaultOrderFilters,
  defaultOrderPagination,
  useOrderMutations,
  useOrders,
} from '../../../hooks';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  orderStatusFlow,
  orderStatusLabels,
} from '../../../utils/format';
import type { AdminOrdersStackParamList } from '../../../navigation/types';
import type {
  Order,
  OrderFilters,
  OrderStatus,
  Pagination as PaginationState,
} from '../../../types/admin';

type OrdersNavigation = StackNavigationProp<AdminOrdersStackParamList, 'OrdersList'>;
type OrdersRoute = RouteProp<AdminOrdersStackParamList, 'OrdersList'>;

/** FR-40 queue tabs, with FR-17's pending view at the front. */
const queueTabs: { key: OrderFilters['status']; label: string }[] = [
  { key: 'all', label: strings.common.all },
  { key: 'pending_cutoff', label: strings.orders.pendingCutoff },
  ...orderStatusFlow.map(status => ({
    key: status as OrderFilters['status'],
    label: orderStatusLabels[status],
  })),
  { key: 'cancelled' as OrderFilters['status'], label: orderStatusLabels.cancelled },
];

const dateFieldOptions: DropdownOption<OrderFilters['dateField']>[] = [
  { value: 'orderDate', label: strings.orders.orderDate },
  { value: 'deliveryDate', label: strings.orders.deliveryDate },
];

/** The three bulk transitions the queue supports, and what they move orders to. */
const bulkActions: { label: string; status: OrderStatus; destructive: boolean }[] = [
  { label: strings.orders.bulkAccept, status: 'accepted', destructive: false },
  { label: strings.orders.bulkProduction, status: 'in_production', destructive: false },
  { label: strings.orders.bulkCancel, status: 'cancelled', destructive: true },
];

export default function OrdersList() {
  const navigation = useNavigation<OrdersNavigation>();
  const { params } = useRoute<OrdersRoute>();

  const [filters, setFilters] = React.useState<OrderFilters>(() => ({
    ...defaultOrderFilters(),
    // A dashboard tile can deep-link straight into a filtered queue.
    status: params?.status ?? 'all',
    shopId: params?.shopId ?? 'all',
  }));
  const [pagination, setPagination] = React.useState<PaginationState>(
    defaultOrderPagination,
  );
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pendingBulk, setPendingBulk] = React.useState<(typeof bulkActions)[number] | null>(
    null,
  );
  const [timelineOrder, setTimelineOrder] = React.useState<Order | null>(null);

  const { orders, total, shops, isLoading, isError, error, isStale, isRefetching, refetch } =
    useOrders(filters, pagination);

  const { bulkUpdateStatus, exportList } = useOrderMutations();

  const isPendingView = filters.status === 'pending_cutoff';

  const updateFilters = (partial: Partial<OrderFilters>) => {
    setFilters(current => ({ ...current, ...partial }));
    setPagination(current => ({ ...current, page: 1 }));
    setSelected([]);
  };

  const shopOptions: DropdownOption<string>[] = [
    { value: 'all', label: strings.common.all },
    ...shops.map(shop => ({ value: shop.id, label: shop.name, meta: shop.code })),
  ];

  const activeFilterCount =
    (filters.shopId === 'all' ? 0 : 1) +
    (filters.dateField === 'orderDate' ? 0 : 1) +
    (filters.range.preset === 'thisMonth' ? 0 : 1);

  const toggleSelect = (orderId: string) =>
    setSelected(current =>
      current.includes(orderId)
        ? current.filter(id => id !== orderId)
        : [...current, orderId],
    );

  const applyBulk = () => {
    if (!pendingBulk) {
      return;
    }
    bulkUpdateStatus.mutate(
      { orderIds: selected, status: pendingBulk.status },
      {
        onSuccess: () => setSelected([]),
        onSettled: () => setPendingBulk(null),
      },
    );
  };

  const columns = React.useMemo<DataTableColumn<Order>[]>(
    () => [
      { key: 'id', title: 'Order', width: 110, render: order => order.id },
      { key: 'shop', title: 'Shop', width: 170, render: order => order.shopName },
      {
        key: 'orderDate',
        title: strings.orders.orderDate,
        width: 110,
        render: order => formatDate(order.orderDate),
      },
      {
        key: 'deliveryDate',
        title: strings.orders.deliveryDate,
        width: 110,
        render: order => formatDate(order.deliveryDate),
      },
      {
        key: 'total',
        title: 'Value',
        width: 110,
        align: 'right',
        render: order => formatCurrency(order.total),
      },
      {
        key: 'status',
        title: 'Status',
        width: 130,
        render: order => (
          <StatusBadge
            status={isPendingView ? 'no_order' : order.status}
            compact
            onPress={() => setTimelineOrder(order)}
          />
        ),
      },
    ],
    [isPendingView],
  );

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title={strings.orders.title} />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={strings.orders.title}
        actions={[
          {
            icon: 'file-delimited-outline',
            label: strings.common.exportCsv,
            onPress: () => exportList.mutate({ filters, format: 'csv' }),
          },
          {
            icon: 'file-pdf-box',
            label: strings.common.exportPdf,
            onPress: () => exportList.mutate({ filters, format: 'pdf' }),
          },
        ]}
      />

      {/* FR-40 — the queue read as a pipeline, one tab per stage. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {queueTabs.map(tab => {
          const selectedTab = filters.status === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => updateFilters({ status: tab.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedTab }}
              accessibilityLabel={tab.label}
              style={({ pressed }) => [
                styles.tab,
                selectedTab && styles.tabSelected,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant="caption"
                color={selectedTab ? colors.onPrimary : colors.textSecondary}
              >
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
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
      >
        <OfflineBanner visible={isStale} />

        <FilterBar
          activeCount={activeFilterCount}
          onClear={() => updateFilters(defaultOrderFilters())}
          primary={
            <SearchInput
              value={filters.search}
              onChangeText={search => updateFilters({ search })}
              placeholder={strings.orders.searchPlaceholder}
              testID="orders-search"
            />
          }
        >
          <View style={styles.filterRow}>
            <Dropdown
              label={strings.orders.shopLabel}
              value={filters.shopId}
              options={shopOptions}
              onChange={shopId => updateFilters({ shopId })}
            />
            <Dropdown
              label={strings.orders.dateFieldLabel}
              value={filters.dateField}
              options={dateFieldOptions}
              onChange={dateField => updateFilters({ dateField })}
            />
          </View>

          <DateRangePicker
            value={filters.range}
            onChange={range => updateFilters({ range })}
          />
        </FilterBar>

        {selected.length > 0 ? (
          <SectionCard title={strings.common.selectedCount(selected.length)}>
            <View style={styles.bulkActions}>
              {bulkActions.map(action => (
                <AppButton
                  key={action.status}
                  label={action.label}
                  onPress={() => setPendingBulk(action)}
                  variant="outline"
                  style={styles.bulkButton}
                />
              ))}
            </View>
          </SectionCard>
        ) : null}

        {isLoading ? (
          <SkeletonList rows={8} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={isPendingView ? 'check-circle-outline' : 'clipboard-text-outline'}
            title={isPendingView ? strings.orders.emptyPendingCutoff : strings.orders.empty}
            message={
              activeFilterCount > 0 || filters.search
                ? 'Widen the date range or clear the filters to see more orders.'
                : undefined
            }
            actionLabel={
              activeFilterCount > 0 || filters.search ? strings.common.clearFilters : undefined
            }
            onAction={
              activeFilterCount > 0 || filters.search
                ? () => updateFilters(defaultOrderFilters())
                : undefined
            }
          />
        ) : (
          <>
            <DataTable<Order>
              columns={columns}
              rows={orders}
              keyExtractor={order => order.id}
              // FR-17 rows are placeholders for shops that never ordered, so
              // there is no order to open and nothing to bulk-action.
              onRowPress={
                isPendingView
                  ? undefined
                  : order => navigation.navigate('OrderDetails', { orderId: order.id })
              }
              selectable={!isPendingView}
              selectedKeys={selected}
              onToggleSelect={toggleSelect}
            />

            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={total}
              onChangePage={page => setPagination(current => ({ ...current, page }))}
            />
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={pendingBulk !== null}
        title={strings.orders.bulkTitle(pendingBulk?.label ?? '', selected.length)}
        message={strings.orders.bulkMessage(pendingBulk?.label ?? '', selected.length)}
        destructive={pendingBulk?.destructive}
        loading={bulkUpdateStatus.isPending}
        onConfirm={applyBulk}
        onDismiss={() => setPendingBulk(null)}
      />

      {/* FR-40 — the timeline behind a status badge, actor and time included. */}
      <ConfirmDialog
        visible={timelineOrder !== null}
        title={strings.orders.timelineTitle}
        message={timelineOrder?.id ?? ''}
        confirmLabel={strings.common.close}
        cancelLabel={strings.common.back}
        onConfirm={() => setTimelineOrder(null)}
        onDismiss={() => setTimelineOrder(null)}
      >
        <View>
          {(timelineOrder?.statusHistory ?? []).map(event => (
            <View key={`${event.status}-${event.at}`} style={styles.timelineRow}>
              <StatusBadge status={event.status} compact />
              <AppText variant="caption" style={styles.timelineMeta}>
                {`${formatDateTime(event.at)} · ${event.actor}`}
              </AppText>
            </View>
          ))}

          {timelineOrder?.statusHistory.length === 0 ? (
            <AppText variant="bodySecondary">{strings.orders.emptyPendingCutoff}</AppText>
          ) : null}
        </View>
      </ConfirmDialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  tabs: { gap: spacing.sm, paddingBottom: spacing.md },
  tab: {
    minHeight: layout.minTouchTarget - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.circle,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  filterRow: { flexDirection: 'row', gap: spacing.md },
  bulkActions: { gap: spacing.sm },
  bulkButton: { width: '100%' },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  timelineMeta: { flex: 1, marginLeft: spacing.sm },
});
