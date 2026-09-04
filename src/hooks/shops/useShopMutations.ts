import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createLedgerAdjustment,
  createShop,
  setShopStatus,
  updateShop,
} from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import type {
  LedgerAdjustmentInput,
  ShopInput,
  ShopStatus,
} from '../../types/admin';

/**
 * FR-2, FR-3 and FR-39 writes.
 *
 * Each mutation invalidates the shop tree so the list, the detail and the
 * dashboard tiles all reflect the change, and reports its outcome through the
 * shared toast rather than leaving each screen to do it.
 */
export function useShopMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidateShops = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const create = useMutation({
    mutationFn: (input: ShopInput) => createShop(input),
    onSuccess: () => {
      invalidateShops();
      // FR-2 — the owner completes their own profile on first login.
      toast.show(`${strings.shopDetails.created} ${strings.shopDetails.inviteSent}`, {
        tone: 'success',
      });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  /**
   * A shop edit fans out to up to three endpoints, so it can half-succeed. The
   * toast names the parts that saved and the parts that did not, because
   * "could not update shop" leaves the admin with no idea what to retry.
   */
  const update = useMutation({
    mutationFn: ({ shopId, input }: { shopId: string; input: ShopInput }) =>
      updateShop(shopId, input),
    onSuccess: (outcome, variables) => {
      invalidateShops();
      queryClient.invalidateQueries({
        queryKey: queryKeys.shops.detail(variables.shopId),
      });
      if (outcome.failed.length === 0) {
        toast.show(strings.shopDetails.updated, { tone: 'success' });
        return;
      }

      toast.show(
        strings.shopDetails.partialSave(
          outcome.saved.map(part => strings.shopDetails.parts[part]),
          outcome.failed.map(entry => strings.shopDetails.parts[entry.part]),
        ),
        { tone: 'info' },
      );
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ shopId, status }: { shopId: string; status: ShopStatus }) =>
      setShopStatus(shopId, status),
    onSuccess: (_data, variables) => {
      invalidateShops();
      queryClient.invalidateQueries({
        queryKey: queryKeys.shops.detail(variables.shopId),
      });
      toast.show(strings.shops.statusChanged, { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  const addAdjustment = useMutation({
    mutationFn: ({
      shopId,
      input,
    }: {
      shopId: string;
      input: LedgerAdjustmentInput;
    }) => createLedgerAdjustment(shopId, input),
    onSuccess: (_data, variables) => {
      invalidateShops();
      queryClient.invalidateQueries({
        queryKey: queryKeys.shops.detail(variables.shopId),
      });
      toast.show(strings.shopDetails.adjustmentPosted, { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  return { create, update, changeStatus, addAdjustment };
}

export default useShopMutations;
