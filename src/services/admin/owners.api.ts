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
  const inviteErrors: string[] = [];

  for (const shop of shops) {
    try {
      const result = await apiPost<{ inviteError?: string }>(
        `/shops/${shop.id}/assign-owner`,
        { userId: ownerId },
        { timeoutMs: OWNER_WRITE_TIMEOUT_MS },
      );
      if (result.inviteError) {
        inviteErrors.push(`${shop.name}: ${result.inviteError}`);
      }
      assigned.push(shop);
    } catch (error) {
      failed.push({ shop, message: describeApiError(error) });
    }
  }

  return {
    assigned,
    failed,
    inviteError: inviteErrors.length > 0 ? inviteErrors.join('; ') : undefined,
  };
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

  const owner = await getShopOwner(result.user.id).catch(() => toShopOwner(result.user));

  return {
    owner,
    assigned: input.shops,
    failed: [],
    inviteError: result.inviteError,
  };
}
