import { bandForPm25 } from './bands.ts';
import { hourlySeries, type AirQualityResponse } from './open-meteo.ts';
import type { History, HistoryDay, LatestReport, Location } from './types.ts';
import { validateHistory } from './validate.ts';

export const HISTORY_TZ = 'UTC+7 day boundaries';
export const RETENTION_DAYS = 800;
const HOURS_PER_DAY = 24;
const BOUNDARY_OFFSET_MS = 7 * 3600e3;

interface Hour {
  time: string;
  pm25: number | null;
}

/** Hourly PM2.5 per city id, each hour stamped in UTC (null for a model gap). */
export type HourlyById = ReadonlyMap<string, readonly Hour[]>;

/** Pairs each location with its hourly series, for `updateHistory`. */
export function hourlyById(locations: readonly Location[], airQuality: readonly AirQualityResponse[]): HourlyById {
  return new Map(locations.map((loc, i) => [loc.id, hourlySeries(airQuality[i])]));
}

/**
 * Calendar day in UTC+7 for a UTC instant. One boundary for every city, Kuala Lumpur (UTC+8) included,
 * so the days stay comparable across cities.
 */
const dayKey = (ms: number): string => new Date(ms + BOUNDARY_OFFSET_MS).toISOString().slice(0, 10);

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Means of the UTC+7 days for which all 24 hours are present. */
function completeDayMeans(hours: readonly Hour[]): Map<string, number> {
  const byDay = new Map<string, number[]>();
  const gappy = new Set<string>();
  for (const h of hours) {
    const day = dayKey(Date.parse(h.time));
    if (h.pm25 === null) gappy.add(day);
    else byDay.set(day, [...(byDay.get(day) ?? []), h.pm25]);
  }
  const means = new Map<string, number>();
  for (const [day, values] of byDay) {
    if (!gappy.has(day) && values.length === HOURS_PER_DAY) means.set(day, round1(values.reduce((a, b) => a + b, 0) / HOURS_PER_DAY));
  }
  return means;
}

/**
 * Next version of history.json. Pure; never throws on a bad `previous` (starts fresh instead).
 * Per city: today's entry keeps a running max of hotspots_24h; a past day gets its mean and band once all 24 hours are known, and is then left alone.
 */
export function updateHistory(previous: History | null, report: LatestReport, now: Date, hourly: HourlyById): History {
  const usable = previous !== null && validateHistory(previous).length === 0;
  const base: History['days'] = usable ? previous.days : {};
  const today = dayKey(now.getTime());
  const days: History['days'] = {};
  for (const id of [...new Set([...Object.keys(base), ...report.locations.map(l => l.id)])].sort()) {
    const city: Record<string, HistoryDay> = {};
    for (const [date, day] of Object.entries(base[id] ?? {})) city[date] = [day[0], day[1], day[2]];
    const loc = report.locations.find(l => l.id === id);
    if (loc !== undefined) {
      const entry: HistoryDay = city[today] ?? [null, null, null];
      city[today] = [entry[0], entry[1], Math.max(entry[2] ?? 0, loc.hotspots_24h.count)];
      for (const [date, mean] of completeDayMeans(hourly.get(id) ?? [])) {
        if (date >= today || city[date]?.[0] != null) continue;
        city[date] = [mean, bandForPm25(mean), city[date]?.[2] ?? null];
      }
    }
    const kept = Object.keys(city).sort().slice(-RETENTION_DAYS);
    if (kept.length > 0) days[id] = Object.fromEntries(kept.map(d => [d, city[d]]));
  }
  return { version: 1, generated_at: now.toISOString(), tz: HISTORY_TZ, days };
}
