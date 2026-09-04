import type {
  PriceList,
  PriceListDetail,
  PriceListInput,
} from '../../types/admin';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api';
import {
  toPriceList,
  toPriceListDetail,
  type ApiPriceList,
  type ApiPriceListDetail,
} from '../mappers';

/**
 * Price lists — FR-6.
 *
 * Endpoints: `/price-lists`, `/price-lists/:id`, `/price-lists/:id/items`,
 * plus `/shops/:id/assign-price-list`, which lives on the shops route but is
 * the other half of assigning a list.
 *
 * This route is NOT paginated: it answers with a bare array and no `meta`, so
 * it uses `apiGet<T[]>` rather than `apiGetPaged`.
 */

/** The `{id, name}` shape the shop form's dropdown needs. */
export async function getPriceLists(): Promise<PriceList[]> {
  const lists = await apiGet<ApiPriceList[]>('/price-lists');
  return (lists ?? []).map(toPriceList);
}

/** The full records, with their items and per-product prices. */
export async function getPriceListsDetailed(): Promise<PriceListDetail[]> {
  const lists = await apiGet<ApiPriceListDetail[]>('/price-lists');
  return (lists ?? []).map(toPriceListDetail);
}

export async function getPriceList(priceListId: string): Promise<PriceListDetail> {
  return toPriceListDetail(
    await apiGet<ApiPriceListDetail>(`/price-lists/${priceListId}`),
  );
}

export async function createPriceList(
  input: PriceListInput,
): Promise<PriceListDetail> {
  return toPriceListDetail(
    await apiPost<ApiPriceListDetail>('/price-lists', {
      name: input.name,
      // Accepted by the API, but no shop carries a region, so a region-targeted
      // list cannot currently resolve to any shop. See docs/api-gaps.md G6.
      ...(input.region ? { region: input.region } : {}),
      ...(input.description ? { description: input.description } : {}),
    }),
  );
}

export async function updatePriceList(
  priceListId: string,
  input: PriceListInput & { isActive?: boolean },
): Promise<PriceListDetail> {
  return toPriceListDetail(
    await apiPatch<ApiPriceListDetail>(`/price-lists/${priceListId}`, {
      name: input.name,
      ...(input.region ? { region: input.region } : {}),
      ...(input.description ? { description: input.description } : {}),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    }),
  );
}

export async function deletePriceList(priceListId: string): Promise<void> {
  await apiDelete(`/price-lists/${priceListId}`);
}

/* -------------------------------------------------------------------------- */
/* Items                                                                       */
/* -------------------------------------------------------------------------- */

export async function addPriceListItems(
  priceListId: string,
  items: { productId: string; price: number }[],
): Promise<void> {
  await apiPost(`/price-lists/${priceListId}/items`, { items });
}

export async function updatePriceListItem(
  priceListId: string,
  itemId: string,
  price: number,
): Promise<void> {
  await apiPatch(`/price-lists/${priceListId}/items/${itemId}`, { price });
}

export async function removePriceListItem(
  priceListId: string,
  productId: string,
): Promise<void> {
  // DELETE with a request body, which axios only sends via `config.data`.
  await apiDelete(`/price-lists/${priceListId}/items`, { productId });
}

/** FR-6 — assign a list to a shop. */
export async function assignPriceListToShop(
  shopId: string,
  priceListId: string,
): Promise<void> {
  await apiPost(`/shops/${shopId}/assign-price-list`, { priceListId });
}
