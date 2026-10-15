import { NEXT_HOURS } from './build.ts';
import type { History, HotspotsFile, LatestReport } from './types.ts';

const BANDS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5]);
const HOUR_MS = 3600e3;

const isUtcTimestamp = (value: unknown): boolean => typeof value === 'string' && value.endsWith('Z') && !Number.isNaN(Date.parse(value));
const isDate = (value: unknown): boolean => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isConcentration = (value: unknown): boolean => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Everything that makes the report unsafe to publish. An empty list means it may be written. */
export function validateReport(report: LatestReport, expectedIds: readonly string[]): string[] {
  const problems: string[] = [];
  if (!isUtcTimestamp(report.generated_at)) problems.push(`generated_at is not a UTC timestamp: ${report.generated_at}`);

  const ids = report.locations.map(l => l.id);
  const missing = expectedIds.filter(id => !ids.includes(id));
  if (missing.length > 0) problems.push(`missing locations: ${missing.join(', ')}`);
  if (new Set(ids).size !== ids.length) problems.push('duplicate location ids');

  for (const loc of report.locations) {
    const at = (msg: string): void => {
      problems.push(`${loc.id}: ${msg}`);
    };
    if (!(Math.abs(loc.lat) <= 90 && Math.abs(loc.lon) <= 180)) at(`coordinates invalid: ${loc.lat},${loc.lon}`);
    if (loc.ispu.value !== null || loc.ispu.status !== 'link_only') at('ispu must stay link_only until access is permitted');
    if (!loc.ispu.source_url.startsWith('https://')) at('ispu.source_url must be https');

    if (!isConcentration(loc.pm25_model.value)) at(`pm25_model.value invalid: ${loc.pm25_model.value}`);
    if (!BANDS.has(loc.pm25_model.band)) at(`pm25_model.band invalid: ${loc.pm25_model.band}`);
    if (!isUtcTimestamp(loc.pm25_model.updated_at)) at('pm25_model.updated_at missing');

    if (!Number.isInteger(loc.hotspots_24h.count) || loc.hotspots_24h.count < 0) at(`hotspots_24h.count invalid: ${loc.hotspots_24h.count}`);
    if (!(loc.hotspots_24h.radius_km > 0)) at('hotspots_24h.radius_km must be positive');
    if (!isUtcTimestamp(loc.hotspots_24h.updated_at)) at('hotspots_24h.updated_at missing');

    if (loc.wind_dir.trim() === '') at('wind_dir missing');

    if (loc.outlook.length === 0) at('outlook is empty');
    loc.outlook.forEach((day, i) => {
      if (!isDate(day.date)) at(`outlook[${i}].date invalid: ${day.date}`);
      if (i > 0 && day.date <= loc.outlook[i - 1].date) at(`outlook[${i}].date not ascending`);
      if (!isConcentration(day.pm25_mean)) at(`outlook[${i}].pm25_mean invalid: ${day.pm25_mean}`);
      if (!BANDS.has(day.band)) at(`outlook[${i}].band invalid: ${day.band}`);
      if (!isConcentration(day.rain_mm)) at(`outlook[${i}].rain_mm invalid: ${day.rain_mm}`);
    });

    if (loc.next_hours.length !== NEXT_HOURS) at(`next_hours has ${loc.next_hours.length} entries, expected ${NEXT_HOURS}`);
    loc.next_hours.forEach((hour, i) => {
      if (!isUtcTimestamp(hour.time)) at(`next_hours[${i}].time invalid: ${hour.time}`);
      if (i > 0 && Date.parse(hour.time) - Date.parse(loc.next_hours[i - 1].time) !== HOUR_MS) at(`next_hours[${i}] is not one hour after the previous`);
      if (!isConcentration(hour.pm25)) at(`next_hours[${i}].pm25 invalid: ${hour.pm25}`);
    });
  }
  return problems;
}

/** Everything that makes hotspots.json unsafe to publish. An empty list means it may be written. */
export function validateHotspots(file: HotspotsFile): string[] {
  const problems: string[] = [];
  if (!isUtcTimestamp(file.generated_at)) problems.push(`generated_at is not a UTC timestamp: ${file.generated_at}`);
  if (typeof file.source !== 'string' || file.source.trim() === '') problems.push('source missing');
  if (!Array.isArray(file.points)) return [...problems, 'points is not an array'];
  const bad = file.points.findIndex(p => !Array.isArray(p) || p.length !== 2 || !(Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180));
  if (bad >= 0) problems.push(`points[${bad}] is not a finite [lat, lon]: ${JSON.stringify(file.points[bad])}`);
  return problems;
}

const isCount = (value: unknown): boolean => value === null || (Number.isInteger(value) && (value as number) >= 0);

/** Everything that makes history.json unsafe to write. An empty list means it may be written. */
export function validateHistory(file: History): string[] {
  const problems: string[] = [];
  if (typeof file !== 'object' || file === null) return ['history is not an object'];
  if (file.version !== 1) problems.push(`version is not 1: ${file.version}`);
  if (!isUtcTimestamp(file.generated_at)) problems.push(`generated_at is not a UTC timestamp: ${file.generated_at}`);
  if (typeof file.days !== 'object' || file.days === null || Array.isArray(file.days)) return [...problems, 'days is not an object'];
  for (const [id, city] of Object.entries(file.days)) {
    if (typeof city !== 'object' || city === null || Array.isArray(city)) {
      problems.push(`${id}: not an object`);
      continue;
    }
    for (const [date, day] of Object.entries(city)) {
      const at = (msg: string): void => {
        problems.push(`${id} ${date}: ${msg}`);
      };
      if (!isDate(date) || Number.isNaN(Date.parse(date))) at('date key invalid');
      if (!Array.isArray(day) || day.length !== 3) {
        at('not a [mean, band, count] triple');
        continue;
      }
      const [mean, band, count] = day;
      if (mean !== null && !isConcentration(mean)) at(`mean invalid: ${mean}`);
      if (band !== null && !BANDS.has(band)) at(`band invalid: ${band}`);
      if ((mean === null) !== (band === null)) at('mean and band must both be set or both null');
      if (!isCount(count)) at(`count invalid: ${count}`);
    }
  }
  return problems;
}
