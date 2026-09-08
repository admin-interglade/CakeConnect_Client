import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppButton,
  AppText,
  Dropdown,
  Icon,
  InlineMessage,
  LabeledInput,
  MultiSelect,
  SectionCard,
  type DropdownOption,
  type MultiSelectOption,
} from '../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import { useProductOptions, useShopOptions } from '../../../hooks';
import {
  MAX_PERCENTAGE_DISCOUNT,
  isValidApiDate,
  isValidBannerUrl,
} from '../../../services/admin';
import { addDays, toApiDate } from '../../../utils/format';
import type { OfferInput } from '../../../types/admin';
import type { DiscountType, Offer } from '../../../types/shop';

type OfferComposerProps = {
  visible: boolean;
  /** Present when editing an existing offer, absent when composing a new one. */
  offer?: Offer;
  submitting: boolean;
  /**
   * Always the full input. In edit mode the caller narrows it to the fields
   * `PATCH /offers/:id` accepts — which is why targeting is read-only there.
   */
  onSubmit: (input: OfferInput) => void;
  onDismiss: () => void;
};

type Draft = {
  title: string;
  description: string;
  bannerUrl: string;
  discountType: DiscountType;
  discountValue: string;
  buyQuantity: string;
  getQuantity: string;
  startDate: string;
  endDate: string;
  targetAllShops: boolean;
  shopIds: string[];
  productIds: string[];
};

type Errors = Partial<Record<keyof Draft, string>>;

/**
 * FR-32, FR-33 — compose an offer, or edit one that already exists.
 *
 * This is not a `ModalForm`: two of the fields are multi-selects and one of the
 * numeric fields is really two, so the shared form's field list cannot describe
 * it. It keeps that component's contract — validate on submit, then live per
 * field — so a half-typed date is not marked wrong while it is being typed.
 *
 * **Editing is narrower than composing, and the screen says so where it
 * matters.** `PATCH /offers/:id` accepts no `productIds`, `shopIds` or
 * `regions`, so in edit mode the targeting and product controls are disabled
 * with the reason attached rather than silently accepting changes that would
 * be dropped on the way to the server (docs/api-gaps.md G25).
 *
 * There is no region control at all, in either mode. `POST /offers` accepts
 * `regions[]` and stores them, but no shop can ever match one, so a picker here
 * would be an affordance that reaches nobody.
 */
