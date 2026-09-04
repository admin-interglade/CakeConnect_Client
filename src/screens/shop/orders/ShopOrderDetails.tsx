import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Screen,
  ScreenHeader,
  SectionCard,
  StatusBadge,
  StepProgress,
  type ProgressStep,
} from '../../../components';
import { colors, iconSize, spacing, strings } from '../../../constants';
import { useShopOrderDetails, useShopOrderMutations } from '../../../hooks';
import {
  canCancelOrder,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  orderStatusFlow,
  orderStatusShortLabels,
} from '../../../utils/format';
import type { OrderItem } from '../../../types/admin';
import type { ShopOrdersStackParamList } from '../../../navigation/types';

type Route = RouteProp<ShopOrdersStackParamList, 'ShopOrderDetails'>;

/**
 * FR-22 / FR-25 — one of this shop's orders, in full.
 *
 * The stepper is the same FR-40 pipeline the franchise owner sees, drawn from
 * the same `orderStatusFlow`, so the shop and the kitchen never disagree about
 * which stage an order is at.
 *
 * What is deliberately absent: a dated timeline. The order payload carries no
 * status history (docs/api-gaps.md G7), and inventing timestamps for
 * transitions that were never recorded would be worse than the note explaining
 * why they are missing.
 */
export default function ShopOrderDetails() {
  const navigation = useNavigation<StackNavigationProp<ShopOrdersStackParamList>>();
  const { params } = useRoute<Route>();

  const { order, isLoading, isError, error, isRefetching, refetch } =
    useShopOrderDetails(params.orderId);
  const { cancel } = useShopOrderMutations();

  const [confirmCancel, setConfirmCancel] = React.useState(false);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.shopOrders.detailTitle}
          onBack={navigation.goBack}
        />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !order) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.shopOrders.detailTitle}
          onBack={navigation.goBack}
        />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  const cancelled = order.status === 'cancelled';
  const steps: ProgressStep[] = orderStatusFlow.map(status => ({
    key: status,
    label: orderStatusShortLabels[status],
  }));
  const currentIndex = orderStatusFlow.indexOf(order.status);

  return (
    <Screen>
      <ScreenHeader
        title={order.orderNumber}
        subtitle={strings.shopOrders.deliveryOn}
        onBack={navigation.goBack}
      >
        <StatusBadge status={order.status} />
      </ScreenHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* FR-40 — how far the order has travelled. */}
        <SectionCard title={strings.shopOrders.progress}>
          <StepProgress
            steps={steps}
            currentIndex={currentIndex === -1 ? 0 : currentIndex}
            failed={cancelled}
          />
          <InlineMessage tone="info" style={styles.note}>
            {strings.shopOrders.noTimeline}
          </InlineMessage>
        </SectionCard>

        <SectionCard title={strings.shopOrders.detailTitle}>
          <DetailRow
            icon="calendar-outline"
            label={strings.shopOrders.placedOn}
            value={order.orderDate ? formatDate(order.orderDate) : '—'}
          />
          <DetailRow
            icon="truck-delivery-outline"
            label={strings.shopOrders.deliveryOn}
            value={order.deliveryDate ? formatDate(order.deliveryDate) : '—'}
          />
          <DetailRow
            icon="send-outline"
            label={strings.shopOrders.submittedAt}
            value={
              order.submittedAt
                ? formatDateTime(order.submittedAt)
                : strings.shopOrders.notSubmitted
            }
          />
        </SectionCard>

        {/* FR-7 — the priced lines, with the notes this shop attached. */}
        <SectionCard title={strings.shopOrders.items(order.items.length)}>
          {order.items.map(item => (
            <OrderLine key={item.productId} item={item} />
          ))}

          <View style={styles.totals}>
            <TotalRow label={strings.cart.subtotal} value={order.subtotal} />
            <TotalRow label={strings.cart.tax} value={order.taxTotal} />
            <View style={styles.grandTotal}>
              <AppText variant="h3">{strings.cart.total}</AppText>
              <AppText variant="h2">{formatCurrency(order.total)}</AppText>
            </View>
          </View>

          {order.shortSupply ? (
            <InlineMessage tone="warning" style={styles.note}>
              {strings.shopOrders.shortSupplyNote}
            </InlineMessage>
          ) : null}
        </SectionCard>

        <View style={styles.actions}>
          {/* FR-25 — the invoice raised against this order. */}
          {order.invoiceId ? (
            <AppButton
              label={strings.shopOrders.viewInvoice}
              icon="file-document-outline"
              variant="outline"
              onPress={() =>
                navigation.navigate('InvoiceDetails', {
                  invoiceId: order.invoiceId as string,
                })
              }
            />
          ) : null}

          {/* FR-10 — cancellable up to dispatch, and the server refuses a
              submitted order once the cut-off has passed. */}
          {canCancelOrder(order.status) ? (
            <AppButton
              label={strings.shopOrders.cancel}
              icon="close-circle-outline"
              variant="link"
              onPress={() => setConfirmCancel(true)}
              disabled={cancel.isPending}
            />
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirmCancel}
        title={strings.shopOrders.cancelTitle}
        message={strings.shopOrders.cancelMessage}
        confirmLabel={strings.shopOrders.cancel}
        destructive
        loading={cancel.isPending}
        onConfirm={() => {
          setConfirmCancel(false);
          cancel.mutate(order.id);
        }}
        onDismiss={() => setConfirmCancel(false)}
      />
    </Screen>
  );
}

function OrderLine({ item }: { item: OrderItem }) {
  const short =
    item.deliveredQty !== undefined && item.deliveredQty < item.orderedQty;

  return (
    <View style={styles.line}>
      <View style={styles.lineText}>
        <AppText variant="body" numberOfLines={2}>
          {item.name}
        </AppText>
        <AppText variant="caption">
          {`${strings.shopOrders.ordered} ${formatNumber(item.orderedQty)}${
            item.unit ? ` ${item.unit}` : ''
          } · ${formatCurrency(item.unitPrice)}`}
        </AppText>
        {/* FR-40 — what actually arrived, where it differs from what was asked. */}
        {short ? (
          <AppText variant="caption" color={colors.warning}>
            {`${strings.shopOrders.delivered} ${formatNumber(
              item.deliveredQty ?? 0,
            )}${item.shortSupplyReason ? ` · ${item.shortSupplyReason}` : ''}`}
          </AppText>
        ) : null}
        {item.note ? (
          <AppText variant="caption" color={colors.textMuted}>
            {strings.orderDetails.itemNote(item.note)}
          </AppText>
        ) : null}
      </View>
      <AppText variant="body">{formatCurrency(item.lineTotal)}</AppText>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Icon name={icon} size={iconSize.md} color={colors.textSecondary} />
      <AppText variant="bodySecondary" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="body">{value}</AppText>
    </View>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.totalRow}>
      <AppText variant="bodySecondary">{label}</AppText>
      <AppText variant="body">{formatCurrency(value)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.giant,
    gap: spacing.md,
  },
  note: { marginTop: spacing.md },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailLabel: { flex: 1 },
  line: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  lineText: { flex: 1, gap: spacing.xxs },
  totals: { marginTop: spacing.lg },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  actions: { gap: spacing.sm },
});
