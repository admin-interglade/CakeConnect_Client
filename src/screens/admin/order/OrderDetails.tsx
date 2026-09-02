import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  DataTable,
  ErrorState,
  Icon,
  InlineMessage,
  LabeledInput,
  LoadingState,
  ModalForm,
  Screen,
  ScreenHeader,
  SectionCard,
  StatusBadge,
  type DataTableColumn,
  type FormField,
  type FormValues,
} from '../../../components';
import { colors, iconSize, spacing, strings } from '../../../constants';
import { useOrderDetails, useOrderMutations } from '../../../hooks';
import {
  canCancelOrder,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  nextOrderStatus,
  orderStatusFlow,
  orderStatusLabels,
} from '../../../utils/format';
import type { AdminOrdersStackParamList } from '../../../navigation/types';
import type { Order, OrderItem, OrderStatus } from '../../../types/admin';

type OrderDetailsNavigation = StackNavigationProp<
  AdminOrdersStackParamList,
  'OrderDetails'
>;
type OrderDetailsRoute = RouteProp<AdminOrdersStackParamList, 'OrderDetails'>;

/** The action label for each legal transition out of the current status (FR-40). */
const transitionLabels: Partial<Record<OrderStatus, string>> = {
  accepted: strings.orderDetails.accept,
  in_production: strings.orderDetails.moveToProduction,
  dispatched: strings.orderDetails.markDispatched,
  delivered: strings.orderDetails.markDelivered,
  invoiced: strings.orderDetails.generateInvoice,
};

