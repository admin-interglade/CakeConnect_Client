import { Platform, type TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Type scale for the CakeConnect auth flow.
 *
 * The Figma file uses the platform UI font (SF Pro on iOS, Roboto on Android).
 * If a brand face is added later, change `fontFamily` here only.
 */
export const fontFamily = {
  regular: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  medium: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  bold: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
} as const;

export const fontSize = {
  xxs: 9,
  xs: 11,
  sm: 12,
  md: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const satisfies Record<string, TextStyle['fontWeight']>;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.45,
  relaxed: 1.6,
} as const;

export const letterSpacing = {
  tighter: -0.4,
  tight: -0.2,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

/**
 * Ready-made text styles. Prefer these over assembling sizes by hand so the
 * flow stays visually consistent across the seven auth screens.
 */
export const textVariants = {
  /** "CakeConnect" wordmark. */
  brand: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: Math.round(fontSize.xxl * lineHeight.tight),
    color: colors.textPrimary,
  },
  /** Small uppercase strapline under the wordmark, e.g. "SECURE PORTAL". */
  kicker: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.widest,
    lineHeight: Math.round(fontSize.xxs * lineHeight.normal),
    color: colors.primary,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: Math.round(fontSize.xxl * lineHeight.snug),
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.xl * lineHeight.snug),
    color: colors.textPrimary,
  },
  h3: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.lg * lineHeight.snug),
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.base * lineHeight.normal),
    color: colors.textPrimary,
  },
  bodySecondary: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.md * lineHeight.relaxed),
    color: colors.textSecondary,
  },
  /** Uppercase label sitting above a text field. */
  inputLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wider,
    lineHeight: Math.round(fontSize.xs * lineHeight.normal),
    color: colors.textLabel,
    textTransform: 'uppercase',
  },
  input: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.base * lineHeight.snug),
    color: colors.textPrimary,
  },
  button: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.normal,
    lineHeight: Math.round(fontSize.base * lineHeight.snug),
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.regular,
    lineHeight: Math.round(fontSize.sm * lineHeight.normal),
    color: colors.textMuted,
  },
  link: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.md * lineHeight.normal),
    color: colors.primary,
  },
  /** Digits inside the OTP boxes. */
  otpDigit: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize.xl * lineHeight.tight),
    color: colors.textPrimary,
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariants;

export const typography = {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textVariants,
} as const;

export default typography;
