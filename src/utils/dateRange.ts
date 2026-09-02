/**
 * FR-19 date-range presets. Resolved in IST so "today" flips at midnight IST
 * regardless of where the device clock is set.
 */

import type { DateRange, DateRangePreset } from '../types/admin';
import { addDays, nowInIst, toApiDate } from './format';

export const rangePresets: { key: DateRangePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This week' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'custom', label: 'Custom' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const istDate = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

/**
 * Turns a preset into concrete inclusive bounds. `custom` keeps whatever the
 * caller already had, since only the user can supply those dates.
 */
export function resolveRange(preset: DateRangePreset, current?: DateRange): DateRange {
  const ist = nowInIst();
  const today = toApiDate(new Date());
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();

  switch (preset) {
    case 'today':
      return { preset, from: today, to: today };

    case 'yesterday': {
      const yesterday = addDays(today, -1);
      return { preset, from: yesterday, to: yesterday };
    }

    case 'thisWeek': {
      // Weeks run Monday to Sunday, which is how the shops read their trade week.
      const dayOfWeek = ist.getUTCDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      return { preset, from: addDays(today, -daysSinceMonday), to: today };
    }

    case 'thisMonth':
      return { preset, from: istDate(year, month, 1), to: today };

    case 'lastMonth': {
      const lastMonthYear = month === 0 ? year - 1 : year;
      const lastMonth = month === 0 ? 11 : month - 1;
      const firstOfThisMonth = istDate(year, month, 1);
      return {
        preset,
        from: istDate(lastMonthYear, lastMonth, 1),
        to: addDays(firstOfThisMonth, -1),
      };
    }

    case 'custom':
    default:
      return current?.preset === 'custom'
        ? current
        : { preset: 'custom', from: today, to: today };
  }
}

/** The range every admin screen opens on. */
export const defaultRange = (): DateRange => resolveRange('thisMonth');

/** Rejects reversed or malformed bounds before they reach the API. */
export function isValidRange(from: string, to: string): boolean {
  const shape = /^\d{4}-\d{2}-\d{2}$/;
  if (!shape.test(from) || !shape.test(to)) {
    return false;
  }
  return from <= to;
}
