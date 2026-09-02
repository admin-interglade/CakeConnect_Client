import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  EmptyState,
  ErrorState,
  Icon,
  ProductionLineCard,
  Screen,
  ScreenHeader,
  SearchInput,
  SkeletonList,
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
import { useOrderMutations, useProductionRequirement } from '../../../hooks';
import { addDays, formatDate, formatNumber, toApiDate } from '../../../utils/format';
import type { AdminDashboardStackParamList } from '../../../navigation/types';
import type { ProductCategory } from '../../../types/admin';

type PlanNavigation = StackNavigationProp<AdminDashboardStackParamList, 'ProductionPlan'>;
type PlanRoute = RouteProp<AdminDashboardStackParamList, 'ProductionPlan'>;

type CategoryFilter = ProductCategory | 'all';

const categories: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: strings.productionPlan.categories.all },
  { key: 'cakes', label: strings.productionPlan.categories.cakes },
  { key: 'pastries', label: strings.productionPlan.categories.pastries },
  { key: 'savoury', label: strings.productionPlan.categories.savoury },
  { key: 'dryItems', label: strings.productionPlan.categories.dryItems },
];

/**
 * FR-37 in full: the consolidated baking schedule for one delivery date,
 * searchable, filtered by kitchen section, and exportable for the kitchen.
 */
export default function ProductionPlan() {
  const navigation = useNavigation<PlanNavigation>();
  const { params } = useRoute<PlanRoute>();

  const today = toApiDate(new Date());
  const [deliveryDate, setDeliveryDate] = React.useState(
    params?.deliveryDate ?? addDays(today, 1),
  );
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState<CategoryFilter>('all');

  const { requirement, isLoading, isError, error, isRefetching, refetch } =
    useProductionRequirement(deliveryDate);
  const { exportProduction } = useOrderMutations();

  /**
   * Search and section run on the client: the plan is one page of products, so
   * a round trip per keystroke would cost more than it saves.
   */
  const lines = React.useMemo(() => {
    const term = search.trim().toLowerCase();

    return (requirement?.lines ?? []).filter(line => {
      if (category !== 'all' && line.category !== category) {
        return false;
      }
      return term ? line.name.toLowerCase().includes(term) : true;
    });
  }, [requirement, search, category]);

  const totalQuantity = lines.reduce((sum, line) => sum + line.totalQuantity, 0);
  const isFiltered = search.trim().length > 0 || category !== 'all';

  return (
    <Screen>
      <ScreenHeader
        title={strings.productionPlan.title}
        subtitle={strings.productionPlan.subtitle}
        onBack={() => navigation.goBack()}
      />

      {/* Which day's bake this is. Stepping back one day shows what the kitchen
          produced today, which is the usual sanity check against tomorrow. */}
      <View style={styles.dateBar}>
        <DateStep
          icon="chevron-left"
          label="Previous day"
          onPress={() => setDeliveryDate(current => addDays(current, -1))}
        />

        <View style={styles.dateLabel}>
          <AppText variant="body" numberOfLines={1}>
            {deliveryDate === addDays(today, 1)
              ? strings.productionPlan.tomorrow
              : deliveryDate === today
              ? strings.productionPlan.today
              : formatDate(deliveryDate)}
          </AppText>
          <AppText variant="caption" numberOfLines={1}>
            {formatDate(deliveryDate)}
          </AppText>
        </View>

        <DateStep
          icon="chevron-right"
          label="Next day"
          onPress={() => setDeliveryDate(current => addDays(current, 1))}
        />
      </View>

      <ScrollView
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
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder={strings.productionPlan.searchPlaceholder}
          testID="production-search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {categories.map(item => {
            const selected = item.key === category;

            return (
              <Pressable
                key={item.key}
                onPress={() => setCategory(item.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="caption"
                  color={selected ? colors.onPrimary : colors.textSecondary}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {isError ? (
          <ErrorState
            message={error}
            onRetry={refetch}
            retrying={isRefetching}
            variant="inline"
          />
        ) : isLoading ? (
          <SkeletonList rows={7} />
        ) : lines.length === 0 ? (
          <EmptyState
            icon="chef-hat"
            title={
              isFiltered
                ? strings.productionPlan.emptyFiltered
                : strings.productionPlan.empty
            }
            actionLabel={isFiltered ? strings.common.clearFilters : undefined}
            onAction={
              isFiltered
                ? () => {
                    setSearch('');
                    setCategory('all');
                  }
                : undefined
            }
          />
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <AppText variant="inputLabel" style={styles.headerProduct}>
                {strings.productionPlan.columnProduct}
              </AppText>
              <AppText variant="inputLabel" style={styles.headerShops}>
                {strings.productionPlan.columnShops}
              </AppText>
              <AppText variant="inputLabel" style={styles.headerQty}>
                {strings.productionPlan.columnQty}
              </AppText>
            </View>

            {lines.map(line => (
              <ProductionLineCard
                key={line.productId}
                line={line}
                onPress={() =>
                  navigation.navigate('ProductionDetail', {
                    deliveryDate,
                    productId: line.productId,
                  })
                }
              />
            ))}

            <AppText variant="caption" style={styles.totals}>
              {strings.productionPlan.totals(lines.length, formatNumber(totalQuantity))}
            </AppText>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={strings.productionPlan.exportPlan}
          icon="tray-arrow-down"
          onPress={() => exportProduction.mutate({ deliveryDate, format: 'csv' })}
          loading={exportProduction.isPending}
          disabled={lines.length === 0}
        />
      </View>
    </Screen>
  );
}

function DateStep({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => [styles.dateStep, pressed && styles.pressed]}
    >
      <Icon name={icon} size={iconSize.md} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  dateStep: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabel: { flex: 1, alignItems: 'center' },
  pressed: { opacity: 0.7 },
  chips: { gap: spacing.sm, paddingVertical: spacing.md, paddingRight: spacing.lg },
  chip: {
    minHeight: layout.minTouchTarget - spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.circle,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  table: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.border,
  },
  headerProduct: { flex: 1 },
  headerShops: { width: 62, textAlign: 'right' },
  headerQty: { minWidth: 84, textAlign: 'right', marginLeft: spacing.sm },
  totals: { paddingVertical: spacing.md, textAlign: 'right' },
  footer: { paddingTop: spacing.sm },
});
