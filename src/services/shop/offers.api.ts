import type { Offer } from '../../types/shop';
import { apiGet, apiGetPaged } from '../api';
import { offerStatusCodec, toOffer, type ApiOffer } from '../mappers';

/**
 * Offers as the shop receives them — FR-34.
 *
 * Endpoints: `/offers`, `/offers/:id`, `/offers/:id/view`.
 *
 * `GET /offers` already scopes itself for a shop owner — the server matches
 * `targetAllShops` or an explicit shop assignment — so this never has to filter
 * for correctness.
 *
 * The half of FR-34 that cannot be honoured: "apply automatically to eligible
 * carts". The order pricer (`buildOrderItems`) writes `discount: 0` on every
 * line and never consults an offer, so no order total the API returns reflects
 * one. Applying a discount client-side would put a number on screen that the
 * invoice will not match. Offers are therefore surfaced as announcements and
 * badges, and the cart says the discount is applied by the franchise at
 * invoicing. See docs/api-gaps.md G20.
 */

/** FR-34 — the offers live for this shop right now. */
export async function getActiveOffers(): Promise<Offer[]> {
  const page = await apiGetPaged<ApiOffer>('/offers', {
    status: offerStatusCodec.toApi('active'),
    page: 1,
    limit: 50,
  });

  return page.items.map(toOffer);
}

/** The offers screen also shows what is coming, so a shop can plan around it. */
export async function getScheduledOffers(): Promise<Offer[]> {
  const page = await apiGetPaged<ApiOffer>('/offers', {
    status: offerStatusCodec.toApi('scheduled'),
    page: 1,
    limit: 50,
  });

  return page.items.map(toOffer);
}

export async function getOffer(offerId: string): Promise<Offer> {
  return toOffer(await apiGet<ApiOffer>(`/offers/${offerId}`));
}

/**
 * FR-35 — the admin's reach figure comes from this being called when a shop
 * actually opens an offer, so it is fired on the detail view rather than on the
 * list render. A failure here is silent: a missed analytics increment must
 * never stop a shop reading its offer.
 */
export async function trackOfferView(offerId: string): Promise<void> {
  try {
    await apiGet(`/offers/${offerId}/view`);
  } catch {
    // Deliberately swallowed — see above.
  }
}
