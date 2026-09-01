/**
 * react-native-vector-icons@10 ships no TypeScript declarations, so we supply
 * our own for the one family the app bundles. Keep this in sync with
 * `iconFontNames` in android/app/build.gradle and UIAppFonts in Info.plist.
 */
declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import type * as React from 'react';
  import type { StyleProp, TextProps, TextStyle } from 'react-native';

  export type IconProps = Omit<TextProps, 'style'> & {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  };

  const Icon: React.ComponentType<IconProps>;
  export default Icon;
}
