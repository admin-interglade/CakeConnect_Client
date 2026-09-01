import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { textVariants, type TextVariant } from '../constants';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  /** Overrides the colour baked into the variant. */
  color?: string;
  align?: TextStyle['textAlign'];
};

/**
 * Every string in the auth flow renders through this so the type scale in
 * `constants/typography` is the only place sizes and weights are defined.
 */
export default function AppText({
  variant = 'body',
  color,
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={StyleSheet.flatten([
        textVariants[variant] as TextStyle,
        color ? { color } : null,
        align ? { textAlign: align } : null,
        style,
      ])}
    />
  );
}
