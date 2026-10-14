import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { boundingBox, countNearby, parseFirmsCsv } from '../ingest/firms.ts';
import type { Location } from '../ingest/types.ts';

// 15 real NOAA-20 rows from NASA's public SouthEast_Asia_24h file (2026-10-14) around Palangkaraya:
// 8 nominal within 100 km on 10-13 17:37 UTC (one at 99.96 km), 2 low within 100 km, 2 nominal within 100 km on 10-12 05:16, 3 nominal at 127–129 km.
const PUBLIC_CSV = readFileSync(new URL('./fixtures/firms-viirs-noaa20-palangkaraya.csv', import.meta.url), 'utf8');
// Area API layout: adds an instrument column and abbreviates confidence.
const API_CSV = [
  'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight',
  '-2.8018,114.03319,330.1,0.4,0.6,2026-10-13,1737,N20,VIIRS,n,2.0NRT,295.2,3.1,N',
  '-2.81,114.03,345.0,0.4,0.6,2026-10-13,0637,N20,VIIRS,h,2.0NRT,296.0,9.8,D',
  '-3.02884,113.95525,310.2,0.4,0.6,2026-10-13,637,N20,VIIRS,l,2.0NRT,290.0,1.2,D'
].join('\n');

const PALANGKARAYA: Location = { id: 'palangkaraya', name: 'Palangkaraya', lat: -2.20833, lon: 113.91667 };
const PONTIANAK: Location = { id: 'pontianak', name: 'Pontianak', lat: -0.03194, lon: 109.325 };

describe('parseFirmsCsv', () => {
  it('reads the public file layout', () => {
    const hotspots = parseFirmsCsv(PUBLIC_CSV);
    assert.equal(hotspots.length, 15);
    assert.deepEqual(hotspots[0], { lat: -2.8018, lon: 114.03319, acquiredAt: new Date('2026-10-13T17:37:00Z'), confidence: 'nominal' });
  });

  it('reads the Area API layout and pads short times', () => {
    const hotspots = parseFirmsCsv(API_CSV);
    assert.deepEqual(
      hotspots.map(h => h.confidence),
      ['nominal', 'high', 'low']
    );
    assert.equal(hotspots[2].acquiredAt.toISOString(), '2026-10-13T06:37:00.000Z');
  });

  it('treats a header-only file as no fires', () => {
    assert.deepEqual(parseFirmsCsv(`${API_CSV.split('\n')[0]}\n`), []);
  });

  it('throws on an error body instead of reading zero fires', () => {
    assert.throws(() => parseFirmsCsv('Invalid MAP_KEY.'), /no "latitude" column/);
    assert.throws(() => parseFirmsCsv(''), /no "latitude" column/);
  });

  it('throws on a truncated row', () => {
    assert.throws(() => parseFirmsCsv(`${API_CSV}\n-2.8,114.0`), /row 5 is malformed/);
  });

  it('throws on an unknown confidence value', () => {
    assert.throws(() => parseFirmsCsv(API_CSV.replace(',n,2.0NRT', ',90,2.0NRT')), /row 2 is malformed/);
  });
});

describe('countNearby', () => {
  const hotspots = parseFirmsCsv(PUBLIC_CSV);

  it('counts non-low detections within 100 km in the last 24 hours', () => {
    assert.equal(countNearby(hotspots, PALANGKARAYA, 100, new Date('2026-10-14T00:30:00Z')), 8);
  });

  it('includes detections exactly 24 hours old and drops later ones', () => {
    assert.equal(countNearby(hotspots, PALANGKARAYA, 100, new Date('2026-10-13T05:16:00Z')), 2);
  });

  it('is zero far from the fires', () => {
    assert.equal(countNearby(hotspots, PONTIANAK, 100, new Date('2026-10-14T00:30:00Z')), 0);
  });
});

describe('boundingBox', () => {
  it('pads the extremes of all locations', () => {
    assert.deepEqual(boundingBox([PALANGKARAYA, PONTIANAK], 1), { west: 108.325, south: -3.20833, east: 114.91667, north: 0.96806 });
  });
});
