import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';

import { colors, iconSize } from '../constants';

export type IconProps = {
  /** A MaterialCommunityIcons glyph name, e.g. "fingerprint". */
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

/**
 * Single import site for iconography. Swapping icon families later means
 * changing this file rather than every screen.
 */
export default function Icon({
  name,
  size = iconSize.md,
  color = colors.textPrimary,
  style,
  accessibilityLabel,
}: IconProps) {
  return (
    <MaterialCommunityIcon
      name={name}
      size={size}
      color={color}
      style={style}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
