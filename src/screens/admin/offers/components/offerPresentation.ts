import { strings } from '../../../../constants';
import type { Offer } from '../../../../types/shop';

/**
 * The short, uppercase label in the pill at the top of an offer card.
 *
 * The design reference puts a category word there — "BULK ORDER", "LIMITED".
 * No such field exists, and a badge reading "LIMITED" on every offer regardless
 * of its terms is decoration rather than information. The discount shape fills
 * the same slot, is the thing the offer is actually about, and is always real.
 */
export function discountBadgeLabel(offer: Offer): string {
  const { badge } = strings.adminOffers;

  switch (offer.discountType) {
    case 'percentage':
      return badge.percentage(String(offer.discountValue));
    case 'flat':
      return badge.flat;
    case 'buyXGetY':
      return badge.buyXGetY(offer.buyQuantity ?? 0, offer.getQuantity ?? 0);
    default:
      return '';
  }
}

/**
 * The line under the card's title, saying who the offer reaches.
 *
 * An offer that names no shops and is not network-wide reaches nobody, and that
 * is said rather than rendered as "0 shops" — see `reachesNoShop`.
 */
export function describeTargeting(offer: Offer): string {
  const { adminOffers } = strings;

  if (offer.targetAllShops) {
    return adminOffers.allShops;
  }
  return offer.shopIds.length > 0
    ? adminOffers.namedShops(offer.shopIds.length)
    : adminOffers.shopsEmpty;
}

/** Whether the offer covers the whole catalogue, or a named set of products. */
export function describeProducts(offer: Offer): string {
  return offer.productIds.length === 0
    ? strings.adminOffers.productsAll
    : strings.adminOffers.productsSome(offer.productIds.length);
}