export default function OrderDetails() {
  const navigation = useNavigation<OrderDetailsNavigation>();
  const { params } = useRoute<OrderDetailsRoute>();
  const orderId = params.orderId;

  const { order, isLoading, isError, error, isRefetching, refetch } =
    useOrderDetails(orderId);
  const { updateStatus, reopen } = useOrderMutations();

  const [pendingStatus, setPendingStatus] = React.useState<OrderStatus | null>(null);
  const [deliveryOpen, setDeliveryOpen] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [reopenReason, setReopenReason] = React.useState('');
  const [reopenError, setReopenError] = React.useState<string | undefined>();

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title={orderId} onBack={() => navigation.goBack()} />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !order) {
    return (
      <Screen>
        <ScreenHeader title={orderId} onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  const next = nextOrderStatus(order.status);
  const submittedAfterCutoff = Boolean(
    order.submittedAt && new Date(order.submittedAt) > new Date(order.cutoffAt),
  );

  /**
   * FR-40 — the Delivered step is the one transition that carries data, since
   * short supply is recorded against the ordered quantity there.
   */
  const advance = (status: OrderStatus) => {
    if (status === 'delivered') {
      setDeliveryOpen(true);
      return;
    }
    setPendingStatus(status);
  };

  const submitDelivery = (values: FormValues) => {
    const deliveredQty: Record<string, number> = {};
    order.items.forEach(item => {
      const entered = Number(values[item.productId]);
      deliveredQty[item.productId] = Number.isFinite(entered)
        ? Math.min(Math.max(entered, 0), item.orderedQty)
        : item.orderedQty;
    });

    updateStatus.mutate(
      { orderId: order.id, status: 'delivered', payload: { deliveredQty } },
      { onSuccess: () => setDeliveryOpen(false) },
    );
  };

  const submitReopen = () => {
    if (!reopenReason.trim()) {
      setReopenError(strings.orderDetails.reopenReasonRequired);
      return;
    }

    reopen.mutate(
      { orderId: order.id, reason: reopenReason.trim() },
      {
        onSuccess: () => {
          setReopenOpen(false);
          setReopenReason('');
          setReopenError(undefined);
        },
      },
    );
  };

  return (
    <Screen>
      <ScreenHeader
        title={order.id}
        subtitle={`${strings.orders.deliveryDate}: ${formatDate(order.deliveryDate)}`}
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: 'printer-outline',
            label: strings.orderDetails.printOrder,
            onPress: () => {},
          },
          {
            icon: 'file-pdf-box',
            label: strings.orderDetails.exportPdf,
            onPress: () => {},
          },
        ]}
      >
        <View style={styles.badgeRow}>
          <StatusBadge status={order.status} />
          {order.shortSupply ? (
            <StatusBadge status="cancelled" compact style={styles.badgeSpacing} />
          ) : null}
        </View>
      </ScreenHeader>

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
        {order.wasReopened ? (
          <InlineMessage tone="warning" style={styles.notice}>
            {`${strings.orderDetails.reopened}${
              order.reopenReason ? ` — ${order.reopenReason}` : ''
            }`}
          </InlineMessage>
        ) : null}

        {submittedAfterCutoff ? (
          <InlineMessage tone="warning" style={styles.notice}>
            {strings.orderDetails.afterCutoff}
          </InlineMessage>
        ) : null}

        {order.shortSupply ? (
          <InlineMessage tone="warning" style={styles.notice}>
            {strings.orderDetails.shortSupplyNote}
          </InlineMessage>
        ) : null}

        <SectionCard title={order.shopName}>
          <Pressable
            onPress={() =>
              navigation.navigate('ShopDetails', { shopId: order.shopId, mode: 'view' })
            }
            accessibilityRole="button"
            accessibilityLabel={`Open ${order.shopName}`}
            style={styles.shopLink}
          >
            <AppText variant="link">{`${order.shopCode} · ${strings.common.view}`}</AppText>
            <Icon name="chevron-right" size={iconSize.md} color={colors.primary} />
          </Pressable>

          <SummaryRow
            label={strings.orderDetails.submittedAt}
            value={
              order.submittedAt
                ? formatDateTime(order.submittedAt)
                : strings.orderDetails.notSubmitted
            }
          />
          <SummaryRow
            label={strings.orderDetails.cutoffAt}
            value={formatDateTime(order.cutoffAt)}
          />
          <SummaryRow
            label={strings.orderDetails.items}
            value={formatNumber(order.items.length)}
          />
          <SummaryRow
            label={strings.orderDetails.total}
            value={formatCurrency(order.total)}
          />
        </SectionCard>

        <SectionCard title={strings.orderDetails.items} flush>
          <DataTable<OrderItem>
            columns={itemColumns}
            rows={order.items}
            keyExtractor={item => item.productId}
          />
        </SectionCard>

        {/* PRD §5 — GST-compliant invoicing needs the split, not just a total. */}
        <SectionCard title={strings.orderDetails.total}>
          <SummaryRow
            label={strings.orderDetails.subtotal}
            value={formatCurrency(order.subtotal)}
          />
          {order.taxBreakdown.map(line => (
            <SummaryRow
              key={line.label}
              label={`${line.label} @ ${line.rate}%`}
              value={formatCurrency(line.amount)}
            />
          ))}
          <SummaryRow
            label={strings.orderDetails.total}
            value={formatCurrency(order.total)}
            emphasis
          />
        </SectionCard>

        <SectionCard title={strings.orderDetails.contact}>
          <SummaryRow label={strings.shopDetails.fields.ownerName} value={order.ownerName} />
          <SummaryRow label={strings.shopDetails.fields.ownerPhone} value={order.ownerPhone} />
          <SummaryRow
            label={strings.shopDetails.fields.ownerEmail}
            value={order.ownerEmail ?? '-'}
          />
        </SectionCard>

        {/* FR-40 timeline, PRD §3 actor and timestamp per transition. */}
        <SectionCard title={strings.orders.timelineTitle}>
          <Timeline order={order} />
        </SectionCard>

        <View style={styles.actions}>
          {order.status === 'submitted' ? (
            <AppButton
              label={strings.orderDetails.reject}
              onPress={() => setPendingStatus('cancelled')}
              variant="outline"
            />
          ) : null}

          {next && transitionLabels[next] ? (
            <AppButton
              label={transitionLabels[next] as string}
              onPress={() => advance(next)}
              loading={updateStatus.isPending && pendingStatus === next}
            />
          ) : null}

          {order.invoiceId ? (
            <AppButton
              label={strings.orderDetails.viewInvoice}
              onPress={() => {}}
              variant="outline"
            />
          ) : null}

          {/* FR-18 — reopening is an exception, so it sits below the flow. */}
          {order.status !== 'draft' && order.status !== 'invoiced' ? (
            <AppButton
              label={strings.orderDetails.reopenAction}
              onPress={() => setReopenOpen(true)}
              variant="link"
            />
          ) : null}

          {canCancelOrder(order.status) && order.status !== 'submitted' ? (
            <AppButton
              label={strings.orderDetails.cancel}
              onPress={() => setPendingStatus('cancelled')}
              variant="link"
            />
          ) : null}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={pendingStatus !== null}
        title={
          pendingStatus === 'cancelled'
            ? strings.orderDetails.cancelTitle
            : strings.orderDetails.confirmTransition(
                orderStatusLabels[pendingStatus ?? 'submitted'],
              )
        }
        message={
          pendingStatus === 'cancelled'
            ? strings.orderDetails.cancelMessage
            : strings.orderDetails.transitionMessage(
                orderStatusLabels[pendingStatus ?? 'submitted'],
              )
        }
        destructive={pendingStatus === 'cancelled'}
        loading={updateStatus.isPending}
        onConfirm={() => {
          if (!pendingStatus) {
            return;
          }
          updateStatus.mutate(
            { orderId: order.id, status: pendingStatus },
            { onSettled: () => setPendingStatus(null) },
          );
        }}
        onDismiss={() => setPendingStatus(null)}
      />

      {/* FR-40 — delivered quantities, which is where short supply is captured. */}
      <ModalForm
        visible={deliveryOpen}
        title={strings.orderDetails.deliveredTitle}
        fields={order.items.map<FormField>(item => ({
          name: item.productId,
          label: `${item.name} (${strings.orderDetails.ordered} ${item.orderedQty} ${item.unit})`,
          type: 'number',
          required: true,
          validate: value =>
            Number(value) >= 0 && Number(value) <= item.orderedQty
              ? undefined
              : `Enter between 0 and ${item.orderedQty}.`,
        }))}
        initialValues={Object.fromEntries(
          order.items.map(item => [item.productId, String(item.orderedQty)]),
        )}
        submitLabel={strings.orderDetails.markDelivered}
        submitting={updateStatus.isPending}
        onSubmit={submitDelivery}
        onDismiss={() => setDeliveryOpen(false)}
      />

      <ConfirmDialog
        visible={reopenOpen}
        title={strings.orderDetails.reopenTitle}
        message={strings.orderDetails.reopenMessage}
        loading={reopen.isPending}
        onConfirm={submitReopen}
        onDismiss={() => {
          setReopenOpen(false);
          setReopenError(undefined);
        }}
      >
        <LabeledInput
          label={strings.orderDetails.reopenReasonLabel}
          value={reopenReason}
          onChangeText={value => {
            setReopenReason(value);
            setReopenError(undefined);
          }}
          error={reopenError}
          multiline
          numberOfLines={3}
        />
      </ConfirmDialog>
    </Screen>
  );
}

