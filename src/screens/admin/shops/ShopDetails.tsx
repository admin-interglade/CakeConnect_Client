import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  DataTable,
  DateRangePicker,
  EmptyState,
  ErrorState,
  InlineMessage,
  LoadingState,
  ModalForm,
  Screen,
  ScreenHeader,
  SectionCard,
  StatCard,
  StatusBadge,
  type DataTableColumn,
  type FormField,
  type FormValues,
} from '../../../components';
import { colors, spacing, strings } from '../../../constants';
import { usePriceLists, useShopDetails, useShopMutations } from '../../../hooks';
import { defaultRange } from '../../../utils/dateRange';
import {
  creditUtilisation,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateTime,
  formatPercent,
} from '../../../utils/format';
import type { AdminShopsStackParamList } from '../../../navigation/types';
import type {
  AuditEntry,
  DateRange,
  LedgerEntry,
  Order,
  ShopInput,
  ShopStatus,
} from '../../../types/admin';

type ShopDetailsNavigation = StackNavigationProp<AdminShopsStackParamList, 'ShopDetails'>;
type ShopDetailsRoute = RouteProp<AdminShopsStackParamList, 'ShopDetails'>;

/**
 * FR-2 / FR-39 shop detail.
 *
 * One screen covers all three modes: without a `shopId` it opens straight into
 * the create form; with one it shows the profile, credit, order history,
 * ledger and audit trail, and opens the same form for edits.
 */
