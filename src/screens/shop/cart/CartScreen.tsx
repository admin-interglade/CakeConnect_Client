import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  EmptyState,
  Icon,
  InlineMessage,
  LabeledInput,
  QuantityStepper,
  Screen,
  ScreenHeader,
  SectionCard,
} from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../../constants';
import { useCart } from '../../../hooks';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatTime,
} from '../../../utils/format';
import type { CartLine } from '../../../types/shop';
import type {
  ShopHomeStackParamList,
  ShopTabParamList,
} from '../../../navigation/types';
import CutoffStrip from '../components/CutoffStrip';

/** The cart sits in the Home stack but links across to the Orders tab. */
type Navigation = StackNavigationProp<ShopHomeStackParamList> &
  BottomTabNavigationProp<ShopTabParamList>;

/**
 * FR-7 to FR-12 — the next-day order, from lines to submitted.
 *
 * Three things this screen is careful about, because each is a way to get an
 * order wrong:
 *
 *   - it never claims the order has reached the kitchen until the server says
 *     so. "Saved on this device" and "submitted" are different sentences;
 *   - it shows the running total including the tax line even though the tax is
 *     zero, because FR-7 asks for a value with tax and a missing line reads as
 *     an oversight;
 *   - it distinguishes a credit limit that warns from one that blocks (PRD §8),
 *     since the franchise sets that per shop.
 */
