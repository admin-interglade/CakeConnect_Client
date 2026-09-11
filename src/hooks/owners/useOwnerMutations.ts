import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  assignShopsToOwner,
  createShopOwner,
  updateShopOwner,
} from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import type {
  AssignedShopSummary,
  Paginated,
  ShopAssignmentOutcome,
  ShopOwner,
  ShopOwnerInput,
  ShopOwnerUpdateInput,
} from '../../types/admin';

/**
 * FR-2 writes for shop-owner accounts.
 *
 * Every mutation invalidates the owners tree **and** the shops tree: an
 * assignment writes `Shop.ownerId`, so a stale shops cache would keep offering
 * the same shop to the next owner the admin creates.
 */
export function useOwnerMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidateOwners = (ownerId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.owners.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    if (ownerId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.owners.detail(ownerId) });
    }
  };

  /**
   * Write what a mutation already knows into the cached owner — the detail and
   * every directory page holding them — so the screen the admin lands on shows
   * the change at once rather than after the refetch `invalidateOwners` starts.
   */
  const patchCachedOwner = (
    ownerId: string,
    patch: (owner: ShopOwner) => ShopOwner,
  ) => {
    queryClient.setQueryData<ShopOwner>(
      queryKeys.owners.detail(ownerId),
      current => current && patch(current),
    );
    queryClient.setQueriesData<Paginated<ShopOwner>>(
      { queryKey: queryKeys.owners.lists },
      page =>
        page && {
          ...page,
          items: page.items.map(owner => (owner.id === ownerId ? patch(owner) : owner)),
        },
    );
  };

  /**
   * The atomic owner endpoint either links every selected shop or fails before
   * creating the account, so a successful create has no partial assignment.
   */
  const create = useMutation({
    mutationFn: (input: ShopOwnerInput) => createShopOwner(input),
    onSuccess: outcome => {
      // Seeded so the profile the form navigates to opens without a spinner.
      queryClient.setQueryData(queryKeys.owners.detail(outcome.owner.id), outcome.owner);
      invalidateOwners(outcome.owner.id);

      if (outcome.failed.length === 0) {
        toast.show(
          outcome.inviteError
            ? `${strings.owners.created(outcome.owner.name)} ${outcome.inviteError}`
            : `${strings.owners.created(outcome.owner.name)} ${strings.owners.signInHint}`,
          { tone: outcome.inviteError ? 'info' : 'success' },
        );
        return;
      }

      toast.show(
        strings.owners.partialAssign(
          outcome.assigned.map(shop => shop.name),
          outcome.failed.map(entry => entry.shop.name),
        ),
        { tone: 'info' },
      );
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  const assignShops = useMutation({
    mutationFn: ({
      ownerId,
      shops,
    }: {
      ownerId: string;
      shops: AssignedShopSummary[];
    }) => assignShopsToOwner(ownerId, shops),
    onSuccess: (outcome: ShopAssignmentOutcome, variables) => {
      patchCachedOwner(variables.ownerId, owner => ({
        ...owner,
        shops: [
          ...owner.shops,
          ...outcome.assigned.filter(
            shop => !owner.shops.some(held => held.id === shop.id),
          ),
        ],
      }));
      invalidateOwners(variables.ownerId);

      if (outcome.failed.length === 0) {
        toast.show(
          outcome.inviteError
            ? `${strings.owners.assigned(outcome.assigned.length)} ${outcome.inviteError}`
            : strings.owners.assigned(outcome.assigned.length),
          { tone: outcome.inviteError ? 'info' : 'success' },
        );
        return;
      }

      toast.show(
        strings.owners.partialAssign(
          outcome.assigned.map(shop => shop.name),
          outcome.failed.map(entry => entry.shop.name),
        ),
        { tone: 'info' },
      );
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  const update = useMutation({
    mutationFn: ({
      ownerId,
      input,
    }: {
      ownerId: string;
      input: ShopOwnerUpdateInput;
    }) => updateShopOwner(ownerId, input),
    onSuccess: (updated, variables) => {
      // The PATCH answers without shops, so only the edited fields are taken.
      patchCachedOwner(variables.ownerId, owner => ({
        ...owner,
        name: updated.name,
        phone: updated.phone,
        email: updated.email,
      }));
      invalidateOwners(variables.ownerId);
      toast.show(strings.owners.updated(updated.name), { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  return { create, assignShops, update };
}

export default useOwnerMutations;
