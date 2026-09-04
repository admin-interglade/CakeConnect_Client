import type { EffectiveCutoff } from '../../types/shop';
import { apiGet } from '../api';
import { toEffectiveCutoff, type ApiEffectiveCutoff } from '../mappers';

/**
 * Cut-off as the shop experiences it — FR-9, FR-13.
 *
 * Endpoints: `/cutoff/shops/:shopId/effective`, `/cutoff/global`.
 */

/** FR-13 — the PRD's system default, used when no global cut-off is set yet. */
export const DEFAULT_CUTOFF_TIME = '22:00';

/**
 * FR-9 — the cut-off this shop is racing, with the countdown derived from it.
 *
 * The backend applies FR-14's date-override -> shop-override -> global-default
 * precedence itself and answers with a single `cutoffTime`, so the client never
 * re-implements that resolution. It returns `data: null` before any cut-off has
 * been configured, in which case FR-13's documented 22:00 stands in — the PRD's
 * own value, not a guess.
 */
export async function getEffectiveCutoff(shopId: string): Promise<EffectiveCutoff> {
  const api = await apiGet<ApiEffectiveCutoff>(`/cutoff/shops/${shopId}/effective`);
  return toEffectiveCutoff(api, shopId, DEFAULT_CUTOFF_TIME);
}
