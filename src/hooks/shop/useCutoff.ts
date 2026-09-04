import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { getEffectiveCutoff } from '../../services/shop';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useActiveShop } from './useActiveShop';
import type { EffectiveCutoff } from '../../types/shop';

type CutoffResult = {
  cutoff?: EffectiveCutoff;
  /** Live seconds remaining, ticking locally between refetches. */
  secondsRemaining: number;
  /** True once the deadline is behind us, from the live tick, not the payload. */
  passed: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  refetch: () => void;
};

/** How long a fetched cut-off stays fresh. It only changes when an admin edits it. */
const CUTOFF_STALE_MS = 5 * 60_000;

/**
 * FR-9 — the applicable cut-off and a live countdown, always visible on the
 * order screen.
 *
 * Two halves, deliberately separate:
 *   - the deadline itself is a query, because only the server knows which of
 *     FR-14's three overrides applies;
 *   - the countdown is a local one-second tick against that deadline, because
 *     polling the server every second for a clock would be absurd.
 *
 * When the countdown reaches zero the query is invalidated once, so the screen
 * learns the cut-off has moved to tomorrow rather than sitting at 00:00
 * forever. The server re-checks the cut-off on submit regardless, so this
 * countdown is a courtesy and never the control (FR-12).
 */
export function useCutoff(): CutoffResult {
  const { shopId } = useActiveShop();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.shop.cutoff(shopId),
    queryFn: () => getEffectiveCutoff(shopId),
    enabled: Boolean(shopId),
    staleTime: CUTOFF_STALE_MS,
  });

  const cutoffAt = query.data?.cutoffAt;

  const [secondsRemaining, setSecondsRemaining] = React.useState(
    query.data?.secondsRemaining ?? 0,
  );

  React.useEffect(() => {
    if (!cutoffAt) {
      setSecondsRemaining(0);
      return;
    }

    const remaining = () =>
      Math.max(Math.floor((new Date(cutoffAt).getTime() - Date.now()) / 1000), 0);

    setSecondsRemaining(remaining());

    const id = setInterval(() => {
      const next = remaining();
      setSecondsRemaining(next);

      if (next === 0) {
        // The window has closed. One refetch tells us what the next one is;
        // without it the strip would read 00:00 until the screen remounts.
        clearInterval(id);
        queryClient.invalidateQueries({
          queryKey: queryKeys.shop.cutoff(shopId),
        });
      }
    }, 1000);

    return () => clearInterval(id);
  }, [cutoffAt, queryClient, shopId]);

  return {
    cutoff: query.data,
    secondsRemaining,
    // Read from the live tick rather than the payload: a cut-off fetched two
    // minutes ago as "not passed" may well have passed since.
    passed: Boolean(query.data) && secondsRemaining <= 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? describeApiError(query.error) : undefined,
    refetch: () => {
      query.refetch();
    },
  };
}

export default useCutoff;
