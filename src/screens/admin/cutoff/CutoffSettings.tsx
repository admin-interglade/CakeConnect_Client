import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

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
  ModalForm,
  Screen,
  ScreenHeader,
  SectionCard,
  SegmentedTabs,
  SkeletonList,
  type DropdownOption,
  type FormField,
  type FormValues,
  type SegmentedTab,
} from '../../../components';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import {
  useCutoffMutations,
  useCutoffResolution,
  useCutoffSettings,
  useSessionOverrides,
  useShopOptions,
  type SessionOverride,
} from '../../../hooks';
import {
  REMINDER_OFFSETS_MINUTES,
  isValidApiDate,
  isValidCutoffTime,
} from '../../../services/admin';
import {
  addDays,
  formatDate,
  formatShortDate,
  formatTime,
  toApiDate,
} from '../../../utils/format';
import type { CutoffLayer, CutoffResolution, Holiday } from '../../../types/admin';

type CutoffTab = 'times' | 'holidays' | 'resolve';

type OverrideForm = 'shop' | 'date' | null;

/**
 * FR-13 to FR-16 — the cut-off an order is racing, and the calendar around it.
 *
 * The screen is built around what this backend can and cannot do, because the
 * gaps are the parts an admin would otherwise get wrong:
 *
 *   - FR-14's per-shop and per-date overrides are write-only. They can be set
 *     and never listed or removed (docs/api-gaps.md G24), so what this session
 *     wrote is shown as exactly that, and every other rung of the ladder reads
 *     "not readable" rather than "not set".
 *   - FR-15's holiday calendar is recorded but not enforced: the backend's
 *     `isHoliday()` returns false unconditionally, so nothing here stops an
 *     order landing on a closed day (G22). The tab says so before it lists one.
 *   - FR-16's reminder intervals have no endpoint and no scheduler behind them,
 *     so the PRD defaults are shown read-only. A control there would write
 *     nowhere and imply reminders are going out.
 *
 * Times are IST throughout, matching every other date in the app (deviation D3).
 */
