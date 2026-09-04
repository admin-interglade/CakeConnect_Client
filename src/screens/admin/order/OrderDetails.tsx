import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
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
  StepProgress,
  type FormField,
  type FormValues,
  type ProgressStep,
} from '../../../components';
import { borderWidth, colors, iconSize, spacing, strings } from '../../../constants';
import { useOrderDetails, useOrderMutations } from '../../../hooks';
import {
  canCancelOrder,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatQuantity,
  nextOrderStatus,
  orderStatusFlow,
  orderStatusLabels,
  orderStatusShortLabels,
} from '../../../utils/format';
import type { AdminOrdersStackParamList } from '../../../navigation/types';
import type { ShortSupplyLine, Order, OrderItem, OrderStatus } from '../../../types/admin';

type OrderDetailsNavigation = StackNavigationProp<
  AdminOrdersStackParamList,
  'OrderDetails'
>;
type OrderDetailsRoute = RouteProp<AdminOrdersStackParamList, 'OrderDetails'>;

/** The action label for each legal transition out of the current status (FR-40). */
const transitionLabels: Partial<Record<OrderStatus, string>> = {
  accepted: strings.orderDetails.accept,
  in_production: strings.orderDetails.startProduction,
  dispatched: strings.orderDetails.markDispatched,
  delivered: strings.orderDetails.markDelivered,
  invoiced: strings.orderDetails.generateInvoice,
};

/** The glyph each stage of the FR-40 pipeline is drawn with while it is current. */
const stepIcons: Partial<Record<OrderStatus, string>> = {
  submitted: 'file-document-outline',
  accepted: 'clipboard-check-outline',
  in_production: 'chef-hat',
  dispatched: 'truck-outline',
  delivered: 'package-variant-closed',
  invoiced: 'receipt',
};

/** Short supply is declared while the order is still ours to change. */
const shortSupplyStatuses: OrderStatus[] = ['accepted', 'in_production', 'dispatched'];

const progressSteps: ProgressStep[] = orderStatusFlow.map(status => ({
  key: status,
  label: orderStatusShortLabels[status],
  icon: stepIcons[status],
}));

/**
 * FR-40 order detail.
 *
 * The screen answers three questions in order: how far has this order got,
 * what is on it, and what happens next — the progress track, the priced items
 * with their per-line notes, and the one or two actions the current stage
 * allows. Everything an admin only occasionally needs (the shop's contact, the
 * dated transition history) sits below that.
 */
