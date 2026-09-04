import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  Dropdown,
  ErrorState,
  Icon,
  LoadingState,
  QuantityStepper,
  Screen,
  ScreenHeader,
  type DropdownOption,
} from '../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../../constants';
import { useOrderDetails, useOrderMutations } from '../../../hooks';
import { formatQuantity } from '../../../utils/format';
import type { AdminOrdersStackParamList } from '../../../navigation/types';
import type { OrderItem, ShortSupplyLine } from '../../../types/admin';

type ShortSupplyNavigation = StackNavigationProp<
  AdminOrdersStackParamList,
  'ShortSupply'
>;
type ShortSupplyRoute = RouteProp<AdminOrdersStackParamList, 'ShortSupply'>;

const reasonOptions: DropdownOption<string>[] = [
  { value: strings.shortSupply.reasons.stock, label: strings.shortSupply.reasons.stock },
  {
    value: strings.shortSupply.reasons.ingredient,
    label: strings.shortSupply.reasons.ingredient,
  },
  {
    value: strings.shortSupply.reasons.production,
    label: strings.shortSupply.reasons.production,
  },
  {
    value: strings.shortSupply.reasons.quality,
    label: strings.shortSupply.reasons.quality,
  },
  {
    value: strings.shortSupply.reasons.capacity,
    label: strings.shortSupply.reasons.capacity,
  },
  { value: strings.shortSupply.reasons.other, label: strings.shortSupply.reasons.other },
];

/**
 * FR-40 — the shortfall declared before the van loads.
 *
 * Every line starts at the ordered quantity, so the admin only touches the
 * ones the kitchen cannot fill; a line stepped down has to carry a reason,
 * because that reason is what the shop is notified with and what the audit
 * trail keeps.
 */