export default function CutoffSettings() {
  const navigation = useNavigation();

  const [tab, setTab] = React.useState<CutoffTab>('times');
  const [globalForm, setGlobalForm] = React.useState(false);
  const [overrideForm, setOverrideForm] = React.useState<OverrideForm>(null);
  const [holidayForm, setHolidayForm] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<Holiday | null>(null);

  const today = toApiDate(new Date());
  const [resolveShopId, setResolveShopId] = React.useState('');
  const [resolveDate, setResolveDate] = React.useState(today);

  const {
    global,
    holidays,
    isLoading,
    isError,
    error,
    holidaysError,
    refetch,
  } = useCutoffSettings();
  const { shops, truncated, isLoading: shopsLoading } = useShopOptions();
  const session = useSessionOverrides();
  const mutations = useCutoffMutations();

  // The picker defaults to the first shop so the explainer has something to
  // resolve the moment the tab is opened.
  React.useEffect(() => {
    if (!resolveShopId && shops.length > 0) {
      setResolveShopId(shops[0].id);
    }
  }, [resolveShopId, shops]);

  const { resolution } = useCutoffResolution(
    resolveShopId,
    resolveDate,
    global,
    holidays,
  );

  const shopOptions: DropdownOption<string>[] = shops.map(shop => ({
    value: shop.id,
    label: shop.name,
    meta: shop.code,
  }));

  const tabs: SegmentedTab<CutoffTab>[] = [
    { key: 'times', label: strings.cutoff.tabs.times },
    { key: 'holidays', label: strings.cutoff.tabs.holidays, badge: holidays.length },
    { key: 'resolve', label: strings.cutoff.tabs.resolve },
  ];

  /* ---------------------------------------------------------------- forms */

  const timeField = (
    name: string,
    hint: string = strings.cutoff.timeHint,
  ): FormField => ({
    name,
    label: strings.cutoff.timeLabel,
    type: 'text',
    required: true,
    placeholder: '22:00',
    hint,
    validate: value =>
      isValidCutoffTime(value) ? undefined : strings.cutoff.timeError,
  });

  const overrideFields: FormField[] =
    overrideForm === 'shop'
      ? [
          {
            name: 'shopId',
            label: strings.cutoff.shopLabel,
            type: 'select',
            required: true,
            options: shopOptions,
          },
          timeField('cutoffTime', strings.cutoff.overrideHint),
        ]
      : [
          {
            name: 'date',
            label: strings.cutoff.dateLabel,
            type: 'text',
            required: true,
            placeholder: today,
            hint: strings.cutoff.dateHint,
            validate: value =>
              isValidApiDate(value) ? undefined : strings.cutoff.dateError,
          },
          timeField('cutoffTime', strings.cutoff.overrideHint),
        ];

  const holidayFields: FormField[] = [
    {
      name: 'date',
      label: strings.cutoff.dateLabel,
      type: 'text',
      required: true,
      placeholder: today,
      hint: strings.cutoff.dateHint,
      validate: value =>
        isValidApiDate(value) ? undefined : strings.cutoff.dateError,
    },
    {
      name: 'name',
      label: strings.cutoff.holidayNameLabel,
      type: 'text',
      required: true,
      hint: strings.cutoff.holidayNameHint,
    },
    {
      // FR-15 keeps the two decisions apart: marking a date and closing
      // deliveries on it are not the same choice, so this is its own control
      // rather than an implication of adding the holiday.
      name: 'isNonDeliveryDay',
      label: strings.cutoff.deliveriesLabel,
      type: 'select',
      required: true,
      options: [
        { value: 'false', label: strings.cutoff.deliveryDay },
        { value: 'true', label: strings.cutoff.nonDeliveryDay },
      ],
      hint: strings.cutoff.holidayHint,
    },
  ];

  const submitGlobal = (values: FormValues) => {
    mutations.setGlobal.mutate(values.cutoffTime.trim(), {
      onSuccess: () => setGlobalForm(false),
    });
  };

  const submitOverride = (values: FormValues) => {
    const cutoffTime = values.cutoffTime.trim();
    const done = { onSuccess: () => setOverrideForm(null) };

    if (overrideForm === 'shop') {
      mutations.setShopOverride.mutate({ shopId: values.shopId, cutoffTime }, done);
    } else {
      mutations.setDateOverride.mutate({ date: values.date.trim(), cutoffTime }, done);
    }
  };

  const submitHoliday = (values: FormValues) => {
    mutations.createHoliday.mutate(
      {
        date: values.date.trim(),
        name: values.name.trim(),
        isNonDeliveryDay: values.isNonDeliveryDay === 'true',
      },
      { onSuccess: () => setHolidayForm(false) },
    );
  };

  // Split around today: what is still to come is what an admin acts on, and a
  // long tail of past holidays would otherwise push it off the screen.
  const upcomingHolidays = holidays.filter(holiday => holiday.date >= today);
  const pastHolidays = holidays
    .filter(holiday => holiday.date < today)
    .slice()
    .reverse();

  if (isError) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.cutoff.title}
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
        <ErrorState message={error} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <ScreenHeader
        title={strings.cutoff.title}
        subtitle={strings.cutoff.subtitle}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} style={styles.tabs} />

      {isLoading || !global ? (
        <SkeletonList rows={4} />
      ) : tab === 'times' ? (
        <View>
          <SectionCard
            title={strings.cutoff.globalTitle}
            subtitle={strings.cutoff.globalSubtitle}
          >
            <AppText variant="h1">{global.cutoffTime}</AppText>
            <AppText variant="caption" style={styles.spaced}>
              {strings.cutoff.istNote}
            </AppText>

            <InlineMessage
              tone={global.isSet ? 'info' : 'warning'}
              style={styles.spaced}
            >
              {global.isSet
                ? strings.cutoff.globalSet(global.cutoffTime)
                : strings.cutoff.globalUnset(global.cutoffTime)}
            </InlineMessage>

            <AppButton
              label={strings.cutoff.editGlobal}
              onPress={() => setGlobalForm(true)}
              style={styles.action}
            />
          </SectionCard>

          <SectionCard
            title={strings.cutoff.shopTitle}
            subtitle={strings.cutoff.shopSubtitle}
          >
            <SessionOverrideList
              entries={Object.entries(session.shops).map(([shopId, entry]) => ({
                key: shopId,
                label: shops.find(shop => shop.id === shopId)?.name ?? shopId,
                entry,
              }))}
            />
            <AppButton
              label={strings.cutoff.setShopOverride}
              onPress={() => setOverrideForm('shop')}
              disabled={shops.length === 0}
              style={styles.action}
            />
          </SectionCard>

          <SectionCard
            title={strings.cutoff.dateTitle}
            subtitle={strings.cutoff.dateSubtitle}
          >
            <SessionOverrideList
              entries={Object.entries(session.dates).map(([date, entry]) => ({
                key: date,
                label: formatDate(date),
                entry,
              }))}
            />
            <AppButton
              label={strings.cutoff.setDateOverride}
              onPress={() => setOverrideForm('date')}
              style={styles.action}
            />
          </SectionCard>

          <InlineMessage tone="warning" style={styles.notice}>
            {strings.cutoff.overridesWriteOnly}
          </InlineMessage>

          {/* FR-16. Read-only on purpose — see the header comment. */}
          <SectionCard
            title={strings.cutoff.remindersTitle}
            subtitle={strings.cutoff.remindersSubtitle}
          >
            {REMINDER_OFFSETS_MINUTES.map(minutes => (
              <View key={minutes} style={styles.reminderRow}>
                <AppText variant="body">
                  {strings.cutoff.reminderOffset(minutes)}
                </AppText>
              </View>
            ))}

            <InlineMessage tone="warning" style={styles.spaced}>
              {strings.cutoff.remindersNotActive}
            </InlineMessage>
          </SectionCard>
        </View>
      ) : tab === 'holidays' ? (
        <View>
          {/* Stated before the calendar, not under it: an admin who reads this
              list as a set of closures will accept an order for a closed day. */}
          <InlineMessage tone="warning" style={styles.notice}>
            {strings.cutoff.holidaysNotEnforced}
          </InlineMessage>

          {holidaysError ? (
            <InlineMessage tone="error" style={styles.notice}>
              {holidaysError}
            </InlineMessage>
          ) : null}

          <View style={styles.listHeader}>
            <View style={styles.listHeading}>
              <AppText variant="h3">{strings.cutoff.holidaysTitle}</AppText>
              <AppText variant="caption" style={styles.spaced}>
                {strings.cutoff.holidaysSubtitle}
              </AppText>
            </View>

            <AppButton
              label={strings.cutoff.addHoliday}
              icon="plus"
              onPress={() => setHolidayForm(true)}
              style={styles.addHoliday}
            />
          </View>

          {holidays.length === 0 ? (
            <EmptyState
              icon="calendar-blank-outline"
              title={strings.cutoff.holidaysEmpty}
              message={strings.cutoff.holidaysEmptyMessage}
            />
          ) : (
            <>
              {upcomingHolidays.length > 0 ? (
                <AppText variant="kicker" style={styles.sectionLabel}>
                  {strings.cutoff.upcoming}
                </AppText>
              ) : null}
              {upcomingHolidays.map(holiday => (
                <HolidayCard
                  key={holiday.id}
                  holiday={holiday}
                  onRemove={() => setPendingDelete(holiday)}
                />
              ))}

              {pastHolidays.length > 0 ? (
                <AppText variant="kicker" style={styles.sectionLabel}>
                  {strings.cutoff.past}
                </AppText>
              ) : null}
              {pastHolidays.map(holiday => (
                <HolidayCard
                  key={holiday.id}
                  holiday={holiday}
                  isPast
                  onRemove={() => setPendingDelete(holiday)}
                />
              ))}
            </>
          )}
        </View>
      ) : (
        <View>
          <SectionCard
            title={strings.cutoff.resolveTitle}
            subtitle={strings.cutoff.resolveSubtitle}
          >
            {shopsLoading ? (
              <SkeletonList rows={2} />
            ) : shops.length === 0 ? (
              <AppText variant="bodySecondary">{strings.cutoff.noShops}</AppText>
            ) : (
              <>
                <Dropdown
                  label={strings.cutoff.shopLabel}
                  value={resolveShopId}
                  options={shopOptions}
                  onChange={setResolveShopId}
                />
                {truncated ? (
                  <AppText variant="caption" style={styles.spaced}>
                    {strings.cutoff.shopsTruncated(shops.length)}
                  </AppText>
                ) : null}

                <View style={styles.dateRow}>
                  <AppButton
                    label={strings.cutoff.today}
                    variant={resolveDate === today ? 'primary' : 'outline'}
                    onPress={() => setResolveDate(today)}
                    style={styles.dateChip}
                  />
                  <AppButton
                    label={strings.cutoff.tomorrow}
                    variant={
                      resolveDate === addDays(today, 1) ? 'primary' : 'outline'
                    }
                    onPress={() => setResolveDate(addDays(today, 1))}
                    style={styles.dateChip}
                  />
                </View>

                <LabeledInput
                  label={strings.cutoff.customDate}
                  value={resolveDate}
                  onChangeText={setResolveDate}
                  placeholder={strings.cutoff.dateHint}
                  autoCapitalize="none"
                  // Only once the field is long enough to be a date: marking
                  // "2026-09" wrong while it is still being typed is noise.
                  error={
                    resolveDate.trim().length < 10 || isValidApiDate(resolveDate)
                      ? undefined
                      : strings.cutoff.dateError
                  }
                  containerStyle={styles.spaced}
                />
              </>
            )}
          </SectionCard>

          {resolution && isValidApiDate(resolveDate) ? (
            <ResolutionCard resolution={resolution} />
          ) : null}
        </View>
      )}

      <ModalForm
        visible={globalForm}
        title={strings.cutoff.globalFormTitle}
        fields={[timeField('cutoffTime')]}
        initialValues={{ cutoffTime: global?.cutoffTime ?? '' }}
        submitLabel={strings.common.save}
        submitting={mutations.setGlobal.isPending}
        onSubmit={submitGlobal}
        onDismiss={() => setGlobalForm(false)}
      />

      <ModalForm
        visible={overrideForm !== null}
        title={
          overrideForm === 'shop'
            ? strings.cutoff.shopFormTitle
            : strings.cutoff.dateFormTitle
        }
        fields={overrideFields}
        initialValues={
          overrideForm === 'shop'
            ? { shopId: shops[0]?.id ?? '', cutoffTime: global?.cutoffTime ?? '' }
            : {
                date: addDays(today, 1),
                cutoffTime: global?.cutoffTime ?? '',
              }
        }
        submitLabel={strings.common.save}
        submitting={
          mutations.setShopOverride.isPending || mutations.setDateOverride.isPending
        }
        onSubmit={submitOverride}
        onDismiss={() => setOverrideForm(null)}
      />

      <ModalForm
        visible={holidayForm}
        title={strings.cutoff.holidayFormTitle}
        fields={holidayFields}
        initialValues={{
          date: addDays(today, 1),
          name: '',
          isNonDeliveryDay: 'false',
        }}
        submitLabel={strings.common.save}
        submitting={mutations.createHoliday.isPending}
        onSubmit={submitHoliday}
        onDismiss={() => setHolidayForm(false)}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title={strings.cutoff.deleteHolidayTitle}
        message={strings.cutoff.deleteHolidayMessage(pendingDelete?.name ?? '')}
        confirmLabel={strings.cutoff.remove}
        destructive
        loading={mutations.removeHoliday.isPending}
        onConfirm={() => {
          if (pendingDelete) {
            mutations.removeHoliday.mutate(pendingDelete.id, {
              onSuccess: () => setPendingDelete(null),
            });
          }
        }}
        onDismiss={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * What this session wrote to an override endpoint. Shown under the control that
 * wrote it, because it is the only record of it there will be: nothing lists
 * these back, and closing the app forgets them (docs/api-gaps.md G24).
 */
function SessionOverrideList({
  entries,
}: {
  entries: { key: string; label: string; entry: SessionOverride }[];
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.sessionList}>
      {entries.map(({ key, label, entry }) => (
        <View key={key} style={styles.sessionRow}>
          <AppText variant="body" style={styles.sessionLabel}>
            {label}
          </AppText>
          <AppText variant="body">{entry.cutoffTime}</AppText>
          <AppText variant="caption" style={styles.sessionTime}>
            {formatTime(entry.savedAt)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * One entry in the FR-15 calendar.
 *
 * The date leads, as a tile, because that is what an admin scans for; the
 * delivery flag sits under the name as its own pill rather than being implied
 * by the entry existing, which is the distinction FR-15 draws. A past entry is
 * muted rather than hidden — it is still a row the backend holds, and removing
 * it is still the only way to be rid of it.
 */
function HolidayCard({
  holiday,
  isPast = false,
  onRemove,
}: {
  holiday: Holiday;
  isPast?: boolean;
  onRemove: () => void;
}) {
  // Split from the formatted date rather than re-deriving it, so the tile stays
  // in IST with every other date in the app (deviation D3).
  const [day, month, year] = formatDate(holiday.date).split(' ');
  const closed = holiday.isNonDeliveryDay;

  return (
    <View style={[styles.holidayCard, isPast && styles.holidayCardPast]}>
      <View style={[styles.dateTile, isPast && styles.dateTilePast]}>
        <AppText variant="h2" color={isPast ? colors.textSecondary : colors.primary}>
          {day}
        </AppText>
        <AppText variant="kicker" color={isPast ? colors.textMuted : colors.primary}>
          {month}
        </AppText>
      </View>

      <View style={styles.holidayText}>
        <View style={styles.holidayTitleRow}>
          <AppText
            variant="h3"
            numberOfLines={2}
            color={isPast ? colors.textSecondary : colors.textPrimary}
            style={styles.holidayName}
          >
            {holiday.name}
          </AppText>

          {/* Compact and cornered rather than a footer row of its own: the card
              is a calendar entry, and removing one is the rarer job. The visual
              is small, so `hitSlop` carries the 44pt touch target. */}
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`${strings.cutoff.remove} ${holiday.name}`}
            hitSlop={layout.hitSlop}
            style={({ pressed }) => [styles.removeAction, pressed && styles.pressed]}
          >
            <Icon name="trash-can-outline" size={iconSize.xs} color={colors.error} />
            <AppText
              variant="caption"
              color={colors.error}
              style={styles.removeLabel}
            >
              {strings.cutoff.remove}
            </AppText>
          </Pressable>
        </View>

        <AppText variant="caption" style={styles.holidayDate}>
          {`${formatShortDate(holiday.date)} ${year}`}
        </AppText>

        <View style={[styles.pill, closed ? styles.pillClosed : styles.pillOpen]}>
          <Icon
            name={closed ? 'calendar-remove-outline' : 'calendar-check-outline'}
            size={iconSize.xs}
            color={closed ? colors.warning : colors.success}
          />
          <AppText
            variant="caption"
            color={closed ? colors.warning : colors.success}
            style={styles.pillLabel}
          >
            {closed ? strings.cutoff.nonDeliveryDay : strings.cutoff.deliveryDay}
          </AppText>
        </View>
      </View>
    </View>
  );
}

/** FR-14's ladder, resolved for the chosen shop and date. */
function ResolutionCard({ resolution }: { resolution: CutoffResolution }) {
  const { cutoff } = strings;

  return (
    <SectionCard
      title={cutoff.resolvedTitle(resolution.cutoffTime)}
      subtitle={cutoff.fromSource(cutoff.sources[resolution.source])}
    >
      <InlineMessage tone={resolution.serverConfirmed ? 'success' : 'info'}>
        {resolution.serverConfirmed ? cutoff.resolvedServer : cutoff.resolvedLocal}
      </InlineMessage>

      {resolution.uncertain ? (
        <InlineMessage tone="warning" style={styles.spaced}>
          {cutoff.resolvedUncertain}
        </InlineMessage>
      ) : null}

      {resolution.source === 'unattributed' ? (
        <InlineMessage tone="warning" style={styles.spaced}>
          {cutoff.unattributedNote}
        </InlineMessage>
      ) : null}

      <View style={styles.ladder}>
        {resolution.layers.map(layer => (
          <LayerRow key={layer.source} layer={layer} />
        ))}
      </View>

      {resolution.holiday ? (
        <InlineMessage
          tone={resolution.holiday.isNonDeliveryDay ? 'warning' : 'info'}
          style={styles.spaced}
        >
          {`${cutoff.holidayOnDate(resolution.holiday.name)}${
            resolution.holiday.isNonDeliveryDay
              ? ` ${cutoff.holidayNonDelivery}`
              : ''
          }`}
        </InlineMessage>
      ) : null}
    </SectionCard>
  );
}

function LayerRow({ layer }: { layer: CutoffLayer }) {
  const { cutoff } = strings;

  const note =
    layer.state === 'unknown'
      ? cutoff.layerUnknown
      : layer.origin === 'session' && layer.savedAt
      ? cutoff.layerSession(formatTime(layer.savedAt))
      : layer.origin === 'prd'
      ? cutoff.layerPrd
      : undefined;

  return (
    <View style={styles.layerRow}>
      <View style={styles.layerHead}>
        <AppText
          variant="body"
          color={layer.state === 'applies' ? colors.textPrimary : colors.textSecondary}
        >
          {cutoff.sources[layer.source]}
        </AppText>
        <AppText
          variant="caption"
          color={
            layer.state === 'applies'
              ? colors.success
              : layer.state === 'unknown'
              ? colors.warning
              : colors.textMuted
          }
        >
          {`${cutoff.layerStates[layer.state]}${
            layer.cutoffTime ? ` · ${layer.cutoffTime}` : ''
          }`}
        </AppText>
      </View>

      {note ? <AppText variant="caption">{note}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { marginBottom: spacing.md },
  spaced: { marginTop: spacing.sm },
  action: { marginTop: spacing.lg },
  notice: { marginBottom: spacing.lg },
  reminderRow: { paddingVertical: spacing.xs },
  sessionList: { marginTop: spacing.xs },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sessionLabel: { flex: 1 },
  sessionTime: { marginLeft: spacing.sm },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  listHeading: { flex: 1, marginRight: spacing.md },
  addHoliday: { minWidth: 140 },
  sectionLabel: { marginTop: spacing.xs, marginBottom: spacing.sm },
  holidayCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...(elevation.card as object),
  },
  holidayCardPast: {
    backgroundColor: colors.surfaceMuted,
    ...(elevation.none as object),
  },
  dateTile: {
    width: 58,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primarySoft,
    marginRight: spacing.lg,
  },
  dateTilePast: { backgroundColor: colors.surfaceSunken },
  holidayText: { flex: 1 },
  holidayTitleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  holidayName: { flex: 1, marginRight: spacing.sm },
  holidayDate: { marginTop: spacing.xxs },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.circle,
  },
  pillClosed: { backgroundColor: colors.warningSoft },
  pillOpen: { backgroundColor: colors.successSoft },
  pillLabel: { marginLeft: spacing.xs },
  removeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.circle,
    borderWidth: borderWidth.hairline,
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  removeLabel: { marginLeft: spacing.xs },
  pressed: { opacity: 0.7 },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  dateChip: { flex: 1 },
  ladder: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  layerRow: { paddingVertical: spacing.sm },
  layerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
