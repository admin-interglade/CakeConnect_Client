import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon, Skeleton } from '../../../components';
import {
  borderRadius,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../../constants';
import { formatDuration } from '../../../utils/format';

type CutoffStripProps = {
  /** "22:00" IST. Absent while the effective cut-off is still loading. */
  cutoffTime?: string;
  secondsRemaining: number;
  passed: boolean;
  onPress?: () => void;
};

/** Under half an hour left is worth colouring differently. */
const URGENT_SECONDS = 30 * 60;

/**
 * FR-9 — the applicable cut-off and a live countdown, always visible on the
 * order screen.
 *
 * The same strip is used on the home screen and the cart so the deadline never
 * changes shape as a shop moves between them, and it carries three states
 * rather than two: plenty of time, close to the deadline, and closed. The
 * middle one exists because "2h left" and "6m left" call for different
 * behaviour from whoever is reading it.
 */
export default function CutoffStrip({
  cutoffTime,
  secondsRemaining,
  passed,
  onPress,
}: CutoffStripProps) {
  if (!cutoffTime) {
    return <Skeleton height={72} radius={borderRadius.lg} />;
  }

  const urgent = !passed && secondsRemaining <= URGENT_SECONDS;

  const tone = passed
    ? { background: colors.errorSoft, accent: colors.error }
    : urgent
      ? { background: colors.warningSoft, accent: colors.warning }
      : { background: colors.secondary, accent: colors.textInverse };

  const onDark = !passed && !urgent;

  const body = (
    <View style={[styles.strip, { backgroundColor: tone.background }]}>
      <Icon
        name={passed ? 'lock-clock' : 'timer-outline'}
        size={iconSize.lg}
        color={tone.accent}
      />
      <View style={styles.text}>
        <AppText
          variant="caption"
          color={onDark ? colors.surfaceSunken : colors.textSecondary}
        >
          {strings.cart.cutoffLabel(cutoffTime)}
        </AppText>
        <AppText variant="h2" color={tone.accent} style={styles.value}>
          {passed
            ? strings.cart.cutoffPassed
            : strings.cart.cutoffRemaining(formatDuration(secondsRemaining))}
        </AppText>
        {urgent ? (
          <AppText variant="caption" color={colors.warning}>
            {strings.cart.cutoffSoon}
          </AppText>
        ) : null}
      </View>
      {onPress ? (
        <Icon
          name="chevron-right"
          size={iconSize.md}
          color={onDark ? colors.surfaceSunken : colors.textMuted}
        />
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
      accessibilityLabel={strings.cart.cutoffLabel(cutoffTime)}
      accessibilityHint={strings.cart.title}
      hitSlop={layout.hitSlop}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: layout.minTouchTarget + spacing.lg,
  },
  text: { flex: 1 },
  value: { marginTop: spacing.xxs },
  pressed: { opacity: 0.85 },
});