export default function OrderDetails() {
  const navigation = useNavigation<OrderDetailsNavigation>();
  const { params } = useRoute<OrderDetailsRoute>();
  const orderId = params.orderId;

  const { order, isLoading, isError, error, isRefetching, refetch } =
    useOrderDetails(orderId);
  const { updateStatus, reopen, shortSupply } = useOrderMutations();

  const [pendingStatus, setPendingStatus] = React.useState<OrderStatus | null>(null);
  const [deliveryOpen, setDeliveryOpen] = React.useState(false);
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [reopenReason, setReopenReason] = React.useState('');
  const [reopenError, setReopenError] = React.useState<string | undefined>();

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.orderDetails.title}
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
          title={strings.orderDetails.title}
          subtitle={orderId}
          onBack={() => navigation.goBack()}
        />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  const next = nextOrderStatus(order.status);
  const submittedAfterCutoff = Boolean(
    order.submittedAt && new Date(order.submittedAt) > new Date(order.cutoffAt),
  );

  // The stage in progress on the track. A cancelled order stops at the last
  // stage it actually reached; a fully invoiced one fills every step.
  const furthestReached = order.statusHistory.reduce(
    (furthest, event) => Math.max(furthest, orderStatusFlow.indexOf(event.status)),
    orderStatusFlow.indexOf(order.status),
  );
  const currentStep =
    furthestReached >= orderStatusFlow.length - 1
      ? orderStatusFlow.length
      : furthestReached;

  /**
   * FR-40 — the Delivered step is the one transition that carries data, since
   * short supply is confirmed against the ordered quantity there.
   */
  const advance = (status: OrderStatus) => {
    if (status === 'delivered') {
      setDeliveryOpen(true);
      return;
    }
    setPendingStatus(status);
  };

  /**
   * FR-40 — delivered quantities live on the delivery, not the order, so this
   * goes through the deliveries flow rather than the status route (which
   * accepts only `{status}`). Lines matching the ordered quantity are omitted:
   * the service treats an undeclared line as delivered in full.
   */
  const submitDelivery = (values: FormValues) => {
    const lines: ShortSupplyLine[] = order.items
      .map(item => {
        const entered = Number(values[item.productId]);
        const deliveringQty = Number.isFinite(entered)
          ? Math.min(Math.max(entered, 0), item.orderedQty)
          : item.orderedQty;

        return { productId: item.productId, deliveringQty };
      })
      .filter(line => {
        const item = order.items.find(candidate => candidate.productId === line.productId);
        return item ? line.deliveringQty < item.orderedQty : false;
      });

    shortSupply.mutate(
      { orderId: order.id, lines },
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
        title={strings.orderDetails.title}
        subtitle={strings.orderDetails.subtitle(order.shopName, order.id)}
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
      />

      <ScrollView
        style={styles.list}
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

        {/* FR-40 — how far the order has travelled, at a glance. */}
        <SectionCard title={strings.orderDetails.progress}>
          <StepProgress
            steps={progressSteps}
            currentIndex={currentStep}
            failed={order.status === 'cancelled'}
          />

          {order.status === 'cancelled' ? (
            <View style={styles.cancelledRow}>
              <StatusBadge status="cancelled" compact />
            </View>
          ) : null}
        </SectionCard>

        {/* FR-5, FR-7 — the priced lines with the shop's per-item instructions. */}
        <SectionCard title={strings.orderDetails.itemsCount(order.items.length)}>
          {order.items.map((item, index) => (
            <ItemRow key={item.productId} item={item} first={index === 0} />
          ))}

          <View style={styles.totalsDivider} />

          <TotalRow
            label={strings.orderDetails.subtotal}
            value={formatCurrency(order.subtotal)}
          />
          {/* PRD §5 — GST-compliant invoicing needs the split, not just a total. */}
          {order.taxBreakdown.map(line => (
            <TotalRow
              key={line.label}
              label={`${line.label} @ ${line.rate}%`}
              value={formatCurrency(line.amount)}
            />
          ))}
          <TotalRow
            label={strings.orderDetails.total}
            value={formatCurrency(order.total)}
            emphasis
          />
        </SectionCard>

        <View style={styles.actions}>
          {/* FR-40 — declared before the van loads, not discovered at delivery. */}
          {shortSupplyStatuses.includes(order.status) ? (
            <AppButton
              label={strings.orderDetails.captureShortSupply}
              onPress={() => navigation.navigate('ShortSupply', { orderId: order.id })}
              variant="outline"
            />
          ) : null}

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

          {/*
            FR-18 — reopening after cut-off has no backend endpoint, and the
            exception has to be audit-logged server-side to mean anything. The
            action is withheld with a reason rather than offered and failing.
            See docs/api-gaps.md G10.
          */}
          {order.status !== 'draft' && order.status !== 'invoiced' ? (
            <InlineMessage tone="info" icon="information-outline">
              {strings.orderDetails.reopenUnavailable}
            </InlineMessage>
          ) : null}

          {canCancelOrder(order.status) && order.status !== 'submitted' ? (
            <AppButton
              label={strings.orderDetails.cancel}
              onPress={() => setPendingStatus('cancelled')}
              variant="link"
            />
          ) : null}
        </View>

        <SectionCard title={strings.orderDetails.sectionShop} style={styles.secondary}>
          <Pressable
            onPress={() =>
              navigation.navigate('ShopDetails', { shopId: order.shopId, mode: 'view' })
            }
            accessibilityRole="button"
            accessibilityLabel={`Open ${order.shopName}`}
            style={styles.shopLink}
          >
            <AppText variant="link">{`${order.shopName} · ${order.shopCode}`}</AppText>
            <Icon name="chevron-right" size={iconSize.md} color={colors.primary} />
          </Pressable>

          <SummaryRow
            label={strings.orders.deliveryDate}
            value={formatDate(order.deliveryDate)}
          />
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
          <SummaryRow label={strings.shopDetails.fields.ownerName} value={order.ownerName} />
          <SummaryRow
            label={strings.shopDetails.fields.ownerPhone}
            value={order.ownerPhone}
          />
          <SummaryRow
            label={strings.shopDetails.fields.ownerEmail}
            value={order.ownerEmail ?? '-'}
          />
        </SectionCard>

        {/* FR-40 timeline, PRD §3 actor and timestamp per transition. */}
        <SectionCard title={strings.orders.timelineTitle}>
          <Timeline order={order} />
        </SectionCard>
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

      {/* FR-40 — the delivered quantities, seeded from any declared shortfall. */}
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
          order.items.map(item => [
            item.productId,
            String(item.deliveredQty ?? item.orderedQty),
          ]),
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

/**
 * One priced line: what was ordered, for how much, and anything the shop asked
 * for. A line already declared short carries the quantity that will be sent.
 */
function ItemRow({ item, first }: { item: OrderItem; first: boolean }) {
  const short = item.deliveredQty !== undefined && item.deliveredQty < item.orderedQty;

  return (
    <View style={[styles.itemRow, first && styles.itemRowFirst]}>
      <View style={styles.itemHeader}>
        <AppText variant="body" style={styles.itemName}>
          {item.name}
        </AppText>
        <AppText variant="bodySecondary" style={styles.itemQty}>
          {formatQuantity(item.orderedQty, item.unit)}
        </AppText>
        <AppText variant="body" align="right" style={styles.itemTotal}>
          {formatCurrency(item.lineTotal)}
        </AppText>
      </View>

      {item.note ? (
        <AppText variant="caption" color={colors.warning} style={styles.itemNote}>
          {strings.orderDetails.itemNote(item.note)}
        </AppText>
      ) : null}

      {short ? (
        <AppText variant="caption" color={colors.error} style={styles.itemNote}>
          {strings.orderDetails.deliveringNote(
            formatQuantity(item.deliveredQty ?? 0, item.unit),
          )}
        </AppText>
      ) : null}
    </View>
  );
}

/** Renders the FR-40 history with the actor and timestamp of each transition. */
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

function TotalRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <AppText
        variant={emphasis ? 'h3' : 'bodySecondary'}
        style={styles.summaryLabel}
      >
        {label}
      </AppText>
      <AppText
        variant={emphasis ? 'h2' : 'bodySecondary'}
        align="right"
        color={emphasis ? colors.primary : undefined}
      >
        {value}
      </AppText>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <AppText variant="bodySecondary" style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText variant="body" align="right">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { paddingBottom: spacing.xxl },
  notice: { marginBottom: spacing.md },
  cancelledRow: { marginTop: spacing.md },
  itemRow: {
    paddingVertical: spacing.md,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: colors.divider,
  },
  itemRowFirst: { borderTopWidth: 0, paddingTop: 0 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  itemName: { flex: 1, marginRight: spacing.sm },
  itemQty: { width: 68, textAlign: 'right' },
  itemTotal: { width: 88 },
  itemNote: { marginTop: spacing.xs },
  totalsDivider: {
    height: borderWidth.hairline,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: { flex: 1, marginRight: spacing.md },
  actions: { gap: spacing.sm, marginBottom: spacing.xl },
  secondary: { marginTop: spacing.sm },
  shopLink: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  timelineText: { flex: 1, marginLeft: spacing.sm },
});
