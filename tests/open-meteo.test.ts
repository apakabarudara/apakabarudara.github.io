import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, describe, it, mock } from 'node:test';
import { currentHourIndex, dailyMaxFrom, fetchAirQuality, localHourKey, type AirQualityResponse } from '../ingest/open-meteo.ts';
import type { Location } from '../ingest/types.ts';

// Real response for Palangkaraya then Pontianak, fetched 2026-10-14 ~00:15 UTC (past_days=1, forecast_days=7, timezone=auto).
const [palangkaraya, pontianak] = JSON.parse(readFileSync(new URL('./fixtures/open-meteo-air-quality.json', import.meta.url), 'utf8')) as AirQualityResponse[];
const NOW = new Date('2026-10-14T00:30:00Z'); // 07:30 WIB

const PLACES: Location[] = [
  { id: 'a', name: 'A', lat: -2.2, lon: 113.9 },
  { id: 'b', name: 'B', lat: 0, lon: 109.3 }
];

const respondWith = (status: number, body: unknown): void => {
  mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(body), { status }));
};

describe('localHourKey', () => {
  it('shifts UTC into the location offset', () => {
    assert.equal(localHourKey(NOW, 25200), '2026-10-14T07:00');
  });

  it('rolls over the local date before UTC does', () => {
    assert.equal(localHourKey(new Date('2026-10-13T17:30:00Z'), 25200), '2026-10-14T00:00');
  });
});

describe('currentHourIndex', () => {
  it('finds the hour containing now', () => {
    const i = currentHourIndex(palangkaraya, NOW);
    assert.equal(palangkaraya.hourly.time[i], '2026-10-14T07:00');
  });

  it('returns -1 when the response does not cover now', () => {
    assert.equal(currentHourIndex(palangkaraya, new Date('2030-01-01T00:00:00Z')), -1);
  });
});

describe('dailyMaxFrom', () => {
  it('keeps only complete local days from today', () => {
    assert.deepEqual(dailyMaxFrom(palangkaraya, NOW), [
      { date: '2026-10-14', pm25_max: 3233.6 },
      { date: '2026-10-15', pm25_max: 3241 },
      { date: '2026-10-16', pm25_max: 2950.4 },
      { date: '2026-10-17', pm25_max: 2875.9 }
    ]);
    assert.deepEqual(
      dailyMaxFrom(pontianak, NOW).map(d => d.pm25_max),
      [125.3, 135.5, 43.7, 66.1]
    );
  });

  it('drops a day the response cuts off part way', () => {
    const cut = 24 + 24 + 12; // yesterday, today, then half of tomorrow
    const truncated: AirQualityResponse = {
      ...palangkaraya,
      hourly: { time: palangkaraya.hourly.time.slice(0, cut), pm2_5: palangkaraya.hourly.pm2_5.slice(0, cut) }
    };
    assert.deepEqual(
      dailyMaxFrom(truncated, NOW).map(d => d.date),
      ['2026-10-14']
    );
  });

  it('counts yesterday as today until local midnight', () => {
    assert.equal(dailyMaxFrom(palangkaraya, new Date('2026-10-13T16:59:00Z'))[0].date, '2026-10-13');
  });
});

describe('fetchAirQuality', () => {
  afterEach(() => mock.restoreAll());

  it('returns one result per location in request order', async () => {
    respondWith(200, [palangkaraya, pontianak]);
    const result = await fetchAirQuality(PLACES);
    assert.equal(result.length, 2);
    assert.deepEqual(result[1].hourly.pm2_5, pontianak.hourly.pm2_5);
  });

  it('wraps a single-location object in an array', async () => {
    respondWith(200, palangkaraya);
    assert.equal((await fetchAirQuality(PLACES.slice(0, 1))).length, 1);
  });

  it('throws with the API reason on an error body', async () => {
    respondWith(400, { error: true, reason: 'Parameter latitude is out of range' });
    await assert.rejects(fetchAirQuality(PLACES), /out of range/);
  });

  it('throws when the result count does not match the locations', async () => {
    respondWith(200, [palangkaraya]);
    await assert.rejects(fetchAirQuality(PLACES), /1 results for 2 locations/);
  });
});
