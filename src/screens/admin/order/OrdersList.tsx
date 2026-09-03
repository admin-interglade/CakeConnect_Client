import React from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  DateRangePicker,
  Dropdown,
  EmptyState,
  ErrorState,
  FilterSheet,
  Icon,
  OfflineBanner,
  OrderQueueCard,
  Pagination,
  Screen,
  ScreenHeader,
  SearchInput,
  SectionCard,
  SkeletonList,
  StatusBadge,
  type DropdownOption,
} from '../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
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
  formatDateTime,
  formatRangeLabel,
  formatNumber,
  orderStatusFlow,
  orderStatusLabels,
} from '../../../utils/format';
import type { AdminOrdersStackParamList } from '../../../navigation/types';
import type {
  Order,
  OrderFilters,
  OrderStatus,
  OrderStatusCounts,
  Pagination as PaginationState,
} from '../../../types/admin';

type OrdersNavigation = StackNavigationProp<
  AdminOrdersStackParamList,
  'OrdersList'
>;
type OrdersRoute = RouteProp<AdminOrdersStackParamList, 'OrdersList'>;

/** FR-40 queue tabs, with FR-17's pending view at the front. */
const queueTabs: { key: OrderFilters['status']; label: string }[] = [
  { key: 'all', label: strings.common.all },
  { key: 'pending_cutoff', label: strings.orders.pendingCutoff },
  ...orderStatusFlow.map(status => ({
    key: status as OrderFilters['status'],
    label: orderStatusLabels[status],
  })),
  {
    key: 'cancelled' as OrderFilters['status'],
    label: orderStatusLabels.cancelled,
  },
];

const dateFieldOptions: DropdownOption<OrderFilters['dateField']>[] = [
  { value: 'orderDate', label: strings.orders.orderDate },
  { value: 'deliveryDate', label: strings.orders.deliveryDate },
];

/** The three bulk transitions the queue supports, and what they move orders to. */
const bulkActions: {
  label: string;
  status: OrderStatus;
  destructive: boolean;
}[] = [
  { label: strings.orders.bulkAccept, status: 'accepted', destructive: false },
  {
    label: strings.orders.bulkProduction,
    status: 'in_production',
    destructive: false,
  },
  { label: strings.orders.bulkCancel, status: 'cancelled', destructive: true },
];

