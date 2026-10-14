import type { LatestReport } from './types.ts';

const BANDS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5]);

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
      if (!isConcentration(day.pm25_max)) at(`outlook[${i}].pm25_max invalid: ${day.pm25_max}`);
      if (!BANDS.has(day.band)) at(`outlook[${i}].band invalid: ${day.band}`);
    });
  }
  return problems;
}
