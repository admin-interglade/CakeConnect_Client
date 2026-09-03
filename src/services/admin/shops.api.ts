import type {
  Paginated,
  Pagination,
  Shop,
  ShopFilters,
  ShopInput,
  ShopStatus,
} from '../../types/admin';
import { creditUtilisation, toApiDate } from '../../utils/format';
import { apiGet, apiGetPaged } from '../api';
import { NotImplementedOnServer, shopStatusCodec, toShop, type ApiShop } from '../mappers';
import { priceLists, recordAudit, shops as mockShops } from './mockStore';

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
/* Writes — MOCK-BACKED. See the banner in `api/index.ts`.                     */
/* -------------------------------------------------------------------------- */

export async function createShop(input: ShopInput): Promise<Shop> {
  const shop: Shop = {
    ...input,
    id: `shop_${Date.now()}`,
    status: 'active',
    creditUsed: 0,
    creditAvailable: input.creditLimit,
    priceListName: priceLists.find(list => list.id === input.priceListId)?.name ?? '',
    outstanding: 0,
    paidToDate: 0,
    todaysOrderStatus: 'no_order',
    inviteSentAt: new Date().toISOString(),
    createdAt: toApiDate(new Date()),
  };

  mockShops.unshift(shop);
  recordAudit(shop.id, { action: 'Shop created', after: shop.name });

  return shop;
}

export async function updateShop(shopId: string, input: ShopInput): Promise<Shop> {
  const index = mockShops.findIndex(shop => shop.id === shopId);
  if (index === -1) {
    throw new Error('Shop not found');
  }

  const previous = mockShops[index];
  const updated: Shop = {
    ...previous,
    ...input,
    priceListName: priceLists.find(list => list.id === input.priceListId)?.name ?? '',
    creditAvailable: Math.max(input.creditLimit - previous.creditUsed, 0),
  };

  mockShops[index] = updated;

  (Object.keys(input) as (keyof ShopInput)[]).forEach(field => {
    if (String(previous[field] ?? '') !== String(input[field] ?? '')) {
      recordAudit(shopId, {
        action: 'Shop updated',
        field,
        before: String(previous[field] ?? ''),
        after: String(input[field] ?? ''),
      });
    }
  });

  return updated;
}

export async function setShopStatus(shopId: string, status: ShopStatus): Promise<Shop> {
  const index = mockShops.findIndex(shop => shop.id === shopId);
  if (index === -1) {
    throw new Error('Shop not found');
  }

  const previous = mockShops[index].status;
  mockShops[index] = { ...mockShops[index], status };

  recordAudit(shopId, {
    action: 'Shop status changed',
    field: 'status',
    before: previous,
    after: status,
  });

  return mockShops[index];
}