export default function OfferComposer({
  visible,
  offer,
  submitting,
  onSubmit,
  onDismiss,
}: OfferComposerProps) {
  const insets = useSafeAreaInsets();
  const isEdit = Boolean(offer);
  const today = toApiDate(new Date());

  const { shops, truncated: shopsTruncated, isLoading: shopsLoading } =
    useShopOptions();
  const {
    products,
    truncated: productsTruncated,
    isLoading: productsLoading,
  } = useProductOptions();

  const [draft, setDraft] = React.useState<Draft>(() => seed(offer, today));
  const [errors, setErrors] = React.useState<Errors>({});
  const [submitted, setSubmitted] = React.useState(false);

  // Re-seed on open, so an abandoned edit never leaks into the next one.
  React.useEffect(() => {
    if (visible) {
      setDraft(seed(offer, today));
      setErrors({});
      setSubmitted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, offer?.id]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);

    if (submitted) {
      setErrors(validate(next));
    }
  };

  const submit = () => {
    setSubmitted(true);
    const found = validate(draft);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      return;
    }

    onSubmit({
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      bannerUrl: draft.bannerUrl.trim() || undefined,
      discountType: draft.discountType,
      // `buyXGetY` carries its terms in the quantities; the endpoint still
      // requires a value, and zero is the only honest one.
      discountValue:
        draft.discountType === 'buyXGetY' ? 0 : Number(draft.discountValue.trim()),
      buyQuantity:
        draft.discountType === 'buyXGetY'
          ? Number(draft.buyQuantity.trim())
          : undefined,
      getQuantity:
        draft.discountType === 'buyXGetY'
          ? Number(draft.getQuantity.trim())
          : undefined,
      startDate: draft.startDate.trim(),
      endDate: draft.endDate.trim(),
      targetAllShops: draft.targetAllShops,
      shopIds: draft.targetAllShops ? [] : draft.shopIds,
      productIds: draft.productIds,
    });
  };

  const discountTypeOptions: DropdownOption<DiscountType>[] = [
    { value: 'percentage', label: strings.adminOffers.discountTypes.percentage },
    { value: 'flat', label: strings.adminOffers.discountTypes.flat },
    { value: 'buyXGetY', label: strings.adminOffers.discountTypes.buyXGetY },
  ];

  const shopOptions: MultiSelectOption[] = shops.map(shop => ({
    value: shop.id,
    label: shop.name,
    meta: shop.code,
  }));

  const productOptions: MultiSelectOption[] = products.map(product => ({
    value: product.id,
    label: product.name,
    meta: product.sku,
  }));

  const startsLater =
    isValidApiDate(draft.startDate) && draft.startDate.trim() > today;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onDismiss}
      presentationStyle="fullScreen"
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <AppText variant="h2" style={styles.headerTitle} numberOfLines={1}>
            {isEdit ? strings.adminOffers.editTitle : strings.adminOffers.composeTitle}
          </AppText>

          <Pressable
            onPress={onDismiss}
            hitSlop={layout.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={strings.common.close}
            style={styles.close}
          >
            <Icon name="close" size={iconSize.lg} color={colors.textSecondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* FR-32 — what the shop reads. */}
            <SectionCard title={strings.adminOffers.termsTitle}>
              <LabeledInput
                label={`${strings.adminOffers.titleLabel} *`}
                value={draft.title}
                onChangeText={value => set('title', value)}
                placeholder={strings.adminOffers.titlePlaceholder}
                error={errors.title}
                containerStyle={styles.field}
              />

              <LabeledInput
                label={strings.adminOffers.descriptionLabel}
                value={draft.description}
                onChangeText={value => set('description', value)}
                placeholder={strings.adminOffers.descriptionPlaceholder}
                multiline
                numberOfLines={3}
                containerStyle={styles.field}
              />

              <LabeledInput
                label={strings.adminOffers.bannerLabel}
                value={draft.bannerUrl}
                onChangeText={value => set('bannerUrl', value)}
                placeholder="https://"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                error={errors.bannerUrl}
                containerStyle={styles.field}
              />
              {errors.bannerUrl ? null : (
                <AppText variant="caption" style={styles.hint}>
                  {strings.adminOffers.bannerHint}
                </AppText>
              )}
            </SectionCard>

            {/* FR-32 — the three discount shapes the backend accepts. */}
            <SectionCard title={strings.adminOffers.discountTypeLabel}>
              <Dropdown
                value={draft.discountType}
                options={discountTypeOptions}
                onChange={value => set('discountType', value)}
                style={styles.field}
              />

              {draft.discountType === 'buyXGetY' ? (
                <View style={styles.row}>
                  <LabeledInput
                    label={`${strings.adminOffers.buyLabel} *`}
                    value={draft.buyQuantity}
                    onChangeText={value => set('buyQuantity', value)}
                    keyboardType="number-pad"
                    error={errors.buyQuantity}
                    containerStyle={styles.rowField}
                  />
                  <LabeledInput
                    label={`${strings.adminOffers.getLabel} *`}
                    value={draft.getQuantity}
                    onChangeText={value => set('getQuantity', value)}
                    keyboardType="number-pad"
                    error={errors.getQuantity}
                    containerStyle={styles.rowField}
                  />
                </View>
              ) : (
                <LabeledInput
                  label={`${
                    draft.discountType === 'percentage'
                      ? strings.adminOffers.percentageLabel
                      : strings.adminOffers.flatLabel
                  } *`}
                  value={draft.discountValue}
                  onChangeText={value => set('discountValue', value)}
                  keyboardType="decimal-pad"
                  error={errors.discountValue}
                  containerStyle={styles.field}
                />
              )}
            </SectionCard>

            {/* FR-33 — the window, and what a start date does and does not do. */}
            <SectionCard title={strings.adminOffers.windowLabel}>
              <View style={styles.row}>
                <LabeledInput
                  label={`${strings.adminOffers.startLabel} *`}
                  value={draft.startDate}
                  onChangeText={value => set('startDate', value)}
                  placeholder={strings.adminOffers.dateHint}
                  autoCapitalize="none"
                  error={errors.startDate}
                  containerStyle={styles.rowField}
                />
                <LabeledInput
                  label={`${strings.adminOffers.endLabel} *`}
                  value={draft.endDate}
                  onChangeText={value => set('endDate', value)}
                  placeholder={strings.adminOffers.dateHint}
                  autoCapitalize="none"
                  error={errors.endDate}
                  containerStyle={styles.rowField}
                />
              </View>

              <InlineMessage tone={startsLater ? 'warning' : 'info'} style={styles.field}>
                {startsLater
                  ? strings.adminOffers.startsLaterNote
                  : strings.adminOffers.startsTodayNote}
              </InlineMessage>
            </SectionCard>

            {/* FR-33 — targeting. Two options, because there are only two. */}
            <SectionCard title={strings.adminOffers.targetingTitle}>
              {isEdit ? (
                <InlineMessage tone="info" style={styles.noticeTop}>
                  {strings.adminOffers.targetingFixed}
                </InlineMessage>
              ) : null}

              <View style={styles.row}>
                <AppButton
                  label={strings.adminOffers.targetAll}
                  variant={draft.targetAllShops ? 'primary' : 'outline'}
                  disabled={isEdit}
                  onPress={() => set('targetAllShops', true)}
                  style={styles.rowField}
                />
                <AppButton
                  label={strings.adminOffers.targetSelected}
                  variant={draft.targetAllShops ? 'outline' : 'primary'}
                  disabled={isEdit}
                  onPress={() => set('targetAllShops', false)}
                  style={styles.rowField}
                />
              </View>

              {!draft.targetAllShops ? (
                <>
                  <MultiSelect
                    label={strings.adminOffers.shopsLabel}
                    values={draft.shopIds}
                    options={shopOptions}
                    onChange={value => set('shopIds', value)}
                    emptyLabel={strings.adminOffers.shopsEmpty}
                    disabled={isEdit}
                    loading={shopsLoading}
                    note={
                      shopsTruncated
                        ? strings.adminOffers.shopsTruncated(shops.length)
                        : undefined
                    }
                    style={styles.field}
                  />
                  {errors.shopIds ? (
                    <InlineMessage tone="error" style={styles.hint}>
                      {errors.shopIds}
                    </InlineMessage>
                  ) : null}
                </>
              ) : null}

              {/* Region targeting is stated as absent rather than left to be
                  looked for: an admin who expects one will otherwise assume it
                  is hidden behind the shop picker. */}
              <InlineMessage tone="warning" style={styles.field}>
                {strings.adminOffers.noRegionTargeting}
              </InlineMessage>
            </SectionCard>

            {/* FR-32 — applicable products. */}
            <SectionCard title={strings.adminOffers.productsLabel}>
              <MultiSelect
                values={draft.productIds}
                options={productOptions}
                onChange={value => set('productIds', value)}
                emptyLabel={strings.adminOffers.productsEmpty}
                title={strings.adminOffers.productsLabel}
                disabled={isEdit}
                loading={productsLoading}
                note={
                  isEdit
                    ? strings.adminOffers.targetingFixed
                    : productsTruncated
                    ? strings.adminOffers.productsTruncated(products.length)
                    : strings.adminOffers.productsHint
                }
              />
            </SectionCard>
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) },
            ]}
          >
            <AppButton
              label={strings.common.cancel}
              onPress={onDismiss}
              variant="outline"
              disabled={submitting}
              style={styles.footerButton}
            />
            <AppButton
              label={
                isEdit ? strings.adminOffers.saveChanges : strings.adminOffers.saveOffer
              }
              onPress={submit}
              loading={submitting}
              style={styles.footerButton}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Draft                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A new offer defaults to a week starting today, which is the shape of nearly
 * every offer in the PRD's examples and is trivially edited when it is not.
 */