export default function ShopDetails() {
  const navigation = useNavigation<ShopDetailsNavigation>();
  const { params } = useRoute<ShopDetailsRoute>();
  const shopId = params?.shopId;
  const isCreateMode = !shopId;

  const [range, setRange] = React.useState<DateRange>(defaultRange);
  const [formOpen, setFormOpen] = React.useState(isCreateMode);
  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<ShopStatus | null>(null);

  const { shop, ledger, orders, audit, isLoading, isError, error, isRefetching, refetch } =
    useShopDetails(shopId, range);

  const priceLists = usePriceLists();
  const { create, update, changeStatus, addAdjustment } = useShopMutations();

  // Arriving with mode "edit" opens the form, but only once the shop has
  // loaded — opening earlier would seed every field from an undefined shop.
  const openedForEdit = React.useRef(false);
  React.useEffect(() => {
    if (params?.mode === 'edit' && shop && !openedForEdit.current) {
      openedForEdit.current = true;
      setFormOpen(true);
    }
  }, [params?.mode, shop]);

  const shopFields = React.useMemo<FormField[]>(
    () => [
      { name: 'name', label: strings.shopDetails.fields.name, type: 'text', required: true },
      { name: 'code', label: strings.shopDetails.fields.code, type: 'text', required: true },
      {
        name: 'ownerName',
        label: strings.shopDetails.fields.ownerName,
        type: 'text',
        required: true,
      },
      {
        name: 'ownerPhone',
        label: strings.shopDetails.fields.ownerPhone,
        type: 'tel',
        required: true,
      },
      { name: 'ownerEmail', label: strings.shopDetails.fields.ownerEmail, type: 'email' },
      {
        name: 'address',
        label: strings.shopDetails.fields.address,
        type: 'textarea',
        required: true,
      },
      {
        name: 'gstin',
        label: strings.shopDetails.fields.gstin,
        type: 'text',
        hint: '15 characters, as printed on the GST certificate.',
        // Optional, but if given it must be a real GSTIN (PRD §5 Compliance).
        validate: value =>
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(
            value.toUpperCase(),
          )
            ? undefined
            : strings.shopDetails.errors.gstin,
      },
      { name: 'region', label: strings.shopDetails.fields.region, type: 'text' },
      {
        name: 'creditLimit',
        label: strings.shopDetails.fields.creditLimit,
        type: 'number',
        required: true,
        validate: value =>
          Number(value) >= 0 ? undefined : strings.shopDetails.errors.creditLimit,
      },
      {
        name: 'priceListId',
        label: strings.shopDetails.fields.priceList,
        type: 'select',
        required: true,
        options: priceLists.map(list => ({ value: list.id, label: list.name })),
      },
    ],
    [priceLists],
  );

  const initialValues: FormValues = React.useMemo(
    () => ({
      name: shop?.name ?? '',
      code: shop?.code ?? '',
      ownerName: shop?.ownerName ?? '',
      ownerPhone: shop?.ownerPhone ?? '',
      ownerEmail: shop?.ownerEmail ?? '',
      address: shop?.address ?? '',
      gstin: shop?.gstin ?? '',
      region: shop?.region ?? '',
      creditLimit: shop ? String(shop.creditLimit) : '',
      priceListId: shop?.priceListId ?? priceLists[0]?.id ?? '',
    }),
    [shop, priceLists],
  );

  const submitShop = (values: FormValues) => {
    const input: ShopInput = {
      name: values.name.trim(),
      code: values.code.trim(),
      ownerName: values.ownerName.trim(),
      ownerPhone: values.ownerPhone.replace(/\D/g, ''),
      ownerEmail: values.ownerEmail.trim() || undefined,
      address: values.address.trim(),
      gstin: values.gstin.trim().toUpperCase() || undefined,
      region: values.region.trim() || undefined,
      creditLimit: Number(values.creditLimit),
      priceListId: values.priceListId,
    };

    const onDone = () => {
      setFormOpen(false);
      if (isCreateMode) {
        navigation.goBack();
      }
    };

    if (isCreateMode) {
      create.mutate(input, { onSuccess: onDone });
    } else {
      update.mutate({ shopId, input }, { onSuccess: onDone });
    }
  };

  /** FR-39 — a manual adjustment or, when negative, a credit note. */
  const submitAdjustment = (values: FormValues) => {
    if (!shopId) {
      return;
    }

    addAdjustment.mutate(
      {
        shopId,
        input: {
          amount: Number(values.amount),
          reference: values.reference.trim(),
          description: values.description.trim(),
        },
      },
      { onSuccess: () => setAdjustmentOpen(false) },
    );
  };

  // Create mode is the form itself; there is nothing underneath to render.
  if (isCreateMode) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.shopDetails.createTitle}
          onBack={() => navigation.goBack()}
        />

        <ModalForm
          visible={formOpen}
          title={strings.shopDetails.createTitle}
          fields={shopFields}
          initialValues={initialValues}
          submitLabel={strings.shops.add}
          submitting={create.isPending}
          onSubmit={submitShop}
          onDismiss={() => {
            setFormOpen(false);
            navigation.goBack();
          }}
        />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title={strings.common.loading} onBack={() => navigation.goBack()} />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !shop) {
    return (
      <Screen>
        <ScreenHeader title={strings.shops.title} onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  const utilisation = creditUtilisation(shop.creditUsed, shop.creditLimit);

  return (
    <Screen>
      <ScreenHeader
        title={shop.name}
        subtitle={`${shop.code} · ${shop.region ?? '-'}`}
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: 'pencil-outline',
            label: strings.common.edit,
            onPress: () => setFormOpen(true),
          },
        ]}
      >
        <StatusBadge status={shop.status} />
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
        {shop.inviteSentAt ? (
          <InlineMessage tone="info" style={styles.notice}>
            {strings.shopDetails.inviteSent}
          </InlineMessage>
        ) : null}

        <SectionCard title={strings.shopDetails.sectionProfile}>
          <DetailRow label={strings.shopDetails.fields.ownerName} value={shop.ownerName} />
          <DetailRow label={strings.shopDetails.fields.ownerPhone} value={shop.ownerPhone} />
          <DetailRow
            label={strings.shopDetails.fields.ownerEmail}
            value={shop.ownerEmail ?? '-'}
          />
          <DetailRow label={strings.shopDetails.fields.address} value={shop.address} />
          <DetailRow label={strings.shopDetails.fields.gstin} value={shop.gstin ?? '-'} />
          {/* FR-6 — each shop sees only the price list assigned to it. */}
          <DetailRow label={strings.shopDetails.priceList} value={shop.priceListName} />
          {/* FR-14 — a per-shop cut-off overrides the global default. */}
          <DetailRow
            label={strings.shopDetails.cutoffOverride}
            value={shop.cutoffOverride ?? strings.shopDetails.cutoffGlobal}
          />
        </SectionCard>

        <SectionCard title={strings.shopDetails.sectionCredit}>
          <View style={styles.creditTiles}>
            <StatCard
              label={strings.shopDetails.creditLimit}
              value={formatCurrencyCompact(shop.creditLimit)}
            />
            <StatCard
              label={strings.shopDetails.creditUsed}
              value={formatCurrencyCompact(shop.creditUsed)}
              caption={formatPercent(utilisation)}
              tone={utilisation >= 90 ? 'warning' : 'default'}
            />
            <StatCard
              label={strings.shopDetails.creditAvailable}
              value={formatCurrencyCompact(shop.creditAvailable)}
              tone={shop.creditAvailable <= 0 ? 'warning' : 'success'}
            />
          </View>
        </SectionCard>

        <SectionCard title={strings.shopDetails.sectionOrders} flush={orders.length > 0}>
          {orders.length > 0 ? (
            <DataTable<Order>
              columns={orderColumns}
              rows={orders}
              keyExtractor={order => order.id}
              onRowPress={order => navigation.navigate('OrderDetails', { orderId: order.id })}
            />
          ) : (
            <EmptyState icon="clipboard-outline" title={strings.shopDetails.noOrders} />
          )}
        </SectionCard>

        {/* FR-23 / FR-39 — the shared ledger with its running balance. */}
        <SectionCard
          title={strings.shopDetails.sectionLedger}
          actionLabel={strings.shopDetails.adjustment}
          actionIcon="plus"
          onAction={() => setAdjustmentOpen(true)}
        >
          <DateRangePicker value={range} onChange={setRange} style={styles.ledgerRange} />

          {ledger.length > 0 ? (
            <DataTable<LedgerEntry>
              columns={ledgerColumns}
              rows={ledger}
              keyExtractor={entry => entry.id}
              style={styles.ledgerTable}
            />
          ) : (
            <AppText variant="bodySecondary" align="center" style={styles.empty}>
              {strings.shopDetails.noLedger}
            </AppText>
          )}
        </SectionCard>

        {/* PRD §3 — every administrative action, with actor and before/after. */}
        <SectionCard title={strings.shopDetails.sectionAudit}>
          {audit.length > 0 ? (
            <DataTable<AuditEntry>
              columns={auditColumns}
              rows={audit}
              keyExtractor={entry => entry.id}
            />
          ) : (
            <AppText variant="bodySecondary" align="center" style={styles.empty}>
              {strings.shopDetails.noAudit}
            </AppText>
          )}
        </SectionCard>

        <View style={styles.dangerZone}>
          <AppButton
            label={
              shop.status === 'active' ? strings.shops.suspend : strings.shops.reactivate
            }
            onPress={() => setPendingStatus(shop.status === 'active' ? 'suspended' : 'active')}
            variant="outline"
          />
          <AppButton
            label={strings.shops.deactivate}
            onPress={() => setPendingStatus('inactive')}
            variant="outline"
            disabled={shop.status === 'inactive'}
          />
        </View>
      </ScrollView>

      <ModalForm
        visible={formOpen}
        title={strings.shopDetails.editTitle}
        fields={shopFields}
        initialValues={initialValues}
        submitting={update.isPending}
        onSubmit={submitShop}
        onDismiss={() => setFormOpen(false)}
      />

      <ModalForm
        visible={adjustmentOpen}
        title={strings.shopDetails.adjustmentTitle}
        fields={adjustmentFields}
        initialValues={{ amount: '', reference: '', description: '' }}
        submitLabel={strings.common.save}
        submitting={addAdjustment.isPending}
        onSubmit={submitAdjustment}
        onDismiss={() => setAdjustmentOpen(false)}
      />

      <ConfirmDialog
        visible={pendingStatus !== null}
        title={
          pendingStatus === 'inactive'
            ? strings.shops.deactivateTitle
            : pendingStatus === 'suspended'
            ? strings.shops.suspendTitle
            : strings.shops.reactivateTitle
        }
        message={
          pendingStatus === 'inactive'
            ? strings.shops.deactivateMessage(shop.name)
            : pendingStatus === 'suspended'
            ? strings.shops.suspendMessage(shop.name)
            : strings.shops.reactivateMessage(shop.name)
        }
        destructive={pendingStatus !== 'active'}
        loading={changeStatus.isPending}
        onConfirm={() => {
          if (!pendingStatus) {
            return;
          }
          changeStatus.mutate(
            { shopId: shop.id, status: pendingStatus },
            {
              onSuccess: () => {
                setPendingStatus(null);
                // Deactivation removes the shop from the working list, so the
                // admin is returned to the directory rather than a dead detail.
                if (pendingStatus === 'inactive') {
                  navigation.goBack();
                }
              },
              onError: () => setPendingStatus(null),
            },
          );
        }}
        onDismiss={() => setPendingStatus(null)}
      />
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="body" style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

