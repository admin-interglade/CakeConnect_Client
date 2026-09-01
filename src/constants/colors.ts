/**
 * CakeConnect colour palette.
 *
 * Derived from the Figma auth flow (warm bakery cream + brick terracotta).
 * This is the single source of truth for colour in the app — screens and
 * components must never hard-code a hex value.
 */

export const palette = {
  // Brand terracotta / brick — primary actions, logo, links.
  // brick500 is taken from the stroke of the supplied cake.svg, so it is the
  // authoritative brand value; the rest of the ramp is derived from it.
  brick50: '#FBF3EF',
  brick100: '#F5E6DE',
  brick200: '#EAC9BB',
  brick400: '#CE7A56',
  brick500: '#B94A1E',
  brick600: '#9D3F1A',
  brick700: '#823415',

  // Warm cream neutrals — app background and surfaces.
  cream50: '#FFFFFF',
  cream100: '#FDF9F2',
  cream200: '#FAF4EA',
  cream300: '#F3EADC',
  cream400: '#E6D9C9',
  cream500: '#D8C8B4',

  // Cocoa neutrals — text.
  cocoa300: '#A2968D',
  cocoa400: '#8A7E75',
  cocoa500: '#7A6E66',
  cocoa700: '#4A403A',
  cocoa900: '#2B2320',

  // Status.
  green100: '#E4F4EA',
  green500: '#2FA05A',
  red100: '#FBE6E2',
  red500: '#D93B2B',
  amber100: '#FCF0DA',
  amber500: '#C88A16',

  transparent: 'transparent',
} as const;

export const colors = {
  /** Primary brand colour — buttons, logo dot, links. */
  primary: palette.brick500,
  primaryPressed: palette.brick600,
  primaryDark: palette.brick700,
  primaryDisabled: palette.brick200,
  /** Tinted primary background — badges, soft callouts. */
  primarySoft: palette.brick100,
  onPrimary: palette.cream50,

  /** Secondary — outlined buttons and low-emphasis actions. */
  secondary: palette.cocoa700,
  onSecondary: palette.cream50,

  /** Screen background. */
  background: palette.cream200,
  /** Raised surfaces: inputs, cards, sheets. */
  surface: palette.cream50,
  surfaceMuted: palette.cream100,
  surfaceSunken: palette.cream300,

  /** Text. */
  textPrimary: palette.cocoa900,
  textSecondary: palette.cocoa500,
  textMuted: palette.cocoa300,
  textInverse: palette.cream50,
  /** Uppercase field labels above inputs. */
  textLabel: palette.cocoa700,
  placeholder: palette.cocoa300,

  /** Borders and dividers. */
  border: palette.cream400,
  borderStrong: palette.cream500,
  borderFocus: palette.brick500,
  divider: palette.cream300,

  /** Status. */
  error: palette.red500,
  errorSoft: palette.red100,
  success: palette.green500,
  successSoft: palette.green100,
  warning: palette.amber500,
  warningSoft: palette.amber100,

  /** Misc. */
  scrim: 'rgba(43, 35, 32, 0.45)',
  shadow: '#2B2320',
  transparent: palette.transparent,
} as const;

export type ColorToken = keyof typeof colors;

export default colors;
