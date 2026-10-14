import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { LatestReport, LocationReport } from '../ingest/types.ts';
import { validateReport } from '../ingest/validate.ts';

const location = (overrides: Partial<LocationReport> = {}): LocationReport => ({
  id: 'pontianak',
  name: 'Pontianak, Kalimantan Barat',
  ispu: { value: null, status: 'link_only', source_url: 'https://ispu.kemenlh.go.id/app/#/' },
  pm25_model: { value: 88.1, unit: 'ug/m3', band: 3, source: 'CAMS global via Open-Meteo', updated_at: '2026-10-14T00:00:00.000Z' },
  hotspots_24h: { count: 0, radius_km: 100, source: 'NASA FIRMS VIIRS NOAA-20 NRT', updated_at: '2026-10-14T00:30:00.000Z' },
  wind_dir: 'Utara',
  outlook: [
    { date: '2026-10-14', pm25_max: 125.3, band: 3 },
    { date: '2026-10-15', pm25_max: 135.5, band: 3 }
  ],
  ...overrides
});
const report = (...locations: LocationReport[]): LatestReport => ({ generated_at: '2026-10-14T00:30:00.000Z', locations });

describe('validateReport', () => {
  it('accepts a complete report', () => {
    assert.deepEqual(validateReport(report(location()), ['pontianak']), []);
  });

  it('rejects a missing location', () => {
    assert.deepEqual(validateReport(report(location()), ['pontianak', 'sampit']), ['missing locations: sampit']);
  });

  it('rejects an ISPU number while access is not permitted', () => {
    const problems = validateReport(report(location({ ispu: { value: 158, status: 'link_only', source_url: 'https://ispu.kemenlh.go.id/app/#/' } })), ['pontianak']);
    assert.deepEqual(problems, ['pontianak: ispu must stay link_only until access is permitted']);
  });

  it('rejects impossible values', () => {
    const bad = location({
      pm25_model: { value: Number.NaN, unit: 'ug/m3', band: 3, source: 'x', updated_at: '' },
      hotspots_24h: { count: -1, radius_km: 100, source: 'x', updated_at: '2026-10-14T00:30:00.000Z' },
      wind_dir: ' ',
      outlook: []
    });
    assert.deepEqual(validateReport(report(bad), ['pontianak']), [
      'pontianak: pm25_model.value invalid: NaN',
      'pontianak: pm25_model.updated_at missing',
      'pontianak: hotspots_24h.count invalid: -1',
      'pontianak: wind_dir missing',
      'pontianak: outlook is empty'
    ]);
  });

  it('rejects outlook days out of order', () => {
    const outlook = [...location().outlook].reverse();
    assert.deepEqual(validateReport(report(location({ outlook })), ['pontianak']), ['pontianak: outlook[1].date not ascending']);
  });
});
