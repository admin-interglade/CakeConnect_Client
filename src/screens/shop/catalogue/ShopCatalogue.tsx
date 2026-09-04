import React from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  EmptyState,
  ErrorState,
  InlineMessage,
  OfflineBanner,
  Pagination,
  Screen,
  ScreenHeader,
  SearchInput,
  SkeletonCards,
} from '../../../components';
import {
  borderRadius,
  colors,
  layout,
  spacing,
  strings,
} from '../../../constants';
import {
  useCart,
  useCutoff,
  useShopCatalogue,
  defaultShopCatalogueFilters,
  defaultShopCataloguePagination,
} from '../../../hooks';
import { formatCurrency, formatNumber } from '../../../utils/format';
import type { Pagination as PaginationState } from '../../../types/admin';
import type { CatalogueFilters } from '../../../types/shop';
import type { ShopHomeStackParamList } from '../../../navigation/types';
import CatalogueProductCard from '../components/CatalogueProductCard';

/**
 * FR-5 / FR-6 — the catalogue, at the price this shop pays.
 *
 * Ordering happens from here, not only from the cart: a shop building tomorrow's
 * demand works product by product, and making them add to a cart and then leave
 * to adjust a quantity would double the taps on the most repetitive task in the
 * app. The cart bar pinned at the foot is what keeps the running total visible
 * while they do it (FR-7).
 */
export default function ShopCatalogue() {
  const navigation = useNavigation<StackNavigationProp<ShopHomeStackParamList>>();

  const [filters, setFilters] = React.useState<CatalogueFilters>(
    defaultShopCatalogueFilters,
  );
  const [pagination, setPagination] = React.useState<PaginationState>(
    defaultShopCataloguePagination,
  );

  const { passed } = useCutoff();
  const cart = useCart();
  const {
    products,
    categories,
    total,
    isLoading,
    isError,
    error,
    isStale,
    isRefetching,
    refetch,
  } = useShopCatalogue(filters, pagination);

  /** Any filter change returns to page one; page 4 of the old filter is meaningless. */
  const updateFilters = (next: Partial<CatalogueFilters>) => {
    setFilters(current => ({ ...current, ...next }));
    setPagination(current => ({ ...current, page: 1 }));
  };

  const quantities = React.useMemo(
    () => new Map(cart.lines.map(line => [line.productId, line.quantity])),
    [cart.lines],
  );

  const categoryOptions = React.useMemo(
    () => [
      { id: 'all', name: strings.shopCatalogue.allCategories },
      ...categories.map(category => ({ id: category.id, name: category.name })),
    ],
    [categories],
  );

  const cartBar =
    cart.lines.length > 0 ? (
      <View style={styles.cartBar}>
        <View style={styles.cartText}>
          <AppText variant="h3" color={colors.textInverse}>
            {formatCurrency(cart.totals.total)}
          </AppText>
          <AppText variant="caption" color={colors.surfaceSunken}>
            {strings.cart.itemsCount(
              cart.totals.lineCount,
              formatNumber(cart.totals.unitCount),
            )}
          </AppText>
        </View>
        <AppButton
          label={strings.cart.title}
          icon="cart-outline"
          onPress={() => navigation.navigate('Cart')}
        />
      </View>
    ) : undefined;

  return (
    /* FR-7 — the running total is pinned above the bottom inset while the
       products scroll, so it never scrolls away mid-order. */
    <Screen footer={cartBar}>
      <ScreenHeader
        title={strings.shopCatalogue.title}
        subtitle={strings.shopCatalogue.subtitleBase}
        onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      />

      <View style={styles.controls}>
        <SearchInput
          value={filters.search}
          onChangeText={search => updateFilters({ search })}
          placeholder={strings.shopCatalogue.searchPlaceholder}
        />

        {/* A horizontal chip strip rather than a dropdown: with a handful of
            categories, one tap beats opening a sheet to make one choice. */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categoryOptions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const selected = filters.categoryId === item.id;
            return (
              <Pressable
                onPress={() => updateFilters({ categoryId: item.id })}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={item.name}
                hitSlop={layout.hitSlop}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <AppText
                  variant="caption"
                  color={selected ? colors.onPrimary : colors.textSecondary}
                >
                  {item.name}
                </AppText>
              </Pressable>
            );
          }}
        />
      </View>

      <OfflineBanner visible={isStale} />

      {isLoading && products.length === 0 ? (
        <SkeletonCards />
      ) : isError ? (
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={product => product.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <CatalogueProductCard
              product={item}
              quantity={quantities.get(item.id) ?? 0}
              onAdd={() => cart.add(item)}
              onChangeQuantity={quantity =>
                cart.setLineQuantity(item.id, quantity)
              }
              // FR-10 — after cut-off tomorrow's order is closed, so nothing
              // more can be added to it.
              disabled={passed || cart.alreadySubmitted}
            />
          )}
          ListHeaderComponent={
            passed || cart.alreadySubmitted ? (
              <InlineMessage tone="warning" style={styles.notice}>
                {cart.alreadySubmitted
                  ? strings.cart.alreadySubmitted
                  : strings.cart.cutoffPassed}
              </InlineMessage>
            ) : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon="cake-variant-outline"
              title={
                filters.search
                  ? strings.shopCatalogue.empty
                  : strings.shopCatalogue.emptyCategory
              }
              message={strings.shopCatalogue.availabilityNote}
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
  controls: { gap: spacing.md },
  chips: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.circle,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: layout.minTouchTarget - spacing.md,
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  notice: { marginBottom: spacing.sm },
  pagination: { marginTop: spacing.lg },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary,
  },
  cartText: { flex: 1 },
});
