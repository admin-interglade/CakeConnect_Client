import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  DateRangePicker,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LedgerEntryCard,
  LoadingState,
  ModalForm,
  OrderHistoryCard,
  ProgressBar,
  Screen,
  ScreenHeader,
  InfoCard,
  SectionCard,
  SegmentedTabs,
  StatusBadge,
  type FormField,
  type FormValues,
  type SegmentedTab,
} from '../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../../constants';
import {
  usePermissions,
  usePriceLists,
  useShopDetails,
  useShopMutations,
} from '../../../hooks';
import { defaultRange } from '../../../utils/dateRange';
import {
  creditUtilisation,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateTime,
  formatMonthYear,
  formatNumber,
  formatPercent,
} from '../../../utils/format';
import type { AdminShopsStackParamList } from '../../../navigation/types';
import type {
  AuditEntry,
  DateRange,
  LedgerEntry,
  ShopInput,
  ShopStatus,
} from '../../../types/admin';

type ShopDetailsNavigation = StackNavigationProp<AdminShopsStackParamList, 'ShopDetails'>;
type ShopDetailsRoute = RouteProp<AdminShopsStackParamList, 'ShopDetails'>;

type DetailTab = 'overview' | 'orders' | 'ledger' | 'payments';

/**
 * FR-2 / FR-39 shop detail.
 *
 * One screen covers all three modes: without a `shopId` it opens straight into
 * the create form; with one it shows the profile header, then splits the record
 * across four tabs — overview (credit and the month's figures), order history,
 * ledger and payments — with the same form behind the edit action.
 */
