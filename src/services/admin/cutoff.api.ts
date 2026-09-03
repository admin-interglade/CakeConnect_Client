import { apiGet } from '../api';
import { addDays, toApiDate } from '../../utils/format';

/**
 * Cut-off configuration — FR-13, FR-14.
 *
 * Endpoints: `/cutoff/global`, `/cutoff/shops/:shopId/effective`.
 */

/** FR-13 — the PRD's system default, used when no global cut-off is set yet. */
export const DEFAULT_CUTOFF_TIME = '22:00';

type ApiGlobalCutoff = { cutoffTime?: string | null } | null;

/**
 * `GET /cutoff/global` returns `data: null` until an admin sets one, so FR-13's
 * documented 22:00 default stands in. That is the PRD's own value, not a guess.
 */
export async function getGlobalCutoffTime(): Promise<string> {
  const cutoff = await apiGet<ApiGlobalCutoff>('/cutoff/global');
  return cutoff?.cutoffTime ?? DEFAULT_CUTOFF_TIME;
}

/** FR-14 — date override, then shop override, then the global default. */
export async function getShopCutoffTime(shopId: string): Promise<string> {
  const cutoff = await apiGet<ApiGlobalCutoff>(`/cutoff/shops/${shopId}/effective`);
  return cutoff?.cutoffTime ?? DEFAULT_CUTOFF_TIME;
}

/** Today's cut-off if it is still ahead, otherwise tomorrow's. */
export function nextCutoffIso(cutoffTime: string): string {
  const today = toApiDate(new Date());
  const todayCutoff = new Date(`${today}T${cutoffTime}:00+05:30`);

  return todayCutoff.getTime() > Date.now()
    ? todayCutoff.toISOString()
    : new Date(`${addDays(today, 1)}T${cutoffTime}:00+05:30`).toISOString();
}
