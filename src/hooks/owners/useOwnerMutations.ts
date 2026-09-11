import { useMutation, useQueryClient } from '@tanstack/react-query';

import { assignShopsToOwner, createShopOwner } from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import type {
  AssignedShopSummary,
  ShopAssignmentOutcome,
  ShopOwnerInput,
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
  * The atomic owner endpoint either links every selected shop or fails before
  * creating the account, so a successful create has no partial assignment.
   */
  const create = useMutation({
    mutationFn: (input: ShopOwnerInput) => createShopOwner(input),
    onSuccess: outcome => {
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

  return { create, assignShops };
}

export default useOwnerMutations;