export default function CartScreen() {
  const navigation = useNavigation<Navigation>();
  const cart = useCart();

  const [confirmSubmit, setConfirmSubmit] = React.useState(false);
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const [noteFor, setNoteFor] = React.useState<CartLine | undefined>();
  const [noteDraft, setNoteDraft] = React.useState('');

  const openNote = (line: CartLine) => {
    setNoteFor(line);
    setNoteDraft(line.note ?? '');
  };

  const commitNote = () => {
    if (noteFor) {
      cart.setNote(noteFor.productId, noteDraft);
    }
    setNoteFor(undefined);
  };

  /* FR-22 — an order already submitted for tomorrow. The cart is not the place
     to edit it: it has to be cancelled first, which is an Orders action. */
  if (cart.alreadySubmitted) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.cart.title}
          onBack={navigation.canGoBack() ? navigation.goBack : undefined}
        />
        <CutoffStrip
          cutoffTime={cart.cutoffTime}
          secondsRemaining={cart.secondsToCutoff}
          passed={cart.cutoffPassed}
        />
        <EmptyState
          icon="check-decagram-outline"
          title={strings.cart.alreadySubmitted}
          message={strings.cart.alreadySubmittedMessage}
          actionLabel={strings.shopHome.tomorrow.viewOrder}
          onAction={() => navigation.navigate('OrdersTab')}
        />
      </Screen>
    );
  }

  const header = (
    <View style={styles.header}>
      <CutoffStrip
        cutoffTime={cart.cutoffTime}
        secondsRemaining={cart.secondsToCutoff}
        passed={cart.cutoffPassed}
      />

      {/* FR-8 — demand is highly repetitive, so repeating is offered before
          the empty state, not buried under it. */}
      <View style={styles.repeatRow}>
        <AppButton
          label={strings.cart.repeatLast}
          icon="history"
          variant="outline"
          onPress={() => cart.repeat('last')}
          loading={cart.isRepeating}
          disabled={cart.cutoffPassed}
          style={styles.repeatButton}
        />
        <AppButton
          label={strings.cart.repeatWeekday}
          icon="calendar-refresh-outline"
          variant="outline"
          onPress={() => cart.repeat('weekday')}
          loading={cart.isRepeating}
          disabled={cart.cutoffPassed}
          style={styles.repeatButton}
        />
      </View>

      {/* FR-11 — say plainly where the order currently lives. */}
      {cart.lines.length > 0 ? (
        <InlineMessage tone={cart.dirty ? 'warning' : 'success'}>
          {cart.dirty
            ? strings.cart.offlineNote
            : cart.lastSyncedAt
              ? strings.cart.syncedAt(formatTime(cart.lastSyncedAt))
              : strings.cart.offlineNote}
        </InlineMessage>
      ) : null}
    </View>
  );

  const footer =
    cart.lines.length === 0 ? undefined : (
      <View style={styles.footer}>
        {/* FR-7 — an order-level note alongside the per-item ones. */}
        <SectionCard title={strings.cart.orderNoteLabel}>
          <LabeledInput
            value={cart.notes}
            onChangeText={cart.setOrderNotes}
            placeholder={strings.cart.orderNotePlaceholder}
            accessibilityLabel={strings.cart.orderNoteLabel}
            multiline
          />
        </SectionCard>

        <SectionCard title={strings.cart.total}>
          <TotalRow label={strings.cart.subtotal} value={cart.totals.subtotal} />
          <TotalRow label={strings.cart.tax} value={cart.totals.taxTotal} />
          <View style={styles.grandTotal}>
            <AppText variant="h3">{strings.cart.total}</AppText>
            <AppText variant="h2">{formatCurrency(cart.totals.total)}</AppText>
          </View>
          <AppText variant="caption" style={styles.taxNote}>
            {strings.cart.taxNote}
          </AppText>

          {/* FR-34 — an offer does not change this total, and saying so here
              is the only place a shop would otherwise be misled. */}
          <InlineMessage tone="info" style={styles.note}>
            {strings.cart.offersNote}
          </InlineMessage>
        </SectionCard>

        {/* PRD §8 — warn or block, depending on what the franchise set. */}
        {cart.creditWarning && cart.credit ? (
          <InlineMessage tone="warning">
            {strings.cart.creditWarning(formatCurrency(cart.credit.availableCredit))}
          </InlineMessage>
        ) : null}
        {cart.blockers.includes('creditExceeded') && cart.credit ? (
          <InlineMessage tone="error">
            {strings.cart.creditBlocked(formatCurrency(cart.credit.availableCredit))}
          </InlineMessage>
        ) : null}
        {cart.blockers.includes('belowMoq') ? (
          <InlineMessage tone="error">{strings.cart.belowMoq}</InlineMessage>
        ) : null}

        <AppButton
          label={strings.cart.saveDraft}
          icon="content-save-outline"
          variant="outline"
          onPress={cart.save}
          loading={cart.isSaving}
          disabled={cart.cutoffPassed || cart.lines.length === 0}
        />
        <AppButton
          label={strings.cart.discard}
          icon="trash-can-outline"
          variant="link"
          onPress={() => setConfirmDiscard(true)}
          disabled={cart.isDiscarding}
        />
      </View>
    );

  /* FR-12 — the one action that reaches the kitchen, pinned above the bottom
     inset so it is reachable without scrolling the order to its end. */
  const submitBar =
    cart.lines.length === 0 ? undefined : (
      <View style={styles.submitBar}>
        <AppButton
          label={strings.cart.submit}
          icon="send-outline"
          onPress={() => setConfirmSubmit(true)}
          loading={cart.isSubmitting}
          disabled={!cart.canSubmit}
          accessibilityHint={strings.cart.submitMessage(
            formatCurrency(cart.totals.total),
          )}
        />
        {cart.cutoffPassed ? (
          <AppText variant="caption" color={colors.error} style={styles.submitNote}>
            {strings.cart.cutoffPassed}
          </AppText>
        ) : null}
      </View>
    );

  return (
    <Screen footer={submitBar}>
      <ScreenHeader
        title={strings.cart.title}
        subtitle={strings.cart.subtitle(formatDate(cart.deliveryDate))}
        onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      />

      <FlatList
        data={cart.lines}
        keyExtractor={line => line.productId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          <EmptyState
            icon="cart-outline"
            title={strings.cart.empty}
            message={strings.cart.emptyMessage}
            actionLabel={strings.cart.browse}
            onAction={() => navigation.navigate('ShopCatalogue')}
          />
        }
        renderItem={({ item }) => (
          <CartLineRow
            line={item}
            disabled={cart.cutoffPassed}
            onChangeQuantity={quantity =>
              cart.setLineQuantity(item.productId, quantity)
            }
            onRemove={() => cart.remove(item.productId)}
            onEditNote={() => openNote(item)}
          />
        )}
      />

      <ConfirmDialog
        visible={confirmSubmit}
        title={strings.cart.submitTitle}
        message={strings.cart.submitMessage(formatCurrency(cart.totals.total))}
        confirmLabel={strings.cart.submit}
        loading={cart.isSubmitting}
        onConfirm={() => {
          setConfirmSubmit(false);
          cart.submit();
        }}
        onDismiss={() => setConfirmSubmit(false)}
      />

      <ConfirmDialog
        visible={confirmDiscard}
        title={strings.cart.discardTitle}
        message={strings.cart.discardMessage}
        confirmLabel={strings.cart.discard}
        destructive
        loading={cart.isDiscarding}
        onConfirm={() => {
          setConfirmDiscard(false);
          cart.discard();
        }}
        onDismiss={() => setConfirmDiscard(false)}
      />

      {/* FR-7 — the per-item note. */}
      <ConfirmDialog
        visible={Boolean(noteFor)}
        title={strings.cart.noteLabel}
        message={noteFor?.name ?? ''}
        confirmLabel={strings.common.save}
        onConfirm={commitNote}
        onDismiss={() => setNoteFor(undefined)}
      >
        <LabeledInput
          value={noteDraft}
          onChangeText={setNoteDraft}
          placeholder={strings.cart.notePlaceholder}
          accessibilityLabel={strings.cart.noteLabel}
          multiline
        />
      </ConfirmDialog>
    </Screen>
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

type CartLineRowProps = {
  line: CartLine;
  disabled: boolean;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
  onEditNote: () => void;
};

function CartLineRow({
  line,
  disabled,
  onChangeQuantity,
  onRemove,
  onEditNote,
}: CartLineRowProps) {
  return (
    <View style={styles.line}>
      <View style={styles.lineHeader}>
        <View style={styles.lineTitle}>
          <AppText variant="h3" numberOfLines={2}>
            {line.name}
          </AppText>
          <AppText variant="caption">
            {`${formatCurrency(line.unitPrice)} ${strings.shopCatalogue.perUnit(
              line.unit,
            )}`}
          </AppText>
        </View>
        <AppText variant="h3">
          {formatCurrency(line.unitPrice * line.quantity)}
        </AppText>
      </View>

      {line.note ? (
        <View style={styles.noteRow}>
          <Icon
            name="note-text-outline"
            size={iconSize.sm}
            color={colors.textSecondary}
          />
          <AppText variant="caption" style={styles.noteText}>
            {line.note}
          </AppText>
        </View>
      ) : null}

      <View style={styles.lineActions}>
        <QuantityStepper
          value={line.quantity}
          onChange={onChangeQuantity}
          min={0}
          step={line.packSize}
          disabled={disabled}
          accessibilityLabel={line.name}
          decreaseLabel={`${strings.shortSupply.decrease} ${line.name}`}
          increaseLabel={`${strings.shortSupply.increase} ${line.name}`}
        />
        <View style={styles.lineButtons}>
          <AppButton
            label={line.note ? strings.cart.editNote : strings.cart.addNote}
            variant="link"
            onPress={onEditNote}
          />
          <AppButton
            label={strings.common.delete}
            variant="link"
            onPress={onRemove}
          />
        </View>
      </View>

      {line.moq > 1 ? (
        <AppText variant="caption" color={colors.textMuted}>
          {strings.shopCatalogue.moq(formatNumber(line.moq), line.unit)}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl, gap: spacing.md },
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  repeatRow: { flexDirection: 'row', gap: spacing.sm },
  repeatButton: { flex: 1 },
  line: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  lineHeader: { flexDirection: 'row', gap: spacing.md },
  lineTitle: { flex: 1 },
  noteRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  noteText: { flex: 1 },
  lineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  lineButtons: { flexDirection: 'row', gap: spacing.md },
  footer: { gap: spacing.md, paddingTop: spacing.md },
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
  taxNote: { marginTop: spacing.xs },
  note: { marginTop: spacing.md },
  submitBar: { paddingTop: spacing.sm },
  submitNote: { marginTop: spacing.sm, textAlign: 'center' },
});
