import { Dimensions, Platform, type ViewStyle } from 'react-native';

import { colors } from './colors';
import { spacing } from './spacing';

const { height: screenHeight } = Dimensions.get('window');

export const screen = {
  height: screenHeight,
  /** Short devices get a shorter hero so the copy below stays visible. */
  isSmall: screenHeight < 700,
} as const;

export const layout = {
  /** Horizontal gutter used by every auth screen. */
  screenPaddingHorizontal: spacing.xxl,
  screenPaddingVertical: spacing.xxl,
  /** Widest a form column is allowed to get on tablets. */
  maxContentWidth: 480,
  /** WCAG / platform minimum tappable area. */
  minTouchTarget: 44,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

export const controlHeight = {
  input: 48,
  button: 52,
  buttonSmall: 40,
  otpBox: 52,
} as const;

export const iconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  /** Fingerprint mark on the biometric screen. */
  hero: 40,
  /** Cake glyph inside the splash badge (48x48 in Figma, optically 36). */
  splashGlyph: 36,
} as const;

export const imageSize = {
  /** Round dot that precedes the "CakeConnect" wordmark. */
  logoDot: 12,
  /** Full lockup height (dot + wordmark) used for vertical rhythm. */
  logoLockupHeight: 32,
  /** Circular badge behind the splash screen cake mark. */
  splashMark: 72,
  /** Welcome screen bakery photograph. */
  heroHeight: screen.isSmall ? 180 : 220,
  /** Circular ring around the tick on the "all set" screen. */
  successRing: 76,
  /** Circular ring around the fingerprint on the biometric screen. */
  biometricRing: 72,
  /** Profile photo avatar in the profile setup form. */
  avatar: 52,
  /** Initials avatar on the login-success card. */
  avatarSmall: 40,
} as const;

export const elevation = {
  none: {
    shadowColor: colors.transparent,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: {},
  }),
} as const;

export default layout;