function seed(offer: Offer | undefined, today: string): Draft {
  if (!offer) {
    return {
      title: '',
      description: '',
      bannerUrl: '',
      discountType: 'percentage',
      discountValue: '',
      buyQuantity: '',
      getQuantity: '',
      startDate: today,
      endDate: addDays(today, 7),
      targetAllShops: true,
      shopIds: [],
      productIds: [],
    };
  }

  return {
    title: offer.title,
    description: offer.description ?? '',
    bannerUrl: offer.bannerUrl ?? '',
    discountType: offer.discountType,
    discountValue:
      offer.discountType === 'buyXGetY' ? '' : String(offer.discountValue),
    buyQuantity: offer.buyQuantity ? String(offer.buyQuantity) : '',
    getQuantity: offer.getQuantity ? String(offer.getQuantity) : '',
    startDate: offer.startDate,
    endDate: offer.endDate,
    targetAllShops: offer.targetAllShops,
    shopIds: offer.shopIds,
    productIds: offer.productIds,
  };
}

/**
 * The endpoint's own rules, checked before the round trip: `BUY_X_GET_Y`
 * requires both quantities, the end date cannot precede the start, and the
 * banner has to be a URL. Failing these locally turns three possible 400s into
 * three field errors next to the field that caused them.
 *
 * The percentage cap is ours rather than the endpoint's — see
 * `MAX_PERCENTAGE_DISCOUNT`.
 */
