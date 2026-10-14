import type { Location } from './types.ts';

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const HOURS_PER_DAY = 24;

export interface AirQualityResponse {
  utc_offset_seconds: number;
  hourly: { time: string[]; pm2_5: (number | null)[] };
}

export interface ForecastResponse {
  current: { time: string; wind_direction_10m: number | null };
  daily: { time: string[]; precipitation_sum: (number | null)[] };
}

export interface DailyMean {
  date: string;
  pm25_mean: number;
}

interface OpenMeteoError {
  error: true;
  reason: string;
}

/** Open-Meteo answers one location with an object and several with an array, in request order. */
async function getPerLocation<T>(baseUrl: string, locations: readonly Location[], params: Record<string, string>): Promise<T[]> {
  const query = new URLSearchParams({
    latitude: locations.map(l => l.lat).join(','),
    longitude: locations.map(l => l.lon).join(','),
    timezone: 'auto',
    ...params
  });
  const res = await fetch(`${baseUrl}?${query}`);
  const body = (await res.json()) as T | T[] | OpenMeteoError;
  if (!res.ok || (typeof body === 'object' && body !== null && 'error' in body)) {
    const reason = typeof body === 'object' && body !== null && 'reason' in body ? body.reason : res.statusText;
    throw new Error(`Open-Meteo ${baseUrl} failed (${res.status}): ${reason}`);
  }
  const list = Array.isArray(body) ? body : [body as T];
  if (list.length !== locations.length) throw new Error(`Open-Meteo returned ${list.length} results for ${locations.length} locations`);
  return list;
}

/** Hourly modelled PM2.5 (CAMS) from yesterday through the end of the forecast, in each location's local time. */
export function fetchAirQuality(locations: readonly Location[]): Promise<AirQualityResponse[]> {
  return getPerLocation<AirQualityResponse>(AIR_QUALITY_URL, locations, { hourly: 'pm2_5', past_days: '1', forecast_days: '7' });
}

export function fetchForecast(locations: readonly Location[]): Promise<ForecastResponse[]> {
  return getPerLocation<ForecastResponse>(FORECAST_URL, locations, { current: 'wind_direction_10m', daily: 'precipitation_sum', forecast_days: '7' });
}

/** `now` as a local hour key matching Open-Meteo's `hourly.time` format, e.g. 2026-10-14T07:00. */
export function localHourKey(now: Date, utcOffsetSeconds: number): string {
  return new Date(now.getTime() + utcOffsetSeconds * 1000).toISOString().slice(0, 13) + ':00';
}

/** Index of the hour containing `now`, or -1 when the response does not cover it. */
export function currentHourIndex(response: AirQualityResponse, now: Date): number {
  return response.hourly.time.indexOf(localHourKey(now, response.utc_offset_seconds));
}

/** A local `hourly.time` entry as a UTC timestamp. */
function hourToUtc(response: AirQualityResponse, index: number): string {
  return new Date(Date.parse(`${response.hourly.time[index]}:00Z`) - response.utc_offset_seconds * 1000).toISOString();
}

/** Mean PM2.5 over the 24 hours ending with the current hour, the averaging ISPU uses, and that hour in UTC. */
export function trailingDayMean(response: AirQualityResponse, now: Date): { value: number; hourUtc: string } {
  const end = currentHourIndex(response, now);
  if (end < HOURS_PER_DAY - 1) throw new Error(`Open-Meteo response does not cover the 24 hours before ${now.toISOString()}`);
  const window = response.hourly.pm2_5.slice(end - HOURS_PER_DAY + 1, end + 1);
  if (window.some(v => v === null)) throw new Error(`Open-Meteo PM2.5 has gaps in the 24 hours before ${now.toISOString()}`);
  const value = (window as number[]).reduce((sum, v) => sum + v, 0) / HOURS_PER_DAY;
  return { value, hourUtc: hourToUtc(response, end) };
}

export interface HourValue {
  time: string;
  pm25: number;
}

/** Hourly PM2.5 from the current hour on, `count` hours, with UTC timestamps. Throws on gaps rather than guessing. */
export function nextHours(response: AirQualityResponse, now: Date, count: number): HourValue[] {
  const start = currentHourIndex(response, now);
  if (start < 0) throw new Error(`Open-Meteo response does not cover ${now.toISOString()}`);
  const values = response.hourly.pm2_5.slice(start, start + count);
  if (values.length < count || values.some(v => v === null)) throw new Error(`Open-Meteo PM2.5 has gaps in the ${count} hours after ${now.toISOString()}`);
  return (values as number[]).map((pm25, i) => ({ time: hourToUtc(response, start + i), pm25 }));
}

/** Mean PM2.5 per local date, from today on, matching the 24-hour averaging of the current band. Days missing any hour are dropped rather than guessed. */
export function dailyMeanFrom(response: AirQualityResponse, now: Date): DailyMean[] {
  const today = localHourKey(now, response.utc_offset_seconds).slice(0, 10);
  const byDate = new Map<string, (number | null)[]>();
  response.hourly.time.forEach((time, i) => {
    const date = time.slice(0, 10);
    if (date < today) return;
    byDate.set(date, [...(byDate.get(date) ?? []), response.hourly.pm2_5[i]]);
  });
  return [...byDate]
    .filter(([, values]) => values.length === HOURS_PER_DAY && values.every(v => v !== null))
    .map(([date, values]) => ({ date, pm25_mean: (values as number[]).reduce((sum, v) => sum + v, 0) / HOURS_PER_DAY }));
}