export default function ShopDetails() {
  const navigation = useNavigation<ShopDetailsNavigation>();
  const { params } = useRoute<ShopDetailsRoute>();
  const shopId = params?.shopId;
  const isCreateMode = !shopId;

  const [range, setRange] = React.useState<DateRange>(defaultRange);
  const [tab, setTab] = React.useState<DetailTab>('overview');
  const [formOpen, setFormOpen] = React.useState(isCreateMode);
  const [creditOpen, setCreditOpen] = React.useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  //const [showAudit, setShowAudit] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<ShopStatus | null>(null);

  const {
    shop,
    ledger,
    orders,
    payments,
   // audit,
    summary,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
  } = useShopDetails(shopId, range);

  const priceLists = usePriceLists();
  const { create, update, changeStatus, addAdjustment } = useShopMutations();

  // PRD §3 — support staff work the order queue without financial controls.
  // The backend restricts these endpoints to ADMIN, so an ungated button could
  // only ever produce a 403 the user cannot act on.
  const { canManageFinancials } = usePermissions();

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

  const toInput = (values: FormValues): ShopInput => ({
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
  });

  const submitShop = (values: FormValues) => {
    const input = toInput(values);

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

  /**
   * FR-38 — the credit limit on its own. It goes through the same update
   * endpoint, with every other field carried over from the loaded shop.
   */
  const submitCreditLimit = (values: FormValues) => {
    if (!shopId) {
      return;
    }

    update.mutate(
      {
        shopId,
        input: { ...toInput(initialValues), creditLimit: Number(values.creditLimit) },
      },
      { onSuccess: () => setCreditOpen(false) },
    );
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
  // Over 80% of the limit is the point at which the admin needs to notice.
  const creditTone =
    utilisation >= 100 ? colors.error : utilisation >= 80 ? colors.warning : colors.success;
  const creditNote =
    utilisation >= 100
      ? strings.shopDetails.creditBreached
      : utilisation >= 80
      ? strings.shopDetails.creditWatch
      : strings.shopDetails.creditHealthy;

  /**
   * FR-39 — payment history comes from GET /payments, not from the ledger.
   * A payment can sit in PENDING_CONFIRMATION (FR-30) and never reach the
   * ledger at all, so deriving this from ledger rows would hide exactly the
   * payments the admin needs to act on.
   */
  const settledPayments = payments.filter(payment => payment.status === 'SUCCESS');

  const tabs: SegmentedTab<DetailTab>[] = [
    { key: 'overview', label: strings.shopDetails.tabs.overview },
    { key: 'orders', label: strings.shopDetails.tabs.orders, badge: orders.length },
    { key: 'ledger', label: strings.shopDetails.tabs.ledger, badge: ledger.length },
    { key: 'payments', label: strings.shopDetails.tabs.payments, badge: payments.length },
  ];

  const billed = ledger
    .filter(entry => entry.amount > 0)
    .reduce((total, entry) => total + entry.amount, 0);
  const received = settledPayments.reduce((total, payment) => total + payment.amount, 0);
  // The ledger arrives newest first, so the first row carries the closing balance.
  const closingBalance = ledger[0]?.runningBalance ?? shop.outstanding;

  const ordersValue = orders.reduce((total, order) => total + order.total, 0);

  return (
    <Screen>
      <ScreenHeader
        title={strings.shopDetails.title}
        subtitle={shop.code}
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: 'pencil-outline',
            label: strings.common.edit,
            onPress: () => setFormOpen(true),
          },
        ]}
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
        {shop.inviteSentAt ? (
          <InlineMessage tone="info" style={styles.notice}>
            {strings.shopDetails.inviteSent}
          </InlineMessage>
        ) : null}

        {/* Identity, live status and the three details an admin calls on. */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.identity}>
              <AppText variant="h2" numberOfLines={1}>
                {shop.name}
              </AppText>
              <AppText variant="bodySecondary" numberOfLines={1}>
                {shop.region ?? shop.address}
              </AppText>
            </View>

            <View style={styles.statusControl}>
              <StatusBadge status={shop.status} />
              {/* FR-3 — suspend and reactivate without leaving the profile. */}
              <Switch
                value={shop.status === 'active'}
                onValueChange={() =>
                  setPendingStatus(shop.status === 'active' ? 'suspended' : 'active')
                }
                color={colors.success}
                accessibilityLabel={strings.shopDetails.statusToggle}
              />
            </View>
          </View>

          <View style={styles.profileDivider} />

          <DetailRow label={strings.shopDetails.franchiseOwner} value={shop.ownerName} />
          <DetailRow label={strings.shopDetails.contactNumber} value={shop.ownerPhone} />
          <DetailRow label={strings.shopDetails.taxId} value={shop.gstin ?? '-'} />

          {showProfile ? (
            <>
              <DetailRow
                label={strings.shopDetails.fields.ownerEmail}
                value={shop.ownerEmail ?? '-'}
              />
              <DetailRow
                label={strings.shopDetails.fields.address}
                value={shop.address}
                stacked
              />
              {/* FR-6 — each shop sees only the price list assigned to it. */}
              <DetailRow label={strings.shopDetails.priceList} value={shop.priceListName} />
              {/* FR-14 — a per-shop cut-off overrides the global default. */}
              <DetailRow
                label={strings.shopDetails.cutoffOverride}
                value={shop.cutoffOverride ?? strings.shopDetails.cutoffGlobal}
              />
            </>
          ) : null}

          <AppButton
            label={
              showProfile ? strings.shopDetails.hideDetails : strings.shopDetails.moreDetails
            }
            icon={showProfile ? 'chevron-up' : 'chevron-down'}
            variant="link"
            onPress={() => setShowProfile(current => !current)}
            style={styles.profileToggle}
          />
        </View>

        <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} />

        {tab === 'overview' ? (
          <>
            {/* FR-38 — usage, headroom and the meter between them. */}
            <SectionCard title={strings.shopDetails.sectionCredit}>
              <View style={styles.creditRow}>
                <View style={styles.creditColumn}>
                  <AppText variant="caption">{strings.shopDetails.creditUsed}</AppText>
                  <AppText variant="h2" numberOfLines={1} adjustsFontSizeToFit>
                    {formatCurrency(shop.creditUsed)}
                  </AppText>
                </View>

                <View style={styles.creditColumnRight}>
                  <AppText variant="caption" align="right">
                    {strings.shopDetails.creditAvailable}
                  </AppText>
                  <AppText
                    variant="h2"
                    align="right"
                    color={shop.creditAvailable <= 0 ? colors.error : colors.success}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatCurrency(shop.creditAvailable)}
                  </AppText>
                </View>
              </View>

              <ProgressBar
                value={utilisation}
                tone={creditTone}
                style={styles.creditBar}
                accessibilityLabel={strings.shops.creditUtilisation(
                  formatPercent(utilisation),
                )}
              />

              <View style={styles.creditFooter}>
                <AppText variant="caption">
                  {strings.shopDetails.creditUsedCaption(
                    formatCurrencyCompact(shop.creditUsed),
                    formatCurrencyCompact(shop.creditLimit),
                  )}
                </AppText>
                <AppText variant="caption" color={creditTone}>
                  {`${formatPercent(utilisation)} · ${creditNote}`}
                </AppText>
              </View>
            </SectionCard>

            <SectionCard title={strings.shopDetails.sectionMonthly}>
              <SummaryRow
                icon="clipboard-text-outline"
                label={strings.shopDetails.ordersThisMonth}
                value={strings.shopDetails.ordersInRange(summary.orderCount)}
              />
              <SummaryRow
                icon="cash-multiple"
                label={strings.shopDetails.totalOrderValue}
                value={formatCurrency(summary.orderValue)}
              />
              <SummaryRow
                icon="cash-check"
                label={strings.shopDetails.paymentsReceived}
                value={formatCurrency(summary.paymentsReceived)}
                tone={colors.success}
                last
              />
            </SectionCard>

            {canManageFinancials ? (
              <>
                <AppButton
                  label={strings.shopDetails.adjustCreditLimit}
                  onPress={() => setCreditOpen(true)}
                  style={styles.primaryAction}
                />
                <AppButton
                  label={strings.shopDetails.adjustment}
                  variant="outline"
                  onPress={() => setAdjustmentOpen(true)}
                  style={styles.primaryAction}
                />
              </>
            ) : null}

            {/* PRD §3 — every administrative action, with actor and before/after. */}
            {/* <SectionCard
              title={strings.shopDetails.sectionAudit}
              actionLabel={showAudit ? strings.common.close : strings.common.view}
              actionIcon={showAudit ? 'chevron-up' : 'chevron-down'}
              onAction={() => setShowAudit(current => !current)}
              style={styles.auditCard}
            >
              {showAudit ? (
                audit.length > 0 ? (
                  audit.map((entry, index) => (
                    <AuditRow
                      key={entry.id}
                      entry={entry}
                      last={index === audit.length - 1}
                    />
                  ))
                ) : (
                  <AppText variant="bodySecondary" align="center" style={styles.empty}>
                    {strings.shopDetails.noAudit}
                  </AppText>
                )
              ) : null}
            </SectionCard> */}

            <AppButton
              label={strings.shopDetails.deactivateShop}
              onPress={() => setPendingStatus('inactive')}
              variant="outline"
              disabled={shop.status === 'inactive'}
            />
          </>
        ) : null}

        {tab === 'orders' ? (
          <SectionCard title={strings.shopDetails.sectionOrders}>
            <DateRangePicker value={range} onChange={setRange} style={styles.rangePicker} />

            <View style={styles.totalsStrip}>
              <Total
                label={strings.shopDetails.tabs.orders}
                value={formatNumber(orders.length)}
              />
              <Total
                label={strings.shopDetails.totalOrderValue}
                value={formatCurrencyCompact(ordersValue)}
                align="right"
              />
            </View>

            {orders.length > 0 ? (
              orders.map(order => (
                <OrderHistoryCard
                  key={order.id}
                  order={order}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                />
              ))
            ) : (
              <EmptyState icon="clipboard-outline" title={strings.shopDetails.noOrders} />
            )}
          </SectionCard>
        ) : null}

        {/* FR-23 / FR-39 — the shared ledger with its running balance. */}
        {tab === 'ledger' ? (
          <SectionCard
            title={strings.shopDetails.sectionLedger}
            actionLabel={canManageFinancials ? strings.common.add : undefined}
            actionIcon={canManageFinancials ? 'plus' : undefined}
            onAction={canManageFinancials ? () => setAdjustmentOpen(true) : undefined}
          >
            <DateRangePicker value={range} onChange={setRange} style={styles.rangePicker} />

            <View style={styles.totalsStrip}>
              <Total
                label={strings.shopDetails.ledgerBilled}
                value={formatCurrencyCompact(billed)}
              />
              <Total
                label={strings.shopDetails.ledgerReceived}
                value={formatCurrencyCompact(received)}
                tone={colors.success}
                align="center"
              />
              <Total
                label={strings.shopDetails.ledgerClosing}
                value={formatCurrencyCompact(closingBalance)}
                tone={closingBalance > 0 ? colors.textPrimary : colors.success}
                align="right"
              />
            </View>

            {ledger.length > 0 ? (
              groupByMonth(ledger).map(group => (
                <View key={group.label}>
                  <AppText variant="kicker" style={styles.groupHeading}>
                    {group.label}
                  </AppText>
                  {group.entries.map(entry => (
                    <LedgerEntryCard key={entry.id} entry={entry} />
                  ))}
                </View>
              ))
            ) : (
              <EmptyState icon="book-open-outline" title={strings.shopDetails.noLedger} />
            )}
          </SectionCard>
        ) : null}

        {tab === 'payments' ? (
          <SectionCard title={strings.shopDetails.sectionPayments}>
            <DateRangePicker value={range} onChange={setRange} style={styles.rangePicker} />

            <View style={styles.totalsStrip}>
              <Total
                label={strings.shopDetails.paymentsReceived}
                value={formatCurrency(received)}
                tone={colors.success}
              />
              <Total
                label={strings.shopDetails.ledgerClosing}
                value={formatCurrencyCompact(closingBalance)}
                align="right"
              />
            </View>

            {payments.length > 0 ? (
              payments.map(payment => (
                <InfoCard
                  key={payment.id}
                  style={styles.paymentCard}
                  title={formatCurrency(payment.amount)}
                  subtitle={`${payment.method}${
                    payment.status === 'SUCCESS' ? '' : ` · ${payment.status}`
                  }`}
                  caption={[formatDate(payment.date), payment.reference]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ))
            ) : (
              <EmptyState icon="cash-remove" title={strings.shopDetails.noPayments} />
            )}
          </SectionCard>
        ) : null}
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
        visible={creditOpen}
        title={strings.shopDetails.adjustCreditTitle}
        fields={creditLimitFields}
        initialValues={{ creditLimit: String(shop.creditLimit) }}
        submitLabel={strings.common.save}
        submitting={update.isPending}
        onSubmit={submitCreditLimit}
        onDismiss={() => setCreditOpen(false)}
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

function DetailRow({
  label,
  value,
  stacked = false,
}: {
  label: string;
  value: string;
  /** Long values such as the address read better under their label. */
  stacked?: boolean;
}) {
  if (stacked) {
    return (
      <View style={styles.detailStacked}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="body">{value}</AppText>
      </View>
    );
  }

  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="body" align="right" numberOfLines={1} style={styles.detailValue}>
        {value}
      </AppText>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  tone = colors.textPrimary,
  last = false,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryRow, last && styles.summaryRowLast]}>
      <Icon name={icon} size={iconSize.md} color={colors.textSecondary} />
      <AppText variant="bodySecondary" numberOfLines={1} style={styles.summaryLabel}>
        {label}
      </AppText>
      <AppText variant="body" color={tone} numberOfLines={1} style={styles.summaryValue}>
        {value}
      </AppText>
    </View>
  );
}