const adjustmentFields: FormField[] = [
  {
    name: 'amount',
    label: strings.shopDetails.fields.amount,
    type: 'number',
    required: true,
    hint: strings.shopDetails.adjustmentHint,
    validate: value =>
      Number(value) !== 0 ? undefined : strings.shopDetails.errors.amount,
  },
  {
    name: 'reference',
    label: strings.shopDetails.fields.reference,
    type: 'text',
    required: true,
  },
  {
    name: 'description',
    label: strings.shopDetails.fields.description,
    type: 'textarea',
    required: true,
  },
];

const orderColumns: DataTableColumn<Order>[] = [
  { key: 'id', title: 'Order', width: 100, render: order => order.id },
  {
    key: 'date',
    title: 'Delivery',
    width: 110,
    render: order => formatDate(order.deliveryDate),
  },
  {
    key: 'total',
    title: 'Value',
    width: 100,
    align: 'right',
    render: order => formatCurrency(order.total),
  },
  {
    key: 'status',
    title: 'Status',
    width: 120,
    render: order => <StatusBadge status={order.status} compact />,
  },
];

const ledgerColumns: DataTableColumn<LedgerEntry>[] = [
  { key: 'date', title: 'Date', width: 100, render: entry => formatDate(entry.date) },
  { key: 'type', title: 'Type', width: 100, render: entry => ledgerTypeLabels[entry.type] },
  { key: 'reference', title: 'Reference', width: 120, render: entry => entry.reference },
  {
    key: 'amount',
    title: 'Amount',
    width: 110,
    align: 'right',
    render: entry => (
      <AppText
        variant="bodySecondary"
        align="right"
        color={entry.amount < 0 ? colors.success : colors.textPrimary}
      >
        {formatCurrency(entry.amount)}
      </AppText>
    ),
  },
  {
    key: 'balance',
    title: strings.shopDetails.runningBalance,
    width: 110,
    align: 'right',
    render: entry => formatCurrency(entry.runningBalance),
  },
];

