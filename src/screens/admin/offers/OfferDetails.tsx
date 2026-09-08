import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  ErrorState,
  Icon,
  InlineMessage,
  LabeledInput,
  Screen,
  ScreenHeader,
  SectionCard,
  SkeletonList,
  StatCard,
} from '../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  spacing,
  strings,
} from '../../../constants';
import { useOfferDetails, useOfferMutations, useProductOptions } from '../../../hooks';
import {
  isOverdueForExpiry,
  isOverdueForPublication,
  reachesNoShop,
} from '../../../services/admin';
import { formatCurrency, formatDate, formatNumber, toApiDate } from '../../../utils/format';
import { describeDiscount } from '../../shop/components/ActiveOfferCard';
import OfferComposer from './OfferComposer';
import OfferBanner from './components/OfferBanner';
import OfferStatusPill from './components/OfferStatusPill';
import { discountBadgeLabel } from './components/offerPresentation';
import type { AdminDashboardStackParamList } from '../../../navigation/types';
import type { OfferInput } from '../../../types/admin';
import type { Offer } from '../../../types/shop';

type Route = RouteProp<AdminDashboardStackParamList, 'OfferDetails'>;

type PendingAction = 'publish' | 'expire' | 'withdraw' | null;

const HERO_HEIGHT = 168;

/**
 * FR-32 to FR-35 — one offer: its terms, who it reaches, what it has done, and
 * the four things an admin can do to it.
 *
 * Laid out to the design reference — hero banner, then the offer's own words,
 * then the products it covers, then its terms — with two departures that the
 * reference could not have anticipated, because it is a shop's view of a live
 * offer and this is the franchise's view of one in any state:
 *
 *   - the status pill and the stranded warnings come first, before the offer
 *     reads as something that is running, because half the offers reaching this
 *     screen are not;
 *   - the reference's single "Order Now" button becomes the action this offer's
 *     state actually calls for, with the rest kept underneath it.
 *
 * Every state change here is one a scheduler would have made on its own if this
 * backend had one. It does not (docs/api-gaps.md G22), so publish and expire
 * are ordinary buttons, and the copy on each says what will and will not happen.
 */
