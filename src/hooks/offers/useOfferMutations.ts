import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  createOffer,
  expireOffer,
  publishOffer,
  updateOffer,
  withdrawOffer,
} from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import type { OfferInput, OfferUpdate } from '../../types/admin';

/**
 * FR-32, FR-33 and FR-35 writes.
 *
 * Every one of these changes what shops see, so all five invalidate the whole
 * offers tree rather than a single key: the list is paged and status-filtered,
 * and a published offer leaves one tab for another.
 *
 * Nothing else in the admin app reads offers — no dashboard tile, no report —
 * so no other cache tree is touched. The shop surface's `shop.offers` cache is
 * a different role's session and is never live in the same app instance.
 */
export function useOfferMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidateOffers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.offers.all });
  };

  const fail = (error: unknown) =>
    toast.show(describeApiError(error), { tone: 'error' });

  /* FR-32, FR-33 — compose and publish. */

  const create = useMutation({
    mutationFn: (input: OfferInput) => createOffer(input),
    onSuccess: offer => {
      invalidateOffers();
      toast.show(
        offer.status === 'scheduled'
          ? strings.adminOffers.createdScheduled
          : strings.adminOffers.createdLive,
        { tone: 'success' },
      );
    },
    onError: fail,
  });

  const update = useMutation({
    mutationFn: ({ offerId, patch }: { offerId: string; patch: OfferUpdate }) =>
      updateOffer(offerId, patch),
    onSuccess: () => {
      invalidateOffers();
      toast.show(strings.adminOffers.updated, { tone: 'success' });
    },
    onError: fail,
  });

  /*
   * FR-33, FR-35 — the two transitions a scheduler would have made on its own.
   * They are ordinary mutations here because on this backend they are ordinary
   * admin work: nothing else will ever make them (docs/api-gaps.md G22).
   */

  const publish = useMutation({
    mutationFn: (offerId: string) => publishOffer(offerId),
    onSuccess: () => {
      invalidateOffers();
      toast.show(strings.adminOffers.published, { tone: 'success' });
    },
    onError: fail,
  });

  const expire = useMutation({
    mutationFn: (offerId: string) => expireOffer(offerId),
    onSuccess: () => {
      invalidateOffers();
      toast.show(strings.adminOffers.expired, { tone: 'success' });
    },
    onError: fail,
  });

  /* FR-35 — pulled rather than run out. */

  const withdraw = useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason?: string }) =>
      withdrawOffer(offerId, reason),
    onSuccess: () => {
      invalidateOffers();
      toast.show(strings.adminOffers.withdrawn, { tone: 'success' });
    },
    onError: fail,
  });

  return { create, update, publish, expire, withdraw };
}

export default useOfferMutations;
