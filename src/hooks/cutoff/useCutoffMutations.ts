import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  addHoliday,
  deleteHoliday,
  setDateCutoffTime,
  setGlobalCutoffTime,
  setShopCutoffTime,
} from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import { rememberDateOverride, rememberShopOverride } from './sessionOverrides';
import type { HolidayInput } from '../../types/admin';

/**
 * FR-13, FR-14 and FR-15 writes.
 *
 * The dashboard's cut-off strip and the production plan both read the global
 * cut-off (`services/admin/dashboard.api.ts`, `production.api.ts`), so changing
 * it invalidates that tree too — otherwise the strip counts down to the old
 * deadline until the cache expires.
 *
 * The two override writes also record what they wrote into the session store,
 * which is the only way the precedence explainer can show them: nothing lists
 * them back (docs/api-gaps.md G24).
 */
export function useCutoffMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidateCutoff = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cutoff.all });
    // Both carry a cut-off derived from the global one.
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const fail = (error: unknown) =>
    toast.show(describeApiError(error), { tone: 'error' });

  /* FR-13 — the baseline every shop and day falls back to. */

  const setGlobal = useMutation({
    mutationFn: (cutoffTime: string) => setGlobalCutoffTime(cutoffTime),
    onSuccess: saved => {
      invalidateCutoff();
      toast.show(strings.cutoff.globalSaved(saved), { tone: 'success' });
    },
    onError: fail,
  });

  /* FR-14 — the two overrides above it. */

  const setShopOverride = useMutation({
    mutationFn: ({ shopId, cutoffTime }: { shopId: string; cutoffTime: string }) =>
      setShopCutoffTime(shopId, cutoffTime),
    onSuccess: (_saved, { shopId, cutoffTime }) => {
      rememberShopOverride(shopId, cutoffTime);
      invalidateCutoff();
      toast.show(strings.cutoff.shopSaved(cutoffTime), { tone: 'success' });
    },
    onError: fail,
  });

  const setDateOverride = useMutation({
    mutationFn: ({ date, cutoffTime }: { date: string; cutoffTime: string }) =>
      setDateCutoffTime(date, cutoffTime),
    onSuccess: (_saved, { date, cutoffTime }) => {
      rememberDateOverride(date, cutoffTime);
      invalidateCutoff();
      toast.show(strings.cutoff.dateSaved(cutoffTime), { tone: 'success' });
    },
    onError: fail,
  });

  /* FR-15 — the holiday calendar. Recorded, not enforced (gap G22). */

  const createHoliday = useMutation({
    mutationFn: (input: HolidayInput) => addHoliday(input),
    onSuccess: () => {
      invalidateCutoff();
      toast.show(strings.cutoff.holidaySaved, { tone: 'success' });
    },
    onError: fail,
  });

  const removeHoliday = useMutation({
    mutationFn: (holidayId: string) => deleteHoliday(holidayId),
    onSuccess: () => {
      invalidateCutoff();
      toast.show(strings.cutoff.holidayDeleted, { tone: 'success' });
    },
    onError: fail,
  });

  return {
    setGlobal,
    setShopOverride,
    setDateOverride,
    createHoliday,
    removeHoliday,
  };
}

export default useCutoffMutations;
