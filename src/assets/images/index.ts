import type { ImageSourcePropType } from 'react-native';

/**
 * Figma image exports.
 *
 * Raster exports only — SVGs need react-native-svg + a Metro transformer,
 * which this project deliberately does not depend on. Export icons as glyphs
 * from MaterialCommunityIcons via `components/Icon` instead.
 */

/** Bakery photograph on the welcome screen (exported as `splashImg.png`). */
export const bakeryHero: ImageSourcePropType = require('./splashImg.png');
