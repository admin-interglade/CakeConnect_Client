/**
 * Formatting helpers shared by every admin screen.
 *
 * Two PRD rules live here rather than at the call sites: money is grouped in
 * the Indian lakh/crore convention (PRD §5 Localisation) and every date is
 * interpreted in IST. India has no daylight saving, so IST is handled as a
 * fixed +05:30 offset instead of relying on `Intl` time-zone data, which is
 * not present on every Hermes build.
 */

import type { OrderStatus, ShopStatus } from '../types/admin';

/** Minutes east of UTC for Asia/Kolkata. */
const IST_OFFSET_MINUTES = 330;
const MS_PER_MINUTE = 60_000;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Shifts an instant into IST and returns a Date whose *UTC* getters read as
 * IST wall-clock values. Only ever read it back with the `getUTC*` family.
 */
function toIst(value: Date | string): Date {
  const date = typeof value === 'string' ? parseIsoOrDate(value) : value;
  return new Date(date.getTime() + IST_OFFSET_MINUTES * MS_PER_MINUTE);
}

/**
 * A bare `YYYY-MM-DD` is an IST calendar date, not a UTC instant — parsing it
 * with `new Date()` alone would shift it a day backwards for IST readers.
 */
function parseIsoOrDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00+05:30`);
  }
  return new Date(value);
}

/** Current instant as IST wall-clock (read with `getUTC*`). */
export function nowInIst(): Date {
  return toIst(new Date());
}

/** `YYYY-MM-DD` in IST — the format every API filter expects. */
export function toApiDate(value: Date | string): string {
  const ist = toIst(value);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** Calendar arithmetic on an API date string, staying in IST. */
export function addDays(apiDate: string, days: number): string {
  const ist = toIst(apiDate);
  ist.setUTCDate(ist.getUTCDate() + days);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** "02 Sep 2026" */
export function formatDate(value: Date | string): string {
  const ist = toIst(value);
  return `${pad(ist.getUTCDate())} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

/** "Tue, 02 Sep" — compact form for table cells and chart axes. */
export function formatShortDate(value: Date | string): string {
  const ist = toIst(value);
  return `${DAYS[ist.getUTCDay()]}, ${pad(ist.getUTCDate())} ${MONTHS[ist.getUTCMonth()]}`;
}

/** "Sep 2026" — the heading a grouped ledger or order list is split by. */
export function formatMonthYear(value: Date | string): string {
  const ist = toIst(value);
  return `${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

/** "22:00" in 24-hour IST, matching how the PRD states the cut-off. */
export function formatTime(value: Date | string): string {
  const ist = toIst(value);
  return `${pad(ist.getUTCHours())}:${pad(ist.getUTCMinutes())}`;
}

/** "02 Sep 2026, 21:47" — used on audit rows and status timelines. */
export function formatDateTime(value: Date | string): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** Inclusive range label, collapsing to a single date when both ends match. */
export function formatDateRange(from: string, to: string): string {
  return from === to ? formatDate(from) : `${formatDate(from)} - ${formatDate(to)}`;
}

/**
 * Indian digit grouping: the last three digits, then pairs.
 * 1234567 -> "12,34,567".
 */
function groupIndian(whole: string): string {
  if (whole.length <= 3) {
    return whole;
  }
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/** "₹12,34,567" — the single money formatter for the whole app. */
export function formatCurrency(
  amount: number,
  { decimals = 0 }: { decimals?: number } = {},
): string {
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);
  const fixed = absolute.toFixed(decimals);
  const [whole, fraction] = fixed.split('.');
  const grouped = groupIndian(whole);
  return `${sign}₹${grouped}${fraction ? `.${fraction}` : ''}`;
}

/**
 * Lakh/crore short form for stat tiles, where the full figure would wrap.
 * 1250000 -> "₹12.5 L". Anything under a lakh keeps its exact value.
 */
export function formatCurrencyCompact(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);

  if (absolute >= 10_000_000) {
    return `${sign}₹${trimZero(absolute / 10_000_000)} Cr`;
  }
  if (absolute >= 100_000) {
    return `${sign}₹${trimZero(absolute / 100_000)} L`;
  }
  return formatCurrency(amount);
}

const trimZero = (value: number) => value.toFixed(1).replace(/\.0$/, '');

/** "12,34,567" — quantities use the same grouping, without the symbol. */
export function formatNumber(value: number): string {
  return groupIndian(Math.round(value).toString());
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Credit utilisation as a 0-100 percentage, guarding a zero limit. */
export function creditUtilisation(used: number, limit: number): number {
  if (limit <= 0) {
    return 0;
  }
  return Math.min(Math.round((used / limit) * 100), 100);
}

/** FR-40 labels. Kept beside the type so a new status cannot ship unlabelled. */
export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  accepted: 'Accepted',
  in_production: 'In production',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  invoiced: 'Invoiced',
  cancelled: 'Cancelled',
};

export const shopStatusLabels: Record<ShopStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  inactive: 'Inactive',
};

/** The FR-40 pipeline in order, excluding the terminal `cancelled` branch. */
export const orderStatusFlow: OrderStatus[] = [
  'submitted',
  'accepted',
  'in_production',
  'dispatched',
  'delivered',
  'invoiced',
];

/**
 * The single legal next status for an order, or null at the end of the flow.
 * Screens render actions from this rather than hard-coding transitions.
 */
export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  const index = orderStatusFlow.indexOf(status);
  if (index === -1 || index === orderStatusFlow.length - 1) {
    return null;
  }
  return orderStatusFlow[index + 1];
}

/** FR-40 — cancellation is allowed up to, but not including, dispatch. */
export function canCancelOrder(status: OrderStatus): boolean {
  return ['draft', 'submitted', 'accepted', 'in_production'].includes(status);
}

/** "2h 14m" / "18m" — countdown copy for the cut-off strip. */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) {
    return '00:00';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? `${hours}h ${pad(minutes)}m`
    : `${pad(minutes)}:${pad(seconds)}`;
}