function validate(draft: Draft): Errors {
  const errors: Errors = {};
  const { adminOffers, shopDetails } = strings;

  if (!draft.title.trim()) {
    errors.title = shopDetails.errors.required;
  }

  if (!isValidBannerUrl(draft.bannerUrl)) {
    errors.bannerUrl = adminOffers.bannerError;
  }

  if (draft.discountType === 'buyXGetY') {
    if (!isPositiveInteger(draft.buyQuantity)) {
      errors.buyQuantity = adminOffers.quantityError;
    }
    if (!isPositiveInteger(draft.getQuantity)) {
      errors.getQuantity = adminOffers.quantityError;
    }
  } else {
    const value = Number(draft.discountValue.trim());

    if (!draft.discountValue.trim() || Number.isNaN(value) || value < 0) {
      errors.discountValue =
        draft.discountType === 'percentage'
          ? adminOffers.percentageError
          : adminOffers.flatError;
    } else if (
      draft.discountType === 'percentage' &&
      value > MAX_PERCENTAGE_DISCOUNT
    ) {
      errors.discountValue = adminOffers.percentageError;
    }
  }

  if (!isValidApiDate(draft.startDate)) {
    errors.startDate = adminOffers.dateError;
  }
  if (!isValidApiDate(draft.endDate)) {
    errors.endDate = adminOffers.dateError;
  }
  if (
    !errors.startDate &&
    !errors.endDate &&
    draft.endDate.trim() < draft.startDate.trim()
  ) {
    errors.endDate = adminOffers.endBeforeStartError;
  }

  // FR-33 — the backend accepts an offer that names no shops and is not
  // network-wide. It reaches nobody, so it is refused here.
  if (!draft.targetAllShops && draft.shopIds.length === 0) {
    errors.shopIds = adminOffers.shopsError;
  }

  return errors;
}

const isPositiveInteger = (value: string): boolean => {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed >= 1;
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { flex: 1 },
  close: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.circle,
  },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  field: { marginTop: spacing.md },
  hint: { marginTop: spacing.xs },
  noticeTop: { marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  rowField: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: borderWidth.hairline,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  footerButton: { flex: 1 },
});
