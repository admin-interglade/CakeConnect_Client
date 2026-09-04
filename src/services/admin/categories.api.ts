import type { Category, CategoryInput } from '../../types/admin';
import { apiDelete, apiGet, apiPatch, apiPost } from '../api';
import { toCategory, type ApiCategory } from '../mappers';

/**
 * Categories — FR-15 (lead times live here), FR-5.
 *
 * Endpoints: `/categories`, `/categories/:id`.
 *
 * This route is NOT paginated: it answers with a bare array and no `meta`, so
 * it uses `apiGet<T[]>` rather than `apiGetPaged`.
 */

export async function getCategories(): Promise<Category[]> {
  const rows = await apiGet<ApiCategory[]>('/categories');
  return (rows ?? []).map(toCategory);
}

export async function getCategory(categoryId: string): Promise<Category> {
  return toCategory(await apiGet<ApiCategory>(`/categories/${categoryId}`));
}

const toApiCategory = (input: CategoryInput) => ({
  name: input.name,
  ...(input.description ? { description: input.description } : {}),
  ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
  leadTimeHours: input.leadTimeHours,
});

export async function createCategory(input: CategoryInput): Promise<Category> {
  return toCategory(await apiPost<ApiCategory>('/categories', toApiCategory(input)));
}

export async function updateCategory(
  categoryId: string,
  input: CategoryInput,
): Promise<Category> {
  return toCategory(
    await apiPatch<ApiCategory>(`/categories/${categoryId}`, {
      ...toApiCategory(input),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
    }),
  );
}

/**
 * Deleting a category that still holds products would orphan them, so the
 * caller checks `productCount` first — the server reports it as
 * `_count.products` on the list payload.
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  await apiDelete(`/categories/${categoryId}`);
}
