import React from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  Dropdown,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LabeledInput,
  Screen,
  ScreenHeader,
  SectionCard,
  SkeletonCards,
  StatCard,
  type DropdownOption,
} from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import { usePayments, defaultPaymentPagination } from '../../../hooks';
import { isOnlineMethod } from '../../../services/shop';
import { formatCurrency, formatDate } from '../../../utils/format';
import type {
  Invoice,
  PaymentMethod,
  PaymentTarget,
  ShopPayment,
} from '../../../types/shop';
import type { ShopLedgerStackParamList } from '../../../navigation/types';

type TargetKind = PaymentTarget['kind'];

const TARGET_OPTIONS: DropdownOption<TargetKind>[] = [
  { value: 'invoice', label: strings.payments.payInvoice },
  { value: 'outstanding', label: strings.payments.payOutstanding },
  { value: 'onAccount', label: strings.payments.payOnAccount },
];

const ONLINE_METHODS: PaymentMethod[] = ['upi', 'card', 'netBanking'];
const OFFLINE_METHODS: PaymentMethod[] = ['cash', 'cheque', 'neft'];

const METHOD_ICONS: Record<PaymentMethod, string> = {
  upi: 'cellphone-check',
  card: 'credit-card-outline',
  netBanking: 'bank-outline',
  cash: 'cash',
  cheque: 'checkbook',
  neft: 'bank-transfer',
};

/**
 * FR-26 to FR-30 — settling the account.
 *
 * The screen is split the way the backend actually behaves, not the way the
 * PRD lists the methods: "Pay now" for the rails that go to a gateway, and
 * "Record a payment you have already made" for the offline ones that wait for
 * the franchise to confirm (FR-30).
 *
 * The outcome panel is the important part. Three endings are possible and they
 * mean very different things about whether money has moved, so the screen shows
 * which one happened rather than collapsing all three into a toast. In
 * particular, an online payment with no gateway wired leaves a real PENDING row
 * that nothing can settle — reporting that as a completed payment would be a
 * lie about money. See docs/api-gaps.md G16.
 */
