import { useQuery } from '@tanstack/react-query';

import { getGlobalCutoff, getHolidays } from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import type { GlobalCutoff, Holiday } from '../../types/admin';

/** A cut-off changes when an admin changes it, and no sooner. */
const CUTOFF_STALE_MS = 5 * 60_000;

type CutoffSettingsResult = {
  global?: GlobalCutoff;
  holidays: Holiday[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  /**
   * Reported on its own: an empty calendar and a calendar that failed to load
   * look identical, and only one of them means "no holidays are set".
   */
  holidaysError?: string;
  isRefetching: boolean;
  refetch: () => void;
};

/**
 * FR-13 and FR-15 — the two halves of the cut-off configuration that can
 * actually be read back: the global default and the holiday calendar.
 *
 * The per-shop and per-date overrides of FR-14 are absent on purpose. They are
 * write-only on this backend (docs/api-gaps.md G24), and a query that returned
 * an empty list for them would be a lie the screen would then draw.
 */
export function useCutoffSettings(): CutoffSettingsResult {
  const global = useQuery({
    queryKey: queryKeys.cutoff.global,
    queryFn: getGlobalCutoff,
    staleTime: CUTOFF_STALE_MS,
  });

  const holidays = useQuery({
    queryKey: queryKeys.cutoff.holidays,
    queryFn: getHolidays,
    staleTime: CUTOFF_STALE_MS,
  });

  return {
    global: global.data,
    holidays: holidays.data ?? [],
    isLoading: global.isLoading || holidays.isLoading,
    // The global cut-off is the screen's spine: without it there is nothing to
    // edit and nothing to resolve against, so its failure is the screen's.
    isError: global.isError,
    error: global.isError ? describeApiError(global.error) : undefined,
    holidaysError: holidays.isError ? describeApiError(holidays.error) : undefined,
    isRefetching: global.isRefetching || holidays.isRefetching,
    refetch: () => {
      global.refetch();
      holidays.refetch();
    },
  };
}

export default useCutoffSettings;
