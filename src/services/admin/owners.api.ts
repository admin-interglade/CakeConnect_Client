import type {
  AssignedShopSummary,
  Paginated,
  Pagination,
  ShopAssignmentOutcome,
  ShopOwner,
  ShopOwnerCreationOutcome,
  ShopOwnerInput,
} from '../../types/admin';
import { apiGet, apiGetPaged, apiPost, describeApiError } from '../api';
import { toShopOwner, userRoleCodec, type ApiUser } from '../mappers';

/**
 * Shop owners — FR-2.
 *
 * Endpoints: `/users`, `/users/:id`, `/shops/:id/assign-owner`.
 *
 * `docs/prompts/shop-owner-onboarding.md` specifies a single
 * `POST /users/owners` that creates the account, links the shops and emails an
 * activation link in one transaction. That endpoint does not exist yet
 * (docs/api-gaps.md G26), so this module composes the same outcome from the
 * routes that do: one `POST /users` followed by one assign call per shop.
 *
 * Two consequences the UI must not paper over:
 *   - **no invite is sent.** Nothing here emails the owner, so no caller may
 *     claim one went out. The owner signs in with the mobile number recorded
 *     below, via OTP.
 *   - **the sequence is not atomic.** The account can be created and an
 *     assignment still fail, so writes report exactly which shops landed.
 */

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * FR-2 — the owner accounts, newest first (the server's own order).
 *
 * Rows carry no shop association: `GET /users` selects without `shopUsers`, so
 * `owner.shops` is empty here for every row and only `getShopOwner` fills it.
 */
export async function getShopOwners(
  search: string,
  pagination: Pagination,
): Promise<Paginated<ShopOwner>> {
  const page = await apiGetPaged<ApiUser>('/users', {
    page: pagination.page,
    limit: pagination.limit,
    role: userRoleCodec.toApi('shopOwner'),
    ...(search.trim() ? { search: search.trim() } : {}),
  });

  return { ...page, items: page.items.map(toShopOwner) };
}

/** One owner, with the shops they can act on. */
export async function getShopOwner(ownerId: string): Promise<ShopOwner> {
  return toShopOwner(await apiGet<ApiUser>(`/users/${ownerId}`));
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * FR-2 — hand a set of shops to an owner.
 *
 * `POST /shops/:id/assign-owner` takes one shop, so this walks them in
 * sequence and records each result. Sequential rather than parallel: the calls
 * write the same `ShopUser` table and an admin reading a failure needs the
 * shops named in the order they were listed, not in whichever order the
 * requests happened to settle.
 *
 * Never throws for a partial failure — the caller shows what landed and what
 * to retry. It throws only when the caller asked for nothing.
 */
export async function assignShopsToOwner(
  ownerId: string,
  shops: AssignedShopSummary[],
): Promise<ShopAssignmentOutcome> {
  const assigned: AssignedShopSummary[] = [];
  const failed: ShopAssignmentOutcome['failed'] = [];

  for (const shop of shops) {
    try {
      await apiPost(`/shops/${shop.id}/assign-owner`, { userId: ownerId });
      assigned.push(shop);
    } catch (error) {
      failed.push({ shop, message: describeApiError(error) });
    }
  }

  return { assigned, failed };
}

/**
 * FR-2 — create the owner account, then link the chosen shops to it.
 *
 * The account is created without a password: `POST /users` makes it optional,
 * and an admin-chosen password would either have to be read out to the owner or
 * be unknown to them. The owner signs in with their mobile number and an OTP
 * until the activation flow in `docs/prompts/shop-owner-onboarding.md` lands.
 *
 * A failure to create throws — there is no account to report on. A failure to
 * assign does not: the account exists by then, and telling the admin the whole
 * thing failed would have them create a duplicate on the same mobile number,
 * which the server rejects with a 409.
 */
export async function createShopOwner(
  input: ShopOwnerInput,
): Promise<ShopOwnerCreationOutcome> {
  const created = await apiPost<ApiUser>('/users', {
    name: input.name,
    mobileNumber: input.phone,
    ...(input.email ? { email: input.email } : {}),
    role: userRoleCodec.toApi('shopOwner'),
  });

  const outcome = await assignShopsToOwner(created.id, input.shops);

  // Re-read rather than composing the owner locally: only the server knows
  // which links actually persisted, and the detail route is what fills `shops`.
  // A failure here still leaves a usable answer, because the create response
  // already describes the account.
  const owner = await getShopOwner(created.id).catch(() => toShopOwner(created));

  return { owner, ...outcome };
}
