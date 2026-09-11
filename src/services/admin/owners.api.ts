import type {
  AssignedShopSummary,
  Paginated,
  Pagination,
  ShopAssignmentOutcome,
  ShopOwner,
  ShopOwnerCreationOutcome,
  ShopOwnerInput,
  ShopOwnerUpdateInput,
} from '../../types/admin';
import { apiGet, apiGetPaged, apiPatch, apiPost, describeApiError } from '../api';
import { toShopOwner, userRoleCodec, type ApiUser } from '../mappers';

/**
 * Both owner writes answer only after the server has emailed the owner, and an
 * SMTP round trip can outlast the default timeout. These POSTs are never
 * retried, so timing out early reports a failure for an account that was
 * created and a shop that was assigned.
 */
const OWNER_WRITE_TIMEOUT_MS = 60_000;

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
 * The server emails the temporary password to the address recorded on the
 * account, so the sequence here is also non-atomic: the account can be
 * created and an assignment still fail, so writes report exactly which shops
 * landed.
 */

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * FR-2 — the owner accounts, newest first (the server's own order), each with
 * the shops it holds.
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
 * `POST /shops/:id/assign-owner` takes one shop, and each call answers only
 * after the server has emailed the owner. Walking them in sequence made the
 * admin wait for one mail round trip per shop, so they run together: each call
 * claims a different shop row, and `allSettled` still reports the results in
 * the order the shops were listed.
 *
 * Never throws for a partial failure — the caller shows what landed and what
 * to retry.
 */
export async function assignShopsToOwner(
  ownerId: string,
  shops: AssignedShopSummary[],
): Promise<ShopAssignmentOutcome> {
  const results = await Promise.allSettled(
    shops.map(shop =>
      apiPost<{ inviteError?: string } | undefined>(
        `/shops/${shop.id}/assign-owner`,
        { userId: ownerId },
        { timeoutMs: OWNER_WRITE_TIMEOUT_MS },
      ),
    ),
  );

  const assigned: AssignedShopSummary[] = [];
  const failed: ShopAssignmentOutcome['failed'] = [];
  const inviteErrors: string[] = [];

  results.forEach((result, index) => {
    const shop = shops[index];
    if (result.status === 'rejected') {
      failed.push({ shop, message: describeApiError(result.reason) });
      return;
    }
    assigned.push(shop);
    if (result.value?.inviteError) {
      inviteErrors.push(`${shop.name}: ${result.value.inviteError}`);
    }
  });

  return {
    assigned,
    failed,
    inviteError: inviteErrors.length > 0 ? inviteErrors.join('; ') : undefined,
  };
}

/**
 * FR-2 — correct an owner's name, sign-in number or email.
 *
 * `PATCH /users/:id` answers without `shopUsers`, so the returned owner has no
 * shops; callers invalidate the detail rather than trusting it for that.
 */
export async function updateShopOwner(
  ownerId: string,
  input: ShopOwnerUpdateInput,
): Promise<ShopOwner> {
  return toShopOwner(
    await apiPatch<ApiUser>(`/users/${ownerId}`, {
      name: input.name,
      mobileNumber: input.phone,
      email: input.email,
    }),
  );
}

/**
 * FR-2 — create the owner account, then link the chosen shops to it.
 *
 * The server generates a temporary password and emails it to the address on
 * the account; the owner sets their own password on the first login. A failure
 * to create throws — there is no account to report on. A failure to
 * assign does not: the account exists by then, and telling the admin the whole
 * thing failed would have them create a duplicate on the same mobile number,
 * which the server rejects with a 409.
 */
export async function createShopOwner(
  input: ShopOwnerInput,
): Promise<ShopOwnerCreationOutcome> {
  const result = await apiPost<{
    user: ApiUser;
    shops: unknown[];
    inviteSent: boolean;
    inviteError?: string;
  }>(
    '/users/owners',
    {
    name: input.name,
    mobileNumber: input.phone,
      email: input.email,
      shopIds: input.shops.map(shop => shop.id),
    },
    { timeoutMs: OWNER_WRITE_TIMEOUT_MS },
  );

  // Built from the response rather than re-read: the endpoint links every
  // selected shop or fails, so the input shops are exactly what landed, and a
  // second round trip only delayed the profile the admin lands on.
  const owner: ShopOwner = { ...toShopOwner(result.user), shops: input.shops };

  return {
    owner,
    assigned: input.shops,
    failed: [],
    inviteError: result.inviteError,
  };
}