function Total({
  label,
  value,
  tone = colors.textPrimary,
  align = 'left',
}: {
  label: string;
  value: string;
  tone?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <View style={styles.total}>
      <AppText variant="caption" align={align} numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="h3" align={align} color={tone} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </AppText>
    </View>
  );
}

function AuditRow({ entry, last }: { entry: AuditEntry; last: boolean }) {
  const change =
    entry.before !== undefined || entry.after !== undefined
      ? `${entry.before ?? '-'} → ${entry.after ?? '-'}`
      : undefined;

  return (
    <View style={[styles.auditRow, last && styles.auditRowLast]}>
      <View style={styles.auditMarker} />
      <View style={styles.auditBody}>
        <AppText variant="body" numberOfLines={2}>
          {entry.action}
        </AppText>
        {change ? (
          <AppText variant="bodySecondary" numberOfLines={2}>
            {change}
          </AppText>
        ) : null}
        <AppText variant="caption" numberOfLines={1}>
          {`${entry.actor} · ${formatDateTime(entry.at)}`}
        </AppText>
      </View>
    </View>
  );
}

/** Splits the ledger into month headings, keeping its newest-first order. */
function groupByMonth(entries: LedgerEntry[]) {
  const groups: { label: string; entries: LedgerEntry[] }[] = [];

  entries.forEach(entry => {
    const label = formatMonthYear(entry.date);
    const current = groups[groups.length - 1];

    if (current && current.label === label) {
      current.entries.push(entry);
    } else {
      groups.push({ label, entries: [entry] });
    }
  });

  return groups;
}

