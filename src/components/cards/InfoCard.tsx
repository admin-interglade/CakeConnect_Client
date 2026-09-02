import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import {
  borderRadius,
  borderWidth,
  colors,
  elevation,
  spacing,
} from '../../constants';

type InfoCardProps = {
  title: string;
  subtitle?: string;
  /** Avatar, icon or badge rendered to the left of the text block. */
  leading?: React.ReactNode;
  /** Small muted line under the card body. */
  caption?: string;
  tone?: 'default' | 'highlight';
  style?: ViewStyle;
};

/** White card used for the assigned shop and the signed-in user summary. */
export default function InfoCard({
  title,
  subtitle,
  leading,
  caption,
  tone = 'default',
  style,
}: InfoCardProps) {
  return (
    <View>
      <View
        style={[
          styles.card,
          tone === 'highlight' && styles.highlight,
          style,
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}

        <View style={styles.text}>
          <AppText variant="h3" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodySecondary" numberOfLines={2} style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>

      {caption ? (
        <AppText variant="caption" style={styles.caption}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: borderWidth.hairline,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...(elevation.card as object),
  },
  highlight: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  leading: { marginRight: spacing.md },
  text: { flex: 1 },
  subtitle: { marginTop: spacing.xxs },
  caption: { marginTop: spacing.sm },
});