export default function PaymentsScreen() {
  const navigation = useNavigation<StackNavigationProp<ShopLedgerStackParamList>>();

  const {
    payableInvoices,
    payments,
    credit,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    outcome,
    clearOutcome,
    pay,
    isPaying,
  } = usePayments(defaultPaymentPagination);

  const [kind, setKind] = React.useState<TargetKind>('outstanding');
  const [invoiceId, setInvoiceId] = React.useState<string>('');
  const [amountDraft, setAmountDraft] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod | undefined>();
  const [note, setNote] = React.useState('');
  const [confirming, setConfirming] = React.useState(false);
  const [amountError, setAmountError] = React.useState<string | undefined>();

  const outstanding = credit?.currentOutstanding ?? 0;
  const selectedInvoice = payableInvoices.find(item => item.id === invoiceId);

  /** The amount each mode is actually paying, before validation. */
  const amount = React.useMemo(() => {
    if (kind === 'invoice') {
      return selectedInvoice?.outstanding ?? 0;
    }
    if (kind === 'outstanding') {
      return outstanding;
    }
    return Number(amountDraft.replace(/[^\d.]/g, '')) || 0;
  }, [kind, selectedInvoice, outstanding, amountDraft]);

  /** Default the invoice picker to the oldest payable one, which is the due one. */
  React.useEffect(() => {
    if (kind === 'invoice' && !invoiceId && payableInvoices.length > 0) {
      setInvoiceId(payableInvoices[0].id);
    }
  }, [kind, invoiceId, payableInvoices]);

  const validate = (): boolean => {
    if (amount <= 0) {
      setAmountError(strings.payments.errors.amount);
      return false;
    }
    // An on-account payment beyond what is owed would leave a credit the
    // franchise has to unwind by hand, so it is refused at the source.
    if (kind === 'onAccount' && outstanding > 0 && amount > outstanding) {
      setAmountError(strings.payments.errors.overOutstanding);
      return false;
    }
    setAmountError(undefined);
    return true;
  };

  const target = (): PaymentTarget => {
    if (kind === 'invoice' && selectedInvoice) {
      return {
        kind: 'invoice',
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.number,
        amount,
      };
    }
    if (kind === 'outstanding') {
      return { kind: 'outstanding', amount };
    }
    return { kind: 'onAccount', amount };
  };

  const submit = () => {
    if (!method || !validate()) {
      return;
    }
    setConfirming(false);
    clearOutcome();
    pay(target(), method, note.trim() || undefined);
  };

  if (isLoading && !credit) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.payments.title}
          onBack={navigation.canGoBack() ? navigation.goBack : undefined}
        />
        <SkeletonCards />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.payments.title}
          onBack={navigation.canGoBack() ? navigation.goBack : undefined}
        />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={strings.payments.title}
        subtitle={strings.payments.subtitle}
        onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        <View style={styles.tiles}>
          <StatCard
            label={strings.payments.outstandingLabel}
            value={formatCurrency(outstanding)}
            icon="scale-balance"
            tone={outstanding > 0 ? 'warning' : 'success'}
            style={styles.tile}
          />
          <StatCard
            label={strings.payments.availableCredit}
            value={formatCurrency(credit?.availableCredit ?? 0)}
            icon="credit-card-outline"
            style={styles.tile}
          />
        </View>

        {/* FR-29 / FR-30 — what actually happened to the last attempt. */}
        {outcome ? (
          <PaymentOutcomePanel outcome={outcome} onDismiss={clearOutcome} />
        ) : null}

        {outstanding <= 0 && payableInvoices.length === 0 ? (
          <EmptyState
            icon="check-decagram-outline"
            title={strings.payments.nothingDue}
            message={strings.payments.nothingDueMessage}
          />
        ) : (
          <>
            {/* FR-26 — a specific invoice, the full outstanding, or on account. */}
            <SectionCard title={strings.payments.payWhat}>
              <Dropdown
                value={kind}
                options={TARGET_OPTIONS}
                onChange={next => {
                  setKind(next);
                  setAmountError(undefined);
                }}
              />

              {kind === 'invoice' ? (
                payableInvoices.length === 0 ? (
                  <InlineMessage tone="info" style={styles.field}>
                    {strings.payments.noPayableInvoices}
                  </InlineMessage>
                ) : (
                  <Dropdown
                    label={strings.payments.invoiceLabel}
                    value={invoiceId}
                    options={payableInvoices.map(invoiceOption)}
                    onChange={setInvoiceId}
                    style={styles.field}
                  />
                )
              ) : null}

              {kind === 'onAccount' ? (
                <LabeledInput
                  label={strings.payments.amountLabel}
                  value={amountDraft}
                  onChangeText={setAmountDraft}
                  placeholder="0"
                  keyboardType="numeric"
                  error={amountError}
                  containerStyle={styles.field}
                />
              ) : null}

              <View style={styles.amountRow}>
                <AppText variant="bodySecondary">
                  {strings.payments.amountLabel}
                </AppText>
                <AppText variant="h2">{formatCurrency(amount)}</AppText>
              </View>
              {amountError && kind !== 'onAccount' ? (
                <InlineMessage tone="error">{amountError}</InlineMessage>
              ) : null}
            </SectionCard>

            {/* FR-27 — the six methods, grouped by what actually happens next. */}
            <SectionCard title={strings.payments.methodLabel}>
              <AppText variant="caption" style={styles.groupLabel}>
                {strings.payments.methodsOnline}
              </AppText>
              <View style={styles.methods}>
                {ONLINE_METHODS.map(item => (
                  <MethodTile
                    key={item}
                    method={item}
                    selected={method === item}
                    onPress={() => setMethod(item)}
                  />
                ))}
              </View>

              <AppText variant="caption" style={styles.groupLabel}>
                {strings.payments.methodsOffline}
              </AppText>
              <View style={styles.methods}>
                {OFFLINE_METHODS.map(item => (
                  <MethodTile
                    key={item}
                    method={item}
                    selected={method === item}
                    onPress={() => setMethod(item)}
                  />
                ))}
              </View>

              <LabeledInput
                label={strings.payments.noteLabel}
                value={note}
                onChangeText={setNote}
                placeholder={strings.payments.notePlaceholder}
                containerStyle={styles.field}
              />
            </SectionCard>

            <AppButton
              label={
                method && isOnlineMethod(method)
                  ? strings.payments.pay(formatCurrency(amount))
                  : strings.payments.record(formatCurrency(amount))
              }
              icon="cash-multiple"
              onPress={() => {
                if (validate()) {
                  setConfirming(true);
                }
              }}
              loading={isPaying}
              disabled={!method || amount <= 0}
            />
          </>
        )}

        {/* FR-29 — history, including rows still awaiting confirmation. */}
        <SectionCard title={strings.payments.historyTitle}>
          {payments.length === 0 ? (
            <AppText variant="bodySecondary">
              {strings.payments.historyEmpty}
            </AppText>
          ) : (
            payments.map(payment => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                // FR-25 — a payment made against an invoice links back to it.
                onPress={
                  payment.invoiceId
                    ? () =>
                        navigation.navigate('InvoiceDetails', {
                          invoiceId: payment.invoiceId as string,
                        })
                    : undefined
                }
              />
            ))
          )}
        </SectionCard>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title={strings.payments.confirmTitle}
        message={strings.payments.confirmMessage(
          formatCurrency(amount),
          method ? strings.payments.methods[method] : '',
        )}
        confirmLabel={strings.common.confirm}
        loading={isPaying}
        onConfirm={submit}
        onDismiss={() => setConfirming(false)}
      />
    </Screen>
  );
}

