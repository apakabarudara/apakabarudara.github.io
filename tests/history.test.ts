import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RETENTION_DAYS, updateHistory, type HourlyById } from '../ingest/history.ts';
import type { History, LatestReport, LocationReport } from '../ingest/types.ts';
import { validateHistory } from '../ingest/validate.ts';

const city = (id: string, hotspots: number): LocationReport =>
  ({ id, hotspots_24h: { count: hotspots, radius_km: 100, source: 's', updated_at: '2026-10-14T00:00:00.000Z' } }) as LocationReport;
const report = (...locations: LocationReport[]): LatestReport => ({ generated_at: 'x', locations });

/** 24 hourly values for the UTC+7 day `date` (it starts at 17:00Z the day before), all `pm25`. */
const day = (date: string, pm25: number | null, hours = 24): { time: string; pm25: number | null }[] =>
  Array.from({ length: hours }, (_, i) => ({ time: new Date(Date.parse(`${date}T00:00:00Z`) - 7 * 3600e3 + i * 3600e3).toISOString(), pm25 }));
const hours = (id: string, ...series: { time: string; pm25: number | null }[][]): HourlyById => new Map([[id, series.flat()]]);

const NOON_15 = new Date('2026-10-15T05:00:00Z'); // 12:00 UTC+7 on the 15th
const empty: HourlyById = new Map();

describe('updateHistory', () => {
  it('starts fresh and records the completed past day plus today running max', () => {
    const h = updateHistory(null, report(city('a', 3)), NOON_15, hours('a', day('2026-10-14', 20), day('2026-10-15', 30)));
    assert.deepEqual(h.days, { a: { '2026-10-14': [20, 2, null], '2026-10-15': [null, null, 3] } });
    assert.equal(h.version, 1);
    assert.equal(h.tz, 'UTC+7 day boundaries');
    assert.deepEqual(validateHistory(h), []);
  });

  it('a normal later hour only moves generated_at and the hotspot running max', () => {
    const series = hours('a', day('2026-10-14', 20), day('2026-10-15', 30));
    const first = updateHistory(null, report(city('a', 3)), NOON_15, series);
    const lower = updateHistory(first, report(city('a', 1)), new Date('2026-10-15T06:00:00Z'), series);
    assert.deepEqual(lower.days, first.days);
    assert.equal(lower.generated_at, '2026-10-15T06:00:00.000Z');
    const higher = updateHistory(first, report(city('a', 7)), new Date('2026-10-15T07:00:00Z'), series);
    assert.deepEqual(higher.days.a['2026-10-15'], [null, null, 7]);
  });

  it('records a day exactly once when midnight UTC+7 passes, keeping its running max', () => {
    const series = hours('a', day('2026-10-14', 20), day('2026-10-15', 40), day('2026-10-16', 9));
    const before = updateHistory(null, report(city('a', 5)), new Date('2026-10-15T16:30:00Z'), series); // 23:30 UTC+7 on the 15th
    assert.deepEqual(before.days.a['2026-10-15'], [null, null, 5]);
    const after = updateHistory(before, report(city('a', 2)), new Date('2026-10-15T17:30:00Z'), series); // 00:30 on the 16th
    assert.deepEqual(after.days.a['2026-10-15'], [40, 2, 5]);
    assert.deepEqual(after.days.a['2026-10-16'], [null, null, 2]);
    // A changed model value later does not rewrite the recorded day.
    const later = updateHistory(after, report(city('a', 2)), new Date('2026-10-15T18:30:00Z'), hours('a', day('2026-10-15', 99)));
    assert.deepEqual(later.days.a['2026-10-15'], [40, 2, 5]);
  });

  it('does not record a day with missing hours, then fills it when a later run has them', () => {
    const gappy = updateHistory(null, report(city('a', 0)), NOON_15, hours('a', [...day('2026-10-14', 20, 23), ...day('2026-10-14', null, 1).map(h => ({ ...h, time: '2026-10-14T16:00:00.000Z' }))]));
    assert.deepEqual(gappy.days.a['2026-10-14'], undefined);
    const nulls = updateHistory(null, report(city('a', 0)), NOON_15, hours('a', [...day('2026-10-14', 20).slice(1), { time: day('2026-10-14', 0)[0].time, pm25: null }]));
    assert.deepEqual(nulls.days.a['2026-10-14'], undefined);
    const filled = updateHistory(gappy, report(city('a', 0)), NOON_15, hours('a', day('2026-10-14', 20)));
    assert.deepEqual(filled.days.a['2026-10-14'], [20, 2, null]);
  });

  it('starts fresh from a malformed previous file without throwing', () => {
    const bad = { version: 2, days: 'x' } as unknown as History;
    assert.deepEqual(updateHistory(bad, report(city('a', 1)), NOON_15, empty).days, { a: { '2026-10-15': [null, null, 1] } });
  });

  it('keeps only the last 800 days per city', () => {
    const old: Record<string, [number, 1, number]> = {};
    for (let i = 0; i < 800; i++) old[new Date(Date.parse('2024-01-01T00:00:00Z') + i * 864e5).toISOString().slice(0, 10)] = [5, 1, 0];
    const prev: History = { version: 1, generated_at: '2026-10-14T00:00:00.000Z', tz: 'x', days: { a: old } };
    const h = updateHistory(prev, report(city('a', 0)), NOON_15, empty);
    const keys = Object.keys(h.days.a);
    assert.equal(keys.length, RETENTION_DAYS);
    assert.equal(keys[0], '2024-01-02');
    assert.equal(keys.at(-1), '2026-10-15');
  });

  it('uses the same UTC+7 boundary for Kuala Lumpur (UTC+8 local hours are stamped in UTC)', () => {
    // KL local day 14th 00:00 is 16:00Z on the 13th = 23:00 UTC+7 on the 13th: that hour belongs to the 13th, not the 14th.
    const klHours = Array.from({ length: 48 }, (_, i) => ({ time: new Date(Date.parse('2026-10-13T16:00:00Z') + i * 3600e3).toISOString(), pm25: 10 }));
    const h = updateHistory(null, report(city('kl', 0)), NOON_15, hours('kl', klHours));
    assert.equal(h.days.kl['2026-10-13'], undefined); // only 1 hour of the 13th present
    assert.deepEqual(h.days.kl['2026-10-14'], [10, 1, null]);
  });
});

describe('validateHistory', () => {
  const ok = (): History => ({ version: 1, generated_at: '2026-10-15T00:00:00.000Z', tz: 'x', days: { a: { '2026-10-14': [20, 2, 3], '2026-10-15': [null, null, 0] } } });
  it('accepts a good file', () => assert.deepEqual(validateHistory(ok()), []));
  it('rejects bad version, date key, band, count and mean', () => {
    const h = ok();
    (h as { version: number }).version = 2;
    assert.equal(validateHistory(h).length, 1);
    const bad = ok();
    (bad.days.a as Record<string, unknown>)['14-10-2026'] = [1, 1, 1];
    (bad.days.a as Record<string, unknown>)['2026-10-13'] = [1, 6, 1];
    (bad.days.a as Record<string, unknown>)['2026-10-12'] = [1, 1, -1];
    (bad.days.a as Record<string, unknown>)['2026-10-11'] = [-5, 1, 1];
    (bad.days.a as Record<string, unknown>)['2026-10-10'] = [1, 1, 1.5];
    assert.equal(validateHistory(bad).length, 5);
  });
  it('rejects non-objects', () => {
    assert.ok(validateHistory(null as unknown as History).length > 0);
    assert.ok(validateHistory({ ...ok(), days: [] } as unknown as History).length > 0);
  });
});
