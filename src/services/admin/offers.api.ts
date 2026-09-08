import type { Offer } from '../../types/shop';
import type {
  OfferFilters,
  OfferInput,
  OfferUpdate,
  Paginated,
  Pagination,
} from '../../types/admin';
import { apiGet, apiGetPaged, apiPatch, apiPost } from '../api';
import { discountTypeCodec, offerStatusCodec, toOffer, type ApiOffer } from '../mappers';
import { toApiDate } from '../../utils/format';

/**
 * Offer authoring — FR-32 to FR-35.
 *
 * Endpoints: `/offers`, `/offers/:id`, `/offers/:id/withdraw`.
 *
 * The published record itself is the shop surface's `Offer`, mapped by the same
 * `toOffer`: an offer the admin writes and an offer a shop reads are one row,
 * and modelling them twice is how the two drift apart. Only the write shapes
 * live here.
 *
 * Four things this backend does not do, each of which the authoring screen
 * states rather than papers over (docs/api-gaps.md G25):
 *
 *   - **Nothing ever changes an offer's status on its own.** There is no
 *     scheduler (G22), so an offer created with a future start date sits at
 *     `SCHEDULED` until an admin publishes it, and an offer past its end date
 *     stays `ACTIVE` — still on every targeted shop's home screen — until an
 *     admin expires it. `publishOffer` and `expireOffer` are that admin action.
 *   - **Region targeting reaches nobody.** `POST /offers` accepts `regions[]`
 *     and stores them, but `Shop` has no region column and the list query
 *     matches only `targetAllShops` or an explicit shop row (G6). This module
 *     therefore never sends `regions`.
 *   - **`PATCH /offers/:id` cannot change targeting.** Its schema has no
 *     `productIds`, `shopIds` or `regions`, so who an offer reaches and which
 *     products it covers are fixed the moment it is created.
 *   - **The withdrawal reason is discarded.** The endpoint accepts `reason`,
 *     the service takes it as an argument and never writes it, and the audit
 *     log records only the offer row before and after. It is sent anyway — it
 *     costs nothing and lands the day a column exists — but nothing can read it
 *     back, and the screen says so before an admin types one.
 */

/** One page of offers; the list is short enough that ten rows read well. */
export const OFFER_PAGE_LIMIT = 10;

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * FR-32 — every offer, most recently edited first (the endpoint orders by
 * `updatedAt`).
 *
 * Unlike the shop's `getActiveOffers` this is unscoped: an admin token sees
 * every offer regardless of targeting, which is what an authoring list needs.
 */
export async function getOffers(
  filters: OfferFilters,
  pagination: Pagination,
): Promise<Paginated<Offer>> {
  const page = await apiGetPaged<ApiOffer>('/offers', {
    page: pagination.page,
    limit: pagination.limit,
    ...(filters.status !== 'all'
      ? { status: offerStatusCodec.toApi(filters.status) }
      : {}),
  });

  return { ...page, items: page.items.map(toOffer) };
}

/**
 * One offer in full.
 *
 * Named apart from the shop surface's `getOffer` deliberately: the two barrels
 * are separate, but a screen that ends up importing both should not have to
 * work out which one it got.
 */
