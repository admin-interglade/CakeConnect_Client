import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from './AppText';
import { borderRadius, colors, fontSize, imageSize, spacing } from '../constants';

type BrandMarkProps = {
  /** Small uppercase strapline under the wordmark, e.g. "SECURE PORTAL". */
  caption?: string;
  size?: 'sm' | 'md';
  align?: 'center' | 'left';
  style?: ViewStyle;
};

/** The "● CakeConnect" lockup that heads every auth screen. */
export default function BrandMark({
  caption,
  size = 'md',
  align = 'center',
  style,
}: BrandMarkProps) {
  const dot = size === 'sm' ? imageSize.logoDot - 2 : imageSize.logoDot;
  const wordmarkSize = size === 'sm' ? fontSize.xl : fontSize.xxl;

  return (
    <View style={[align === 'center' ? styles.centered : styles.left, style]}>
      <View style={styles.lockup}>
        <View
          style={[
            styles.dot,
            { width: dot, height: dot, borderRadius: dot / 2 },
          ]}
        />
        <AppText variant="brand" style={{ fontSize: wordmarkSize }}>
          CakeConnect
        </AppText>
      </View>

      {caption ? (
        <AppText
          variant="kicker"
          align={align === 'center' ? 'center' : 'left'}
          style={styles.caption}
        >
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center' },
  left: { alignItems: 'flex-start' },
  lockup: { flexDirection: 'row', alignItems: 'center' },
  dot: {
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
    borderRadius: borderRadius.circle,
  },
  caption: { marginTop: spacing.xs },
});
