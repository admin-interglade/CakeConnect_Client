import { useQuery } from '@tanstack/react-query';

import { getShopCutoffTime } from '../../services/admin';
import { queryKeys } from '../queryKeys';
import { toApiDate } from '../../utils/format';
import { useSessionOverrides, type SessionOverrides } from './sessionOverrides';
import type {
  CutoffLayer,
  CutoffResolution,
  GlobalCutoff,
  Holiday,
} from '../../types/admin';

/**
 * FR-14 — which cut-off applies to a given shop on a given date, and why.
 *
 * The backend applies date -> shop -> global itself, but exposes the result for
 * **today only**: `/cutoff/shops/:id/effective` ignores the date it is asked
 * about (docs/api-gaps.md G23), and neither override can be listed back (G24).
 *
 * So the explainer answers in two different registers, and says which it is in:
 *
 *   - today          the server's own resolution, authoritative;
 *   - any other date the ladder as far as this app can see it, which is the
 *                    global default plus whatever this session wrote.
 *
 * Every rung the app cannot see is reported as `unknown` rather than as absent.
 * An admin who reads "no shop override" and sets a global cut-off on that basis
 * has been told something this app does not know.
 */

type ResolutionInput = {
  shopId: string;
  /** `YYYY-MM-DD` in IST. */
  date: string;
  global: GlobalCutoff;
  session: SessionOverrides;
  holidays: Holiday[];
  /** The server's answer for today, when the date asked about is today. */
  serverCutoffTime?: string;
};

/**
 * Pure so the precedence rule can be reasoned about — and tested — without a
 * server, a clock or a component.
 */
export function resolveCutoff({
  shopId,
  date,
  global,
  session,
  holidays,
  serverCutoffTime,
}: ResolutionInput): CutoffResolution {
  const dateOverride = session.dates[date];
  const shopOverride = session.shops[shopId];
  const globalSource = global.isSet ? 'global' : 'default';

  const layers: CutoffLayer[] = [
    dateOverride
      ? {
          source: 'date',
          state: 'applies',
          cutoffTime: dateOverride.cutoffTime,
          origin: 'session',
          savedAt: dateOverride.savedAt,
        }
      : { source: 'date', state: 'unknown' },
    shopOverride
      ? {
          source: 'shop',
          state: dateOverride ? 'overridden' : 'applies',
          cutoffTime: shopOverride.cutoffTime,
          origin: 'session',
          savedAt: shopOverride.savedAt,
        }
      : { source: 'shop', state: 'unknown' },
    {
      source: globalSource,
      state: dateOverride || shopOverride ? 'overridden' : 'applies',
      cutoffTime: global.cutoffTime,
      origin: global.isSet ? 'server' : 'prd',
    },
  ];

  // What the ladder says with only the layers this app can see.
  const visibleTime =
    dateOverride?.cutoffTime ?? shopOverride?.cutoffTime ?? global.cutoffTime;
  const visibleSource = dateOverride ? 'date' : shopOverride ? 'shop' : globalSource;

  const serverConfirmed = serverCutoffTime !== undefined;

  // The server knows the time for certain; it does not say which layer supplied
  // it. When the two disagree, the server is right about the *time* and the app
  // cannot name the layer — which is the honest answer, not a guess at one.
  const cutoffTime = serverCutoffTime ?? visibleTime;
  const source =
    serverConfirmed && serverCutoffTime !== visibleTime ? 'unattributed' : visibleSource;

  return {
    shopId,
    date,
    cutoffTime,
    source,
    layers,
    serverConfirmed,
    // A date override is the top of the ladder: once we hold one, nothing
    // unseen can outrank it. Otherwise an override we cannot read may be in
    // force, and the time shown is the best guess rather than the answer.
    uncertain: !serverConfirmed && !dateOverride,
    holiday: holidays.find(entry => entry.date === date),
  };
}

type ResolutionResult = {
  resolution?: CutoffResolution;
  isLoading: boolean;
};

/**
 * Resolves live as the admin changes the shop or the date. Undefined until the
 * global cut-off has loaded — there is no ladder without its bottom rung.
 */
export function useCutoffResolution(
  shopId: string,
  date: string,
  global: GlobalCutoff | undefined,
  holidays: Holiday[],
): ResolutionResult {
  const session = useSessionOverrides();
  const isToday = date === toApiDate(new Date());

  const effective = useQuery({
    queryKey: queryKeys.cutoff.effective(shopId),
    queryFn: () => getShopCutoffTime(shopId),
    // Only today: for any other date this endpoint answers about today anyway
    // (G23), and showing that as tomorrow's cut-off would be worse than saying
    // we do not know.
    enabled: Boolean(shopId) && isToday,
    staleTime: 5 * 60_000,
  });

  if (!global) {
    return { resolution: undefined, isLoading: true };
  }

  return {
    resolution: resolveCutoff({
      shopId,
      date,
      global,
      session,
      holidays,
      serverCutoffTime: isToday ? effective.data : undefined,
    }),
    isLoading: isToday && effective.isLoading,
  };
}

export default useCutoffResolution;