export async function getOfferById(offerId: string): Promise<Offer> {
  return toOffer(await apiGet<ApiOffer>(`/offers/${offerId}`));
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Dates cross the wire as instants, and the mapper reads them back by slicing
 * the first ten characters off the ISO string. Framing the window in UTC is
 * therefore the only choice that round-trips: an IST midnight would be stored
 * as 18:30 the previous day and read back as the wrong date entirely.
 *
 * The end of the window is the last millisecond of its day rather than its
 * midnight, so a one-day offer lasts a day instead of an instant.
 */
const startOfDay = (apiDate: string): string => `${apiDate}T00:00:00.000Z`;
const endOfDay = (apiDate: string): string => `${apiDate}T23:59:59.999Z`;

/**
 * FR-32, FR-33 — `POST /offers`.
 *
 * The status is decided here and sent explicitly rather than left to the
 * endpoint, which infers it by comparing the window against the server clock.
 * That comparison disagrees with the admin for the first five and a half hours
 * of every IST day — an offer starting "today" would be created `SCHEDULED`,
 * and nothing would ever publish it. Sending the intent removes the ambiguity.
 */
export async function createOffer(input: OfferInput): Promise<Offer> {
  const startsInFuture = input.startDate > toApiDate(new Date());

  const created = await apiPost<ApiOffer>('/offers', {
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    ...(input.bannerUrl ? { bannerUrl: input.bannerUrl } : {}),
    discountType: discountTypeCodec.toApi(input.discountType),
    discountValue: input.discountValue,
    ...(input.discountType === 'buyXGetY'
      ? { buyQuantity: input.buyQuantity, getQuantity: input.getQuantity }
      : {}),
    startDate: startOfDay(input.startDate),
    endDate: endOfDay(input.endDate),
    status: offerStatusCodec.toApi(startsInFuture ? 'scheduled' : 'active'),
    targetAllShops: input.targetAllShops,
    // Only sent when the offer names shops: an empty array on a network-wide
    // offer creates no rows either way, but reads in the request as "nobody".
    ...(!input.targetAllShops && input.shopIds.length > 0
      ? { shopIds: input.shopIds }
      : {}),
    ...(input.productIds.length > 0 ? { productIds: input.productIds } : {}),
    // `regions` is deliberately never sent — see the module header.
  });

  return toOffer(created);
}

/**
 * FR-32 — `PATCH /offers/:id`. Only the fields the endpoint accepts; targeting
 * and the product list are not among them.
 */
export async function updateOffer(
  offerId: string,
  patch: OfferUpdate,
): Promise<Offer> {
  const updated = await apiPatch<ApiOffer>(`/offers/${offerId}`, {
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    // An empty string is the endpoint's own way of clearing the banner, so it
    // is passed through rather than dropped as falsy.
    ...(patch.bannerUrl !== undefined ? { bannerUrl: patch.bannerUrl } : {}),
    ...(patch.discountType !== undefined
      ? { discountType: discountTypeCodec.toApi(patch.discountType) }
      : {}),
    ...(patch.discountValue !== undefined
      ? { discountValue: patch.discountValue }
      : {}),
    ...(patch.buyQuantity !== undefined ? { buyQuantity: patch.buyQuantity } : {}),
    ...(patch.getQuantity !== undefined ? { getQuantity: patch.getQuantity } : {}),
    ...(patch.startDate !== undefined
      ? { startDate: startOfDay(patch.startDate) }
      : {}),
    ...(patch.endDate !== undefined ? { endDate: endOfDay(patch.endDate) } : {}),
    ...(patch.status !== undefined
      ? { status: offerStatusCodec.toApi(patch.status) }
      : {}),
  });

  return toOffer(updated);
}

/**
 * FR-33 — put a scheduled offer live now.
 *
 * This is not a convenience. Nothing on the backend flips an offer to `ACTIVE`
 * when its start date arrives, so without this an offer scheduled for Monday is
 * still invisible to every shop on Tuesday.
 */
export async function publishOffer(offerId: string): Promise<Offer> {
  return updateOffer(offerId, { status: 'active' });
}

/**
 * FR-35 — end an offer that has run its course.
 *
 * Also not a convenience: nothing marks an offer `EXPIRED` at its end date, and
 * the shop's own list asks for `status=ACTIVE`, so an offer left alone stays on
 * every targeted shop's home screen indefinitely.
 */
export async function expireOffer(offerId: string): Promise<Offer> {
  return updateOffer(offerId, { status: 'expired' });
}

/**
 * FR-35 — `POST /offers/:id/withdraw`. Pulls the offer immediately.
 *
 * The reason is sent and then lost; see the module header. Withdrawal is kept
 * apart from expiry because they are different admissions: one says the offer
 * ran its course, the other says it was pulled.
 */
export async function withdrawOffer(
  offerId: string,
  reason?: string,
): Promise<Offer> {
  const withdrawn = await apiPost<ApiOffer>(`/offers/${offerId}/withdraw`, {
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  });

  return toOffer(withdrawn);
}

/* -------------------------------------------------------------------------- */
/* Validation — the endpoint's own rules, checked before the round trip         */
/* -------------------------------------------------------------------------- */

/** `bannerUrl` is validated as a URL server-side, so a bare path 400s. */
export function isValidBannerUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * A percentage over 100 is not rejected by the endpoint — this cap is ours. It
 * is a typo guard rather than a backend rule: "50" typed as "500" would
 * otherwise be published to the whole network.
 */
export const MAX_PERCENTAGE_DISCOUNT = 100;

/* -------------------------------------------------------------------------- */
/* Derived — the state the missing scheduler would have maintained             */
/* -------------------------------------------------------------------------- */

/**
 * An offer that says it is live and whose window has closed.
 *
 * This is the state that actually costs something: the shop app lists
 * `status=ACTIVE` offers, so one of these is still being announced to every
 * targeted shop on terms the franchise stopped honouring. Only an admin can end
 * it (G22), so the list surfaces it rather than waiting to be asked.
 */
export function isOverdueForExpiry(
  offer: Offer,
  today = toApiDate(new Date()),
): boolean {
  return offer.status === 'active' && Boolean(offer.endDate) && offer.endDate < today;
}

/**
 * A scheduled offer whose start date has arrived or passed, and which is
 * therefore not running when the admin who scheduled it believes it is.
 */
export function isOverdueForPublication(
  offer: Offer,
  today = toApiDate(new Date()),
): boolean {
  return (
    offer.status === 'scheduled' &&
    Boolean(offer.startDate) &&
    offer.startDate <= today
  );
}

/**
 * FR-33 — an offer targeting nobody: it names no shops and is not network-wide.
 * The backend accepts this happily; the composer refuses to create one, and
 * this flags any that already exist.
 */
export function reachesNoShop(offer: Offer): boolean {
  return !offer.targetAllShops && offer.shopIds.length === 0;
}
