import React from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import SearchInput from './SearchInput';
import {
  borderRadius,
  borderWidth,
  colors,
  controlHeight,
  elevation,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../constants';

export type MultiSelectOption = {
  value: string;
  label: string;
  /** Right-aligned hint on the row, e.g. a shop code or an SKU. */
  meta?: string;
};

type MultiSelectProps = {
  label?: string;
  values: string[];
  options: MultiSelectOption[];
  onChange: (values: string[]) => void;
  /** Trigger copy when nothing is selected — say what that *means*, not "none". */
  emptyLabel?: string;
  /** Sheet heading; falls back to the field label. */
  title?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  /** Shown under the trigger while the options are still being fetched. */
  loading?: boolean;
  /** Explains a disabled field, e.g. an endpoint that cannot change this. */
  note?: string;
  style?: ViewStyle;
  testID?: string;
};

/** Above this many chips the summary reads better than the list of names. */
const MAX_CHIPS = 6;

/**
 * Select several of something, from a searchable sheet.
 *
 * The `Dropdown` sheet it is modelled on commits on tap and closes, which is
 * right for one choice and wrong for many: picking eleven shops would mean
 * eleven reopenings. This one edits a draft inside the sheet and commits on
 * Done, so a cancelled sheet leaves the field untouched.
 *
 * Selected values are also drawn as chips under the trigger. A count alone
 * ("11 selected") is not reviewable, and offer targeting is exactly the kind of
 * choice that has to be checked before it is published.
 */
export default function MultiSelect({
  label,
  values,
  options,
  onChange,
  emptyLabel = strings.common.all,
  title,
  searchPlaceholder = strings.common.search,
  disabled = false,
  loading = false,
  note,
  style,
  testID,
}: MultiSelectProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[]>(values);
  const [search, setSearch] = React.useState('');

  // Same reason as `Dropdown`: a sheet on the bottom edge otherwise puts its
  // last row behind the system navigation bar.
  const sheetPadding = Math.max(insets.bottom, spacing.lg) + spacing.sm;

  const selected = options.filter(option => values.includes(option.value));
  // A value with no matching option is still a real selection — an offer can
  // name a shop that has since dropped off the picker's first page — so it is
  // counted even though it cannot be labelled.
  const unlabelled = values.length - selected.length;

  const query = search.trim().toLowerCase();
  const visible = query
    ? options.filter(
        option =>
          option.label.toLowerCase().includes(query) ||
          option.meta?.toLowerCase().includes(query),
      )
    : options;

  const openSheet = () => {
    setDraft(values);
    setSearch('');
    setOpen(true);
  };

  const toggle = (value: string) =>
    setDraft(current =>
      current.includes(value)
        ? current.filter(entry => entry !== value)
        : [...current, value],
    );

  const commit = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <View style={style}>
      {label ? (
        <AppText variant="inputLabel" style={styles.label}>
          {label}
        </AppText>
      ) : null}

      <Pressable
        testID={testID}
        onPress={openSheet}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        accessibilityLabel={`${label ?? ''} ${
          values.length > 0 ? strings.common.selectedCount(values.length) : emptyLabel
        }`.trim()}
        style={({ pressed }) => [
          styles.field,
          disabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <AppText
          variant="body"
          numberOfLines={1}
          color={values.length > 0 ? colors.textPrimary : colors.placeholder}
          style={styles.value}
        >
          {values.length > 0
            ? strings.common.selectedCount(values.length)
            : emptyLabel}
        </AppText>
        <Icon name="chevron-down" size={iconSize.md} color={colors.textSecondary} />
      </Pressable>

      {loading ? (
        <AppText variant="caption" style={styles.note}>
          {strings.common.loading}
        </AppText>
      ) : null}

      {note ? (
        <AppText variant="caption" style={styles.note}>
          {note}
        </AppText>
      ) : null}

      {selected.length > 0 ? (
        <View style={styles.chips}>
          {selected.slice(0, MAX_CHIPS).map(option => (
            <View key={option.value} style={styles.chip}>
              <AppText variant="caption" color={colors.primaryDark} numberOfLines={1}>
                {option.label}
              </AppText>
            </View>
          ))}

          {selected.length > MAX_CHIPS ? (
            <View style={styles.chipMore}>
              <AppText variant="caption" color={colors.textSecondary}>
                {strings.common.andMore(selected.length - MAX_CHIPS)}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {unlabelled > 0 ? (
        <AppText variant="caption" style={styles.note}>
          {strings.common.unlistedSelections(unlabelled)}
        </AppText>
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel={strings.common.close}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: sheetPadding }]}
            onPress={event => event.stopPropagation()}
          >
            <AppText variant="h3" style={styles.sheetTitle}>
              {title ?? label ?? ''}
            </AppText>

            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder={searchPlaceholder}
              style={styles.search}
            />

            <FlatList
              data={visible}
              keyExtractor={option => option.value}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <AppText variant="bodySecondary" style={styles.empty}>
                  {strings.common.noMatches}
                </AppText>
              }
              renderItem={({ item }) => {
                const checked = draft.includes(item.value);

                return (
                  <Pressable
                    onPress={() => toggle(item.value)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    style={({ pressed }) => [
                      styles.option,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Icon
                      name={
                        checked
                          ? 'checkbox-marked-outline'
                          : 'checkbox-blank-outline'
                      }
                      size={iconSize.md}
                      color={checked ? colors.primary : colors.textMuted}
                    />
                    <AppText
                      variant="body"
                      numberOfLines={1}
                      color={checked ? colors.textPrimary : colors.textSecondary}
                      style={styles.optionLabel}
                    >
                      {item.label}
                    </AppText>

                    {item.meta ? (
                      <AppText variant="caption" numberOfLines={1}>
                        {item.meta}
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              }}
            />

            <View style={styles.footer}>
              <AppButton
                label={strings.common.clear}
                variant="outline"
                onPress={() => setDraft([])}
                disabled={draft.length === 0}
                style={styles.footerButton}
              />
              <AppButton
                label={strings.common.done}
                onPress={commit}
                style={styles.footerButton}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: controlHeight.input,
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  disabled: { backgroundColor: colors.surfaceSunken },
  pressed: { opacity: 0.8 },
  value: { flex: 1, marginRight: spacing.sm },
  note: { marginTop: spacing.xs },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  chip: {
    maxWidth: '100%',
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.primarySoft,
  },
  chipMore: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.surfaceSunken,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    maxHeight: '80%',
    ...(elevation.card as object),
  },
  sheetTitle: { marginBottom: spacing.md },
  search: { marginBottom: spacing.sm },
  list: { flexGrow: 0 },
  empty: { paddingVertical: spacing.xl, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  optionLabel: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  footerButton: { flex: 1 },
});
