import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import {
  AppButton,
  AppText,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Screen,
  ScreenHeader,
  SectionCard,
} from '../../../components';
import { colors, iconSize, spacing, strings } from '../../../constants';
import { useInvoiceDetails } from '../../../hooks';
import { formatCurrency, formatDate, formatNumber } from '../../../utils/format';
import type { InvoiceLine } from '../../../types/shop';
import type {
  ShopLedgerStackParamList,
  ShopTabParamList,
} from '../../../navigation/types';

/**
 * Registered in the Home, Orders and Ledger stacks — an invoice is reachable
 * from a notification, from an invoiced order and from the statement. The
 * Ledger stack's params are the widest of the three, so they type the route.
 */
type Route = RouteProp<ShopLedgerStackParamList, 'InvoiceDetails'>;
type Navigation = StackNavigationProp<ShopLedgerStackParamList> &
  BottomTabNavigationProp<ShopTabParamList>;

/**
 * FR-25 — invoice detail with line items, taxes and short-supply notes against
 * the original order.
 *
 * The short-supply half is carried by `basedOnDelivered`, which is the PRD §8
 * open question ("billed on ordered or delivered quantity?") already answered
 * by the backend per invoice. Stating which basis was used is the difference
 * between a shop understanding a smaller bill and disputing it.
 */
export default function InvoiceDetails() {
  const navigation = useNavigation<Navigation>();
  const { params } = useRoute<Route>();

  const { invoice, isLoading, isError, error, refetch } = useInvoiceDetails(
    params.invoiceId,
  );

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title={strings.invoice.title} onBack={navigation.goBack} />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !invoice) {
    return (
      <Screen>
        <ScreenHeader title={strings.invoice.title} onBack={navigation.goBack} />
        <ErrorState message={error} onRetry={refetch} />
      </Screen>
    );
  }

  const settled = invoice.outstanding <= 0;

  return (
    <Screen>
      <ScreenHeader
        title={strings.invoice.subtitle(invoice.number)}
        subtitle={strings.invoice.statuses[invoice.status]}
        onBack={navigation.goBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionCard title={strings.invoice.title}>
          <DetailRow
            icon="calendar-outline"
            label={strings.invoice.issuedOn}
            value={invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '—'}
          />
          <DetailRow
            icon="calendar-clock"
            label={strings.invoice.dueOn}
            value={invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
          />
          <DetailRow
            icon="information-outline"
            label={strings.invoice.status}
            value={strings.invoice.statuses[invoice.status]}
          />

          {/* PRD §8 — ordered or delivered quantity. The invoice says which. */}
          <InlineMessage
            tone={invoice.basedOnDelivered ? 'info' : 'warning'}
            style={styles.note}
          >
            {invoice.basedOnDelivered
              ? strings.invoice.basedOnDelivered
              : strings.invoice.basedOnOrdered}
          </InlineMessage>
        </SectionCard>

        <SectionCard title={strings.invoice.lines(invoice.lines.length)}>
          {invoice.lines.map(line => (
            <InvoiceLineRow key={`${line.productId}-${line.name}`} line={line} />
          ))}

          <View style={styles.totals}>
            <TotalRow label={strings.invoice.subtotal} value={invoice.subtotal} />
            <TotalRow label={strings.invoice.tax} value={invoice.taxTotal} />
            {invoice.discountTotal > 0 ? (
              <TotalRow
                label={strings.invoice.discount}
                value={-invoice.discountTotal}
              />
            ) : null}
            <View style={styles.grandTotal}>
              <AppText variant="h3">{strings.invoice.total}</AppText>
              <AppText variant="h2">{formatCurrency(invoice.total)}</AppText>
            </View>
            <TotalRow label={strings.invoice.paid} value={invoice.paid} />
            <View style={styles.outstanding}>
              <AppText variant="h3">{strings.invoice.outstanding}</AppText>
              <AppText
                variant="h3"
                color={invoice.outstanding > 0 ? colors.warning : colors.success}
              >
                {formatCurrency(invoice.outstanding)}
              </AppText>
            </View>
          </View>
        </SectionCard>

        {/* FR-26 — pay this specific invoice. */}
        {settled ? (
          <InlineMessage tone="success">{strings.invoice.settled}</InlineMessage>
        ) : (
          <AppButton
            label={strings.invoice.payThis}
            icon="cash-multiple"
            onPress={() =>
              navigation.navigate('LedgerTab', { screen: 'ShopPayments' })
            }
          />
        )}
      </ScrollView>
    </Screen>
  );
}

function InvoiceLineRow({ line }: { line: InvoiceLine }) {
  return (
    <View style={styles.line}>
      <View style={styles.lineText}>
        <AppText variant="body" numberOfLines={2}>
          {line.name}
        </AppText>
        <AppText variant="caption">
          {`${strings.invoice.quantity} ${formatNumber(line.quantity)} · ${formatCurrency(
            line.unitPrice,
          )}`}
        </AppText>
      </View>
      <AppText variant="body">{formatCurrency(line.lineTotal)}</AppText>
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
  outstanding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