/**
 * FR-40 order queue.
 *
 * The pipeline reads as a filtered card list: search, the day being worked,
 * one tab per stage with the count behind it, and a card per order carrying
 * the one action that stage offers. Bulk transitions are still here — a
 * long-press turns the list into a multi-select, which keeps the checkboxes
 * out of the way of the ninety-nine percent case of working one order at a
 * time.
 */
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
  // The sheet edits a draft and commits it on Apply, so half-built filter
  // combinations never reach the query.
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<FilterDraft>(() => toDraft(filters));
  const [selected, setSelected] = React.useState<string[]>([]);
  const [pendingBulk, setPendingBulk] = React.useState<
    (typeof bulkActions)[number] | null
  >(null);
  const [timelineOrder, setTimelineOrder] = React.useState<Order | null>(null);
  const [quickActionId, setQuickActionId] = React.useState<string | null>(null);

  const {
    orders,
    total,
    counts,
    shops,
    isLoading,
    isError,
    error,
    isStale,
    isRefetching,
    refetch,
  } = useOrders(filters, pagination);

  const { updateStatus, bulkUpdateStatus, exportList } = useOrderMutations();

  const isPendingView = filters.status === 'pending_cutoff';
  const selectionMode = selected.length > 0;

  const updateFilters = (partial: Partial<OrderFilters>) => {
    setFilters(current => ({ ...current, ...partial }));
    setPagination(current => ({ ...current, page: 1 }));
    setSelected([]);
  };

  const openFilterSheet = () => {
    setDraft(toDraft(filters));
    setFilterSheetOpen(true);
  };

  const applyFilterSheet = () => {
    updateFilters(draft);
    setFilterSheetOpen(false);
  };

  const shopOptions: DropdownOption<string>[] = [
    { value: 'all', label: strings.common.all },
    ...shops.map(shop => ({
      value: shop.id,
      label: shop.name,
      meta: shop.code,
    })),
  ];

  const activeFilterCount = countActive(toDraft(filters));
  const draftFilterCount = countActive(draft);

  const toggleSelect = (orderId: string) =>
    setSelected(current =>
      current.includes(orderId)
        ? current.filter(id => id !== orderId)
        : [...current, orderId],
    );

  const openOrder = (order: Order) => {
    if (selectionMode) {
      toggleSelect(order.id);
      return;
    }
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  /** The queue only offers the first transition; the rest live on the detail. */
  const acceptOrder = (order: Order) => {
    setQuickActionId(order.id);
    updateStatus.mutate(
      { orderId: order.id, status: 'accepted' },
      { onSettled: () => setQuickActionId(null) },
    );
  };

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

  if (isError) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.orders.title}
          subtitle={strings.orders.subtitle}
        />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={strings.orders.title}
        subtitle={strings.orders.subtitle}
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

      <SearchInput
        value={filters.search}
        onChangeText={search => updateFilters({ search })}
        placeholder={strings.orders.searchPlaceholder}
        testID="orders-search"
      />

      {/* The day being worked. Both controls open the same sheet, so the list
          never shifts under the admin's thumb to make room for filters. */}
      <View style={styles.filterBar}>
        <Pressable
          onPress={openFilterSheet}
          accessibilityRole="button"
          accessibilityLabel={formatRangeLabel(
            filters.range.from,
            filters.range.to,
          )}
          accessibilityHint="Opens the order filters"
          style={({ pressed }) => [styles.rangeButton, pressed && styles.pressed]}
        >
          <Icon
            name="calendar-range-outline"
            size={iconSize.md}
            color={colors.textSecondary}
          />
          <AppText variant="body" numberOfLines={1} style={styles.rangeLabel}>
            {formatRangeLabel(filters.range.from, filters.range.to)}
          </AppText>
          <Icon name="chevron-down" size={iconSize.md} color={colors.textSecondary} />
        </Pressable>

        <Pressable
          onPress={openFilterSheet}
          accessibilityRole="button"
          accessibilityLabel={
            activeFilterCount > 0
              ? `${strings.orders.selectRange}, ${strings.orders.filterSummary(
                  activeFilterCount,
                )}`
              : strings.orders.selectRange
          }
          hitSlop={layout.hitSlop}
          style={({ pressed }) => [styles.rangeLink, pressed && styles.pressed]}
        >
          <AppText variant="link">{strings.orders.selectRange}</AppText>

          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <AppText variant="caption" color={colors.onPrimary}>
                {activeFilterCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* FR-40 — the queue read as a pipeline, one tab per stage. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // The strip is sized by its content: margins go here, on the scroll
        // view, because a contentContainerStyle margin cannot move siblings.
        style={styles.tabsStrip}
        contentContainerStyle={styles.tabs}
      >
        {queueTabs.map(tab => {
          const selectedTab = filters.status === tab.key;
          const count = tabCount(counts, tab.key);

          return (
            <Pressable
              key={tab.key}
              onPress={() => updateFilters({ status: tab.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedTab }}
              accessibilityLabel={
                count === undefined ? tab.label : `${tab.label}, ${count}`
              }
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
                {count === undefined
                  ? tab.label
                  : `${tab.label} (${formatNumber(count)})`}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bounded by flex so the queue scrolls under the fixed search, date
          and tab strip instead of running off the bottom of the screen. */}
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
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

        {selectionMode ? (
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
              <AppButton
                label={strings.common.cancel}
                variant="link"
                onPress={() => setSelected([])}
              />
            </View>
          </SectionCard>
        ) : null}

        {isLoading ? (
          <SkeletonList rows={6} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={
              isPendingView ? 'check-circle-outline' : 'clipboard-text-outline'
            }
            title={
              isPendingView
                ? strings.orders.emptyPendingCutoff
                : strings.orders.empty
            }
            message={
              activeFilterCount > 0 || filters.search
                ? 'Widen the date range or clear the filters to see more orders.'
                : undefined
            }
            actionLabel={
              activeFilterCount > 0 || filters.search
                ? strings.common.clearFilters
                : undefined
            }
            onAction={
              activeFilterCount > 0 || filters.search
                ? () => updateFilters(defaultOrderFilters())
                : undefined
            }
          />
        ) : (
          <>
            {orders.map(order => (
              <OrderQueueCard
                key={order.id}
                order={order}
                selected={selected.includes(order.id)}
                badgeStatus={isPendingView ? 'no_order' : undefined}
                onStatusPress={
                  isPendingView ? undefined : () => setTimelineOrder(order)
                }
                onPress={() => openOrder(order)}
                // FR-17 rows are placeholders for shops that never ordered, so
                // there is no order to open and nothing to bulk-action.
                onLongPress={
                  isPendingView ? undefined : () => toggleSelect(order.id)
                }
                disabled={isPendingView}
                quickActionLabel={
                  !isPendingView &&
                  !selectionMode &&
                  order.status === 'submitted'
                    ? strings.orders.quickAccept
                    : undefined
                }
                onQuickAction={() => acceptOrder(order)}
                quickActionLoading={quickActionId === order.id}
              />
            ))}

            {!isPendingView && !selectionMode ? (
              <AppText variant="caption" align="center" style={styles.hint}>
                {strings.orders.selectionHint}
              </AppText>
            ) : null}

            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={total}
              onChangePage={page =>
                setPagination(current => ({ ...current, page }))
              }
            />
          </>
        )}
      </ScrollView>

      {/* Range, which date it filters on, and the shop — one commit. */}
      <FilterSheet
        visible={filterSheetOpen}
        title={strings.orders.filtersTitle}
        onDismiss={() => setFilterSheetOpen(false)}
        onApply={applyFilterSheet}
        onClear={
          draftFilterCount > 0
            ? () => setDraft(toDraft(defaultOrderFilters()))
            : undefined
        }
      >
        <AppText variant="inputLabel" style={styles.sheetLabel}>
          {strings.orders.dateRangeLabel}
        </AppText>
        <DateRangePicker
          value={draft.range}
          onChange={range => setDraft(current => ({ ...current, range }))}
        />

        <View style={styles.sheetRow}>
          <Dropdown
            label={strings.orders.dateFieldLabel}
            value={draft.dateField}
            options={dateFieldOptions}
            onChange={dateField => setDraft(current => ({ ...current, dateField }))}
          />
        </View>

        <View style={styles.sheetRow}>
          <Dropdown
            label={strings.orders.shopLabel}
            value={draft.shopId}
            options={shopOptions}
            onChange={shopId => setDraft(current => ({ ...current, shopId }))}
          />
        </View>
      </FilterSheet>

      <ConfirmDialog
        visible={pendingBulk !== null}
        title={strings.orders.bulkTitle(
          pendingBulk?.label ?? '',
          selected.length,
        )}
        message={strings.orders.bulkMessage(
          pendingBulk?.label ?? '',
          selected.length,
        )}
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
            <View
              key={`${event.status}-${event.at}`}
              style={styles.timelineRow}
            >
              <StatusBadge status={event.status} compact />
              <AppText variant="caption" style={styles.timelineMeta}>
                {`${formatDateTime(event.at)} · ${event.actor}`}
              </AppText>
            </View>
          ))}

          {timelineOrder?.statusHistory.length === 0 ? (
            <AppText variant="bodySecondary">
              {strings.orders.emptyPendingCutoff}
            </AppText>
          ) : null}
        </View>
      </ConfirmDialog>
    </Screen>
  );
}

