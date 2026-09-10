import type { CartLine, Offer } from '../types/shop';

export type OfferPricing = {
  discount: number;
  eligible: boolean;
};

export function isOfferActive(offer: Offer, date = new Date()): boolean {
  const day = date.toISOString().slice(0, 10);
  return offer.status === 'active' && offer.startDate <= day && offer.endDate >= day;
}

export function offerMatchesCart(offer: Offer, lines: CartLine[]): boolean {
  if (!isOfferActive(offer) || lines.length === 0) {
    return false;
  }

  return lines.some(line =>
    offer.productIds.length === 0 || offer.productIds.includes(line.productId),
  );
}

export function calculateOfferPricing(
  offer: Offer,
  lines: CartLine[],
): OfferPricing {
  if (!offerMatchesCart(offer, lines)) {
    return { discount: 0, eligible: false };
  }

  const eligibleLines = lines.filter(
    line => offer.productIds.length === 0 || offer.productIds.includes(line.productId),
  );
  const eligibleSubtotal = eligibleLines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );

  let discount = 0;
  switch (offer.discountType) {
    case 'percentage':
      discount = eligibleSubtotal * (offer.discountValue / 100);
      break;
    case 'flat':
      discount = offer.discountValue;
      break;
    case 'buyXGetY': {
      const buy = Math.max(offer.buyQuantity ?? 0, 0);
      const get = Math.max(offer.getQuantity ?? 0, 0);
      const bundle = buy + get;
      if (bundle > 0 && get > 0) {
        discount = eligibleLines.reduce((sum, line) => {
          const freeUnits = Math.floor(line.quantity / bundle) * get;
          return sum + freeUnits * line.unitPrice;
        }, 0);
      }
      break;
    }
  }

  return {
    discount: Math.min(Math.max(discount, 0), eligibleSubtotal),
    eligible: discount > 0,
  };
}

export function findBestOffer(offers: Offer[], lines: CartLine[]): Offer | undefined {
  return offers
    .filter(offer => offerMatchesCart(offer, lines))
    .sort(
      (left, right) =>
        calculateOfferPricing(right, lines).discount -
        calculateOfferPricing(left, lines).discount,
    )[0];
}
