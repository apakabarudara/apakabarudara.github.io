import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { buildReport, type Sources } from '../ingest/build.ts';
import { parseFirmsCsv } from '../ingest/firms.ts';
import type { AirQualityResponse, ForecastResponse } from '../ingest/open-meteo.ts';
import type { LatestReport, Location } from '../ingest/types.ts';
import { validateReport } from '../ingest/validate.ts';

const fixture = <T>(name: string): T => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')) as T;

const LOCATIONS: Location[] = [
  { id: 'palangkaraya', name: 'Palangkaraya, Kalimantan Tengah', lat: -2.20833, lon: 113.91667 },
  { id: 'pontianak', name: 'Pontianak, Kalimantan Barat', lat: -0.03194, lon: 109.325 }
];
const SOURCES: Sources = {
  airQuality: fixture<AirQualityResponse[]>('open-meteo-air-quality.json'),
  forecast: fixture<ForecastResponse[]>('open-meteo-forecast.json'),
  hotspots: parseFirmsCsv(readFileSync(new URL('./fixtures/firms-viirs-noaa20-palangkaraya.csv', import.meta.url), 'utf8'))
};
const NOW = new Date('2026-10-14T00:30:00Z'); // 07:30 WIB

describe('buildReport', () => {
  const report: LatestReport = buildReport(LOCATIONS, SOURCES, NOW);
  const [palangkaraya, pontianak] = report.locations;

  it('produces a report that passes validation', () => {
    assert.deepEqual(validateReport(report, ['palangkaraya', 'pontianak']), []);
  });

  // Expected means computed independently from the fixture (hours 2026-10-13T08:00 to 2026-10-14T07:00 local).
  it('uses the trailing 24-hour mean for the current band', () => {
    assert.deepEqual(palangkaraya.pm25_model, {
      value: 1133.1,
      unit: 'ug/m3',
      band: 5,
      source: 'CAMS global via Open-Meteo',
      updated_at: '2026-10-14T00:00:00.000Z'
    });
    assert.equal(pontianak.pm25_model.value, 88.1);
    assert.equal(pontianak.pm25_model.band, 3);
  });

  it('keeps ISPU as a link-out', () => {
    assert.deepEqual(palangkaraya.ispu, { value: null, status: 'link_only', source_url: 'https://ispu.kemenlh.go.id/app/#/' });
  });

  it('counts hotspots per location', () => {
    assert.equal(palangkaraya.hotspots_24h.count, 8);
    assert.equal(pontianak.hotspots_24h.count, 0);
    assert.equal(palangkaraya.hotspots_24h.updated_at, NOW.toISOString());
  });

  it('labels where the wind comes from', () => {
    assert.equal(palangkaraya.wind_dir, 'Tenggara'); // 127°
    assert.equal(pontianak.wind_dir, 'Utara'); // 17°
  });

  it('bands each complete outlook day by its 24-hour mean and adds that day’s rain', () => {
    assert.deepEqual(pontianak.outlook, [
      { date: '2026-10-14', pm25_mean: 98.4, band: 3, rain_mm: 18.5 },
      { date: '2026-10-15', pm25_mean: 99.5, band: 3, rain_mm: 10.1 },
      { date: '2026-10-16', pm25_mean: 23.5, band: 2, rain_mm: 20.2 },
      { date: '2026-10-17', pm25_mean: 51.7, band: 2, rain_mm: 13.8 }
    ]);
  });

  it('throws when an outlook day has no rain forecast', () => {
    const forecast = SOURCES.forecast.map(f => ({ ...f, daily: { time: f.daily.time.slice(0, 2), precipitation_sum: f.daily.precipitation_sum.slice(0, 2) } }));
    assert.throws(() => buildReport(LOCATIONS, { ...SOURCES, forecast }, NOW), /no rain forecast for 2026-10-16/);
  });

  it('carries the next 24 hourly values with UTC times', () => {
    // Fixture hours 2026-10-14T07:00 (737.6) to 2026-10-15T06:00 (414.4) local, UTC+7.
    assert.equal(palangkaraya.next_hours.length, 24);
    assert.deepEqual(palangkaraya.next_hours[0], { time: '2026-10-14T00:00:00.000Z', pm25: 737.6 });
    assert.deepEqual(palangkaraya.next_hours[23], { time: '2026-10-14T23:00:00.000Z', pm25: 414.4 });
  });

  it('throws when the model does not cover now', () => {
    assert.throws(() => buildReport(LOCATIONS, SOURCES, new Date('2026-10-25T00:00:00Z')), /does not cover/);
  });

  it('throws when wind is missing', () => {
    const forecast = SOURCES.forecast.map(f => ({ ...f, current: { ...f.current, wind_direction_10m: null } }));
    assert.throws(() => buildReport(LOCATIONS, { ...SOURCES, forecast }, NOW), /no current wind direction/);
  });
});
