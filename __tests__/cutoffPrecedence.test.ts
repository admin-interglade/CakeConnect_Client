import { resolveCutoff } from '../src/hooks/cutoff/useCutoffResolution';
import {
  isValidApiDate,
  isValidCutoffTime,
} from '../src/services/admin/cutoff.api';
import type { GlobalCutoff, Holiday } from '../src/types/admin';

/**
 * FR-14's ladder is the one rule on the cut-off screen an admin acts on without
 * being able to check it: date beats shop beats global. These pin both halves
 * of the answer — the time, and how much of it is actually known — because on
 * this backend most of the ladder cannot be read back (docs/api-gaps.md G24)
 * and a confident-looking wrong answer is the failure mode that costs an order.
 */

const savedGlobal: GlobalCutoff = { cutoffTime: '21:00', isSet: true };
const unsavedGlobal: GlobalCutoff = { cutoffTime: '22:00', isSet: false };

const noOverrides = { shops: {}, dates: {} };

const session = (
  shops: Record<string, string> = {},
  dates: Record<string, string> = {},
) => ({
  shops: Object.fromEntries(
    Object.entries(shops).map(([id, cutoffTime]) => [
      id,
      { cutoffTime, savedAt: '2026-09-07T08:30:00.000Z' },
    ]),
  ),
  dates: Object.fromEntries(
    Object.entries(dates).map(([date, cutoffTime]) => [
      date,
      { cutoffTime, savedAt: '2026-09-07T08:30:00.000Z' },
    ]),
  ),
});

const base = {
  shopId: 'shop-1',
  date: '2026-09-20',
  holidays: [] as Holiday[],
};

describe('resolveCutoff — FR-14 precedence', () => {
  it('falls back to the global cut-off when nothing else is known', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: noOverrides,
    });

    expect(result.cutoffTime).toBe('21:00');
    expect(result.source).toBe('global');
  });

  it('names the PRD default rather than a saved global when none is saved', () => {
    const result = resolveCutoff({
      ...base,
      global: unsavedGlobal,
      session: noOverrides,
    });

    expect(result.cutoffTime).toBe('22:00');
    expect(result.source).toBe('default');
    expect(result.layers[2]).toMatchObject({ source: 'default', origin: 'prd' });
  });

  it('puts a shop override above the global', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: session({ 'shop-1': '19:30' }),
    });

    expect(result.cutoffTime).toBe('19:30');
    expect(result.source).toBe('shop');
    expect(result.layers[2].state).toBe('overridden');
  });

  it('ignores a shop override belonging to a different shop', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: session({ 'shop-2': '19:30' }),
    });

    expect(result.cutoffTime).toBe('21:00');
    expect(result.layers[1].state).toBe('unknown');
  });

  it('puts a date override above both', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: session({ 'shop-1': '19:30' }, { '2026-09-20': '17:00' }),
    });

    expect(result.cutoffTime).toBe('17:00');
    expect(result.source).toBe('date');
    expect(result.layers.map(layer => layer.state)).toEqual([
      'applies',
      'overridden',
      'overridden',
    ]);
  });
});

describe('resolveCutoff — what is known versus what is guessed', () => {
  it('reports an unreadable layer as unknown, not as absent', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: noOverrides,
    });

    expect(result.layers[0]).toEqual({ source: 'date', state: 'unknown' });
    expect(result.layers[1]).toEqual({ source: 'shop', state: 'unknown' });
    expect(result.layers[0].cutoffTime).toBeUndefined();
  });

  it('is uncertain without the server, because an unseen override may outrank it', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: session({ 'shop-1': '19:30' }),
    });

    expect(result.serverConfirmed).toBe(false);
    expect(result.uncertain).toBe(true);
  });

  it('is certain once a date override is held: nothing outranks the top rung', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: session({}, { '2026-09-20': '17:00' }),
    });

    expect(result.uncertain).toBe(false);
  });

  it("prefers the server's answer for today and stops guessing", () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: noOverrides,
      serverCutoffTime: '20:00',
    });

    expect(result.cutoffTime).toBe('20:00');
    expect(result.serverConfirmed).toBe(true);
    expect(result.uncertain).toBe(false);
  });

  it('refuses to name a layer when the server disagrees with the visible ladder', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: noOverrides,
      serverCutoffTime: '20:00',
    });

    // 20:00 is neither the global nor anything this app wrote, so an override
    // it cannot read is in force. Guessing which one would be a fabrication.
    expect(result.source).toBe('unattributed');
  });

  it('keeps the visible attribution when the server agrees with it', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: session({ 'shop-1': '19:30' }),
      serverCutoffTime: '19:30',
    });

    expect(result.source).toBe('shop');
  });
});

describe('resolveCutoff — the holiday calendar', () => {
  const holiday: Holiday = {
    id: 'h1',
    date: '2026-09-20',
    name: 'Ganesh Chaturthi',
    isNonDeliveryDay: true,
  };

  it('attaches the holiday falling on the resolved date', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: noOverrides,
      holidays: [holiday],
    });

    expect(result.holiday).toEqual(holiday);
  });

  it('does not let a holiday change the cut-off, because the backend does not', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: noOverrides,
      holidays: [holiday],
    });

    expect(result.cutoffTime).toBe('21:00');
  });

  it('ignores a holiday on another date', () => {
    const result = resolveCutoff({
      ...base,
      global: savedGlobal,
      session: noOverrides,
      holidays: [{ ...holiday, date: '2026-09-21' }],
    });

    expect(result.holiday).toBeUndefined();
  });
});

describe('cut-off input validation', () => {
  it('accepts 24-hour times and rejects anything the API would refuse', () => {
    ['00:00', '09:05', '22:00', '23:59'].forEach(value =>
      expect(isValidCutoffTime(value)).toBe(true),
    );

    ['24:00', '22:60', '9:05', '22.00', '10:00 PM', ''].forEach(value =>
      expect(isValidCutoffTime(value)).toBe(false),
    );
  });

  it('rejects a date that parses but does not exist', () => {
    expect(isValidApiDate('2026-09-20')).toBe(true);
    expect(isValidApiDate('2026-02-31')).toBe(false);
    expect(isValidApiDate('20-09-2026')).toBe(false);
  });
});
