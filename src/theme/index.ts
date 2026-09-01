import { MD3LightTheme, configureFonts, type MD3Theme } from 'react-native-paper';
import { DefaultTheme, type Theme } from '@react-navigation/native';

import { borderRadius, colors, fontFamily, fontWeight } from '../constants';

/**
 * Maps the CakeConnect palette onto React Native Paper's MD3 theme so any
 * Paper component (ActivityIndicator, Snackbar, Dialog, …) picks up brand
 * colours without per-call-site overrides.
 */
export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: borderRadius.md,
  fonts: configureFonts({
    config: {
      fontFamily: fontFamily.regular,
      fontWeight: fontWeight.regular,
      letterSpacing: 0,
      lineHeight: 20,
      fontSize: 15,
    },
  }),
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.primarySoft,
    onPrimaryContainer: colors.primaryDark,
    secondary: colors.secondary,
    onSecondary: colors.onSecondary,
    background: colors.background,
    onBackground: colors.textPrimary,
    surface: colors.surface,
    onSurface: colors.textPrimary,
    surfaceVariant: colors.surfaceSunken,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    outlineVariant: colors.divider,
    error: colors.error,
    onError: colors.onPrimary,
    errorContainer: colors.errorSoft,
    onErrorContainer: colors.error,
    inverseSurface: colors.textPrimary,
    inverseOnSurface: colors.textInverse,
    scrim: colors.scrim,
  },
};

/**
 * Keeps the navigator's own background cream, which stops a white flash
 * between auth screens during the stack transition.
 */
export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.primary,
  },
};
