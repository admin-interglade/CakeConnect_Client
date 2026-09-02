import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppText,
  EmptyState,
  ErrorState,
  LoadingState,
  Screen,
  ScreenHeader,
  SectionCard,
  SimpleLineChart,
  StatCard,
} from '../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  layout,
  spacing,
  strings,
} from '../../../constants';
import { useProductionDetail } from '../../../hooks';
import { formatDate, formatNumber, formatShortDate } from '../../../utils/format';
import type { AdminDashboardStackParamList } from '../../../navigation/types';
import type { ProductCategory, ProductionShopLine } from '../../../types/admin';

type DetailNavigation = StackNavigationProp<
  AdminDashboardStackParamList,
  'ProductionDetail'
>;
type DetailRoute = RouteProp<AdminDashboardStackParamList, 'ProductionDetail'>;

const categoryLabels: Record<ProductCategory, string> = {
  cakes: strings.productionPlan.categories.cakes,
  pastries: strings.productionPlan.categories.pastries,
  savoury: strings.productionPlan.categories.savoury,
  dryItems: strings.productionPlan.categories.dryItems,
};

/**
 * FR-37 drilled into one product: the total the kitchen bakes, how many shops
 * that covers, a week of demand for context, and the shop-by-shop split with
 * each shop's note (FR-7) so special instructions reach the bench.
 */
export default function ProductionDetail() {
  const navigation = useNavigation<DetailNavigation>();
  const { params } = useRoute<DetailRoute>();

  const { detail, isLoading, isError, error, isRefetching, refetch } =
    useProductionDetail(params.deliveryDate, params.productId);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.productionDetail.title}
          onBack={() => navigation.goBack()}
        />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !detail) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.productionDetail.title}
          onBack={() => navigation.goBack()}
        />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={strings.productionDetail.title}
        subtitle={`${strings.productionDetail.subtitle} · ${formatDate(
          detail.deliveryDate,
        )}`}
        onBack={() => navigation.goBack()}
      />

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
        <View style={styles.categoryPill}>
          <AppText variant="caption" color={colors.primaryDark}>
            {categoryLabels[detail.category]}
          </AppText>
        </View>

        <AppText variant="h1" style={styles.name}>
          {detail.name}
        </AppText>

        <AppText variant="bodySecondary" style={styles.description}>
          {`${detail.variant} · ${detail.description}`}
        </AppText>

        <View style={styles.tiles}>
          <StatCard
            label={strings.productionDetail.totalRequired}
            value={strings.productionDetail.unitSuffix(
              formatNumber(detail.totalQuantity),
              detail.unit,
            )}
            tone="primary"
            icon="cake-variant-outline"
          />
          <StatCard
            label={strings.productionDetail.orderingShops}
            value={strings.productionDetail.orderingShopsValue(
              detail.shopCount,
              detail.totalShops,
            )}
            icon="storefront-outline"
          />
        </View>

        <SectionCard title={strings.productionDetail.demandTrend} style={styles.section}>
          <SimpleLineChart
            data={detail.trend.map(point => ({
              label: formatShortDate(point.date),
              value: point.quantity,
            }))}
            formatValue={value => formatNumber(value)}
            emptyMessage={strings.dashboard.charts.empty}
          />
        </SectionCard>

        <SectionCard
          title={strings.productionDetail.shopBreakdown}
          subtitle={strings.productionPlan.shops(detail.shops.length)}
          style={styles.section}
        >
          {detail.shops.length === 0 ? (
            <EmptyState icon="storefront-outline" title={strings.productionDetail.empty} />
          ) : (
            detail.shops.map(shop => (
              <ShopBreakdownRow key={shop.shopId} shop={shop} unit={detail.unit} />
            ))
          )}
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}

function ShopBreakdownRow({
  shop,
  unit,
}: {
  shop: ProductionShopLine;
  unit: string;
}) {
  return (
    <View
      style={styles.shopRow}
      accessible
      accessibilityLabel={`${shop.shopName}: ${formatNumber(shop.quantity)} ${unit}. ${
        shop.note ?? strings.productionDetail.noNote
      }`}
    >
      <View style={styles.shopText}>
        <AppText variant="body" numberOfLines={2}>
          {shop.shopName}
        </AppText>
        <AppText
          variant="caption"
          numberOfLines={2}
          color={shop.note ? colors.warning : colors.textMuted}
        >
          {shop.note ?? strings.productionDetail.noNote}
        </AppText>
      </View>

      <AppText variant="h3" color={colors.primary} numberOfLines={1}>
        {strings.productionDetail.unitSuffix(formatNumber(shop.quantity), unit)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.circle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  name: { marginTop: spacing.sm },
  description: { marginTop: spacing.xxs, marginBottom: spacing.lg },
  tiles: { flexDirection: 'row', gap: spacing.md },
  section: { marginTop: spacing.lg },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.divider,
  },
  shopText: { flex: 1, marginRight: spacing.md },
});