/** Renders the FR-40 flow with reached steps filled and the rest pending. */
function Timeline({ order }: { order: Order }) {
  const reached = new Map(order.statusHistory.map(event => [event.status, event]));

  return (
    <View>
      {orderStatusFlow.map(status => {
        const event = reached.get(status);
        const done = Boolean(event);

        return (
          <View key={status} style={styles.timelineRow}>
            <Icon
              name={done ? 'check-circle' : 'circle-outline'}
              size={iconSize.md}
              color={done ? colors.success : colors.textMuted}
            />

            <View style={styles.timelineText}>
              <AppText
                variant="body"
                color={done ? colors.textPrimary : colors.textMuted}
              >
                {orderStatusLabels[status]}
              </AppText>
              {event ? (
                <AppText variant="caption">
                  {`${formatDateTime(event.at)} · ${event.actor}`}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}

      {order.status === 'cancelled' ? (
        <View style={styles.timelineRow}>
          <Icon name="close-circle" size={iconSize.md} color={colors.error} />
          <View style={styles.timelineText}>
            <AppText variant="body" color={colors.error}>
              {orderStatusLabels.cancelled}
            </AppText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <AppText variant={emphasis ? 'h3' : 'bodySecondary'} style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText variant={emphasis ? 'h3' : 'body'} align="right">
        {value}
      </AppText>
    </View>
  );
}

const itemColumns: DataTableColumn<OrderItem>[] = [
  { key: 'name', title: 'Product', width: 170, render: item => item.name },
  {
    key: 'unit',
    title: 'Unit / pack',
    width: 100,
    render: item => `${item.unit} · ${item.packSize}`,
  },
  {
    key: 'ordered',
    title: strings.orderDetails.ordered,
    width: 80,
    align: 'right',
    render: item => formatNumber(item.orderedQty),
  },
  {
    key: 'delivered',
    title: strings.orderDetails.delivered,
    width: 90,
    align: 'right',
    render: item =>
      item.deliveredQty === undefined ? (
        '-'
      ) : (
        <AppText
          variant="bodySecondary"
          align="right"
          color={item.deliveredQty < item.orderedQty ? colors.warning : colors.textPrimary}
        >
          {formatNumber(item.deliveredQty)}
        </AppText>
      ),
  },
  {
    key: 'unitPrice',
    title: strings.orderDetails.unitPrice,
    width: 100,
    align: 'right',
    render: item => formatCurrency(item.unitPrice),
  },
  {
    key: 'lineTotal',
    title: strings.orderDetails.lineTotal,
    width: 110,
    align: 'right',
    render: item => formatCurrency(item.lineTotal),
  },
  {
    key: 'note',
    title: 'Note',
    width: 160,
    render: item => item.note ?? '-',
  },
];

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  badgeSpacing: { marginLeft: spacing.sm },
  notice: { marginBottom: spacing.md },
  shopLink: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: { flex: 1, marginRight: spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  timelineText: { flex: 1, marginLeft: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
