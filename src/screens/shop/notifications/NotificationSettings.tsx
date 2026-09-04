import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import {
  AppText,
  ErrorState,
  InlineMessage,
  LoadingState,
  Screen,
  ScreenHeader,
  SectionCard,
} from '../../../components';
import { colors, spacing, strings } from '../../../constants';
import { useNotificationSettings } from '../../../hooks';
import type {
  NotificationCategory,
  NotificationSetting,
} from '../../../types/shop';

const CATEGORY_ORDER: NotificationCategory[] = [
  'cutoff',
  'financial',
  'order',
  'offer',
];

/**
 * FR-45 — users can mute non-critical categories; financial and cut-off alerts
 * cannot be muted.
 *
 * The critical rows render a locked "Always on" label instead of a switch,
 * rather than a switch that is disabled: a greyed-out control invites tapping
 * and then says nothing about why. The rule is also enforced in the service —
 * the backend would happily accept muting an overdue-payment alert — so this
 * is the explanation, not the mechanism. See docs/api-gaps.md G17.
 */
export default function NotificationSettings() {
  const navigation = useNavigation();
  const { settings, isLoading, isError, error, update, isUpdating } =
    useNotificationSettings();

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.notifications.settingsTitle}
          onBack={navigation.goBack}
        />
        <LoadingState />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.notifications.settingsTitle}
          onBack={navigation.goBack}
        />
        <ErrorState message={error} />
      </Screen>
    );
  }

  const byCategory = CATEGORY_ORDER.map(category => ({
    category,
    rows: settings.filter(setting => setting.category === category),
  })).filter(group => group.rows.length > 0);

  return (
    <Screen>
      <ScreenHeader
        title={strings.notifications.settingsTitle}
        subtitle={strings.notifications.settingsSubtitle}
        onBack={navigation.goBack}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <InlineMessage tone="info">
          {strings.notifications.pushUnavailable}
        </InlineMessage>

        {byCategory.map(group => (
          <SectionCard
            key={group.category}
            title={strings.notifications.categories[group.category]}
          >
            {group.rows.map(setting => (
              <SettingRow
                key={setting.type}
                setting={setting}
                disabled={isUpdating}
                onToggle={push => update(setting.type, { push })}
              />
            ))}
          </SectionCard>
        ))}
      </ScrollView>
    </Screen>
  );
}

function SettingRow({
  setting,
  disabled,
  onToggle,
}: {
  setting: NotificationSetting;
  disabled: boolean;
  onToggle: (push: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <AppText variant="body" style={styles.label}>
        {strings.notifications.types[setting.type]}
      </AppText>

      {setting.muteable ? (
        <Switch
          value={setting.push}
          onValueChange={onToggle}
          disabled={disabled}
          color={colors.primary}
          accessibilityLabel={strings.notifications.types[setting.type]}
        />
      ) : (
        <AppText variant="caption" color={colors.success}>
          {strings.notifications.alwaysOn}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.giant,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  label: { flex: 1 },
});
