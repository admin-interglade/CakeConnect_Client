/**
 * 4-point spacing scale. Every margin, padding and gap in the app should come
 * from here so vertical rhythm stays consistent.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  giant: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  circle: 9999,
} as const;

export const borderWidth = {
  none: 0,
  hairline: 1,
  thin: 1.5,
  thick: 2,
} as const;

export default spacing;