const invoiceOption = (invoice: Invoice): DropdownOption<string> => ({
  value: invoice.id,
  label: invoice.number,
  meta: `${formatCurrency(invoice.outstanding)} · ${strings.payments.dueOn(
    formatDate(invoice.dueDate),
  )}`,
});

function MethodTile({
  method,
  selected,
  onPress,
}: {
  method: PaymentMethod;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={strings.payments.methods[method]}
      hitSlop={layout.hitSlop}
      style={[styles.method, selected && styles.methodSelected]}
    >
      <Icon
        name={METHOD_ICONS[method]}
        size={iconSize.md}
        color={selected ? colors.primary : colors.textSecondary}
      />
      <AppText
        variant="caption"
        color={selected ? colors.primary : colors.textSecondary}
        numberOfLines={2}
      >
        {strings.payments.methods[method]}
      </AppText>
    </Pressable>
  );
}

/**
 * FR-29 / FR-30 — the three endings, told apart.
 *
 * `gatewayUnavailable` is the one that matters most: the payment row is real,
 * nothing has been charged, and the balance is still due. Saying "successful"
 * here would be the single most damaging thing this screen could do.
 */
function PaymentOutcomePanel({
  outcome,
  onDismiss,
}: {
  outcome: NonNullable<ReturnType<typeof usePayments>['outcome']>;
  onDismiss: () => void;
}) {
  if (outcome.kind === 'awaitingConfirmation') {
    return (
      <SectionCard
        title={strings.payments.awaitingTitle}
        actionLabel={strings.common.close}
        actionIcon="close"
        onAction={onDismiss}
      >
        <InlineMessage tone="success">
          {strings.payments.awaitingMessage(outcome.payment.reference)}
        </InlineMessage>
      </SectionCard>
    );
  }

  if (outcome.kind === 'gatewayHandoff') {
    return (
      <SectionCard
        title={strings.payments.gatewayHandoff}
        actionLabel={strings.common.close}
        actionIcon="close"
        onAction={onDismiss}
      >
        <AppButton
          label={strings.payments.gatewayHandoff}
          icon="open-in-new"
          onPress={() => Linking.openURL(outcome.url)}
        />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={strings.payments.gatewayUnavailableTitle}
      actionLabel={strings.common.close}
      actionIcon="close"
      onAction={onDismiss}
    >
      <InlineMessage tone="error">
        {strings.payments.gatewayUnavailableMessage(outcome.payment.reference)}
      </InlineMessage>
    </SectionCard>
  );
}

function PaymentRow({
  payment,
  onPress,
}: {
  payment: ShopPayment;
  onPress?: () => void;
}) {
  const tone =
    payment.status === 'success'
      ? colors.success
      : payment.status === 'failed' || payment.status === 'rejected'
        ? colors.error
        : colors.warning;

  const body = (
    <View style={styles.paymentRow}>
      <View style={styles.paymentText}>
        <AppText variant="body">{payment.reference}</AppText>
        <AppText variant="caption">
          {[
            formatDate(payment.date),
            strings.payments.methods[payment.method],
            payment.invoiceNumber,
          ]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
        <AppText variant="caption" color={tone}>
          {strings.payments.statuses[payment.status]}
        </AppText>
      </View>
      <AppText variant="body">{formatCurrency(payment.amount)}</AppText>
      {onPress ? (
        <Icon name="chevron-right" size={iconSize.md} color={colors.textMuted} />
      ) : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={payment.reference}
      accessibilityHint={strings.invoice.title}
      hitSlop={layout.hitSlop}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.giant,
    gap: spacing.md,
  },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
  field: { marginTop: spacing.md },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  groupLabel: { marginTop: spacing.md, marginBottom: spacing.sm },
  methods: { flexDirection: 'row', gap: spacing.sm },
  method: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: layout.minTouchTarget + spacing.lg,
    justifyContent: 'center',
  },
  methodSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  paymentText: { flex: 1, gap: spacing.xxs },
});