export default function OfferDetails() {
  const navigation = useNavigation();
  const { params } = useRoute<Route>();

  const { offer, isLoading, isError, error, refetch } = useOfferDetails(
    params.offerId,
  );
  const mutations = useOfferMutations();

  const [editing, setEditing] = React.useState(false);
  const [pending, setPending] = React.useState<PendingAction>(null);
  const [withdrawReason, setWithdrawReason] = React.useState('');

  const today = toApiDate(new Date());

  const header = (
    <ScreenHeader
      title={strings.adminOffers.detailTitle}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    />
  );

  if (isError) {
    return (
      <Screen>
        {header}
        <ErrorState message={error} onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading || !offer) {
    return (
      <Screen>
        {header}
        <SkeletonList rows={5} />
      </Screen>
    );
  }

  const overdueForExpiry = isOverdueForExpiry(offer, today);
  const overdueForPublication = isOverdueForPublication(offer, today);
  const targetsNobody = reachesNoShop(offer);

  const confirm = () => {
    const done = { onSuccess: () => setPending(null) };

    if (pending === 'publish') {
      mutations.publish.mutate(offer.id, done);
    } else if (pending === 'expire') {
      mutations.expire.mutate(offer.id, done);
    } else if (pending === 'withdraw') {
      mutations.withdraw.mutate(
        { offerId: offer.id, reason: withdrawReason },
        {
          onSuccess: () => {
            setWithdrawReason('');
            setPending(null);
          },
        },
      );
    }
  };

  /**
   * The edit form is the composer with its targeting controls locked, so the
   * patch is narrowed to what `PATCH /offers/:id` actually accepts. Sending
   * `shopIds` or `productIds` would be silently dropped by the endpoint, which
   * is worse than not offering the control.
   */
  const submitEdit = (input: OfferInput) => {
    mutations.update.mutate(
      {
        offerId: offer.id,
        patch: {
          title: input.title,
          // An empty description or banner is a deliberate clear, so both are
          // sent as empty strings rather than omitted.
          description: input.description ?? '',
          bannerUrl: input.bannerUrl ?? '',
          discountType: input.discountType,
          discountValue: input.discountValue,
          buyQuantity: input.buyQuantity,
          getQuantity: input.getQuantity,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      },
      { onSuccess: () => setEditing(false) },
    );
  };

  return (
    <Screen scrollable>
      {header}

      {/* Hero, as the reference has it — with the status over it, because an
          expired offer that looks live is the one mistake this screen must not
          allow. */}
      <OfferBanner offer={offer} height={HERO_HEIGHT} style={styles.hero}>
        <OfferStatusPill status={offer.status} style={styles.heroStatus} />
      </OfferBanner>

      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <AppText variant="kicker" color={colors.onPrimary}>
            {discountBadgeLabel(offer)}
          </AppText>
        </View>

        {offer.endDate ? (
          <AppText variant="caption" style={styles.validity}>
            {strings.adminOffers.validTill(formatDate(offer.endDate))}
          </AppText>
        ) : null}
      </View>

      <AppText variant="h2" style={styles.title}>
        {offer.title}
      </AppText>

      <AppText variant="h3" color={colors.primaryDark} style={styles.discount}>
        {describeDiscount(offer)}
      </AppText>

      {/* The states nothing will fix on its own. */}
      {overdueForExpiry ? (
        <InlineMessage tone="warning" style={styles.notice}>
          {`${strings.adminOffers.pastEndDate} ${strings.adminOffers.strandedLiveMessage}`}
        </InlineMessage>
      ) : null}

      {overdueForPublication ? (
        <InlineMessage tone="warning" style={styles.notice}>
          {`${strings.adminOffers.startDatePassed} ${strings.adminOffers.strandedScheduledMessage}`}
        </InlineMessage>
      ) : null}

      {targetsNobody ? (
        <InlineMessage tone="error" style={styles.notice}>
          {strings.adminOffers.reachesNobody}
        </InlineMessage>
      ) : null}

      <SectionCard title={strings.adminOffers.descriptionHeading}>
        <AppText
          variant={offer.description ? 'bodySecondary' : 'caption'}
        >
          {offer.description || strings.adminOffers.noDescription}
        </AppText>
      </SectionCard>

      <ApplicableProducts offer={offer} />

      <TermsCard offer={offer} />

      {/* FR-33 — who sees it, and the targeting that does not exist. */}
      <SectionCard title={strings.adminOffers.targetingTitle}>
        <AppText variant="body">
          {offer.targetAllShops
            ? strings.adminOffers.allShops
            : strings.adminOffers.namedShops(offer.shopIds.length)}
        </AppText>

        {offer.regions.length > 0 ? (
          <InlineMessage tone="warning" style={styles.spaced}>
            {`${strings.adminOffers.regionsNamed(offer.regions.length)} ${
              strings.adminOffers.noRegionTargeting
            }`}
          </InlineMessage>
        ) : null}

        <InlineMessage tone="info" style={styles.spaced}>
          {strings.adminOffers.noPublishNotification}
        </InlineMessage>
      </SectionCard>

      {/*
        FR-35 — reach.
        Two figures, drawn as figures rather than as a chart: one of them cannot
        move, and a bar of a constant zero beside a real count reads as a
        comparison between two measurements when only one of them is one.
      */}
      <SectionCard
        title={strings.adminOffers.reachTitle}
        subtitle={strings.adminOffers.reachSubtitle}
      >
        <View style={styles.reachRow}>
          <StatCard
            label={strings.adminOffers.views}
            value={offer.views === undefined ? '—' : formatNumber(offer.views)}
            caption={
              offer.views === undefined ? strings.adminOffers.notReported : undefined
            }
            icon="eye-outline"
            tone="primary"
            style={styles.reachCard}
          />
          <StatCard
            label={strings.adminOffers.redemptions}
            value={
              offer.redemptions === undefined ? '—' : formatNumber(offer.redemptions)
            }
            caption={
              offer.redemptions === undefined
                ? strings.adminOffers.notReported
                : strings.adminOffers.redemptionsCaption
            }
            icon="cart-outline"
            style={styles.reachCard}
          />
        </View>

        <AppText variant="caption" style={styles.spaced}>
          {strings.adminOffers.viewsCaption}
        </AppText>

        <InlineMessage tone="info" style={styles.spaced}>
          {strings.adminOffers.redemptionsAlwaysZero}
        </InlineMessage>

        {offer.views === undefined || offer.redemptions === undefined ? (
          <AppText variant="caption" style={styles.spaced}>
            {strings.adminOffers.notReportedCaption}
          </AppText>
        ) : null}
      </SectionCard>

      {/*
        The reference's single primary button, resolved to the action this
        offer's state calls for. A live offer's headline action is to change it;
        every other state's is to put it live, because nothing else will. Expire
        and withdraw stay outlined — a destructive action does not get to be the
        brightest thing on the screen.
      */}
      <View style={styles.actions}>
        {offer.status === 'active' ? (
          <AppButton
            label={strings.adminOffers.edit}
            icon="pencil-outline"
            onPress={() => setEditing(true)}
            style={styles.primaryAction}
          />
        ) : (
          <AppButton
            label={strings.adminOffers.publishNow}
            icon="broadcast"
            onPress={() => setPending('publish')}
            style={styles.primaryAction}
          />
        )}

        {offer.status === 'active' ? (
          <AppButton
            label={strings.adminOffers.expireNow}
            variant="outline"
            icon="calendar-check-outline"
            onPress={() => setPending('expire')}
            style={styles.action}
          />
        ) : (
          <AppButton
            label={strings.adminOffers.edit}
            variant="outline"
            icon="pencil-outline"
            onPress={() => setEditing(true)}
            style={styles.action}
          />
        )}

        {offer.status === 'active' || offer.status === 'scheduled' ? (
          <AppButton
            label={strings.adminOffers.withdraw}
            variant="outline"
            icon="close-circle-outline"
            onPress={() => setPending('withdraw')}
            style={styles.action}
          />
        ) : null}
      </View>

      <OfferComposer
        visible={editing}
        offer={offer}
        submitting={mutations.update.isPending}
        onSubmit={submitEdit}
        onDismiss={() => setEditing(false)}
      />

      <ConfirmDialog
        visible={pending === 'publish'}
        title={strings.adminOffers.publishTitle}
        message={`${strings.adminOffers.publishMessage} ${strings.adminOffers.noPublishNotification}`}
        confirmLabel={strings.adminOffers.publishNow}
        loading={mutations.publish.isPending}
        onConfirm={confirm}
        onDismiss={() => setPending(null)}
      />

      <ConfirmDialog
        visible={pending === 'expire'}
        title={strings.adminOffers.expireTitle}
        message={strings.adminOffers.expireMessage}
        confirmLabel={strings.adminOffers.expireNow}
        destructive
        loading={mutations.expire.isPending}
        onConfirm={confirm}
        onDismiss={() => setPending(null)}
      />

      <ConfirmDialog
        visible={pending === 'withdraw'}
        title={strings.adminOffers.withdrawTitle}
        message={strings.adminOffers.withdrawMessage}
        confirmLabel={strings.adminOffers.withdraw}
        destructive
        loading={mutations.withdraw.isPending}
        onConfirm={confirm}
        onDismiss={() => {
          setWithdrawReason('');
          setPending(null);
        }}
      >
        <LabeledInput
          label={strings.adminOffers.withdrawReasonLabel}
          value={withdrawReason}
          onChangeText={setWithdrawReason}
          placeholder={strings.adminOffers.withdrawReasonPlaceholder}
          multiline
          numberOfLines={2}
        />
        {/* Said next to the field, not after it is filled in. */}
        <InlineMessage tone="warning" style={styles.spaced}>
          {strings.adminOffers.withdrawReasonNotKept}
        </InlineMessage>
      </ConfirmDialog>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * FR-32 — the products the offer covers, by name and price.
 *
 * The offer carries product **ids** only, so the names come from the catalogue
 * page the picker already holds. An id that is not on that page is counted and
 * said rather than dropped: an offer can outlive a hundred-product window, and
 * a list that quietly showed four of five products would misstate the offer.
 *
 * The prices are base prices. FR-6 gives each shop its own price list, so the
 * number a shop sees is not this one — which is worth saying next to a figure
 * an admin might otherwise read as "what the discount comes off".
 */
function ApplicableProducts({ offer }: { offer: Offer }) {
  const { products, isLoading } = useProductOptions();

  if (offer.productIds.length === 0) {
    return (
      <SectionCard title={strings.adminOffers.applicableProductsHeading}>
        <View style={styles.productRow}>
          <Icon name="tag-multiple-outline" size={iconSize.sm} color={colors.primary} />
          <AppText variant="body" style={styles.productName}>
            {strings.adminOffers.wholeCatalogueRow}
          </AppText>
        </View>
      </SectionCard>
    );
  }

  const named = offer.productIds
    .map(id => products.find(product => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));
  const unresolved = offer.productIds.length - named.length;

  return (
    <SectionCard title={strings.adminOffers.applicableProductsHeading}>
      {isLoading && named.length === 0 ? (
        <SkeletonList rows={2} />
      ) : (
        named.map(product => (
          <View key={product.id} style={styles.productRow}>
            <AppText variant="body" numberOfLines={2} style={styles.productName}>
              {product.name}
            </AppText>
            <AppText variant="body" color={colors.primaryDark}>
              {formatCurrency(product.basePrice)}
            </AppText>
          </View>
        ))
      )}

      {unresolved > 0 && !isLoading ? (
        <AppText variant="caption" color={colors.warning} style={styles.spaced}>
          {strings.adminOffers.productsUnresolved(unresolved)}
        </AppText>
      ) : null}

      {named.length > 0 ? (
        <AppText variant="caption" style={styles.spaced}>
          {strings.adminOffers.basePriceNote}
        </AppText>
      ) : null}
    </SectionCard>
  );
}

/**
 * The reference's "Terms & Conditions" block.
 *
 * There is no terms field on an offer and no endpoint that would carry one, so
 * nothing here is authored: every line is read off the record, plus the one
 * thing about how the discount is actually applied that a franchise owner has
 * to know before publishing (docs/api-gaps.md G20). The card says as much, so
 * it is not mistaken for terms someone wrote and agreed.
 */
function TermsCard({ offer }: { offer: Offer }) {
  const { adminOffers } = strings;

  const terms = [
    adminOffers.termWindow(formatDate(offer.startDate), formatDate(offer.endDate)),
    offer.productIds.length === 0
      ? adminOffers.termProductsAll
      : adminOffers.termProductsSome(offer.productIds.length),
    offer.targetAllShops
      ? adminOffers.termTargetAll
      : offer.shopIds.length > 0
      ? adminOffers.termTargetSome(offer.shopIds.length)
      : adminOffers.termTargetNobody,
    adminOffers.termNotAutoApplied,
  ];

  return (
    <SectionCard title={adminOffers.termsHeading}>
      {terms.map(term => (
        <View key={term} style={styles.termRow}>
          <View style={styles.bullet} />
          <AppText variant="bodySecondary" style={styles.termLabel}>
            {term}
          </AppText>
        </View>
      ))}

      <AppText variant="caption" style={styles.spaced}>
        {adminOffers.termsDerived}
      </AppText>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  hero: { marginBottom: spacing.lg },
  heroStatus: { position: 'absolute', top: spacing.md, right: spacing.md },
  badgeRow: { flexDirection: 'row', alignItems: 'center' },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.xs,
    backgroundColor: colors.primary,
  },
  validity: { flex: 1, marginLeft: spacing.sm, textAlign: 'right' },
  title: { marginTop: spacing.md },
  discount: { marginTop: spacing.xs, marginBottom: spacing.lg },
  notice: { marginBottom: spacing.md },
  spaced: { marginTop: spacing.sm },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: spacing.sm,
    borderBottomWidth: borderWidth.hairline,
    borderBottomColor: colors.divider,
  },
  productName: { flex: 1, marginRight: spacing.md },
  termRow: { flexDirection: 'row', paddingVertical: spacing.xs },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  termLabel: { flex: 1, marginLeft: spacing.md },
  reachRow: { flexDirection: 'row', gap: spacing.md },
  reachCard: { flex: 1 },
  actions: { marginTop: spacing.sm, marginBottom: spacing.xxl },
  primaryAction: { width: '100%' },
  action: { marginTop: spacing.md },
});
