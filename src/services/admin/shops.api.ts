import type {
  Paginated,
  Pagination,
  Shop,
  ShopFilters,
  ShopInput,
  ShopStatus,
  ShopUpdateOutcome,
  ShopUpdatePart,
} from '../../types/admin';
import { creditUtilisation } from '../../utils/format';
import { apiGet, apiGetPaged, apiPatch, apiPost, describeApiError } from '../api';
import {
  NotImplementedOnServer,
  creditBehaviorCodec,
  shopStatusCodec,
  toApiShopCreate,
  toApiShopDetails,
  toShop,
  type ApiShop,
} from '../mappers';

/**
 * Shops — FR-2, FR-3, FR-38, FR-39.
 *
 * Endpoints: `/shops`, `/shops/:id`, `/shops/:id/status`,
 * `/shops/:id/credit-limit`, `/shops/:id/assign-price-list`.
 */

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/** Active shops in the network — the denominator for FR-17's "22 of 24". */
export async function countActiveShops(): Promise<number> {
  const page = await apiGetPaged<ApiShop>('/shops', {
    page: 1,
    limit: 1,
    status: shopStatusCodec.toApi('active'),
  });
  return page.total;
}

/**
 * FR-38 — the paginated shop directory.
 *
 * `GET /shops` supports neither `sort` nor a region field, so
 * `ShopFilters.region` is sent as the `city` query it maps to (see
 * `mappers/admin`, which reads `region` from `city`), and sorting is applied to
 * the returned page only — it cannot order rows the server did not send.
 * See docs/api-gaps.md G2.
 */
export async function getShops(
  filters: ShopFilters,
  pagination: Pagination,
): Promise<Paginated<Shop>> {
  const page = await apiGetPaged<ApiShop>('/shops', {
    page: pagination.page,
    limit: pagination.limit,
    ...(filters.status !== 'all'
      ? { status: shopStatusCodec.toApi(filters.status) }
      : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
    ...(filters.region !== 'all' ? { city: filters.region } : {}),
  });

  const items = page.items.map(toShop);

  const sorted = [...items].sort((a, b) => {
    switch (filters.sort) {
      case 'outstanding':
        return b.outstanding - a.outstanding;
      case 'creditUtilisation':
        return (
          creditUtilisation(b.creditUsed, b.creditLimit) -
          creditUtilisation(a.creditUsed, a.creditLimit)
        );
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return { ...page, items: sorted };
}

export async function getShop(shopId: string): Promise<Shop> {
  return toShop(await apiGet<ApiShop>(`/shops/${shopId}`));
}

/**
 * FR-6 targets price lists "per shop or region", and offers target regions too,
 * but the shop model has no region — only `city`/`state`, and nothing lists the
 * distinct values. See docs/api-gaps.md G6.
 */
export async function getRegions(): Promise<string[]> {
  throw new NotImplementedOnServer(
    'getRegions',
    'G6',
    'shops carry city/state, and no endpoint enumerates either',
  );
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * FR-2 — create the shop. `POST /shops` accepts creditLimit and priceListId
 * inline, unlike the update route, so a create is a single call.
 *
 * The owner is linked by `ownerMobileNumber`; nothing sends them an invite, so
 * `inviteSentAt` stays unset rather than claiming a message went out. See
 * docs/api-gaps.md backend gap 1.
 */
export async function createShop(input: ShopInput): Promise<Shop> {
  return toShop(await apiPost<ApiShop>('/shops', toApiShopCreate(input)));
}

/**
 * FR-2 — edit the shop. This fans out, because `PATCH /shops/:id` silently
 * ignores creditLimit and priceListId:
 *
 *   PATCH /shops/:id                    descriptive fields
 *   PATCH /shops/:id/credit-limit       creditLimit + creditBehavior
 *   POST  /shops/:id/assign-price-list  priceListId
 *
 * They run in sequence and each is recorded, so a half-succeeding save reports
 * exactly which parts landed. Throws only when nothing at all was saved; a
 * partial success is returned rather than raised, because the admin needs to
 * see what to retry rather than being told the whole edit failed.
 */
export async function updateShop(
  shopId: string,
  input: ShopInput,
): Promise<ShopUpdateOutcome> {
  const saved: ShopUpdatePart[] = [];
  const failed: ShopUpdateOutcome['failed'] = [];

  const attempt = async (part: ShopUpdatePart, run: () => Promise<unknown>) => {
    try {
      await run();
      saved.push(part);
    } catch (error) {
      failed.push({ part, message: describeApiError(error) });
    }
  };

  await attempt('details', () =>
    apiPatch<ApiShop>(`/shops/${shopId}`, toApiShopDetails(input)),
  );

  await attempt('creditLimit', () =>
    apiPatch<ApiShop>(`/shops/${shopId}/credit-limit`, {
      creditLimit: input.creditLimit,
      ...(input.creditBehavior
        ? { creditBehavior: creditBehaviorCodec.toApi(input.creditBehavior) }
        : {}),
    }),
  );

  if (input.priceListId) {
    await attempt('priceList', () =>
      apiPost(`/shops/${shopId}/assign-price-list`, {
        priceListId: input.priceListId,
      }),
    );
  }

  if (saved.length === 0) {
    throw new Error(failed[0]?.message ?? 'The shop could not be updated.');
  }

  // Re-read rather than patching locally: the server owns availableCredit and
  // the price-list association, and only it knows what actually persisted.
  return { shop: await getShop(shopId), saved, failed };
}

/**
 * FR-3 — activate, suspend or deactivate.
 *
 * The status route answers with a thin projection — id, code, name, status —
 * so mapping its response straight to a Shop would blank the owner, address and
 * credit fields on the detail screen. The full record is re-read instead.
 */
export async function setShopStatus(shopId: string, status: ShopStatus): Promise<Shop> {
  await apiPatch(`/shops/${shopId}/status`, {
    status: shopStatusCodec.toApi(status),
  });

  return getShop(shopId);
}
