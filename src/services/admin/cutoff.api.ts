import { apiDelete, apiGet, apiPost } from '../api';
import { addDays, toApiDate } from '../../utils/format';
import type { GlobalCutoff, Holiday, HolidayInput } from '../../types/admin';

/**
 * Cut-off configuration — FR-13, FR-14, FR-15.
 *
 * Endpoints: `/cutoff/global`, `/cutoff/shops`, `/cutoff/date`,
 * `/cutoff/holidays`, `/cutoff/shops/:shopId/effective`.
 *
 * Every time here is `HH:mm` in IST. India has no daylight saving and the app
 * fixes the offset at +05:30 throughout (deviation D3), so no time on this
 * screen carries a zone — there is only one.
 *
 * What the backend does not offer, and why the screen says so rather than
 * inventing it:
 *   - no read for the shop and date overrides these writes create, so the
 *     precedence explainer cannot show what is already in force for a future
 *     date (docs/api-gaps.md G24);
 *   - `/cutoff/shops/:id/effective` resolves against today, not against a
 *     delivery date (G23);
 *   - nothing runs at the cut-off, so a saved holiday is inert and the FR-16
 *     reminder offsets below are not sent (G22).
 */

/** FR-13 — the PRD's system default, used when no global cut-off is set yet. */
export const DEFAULT_CUTOFF_TIME = '22:00';

/**
 * FR-16 — the PRD's default reminder offsets, in minutes before the cut-off.
 *
 * Exported as a constant and shown read-only. There is no endpoint that stores
 * these and no scheduler that would send them (docs/api-gaps.md G22), so a
 * control here would write to nothing and imply reminders are going out.
 */
export const REMINDER_OFFSETS_MINUTES = [120, 30] as const;

/** `HH:mm` on a 24-hour clock, which is what every cut-off endpoint accepts. */
const CUTOFF_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidCutoffTime = (value: string): boolean =>
  CUTOFF_TIME_PATTERN.test(value.trim());

/** `YYYY-MM-DD`, and a real calendar date rather than 2026-02-31. */
export function isValidApiDate(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return false;
  }
  return toApiDate(trimmed) === trimmed;
}

/* -------------------------------------------------------------------------- */
/* Global cut-off — FR-13                                                      */
/* -------------------------------------------------------------------------- */

type ApiGlobalCutoff = { cutoffTime?: string | null } | null;

/**
 * `GET /cutoff/global` returns `data: null` until an admin sets one, so FR-13's
 * documented 22:00 default stands in. That is the PRD's own value, not a guess
 * — but `isSet` reports which of the two the caller is holding, because an
 * unsaved default and a saved 22:00 behave differently the moment anyone edits.
 */
export async function getGlobalCutoff(): Promise<GlobalCutoff> {
  const cutoff = await apiGet<ApiGlobalCutoff>('/cutoff/global');
  const cutoffTime = cutoff?.cutoffTime ?? null;

  return {
    cutoffTime: cutoffTime ?? DEFAULT_CUTOFF_TIME,
    isSet: Boolean(cutoffTime),
  };
}

/** The time alone, for the callers that only need a deadline. */
export async function getGlobalCutoffTime(): Promise<string> {
  return (await getGlobalCutoff()).cutoffTime;
}

/** FR-13 / FR-14 — `POST /cutoff/global`. Applies to every shop and every day. */
export async function setGlobalCutoffTime(cutoffTime: string): Promise<string> {
  const saved = await apiPost<ApiGlobalCutoff>('/cutoff/global', { cutoffTime });
  return saved?.cutoffTime ?? cutoffTime;
}

/* -------------------------------------------------------------------------- */
/* Overrides — FR-14                                                           */
/* -------------------------------------------------------------------------- */

/** FR-14 — date override, then shop override, then the global default. */
export async function getShopCutoffTime(shopId: string): Promise<string> {
  const cutoff = await apiGet<ApiGlobalCutoff>(`/cutoff/shops/${shopId}/effective`);
  return cutoff?.cutoffTime ?? DEFAULT_CUTOFF_TIME;
}

/**
 * FR-14 — `POST /cutoff/shops`. One shop, every day.
 *
 * Write-only: nothing lists these back and nothing removes one, so the only
 * way to undo it is to set it again to the global time (G24).
 */
export async function setShopCutoffTime(
  shopId: string,
  cutoffTime: string,
): Promise<void> {
  await apiPost<unknown>('/cutoff/shops', { shopId, cutoffTime });
}

/** FR-14 — `POST /cutoff/date`. One date, every shop. Write-only, as above. */
export async function setDateCutoffTime(
  date: string,
  cutoffTime: string,
): Promise<void> {
  await apiPost<unknown>('/cutoff/date', { date, cutoffTime });
}

/* -------------------------------------------------------------------------- */
/* Holiday calendar — FR-15                                                    */
/* -------------------------------------------------------------------------- */

type ApiHoliday = {
  id?: string | null;
  date?: string | null;
  name?: string | null;
  isNonDeliveryDay?: boolean | null;
} | null;

/**
 * Dates arrive as full ISO timestamps on some rows and as bare dates on others,
 * and the flag is absent on rows written before it existed. FR-15 treats a
 * missing flag as "deliveries continue", which is the safer of the two
 * readings: it never tells an admin a day is closed when it is not.
 */
function toHoliday(api: ApiHoliday): Holiday {
  return {
    id: api?.id ?? '',
    date: typeof api?.date === 'string' ? api.date.slice(0, 10) : '',
    name: api?.name ?? '',
    isNonDeliveryDay: api?.isNonDeliveryDay === true,
  };
}

/** FR-15 — `GET /cutoff/holidays`, oldest first so the calendar reads forward. */
export async function getHolidays(): Promise<Holiday[]> {
  const rows = await apiGet<ApiHoliday[] | null>('/cutoff/holidays');

  return (rows ?? [])
    .map(toHoliday)
    .filter(holiday => holiday.id && holiday.date)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** FR-15 — `POST /cutoff/holidays`. */
export async function addHoliday(input: HolidayInput): Promise<Holiday> {
  const saved = await apiPost<ApiHoliday>('/cutoff/holidays', {
    date: input.date,
    name: input.name,
    isNonDeliveryDay: input.isNonDeliveryDay,
  });

  return toHoliday(saved ?? { ...input });
}

/** FR-15 — `DELETE /cutoff/holidays/:id`. */
export async function deleteHoliday(holidayId: string): Promise<void> {
  await apiDelete<unknown>(`/cutoff/holidays/${holidayId}`);
}

/* -------------------------------------------------------------------------- */
/* Derived                                                                     */
/* -------------------------------------------------------------------------- */

/** Today's cut-off if it is still ahead, otherwise tomorrow's. */
export function nextCutoffIso(cutoffTime: string): string {
  const today = toApiDate(new Date());
  const todayCutoff = new Date(`${today}T${cutoffTime}:00+05:30`);

  return todayCutoff.getTime() > Date.now()
    ? todayCutoff.toISOString()
    : new Date(`${addDays(today, 1)}T${cutoffTime}:00+05:30`).toISOString();
}
