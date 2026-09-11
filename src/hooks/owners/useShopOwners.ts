import {
  keepPreviousData,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { getShopOwner, getShopOwners } from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useShopOptions } from '../shops/useShops';
import type {
  AssignedShopSummary,
  Paginated,
  Pagination,
  ShopOwner,
} from '../../types/admin';

export const defaultOwnerPagination: Pagination = { page: 1, limit: 20 };

type ShopOwnersResult = {
  owners: ShopOwner[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/** FR-2 — the shop-owner accounts, for pickers and the owner directory. */
export function useShopOwners(
  search = '',
  pagination: Pagination = defaultOwnerPagination,
): ShopOwnersResult {
  const list = useQuery({
    queryKey: queryKeys.owners.list(search, pagination),
    queryFn: () => getShopOwners(search, pagination),
    placeholderData: keepPreviousData,
  });

  return {
    owners: list.data?.items ?? [],
    total: list.data?.total ?? 0,
    isLoading: list.isLoading,
    isError: list.isError && list.data === undefined,
    error: list.error ? describeApiError(list.error) : undefined,
    isRefetching: list.isRefetching,
    refetch: () => list.refetch(),
  };
}

type ShopOwnerResult = {
  owner?: ShopOwner;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * The owner as a directory page already holds them. `GET /users` returns the
 * same fields and shops as the detail route, so a screen opened from the list
 * can render at once instead of behind a spinner while the detail loads.
 */
function findListedOwner(
  queryClient: QueryClient,
  ownerId: string,
): ShopOwner | undefined {
  const pages = queryClient.getQueriesData<Paginated<ShopOwner>>({
    queryKey: queryKeys.owners.lists,
  });
  for (const [, page] of pages) {
    const owner = page?.items.find(item => item.id === ownerId);
    if (owner) {
      return owner;
    }
  }
  return undefined;
}

/**
 * One owner and the shops they hold. Idle until an `ownerId` exists.
 *
 * Shows the directory's copy while the detail is fetched in the background.
 */
export function useShopOwnerDetails(ownerId?: string): ShopOwnerResult {
  const queryClient = useQueryClient();
  const detail = useQuery({
    queryKey: queryKeys.owners.detail(ownerId ?? ''),
    queryFn: () => getShopOwner(ownerId as string),
    enabled: Boolean(ownerId),
    placeholderData: () =>
      ownerId ? findListedOwner(queryClient, ownerId) : undefined,
  });

  return {
    owner: detail.data,
    isLoading: detail.isLoading && Boolean(ownerId),
    isError: detail.isError,
    error: detail.error ? describeApiError(detail.error) : undefined,
    isRefetching: detail.isRefetching,
    refetch: () => detail.refetch(),
  };
}

/**
 * How many owners a picker will load in one go. `GET /users` is paginated with
 * no "all" mode; `truncated` says when the network has more than one page,
 * rather than quietly offering a partial list as if it were everyone.
 */
const OWNER_PICKER_LIMIT = 100;

const ownerPickerPagination: Pagination = { page: 1, limit: OWNER_PICKER_LIMIT };

type ShopOwnerOptionsResult = {
  owners: ShopOwner[];
  /** True when there are more owners than one page holds. */
  truncated: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
};

/**
 * Every shop owner, by name, for the controls that pick one — the owner field
 * on the shop form, and anything else that needs an account rather than a
 * typed name.
 *
 * Shares its cache key with the owners list, so the two never refetch each
 * other's rows.
 */
export function useShopOwnerOptions(): ShopOwnerOptionsResult {
  const list = useQuery({
    queryKey: queryKeys.owners.list('', ownerPickerPagination),
    queryFn: () => getShopOwners('', ownerPickerPagination),
    staleTime: 5 * 60_000,
  });

  const owners = list.data?.items ?? [];

  return {
    owners,
    truncated: (list.data?.total ?? 0) > owners.length,
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error ? describeApiError(list.error) : undefined,
  };
}

type AvailableShopsResult = {
  /** Shops no owner account holds yet — what a new owner can be given. */
  shops: AssignedShopSummary[];
  /** True when the network has more shops than the picker's one page holds. */
  truncated: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
};

/**
 * FR-2 — the shops available to hand to an owner.
 *
 * "Available" is `ownerId` being unset, not `ownerName` being blank: a shop
 * created with an owner *name* and no account is still unclaimed, and that is
 * exactly the shop an admin is trying to place here.
 *
 * Already-owned shops are filtered out rather than shown disabled, because
 * `POST /shops/:id/assign-owner` would silently *re*-assign one — the endpoint
 * overwrites `ownerId` without complaint, so offering an owned shop in this
 * picker is offering to take it away from someone with no warning. Moving a
 * shop between owners belongs on the shop, not on the new owner's form.
 */
export function useAvailableShops(): AvailableShopsResult {
  const { shops, truncated, isLoading, isError, error } = useShopOptions();

  return {
    shops: shops
      .filter(shop => !shop.ownerId)
      .map(shop => ({ id: shop.id, name: shop.name, code: shop.code })),
    truncated,
    isLoading,
    isError,
    error,
  };
}

export default useShopOwners;
