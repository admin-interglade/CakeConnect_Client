import React from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Icon from './Icon';

import AppText from './AppText';
import { borderRadius, colors, iconSize, imageSize } from '../../constants';

type AvatarProps = {
  /** Falls back to initials, then to a generic person glyph. */
  source?: ImageSourcePropType | null;
  name?: string;
  size?: number;
  backgroundColor?: string;
};

const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

export default function Avatar({
  source,
  name,
  size = imageSize.avatar,
  backgroundColor = colors.primarySoft,
}: AvatarProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (source) {
    return <Image source={source} style={[styles.base, shape]} accessibilityRole="image" />;
  }

  const initials = name ? initialsOf(name) : '';

  return (
    <View style={[styles.base, styles.fallback, shape, { backgroundColor }]}>
      {initials ? (
        <AppText
          variant="h3"
          color={colors.primaryDark}
          style={{ fontSize: Math.round(size * 0.34) }}
        >
          {initials}
        </AppText>
      ) : (
        <Icon
          name="account-outline"
          size={Math.max(iconSize.md, Math.round(size * 0.5))}
          color={colors.textMuted}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: borderRadius.circle, backgroundColor: colors.surfaceSunken },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