export default function ShortSupply() {
  const navigation = useNavigation<ShortSupplyNavigation>();
  const { params } = useRoute<ShortSupplyRoute>();
  const orderId = params.orderId;

  const { order, isLoading, isError, error, isRefetching, refetch } =
    useOrderDetails(orderId);
  const { shortSupply } = useOrderMutations();

  const [delivering, setDelivering] = React.useState<Record<string, number>>({});
  const [reasons, setReasons] = React.useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  // Seeded from whatever is already recorded, once per order: a background
  // refetch must not overwrite quantities the admin is part-way through.
  const seeded = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!order || seeded.current === order.id) {
      return;
    }
    seeded.current = order.id;
    setDelivering(
      Object.fromEntries(
        order.items.map(item => [item.productId, item.deliveredQty ?? item.orderedQty]),
      ),
    );
    setReasons(
      Object.fromEntries(
        order.items
          .filter(item => item.shortSupplyReason)
          .map(item => [item.productId, item.shortSupplyReason as string]),
      ),
    );
  }, [order]);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.shortSupply.title}
          subtitle={orderId}
          onBack={() => navigation.goBack()}
        />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !order) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.shortSupply.title}
          subtitle={orderId}
          onBack={() => navigation.goBack()}
        />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  const shortfallFor = (item: OrderItem) =>
    Math.max(item.orderedQty - (delivering[item.productId] ?? item.orderedQty), 0);

  const shortLines = order.items.filter(item => shortfallFor(item) > 0);
  const missingReason = shortLines.some(item => !reasons[item.productId]);

  const submit = () => {
    if (missingReason) {
      setShowErrors(true);
      return;
    }
    setConfirmOpen(true);
  };

  const confirm = () => {
    const lines: ShortSupplyLine[] = order.items.map(item => ({
      productId: item.productId,
      deliveringQty: delivering[item.productId] ?? item.orderedQty,
      reason: shortfallFor(item) > 0 ? reasons[item.productId] : undefined,
    }));

    shortSupply.mutate(
      { orderId: order.id, lines },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          navigation.goBack();
        },
        onError: () => setConfirmOpen(false),
      },
    );
  };

  return (
    <Screen
      footer={
        <AppButton
          label={strings.shortSupply.confirm}
          onPress={submit}
          loading={shortSupply.isPending}
          testID="confirm-short-supply"
        />
      }
    >
      <ScreenHeader
        title={strings.shortSupply.title}
        subtitle={strings.shortSupply.subtitle(order.orderNumber, order.shopName)}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* FR-41 — the shop is notified automatically, so say so up front. */}
        <View style={styles.banner}>
          <Icon
            name="alert-outline"
            size={iconSize.md}
            color={colors.warning}
            style={styles.bannerIcon}
          />
          <AppText variant="caption" color={colors.textSecondary} style={styles.bannerText}>
            {strings.shortSupply.intro}
          </AppText>
        </View>

        {order.items.map(item => {
          const value = delivering[item.productId] ?? item.orderedQty;
          const shortfall = shortfallFor(item);
          const reasonMissing = showErrors && shortfall > 0 && !reasons[item.productId];

          return (
            <View key={item.productId} style={styles.itemCard}>
              <AppText variant="h3" numberOfLines={2}>
                {item.name}
              </AppText>

              <View style={styles.figuresRow}>
                <View style={styles.figure}>
                  <AppText variant="inputLabel">{strings.shortSupply.ordered}</AppText>
                  <AppText variant="body" style={styles.figureValue}>
                    {formatQuantity(item.orderedQty, item.unit)}
                  </AppText>
                </View>

                <View style={styles.figure}>
                  <AppText variant="inputLabel">{strings.shortSupply.delivering}</AppText>
                  <QuantityStepper
                    value={value}
                    min={0}
                    max={item.orderedQty}
                    onChange={quantity =>
                      setDelivering(current => ({
                        ...current,
                        [item.productId]: quantity,
                      }))
                    }
                    accessibilityLabel={`${strings.shortSupply.delivering} ${item.name}`}
                    decreaseLabel={`${strings.shortSupply.decrease} ${item.name}`}
                    increaseLabel={`${strings.shortSupply.increase} ${item.name}`}
                    style={styles.figureValue}
                    testID={`delivering-${item.productId}`}
                  />
                </View>

                <View style={styles.figureRight}>
                  <AppText variant="inputLabel" align="right">
                    {strings.shortSupply.shortfall}
                  </AppText>
                  <AppText
                    variant="body"
                    align="right"
                    color={shortfall > 0 ? colors.error : colors.success}
                    style={styles.figureValue}
                  >
                    {formatQuantity(shortfall, item.unit)}
                  </AppText>
                </View>
              </View>

              {/* Only a line that is actually short needs explaining. */}
              {shortfall > 0 ? (
                <Dropdown
                  label={strings.shortSupply.reasonLabel}
                  value={reasons[item.productId] ?? ''}
                  options={reasonOptions}
                  placeholder={strings.shortSupply.reasonPlaceholder}
                  onChange={reason =>
                    setReasons(current => ({ ...current, [item.productId]: reason }))
                  }
                  style={styles.reason}
                  testID={`reason-${item.productId}`}
                />
              ) : null}

              {reasonMissing ? (
                <AppText variant="caption" color={colors.error} style={styles.reasonError}>
                  {strings.shortSupply.reasonRequired}
                </AppText>
              ) : null}
            </View>
          );
        })}

        <AppText variant="bodySecondary" align="center" style={styles.summary}>
          {shortLines.length === 0
            ? strings.shortSupply.summaryNone
            : strings.shortSupply.summaryShort(shortLines.length)}
        </AppText>
      </ScrollView>

      <ConfirmDialog
        visible={confirmOpen}
        title={strings.shortSupply.confirmTitle}
        message={strings.shortSupply.confirmMessage(shortLines.length, order.shopName)}
        loading={shortSupply.isPending}
        onConfirm={confirm}
        onDismiss={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  bannerIcon: { marginRight: spacing.sm },
  bannerText: { flex: 1 },
  itemCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  figuresRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  figure: { flex: 1 },
  figureRight: { flexShrink: 0 },
  figureValue: { marginTop: spacing.xs },
  reason: { marginTop: spacing.lg },
  reasonError: { marginTop: spacing.xs },
  summary: { marginTop: spacing.sm },
});
