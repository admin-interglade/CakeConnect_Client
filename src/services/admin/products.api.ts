import type {
  Paginated,
  Pagination,
  Product,
  ProductAvailabilityInput,
  ProductFilters,
  ProductInput,
} from '../../types/admin';
import { apiDelete, apiGet, apiGetPaged, apiPatch, apiPost } from '../api';
import {
  NotImplementedOnServer,
  productStatusCodec,
  toProduct,
  type ApiProduct,
} from '../mappers';

/**
 * Products — FR-5.
 *
 * Endpoints: `/products`, `/products/:id`, `/products/:id/availability`.
 */

export async function getProducts(
  filters: ProductFilters,
  pagination: Pagination,
): Promise<Paginated<Product>> {
  const page = await apiGetPaged<ApiProduct>('/products', {
    page: pagination.page,
    limit: pagination.limit,
    ...(filters.status !== 'all'
      ? { status: productStatusCodec.toApi(filters.status) }
      : {}),
    ...(filters.categoryId !== 'all' ? { categoryId: filters.categoryId } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
  });

  return { ...page, items: page.items.map(toProduct) };
}

export async function getProduct(productId: string): Promise<Product> {
  return toProduct(await apiGet<ApiProduct>(`/products/${productId}`));
}

const toApiProduct = (input: ProductInput) => ({
  name: input.name,
  sku: input.sku,
  categoryId: input.categoryId,
  ...(input.description ? { description: input.description } : {}),
  ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
  unit: input.unit,
  basePrice: input.basePrice,
  // `moq` in the domain; the endpoint spells the field out in full.
  minimumOrderQuantity: input.moq,
  packSize: input.packSize,
});

export async function createProduct(input: ProductInput): Promise<Product> {
  return toProduct(await apiPost<ApiProduct>('/products', toApiProduct(input)));
}

export async function updateProduct(
  productId: string,
  input: ProductInput,
): Promise<Product> {
  return toProduct(
    await apiPatch<ApiProduct>(`/products/${productId}`, {
      ...toApiProduct(input),
      ...(input.status ? { status: productStatusCodec.toApi(input.status) } : {}),
    }),
  );
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiDelete(`/products/${productId}`);
}

/* -------------------------------------------------------------------------- */
/* Availability — FR-5, write-only                                             */
/* -------------------------------------------------------------------------- */

/** Marks a product available or not for one delivery date. */
export async function setProductAvailability(
  productId: string,
  input: ProductAvailabilityInput,
): Promise<void> {
  await apiPost(`/products/${productId}/availability`, {
    date: input.date,
    available: input.available,
    ...(input.note ? { note: input.note } : {}),
  });
}

/** Clears the override, returning the product to its default availability. */
export async function clearProductAvailability(
  productId: string,
  date: string,
): Promise<void> {
  // DELETE with a request body, which axios only sends via `config.data`.
  await apiDelete(`/products/${productId}/availability`, { date });
}

/**
 * Availability is write-only on this backend: it can be set and cleared, but
 * nothing reads it back and `GET /products` takes no `date`. Rendering an empty
 * calendar would read as "available every day", which is a claim the data does
 * not support — so this refuses rather than guessing.
 * See docs/api-gaps.md G15.
 */
export async function getProductAvailability(
  _productId: string,
  _range: { from: string; to: string },
): Promise<never> {
  throw new NotImplementedOnServer(
    'getProductAvailability',
    'G15',
    'availability can be written but never read back',
  );
}