/** The slice of the filters the sheet owns; status stays on the tab strip. */
type FilterDraft = Pick<OrderFilters, 'range' | 'shopId' | 'dateField'>;

const toDraft = (filters: OrderFilters): FilterDraft => ({
  range: filters.range,
  shopId: filters.shopId,
  dateField: filters.dateField,
});

/** How many of the sheet's filters are away from their default. */
const countActive = (draft: FilterDraft): number =>
  (draft.shopId === 'all' ? 0 : 1) +
  (draft.dateField === 'orderDate' ? 0 : 1) +
  (draft.range.preset === defaultOrderFilters().range.preset ? 0 : 1);

/**
 * The count behind a tab. FR-17's pending view is a different endpoint, and
 * `draft` never appears in the queue, so both are left unbadged.
 */
function tabCount(
  counts: OrderStatusCounts,
  key: OrderFilters['status'],
): number | undefined {
  if (key === 'pending_cutoff') {
    return undefined;
  }
  if (key === 'all') {
    return counts.all;
  }
  return counts[key] ?? 0;
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  rangeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rangeLabel: { flex: 1 },
  rangeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
  },
  filterBadge: {
    minWidth: spacing.lg,
    height: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primary,
  },
  sheetLabel: { marginBottom: spacing.xs },
  // A row, so the dropdown's own flex:1 spans the sheet's width.
  sheetRow: { flexDirection: 'row', marginTop: spacing.lg },
  tabsStrip: { flexGrow: 0, marginTop: spacing.md, marginBottom: spacing.md },
  tabs: { gap: spacing.sm, paddingRight: spacing.lg },
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
  bulkActions: { gap: spacing.sm },
  bulkButton: { width: '100%' },
  hint: { marginBottom: spacing.md },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  timelineMeta: { flex: 1, marginLeft: spacing.sm },
});