const creditLimitFields: FormField[] = [
  {
    name: 'creditLimit',
    label: strings.shopDetails.fields.creditLimit,
    type: 'number',
    required: true,
    hint: strings.shopDetails.adjustCreditHint,
    validate: value =>
      Number(value) >= 0 ? undefined : strings.shopDetails.errors.creditLimit,
  },
];

const adjustmentFields: FormField[] = [
  {
    name: 'amount',
    label: strings.shopDetails.fields.amount,
    type: 'number',
    required: true,
    hint: strings.shopDetails.adjustmentHint,
    validate: value => (Number(value) !== 0 ? undefined : strings.shopDetails.errors.amount),
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

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  notice: { marginBottom: spacing.md },

  profileCard: {
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  identity: { flex: 1 },
  statusControl: { alignItems: 'flex-end', gap: spacing.xs },
  profileDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  profileToggle: { alignSelf: 'flex-start', marginTop: spacing.xs },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  detailLabel: { flexShrink: 0 },
  detailValue: { flex: 1 },
  detailStacked: { paddingVertical: spacing.xs },

  creditRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  creditColumn: { flex: 1 },
  creditColumnRight: { flex: 1, alignItems: 'flex-end' },
  creditBar: { marginTop: spacing.md },
  creditFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  summaryRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  summaryLabel: { flex: 1, marginLeft: spacing.sm },
  summaryValue: { fontWeight: '700', marginLeft: spacing.sm },

  primaryAction: { marginBottom: spacing.sm },
  auditCard: { marginTop: spacing.lg },

  rangePicker: { marginBottom: spacing.md },
  totalsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  total: { flex: 1 },
  groupHeading: { marginBottom: spacing.sm, marginTop: spacing.xs },

  auditRow: { flexDirection: 'row', paddingBottom: spacing.md },
  auditRowLast: { paddingBottom: 0 },
  auditMarker: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primary,
    marginTop: spacing.xs,
    marginRight: spacing.md,
  },
  auditBody: { flex: 1 },
  empty: { paddingVertical: spacing.lg },
  paymentCard: { marginBottom: spacing.sm },
});
