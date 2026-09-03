import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  borderWidth,
  colors,
  iconSize,
  spacing,
} from '../../constants';

export type ProgressStep = {
  key: string;
  /** Kept short — six of these share one row on a phone. */
  label: string;
  /** Glyph for the step that is currently in progress. */
  icon?: string;
};

type StepProgressProps = {
  steps: ProgressStep[];
  /** Index of the step in progress; every earlier step reads as complete. */
  currentIndex: number;
  /** Renders the whole track in the error tone, e.g. a cancelled order. */
  failed?: boolean;
  style?: ViewStyle;
};

/**
 * Horizontal stepper for a workflow that always runs in one direction, such as
 * the FR-40 order lifecycle.
 *
 * Complete steps are filled and ticked, the current step is filled in the
 * brand colour, and the rest are hollow — so how far an order has travelled
 * reads in one glance, with the detail left to the dated timeline below.
 */
export default function StepProgress({
  steps,
  currentIndex,
  failed = false,
  style,
}: StepProgressProps) {
  const connectorTone = failed ? colors.error : colors.secondary;

  return (
    <View style={[styles.row, style]} accessibilityRole="progressbar">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        // Only the stages the order actually reached carry the failed tone;
        // the ones it never got to stay hollow.
        const tone = !done && !current
          ? colors.border
          : failed
          ? colors.error
          : done
          ? colors.secondary
          : colors.primary;

        return (
          <View key={step.key} style={styles.step}>
            <View style={styles.markerRow}>
              {/* The connectors live inside the step so the track stays even
                  however many steps are passed in. */}
              <View
                style={[
                  styles.connector,
                  (done || current) && { backgroundColor: connectorTone },
                  // Last, so the ends of the track stay open whatever the tone.
                  index === 0 && styles.connectorHidden,
                ]}
              />

              <View
                style={[
                  styles.marker,
                  { borderColor: tone },
                  (done || current) && { backgroundColor: tone },
                ]}
              >
                <Icon
                  name={done ? 'check' : step.icon ?? 'circle-small'}
                  size={iconSize.sm}
                  color={done || current ? colors.onPrimary : colors.textMuted}
                />
              </View>

              <View
                style={[
                  styles.connector,
                  done && { backgroundColor: connectorTone },
                  index === steps.length - 1 && styles.connectorHidden,
                ]}
              />
            </View>

            <AppText
              variant="caption"
              align="center"
              numberOfLines={1}
              color={done || current ? colors.textPrimary : colors.textMuted}
              style={styles.label}
            >
              {step.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const markerSize = 28;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { flex: 1, alignItems: 'center' },
  markerRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  connector: { flex: 1, height: borderWidth.thick, backgroundColor: colors.border },
  connectorHidden: { backgroundColor: colors.transparent },
  marker: {
    width: markerSize,
    height: markerSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.circle,
    borderWidth: borderWidth.thin,
    backgroundColor: colors.surface,
  },
  label: { marginTop: spacing.xs },
});