const ledgerTypeLabels: Record<LedgerEntry['type'], string> = {
  order: 'Order',
  invoice: 'Invoice',
  payment: 'Payment',
  credit_note: 'Credit note',
  adjustment: 'Adjustment',
};

const auditColumns: DataTableColumn<AuditEntry>[] = [
  { key: 'at', title: 'When', width: 150, render: entry => formatDateTime(entry.at) },
  { key: 'actor', title: 'Actor', width: 130, render: entry => entry.actor },
  { key: 'action', title: 'Action', width: 170, render: entry => entry.action },
  {
    key: 'change',
    title: 'Before / after',
    width: 200,
    render: entry =>
      entry.before !== undefined || entry.after !== undefined
        ? `${entry.before ?? '-'} → ${entry.after ?? '-'}`
        : '-',
  },
];

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  notice: { marginBottom: spacing.md },
  detailRow: { marginBottom: spacing.md },
  detailLabel: { marginBottom: spacing.xxs },
  detailValue: { flexShrink: 1 },
  creditTiles: { flexDirection: 'row', gap: spacing.sm },
  ledgerRange: { marginBottom: spacing.md },
  ledgerTable: { marginTop: spacing.sm },
  empty: { paddingVertical: spacing.lg },
  dangerZone: { gap: spacing.sm, marginTop: spacing.sm },
});
