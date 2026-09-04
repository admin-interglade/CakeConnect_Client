import type {
  Category,
  PriceListDetail,
  PriceListItem,
  Product,
  ProductStatus,
} from '../../types/admin';
import { createEnumCodec } from './codec';

/**
 * Wire shapes and mappers for the catalogue — FR-5, FR-6, FR-15.
 *
 * Shapes captured from a live server, so these are verified rather than read
 * off the endpoint doc. The one thing to keep in mind: money and quantities
 * arrive as **strings** (`basePrice: "500"`, `price: "850"`), which is what made
 * every ledger amount map to zero before real rows exposed it.
 */

const num = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/* -------------------------------------------------------------------------- */
/* Product status — FR-5                                                       */
/* -------------------------------------------------------------------------- */

export type ApiProductStatus = 'ACTIVE' | 'INACTIVE' | 'UNAVAILABLE';

export const productStatusCodec = createEnumCodec<ProductStatus, ApiProductStatus>(
  'product status',
  { active: 'ACTIVE', inactive: 'INACTIVE', unavailable: 'UNAVAILABLE' },
);

/* -------------------------------------------------------------------------- */
/* Categories — FR-15                                                          */
/* -------------------------------------------------------------------------- */

export type ApiCategory = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  leadTimeHours?: number | string | null;
  _count?: { products?: number } | null;
};

export const toCategory = (api: ApiCategory): Category => ({
  id: api.id,
  name: api.name,
  description: api.description ?? undefined,
  imageUrl: api.imageUrl ?? undefined,
  isActive: api.isActive ?? true,
  leadTimeHours: num(api.leadTimeHours),
  // The server counts the products referencing this category, which is the
  // guard before offering a delete.
  productCount: api._count?.products ?? 0,
});

/* -------------------------------------------------------------------------- */
/* Products — FR-5                                                             */
/* -------------------------------------------------------------------------- */

export type ApiProduct = {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  category?: { id?: string; name?: string } | null;
  description?: string | null;
  imageUrl?: string | null;
  unit?: string | null;
  basePrice?: string | number | null;
  minimumOrderQuantity?: number | string | null;
  packSize?: number | string | null;
  status: string;
};

export const toProduct = (api: ApiProduct): Product => ({
  id: api.id,
  name: api.name,
  sku: api.sku,
  categoryId: api.categoryId,
  categoryName: api.category?.name ?? undefined,
  description: api.description ?? undefined,
  imageUrl: api.imageUrl ?? undefined,
  unit: api.unit ?? '',
  basePrice: num(api.basePrice),
  // `moq` in the domain, `minimumOrderQuantity` on the wire.
  moq: num(api.minimumOrderQuantity, 1),
  packSize: num(api.packSize, 1),
  status: productStatusCodec.fromApi(api.status),
});

/* -------------------------------------------------------------------------- */
/* Price lists — FR-6                                                          */
/* -------------------------------------------------------------------------- */

export type ApiPriceListItem = {
  id: string;
  priceListId?: string;
  productId: string;
  price?: string | number | null;
  product?: { name?: string; unit?: string } | null;
};

export type ApiPriceListDetail = {
  id: string;
  name: string;
  /**
   * Accepted by the API, but no shop carries a region, so a region-targeted
   * list can never resolve to a shop. See docs/api-gaps.md G6.
   */
  region?: string | null;
  description?: string | null;
  isActive?: boolean;
  items?: ApiPriceListItem[] | null;
};

export const toPriceListItem = (api: ApiPriceListItem): PriceListItem => ({
  id: api.id,
  productId: api.productId,
  productName: api.product?.name ?? api.productId,
  unit: api.product?.unit ?? '',
  price: num(api.price),
});

export const toPriceListDetail = (api: ApiPriceListDetail): PriceListDetail => ({
  id: api.id,
  name: api.name,
  region: api.region ?? undefined,
  description: api.description ?? undefined,
  isActive: api.isActive ?? true,
  items: (api.items ?? []).map(toPriceListItem),
});
