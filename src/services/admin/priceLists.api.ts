import type { PriceList } from '../../types/admin';
import { apiGet } from '../api';
import { toPriceList, type ApiPriceList } from '../mappers';

/**
 * Price lists — FR-6.
 *
 * Endpoints: `/price-lists`. Note this route is NOT paginated: it returns a
 * bare array with no `meta`, so it uses `apiGet` rather than `apiGetPaged`.
 */
export async function getPriceLists(): Promise<PriceList[]> {
  const lists = await apiGet<ApiPriceList[]>('/price-lists');
  return (lists ?? []).map(toPriceList);
}
