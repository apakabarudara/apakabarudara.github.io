import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ago, freshness, mapsSearchUrl, nearest, resolveCity, upcomingDays } from '../web/logic.js';

const NOW = new Date('2026-10-14T06:00:00Z');
const hoursAgo = (h: number): string => new Date(NOW.getTime() - h * 3600e3).toISOString();

describe('freshness', () => {
  it('is fresh under 3 hours, stale under 12, expired after', () => {
    assert.equal(freshness(hoursAgo(2.9), NOW), 'fresh');
    assert.equal(freshness(hoursAgo(3), NOW), 'stale');
    assert.equal(freshness(hoursAgo(11.9), NOW), 'stale');
    assert.equal(freshness(hoursAgo(12), NOW), 'expired');
  });

  it('treats an unreadable timestamp as expired', () => {
    assert.equal(freshness('kemarin', NOW), 'expired');
    assert.equal(freshness(undefined, NOW), 'expired');
  });
});

describe('resolveCity', () => {
  const ids = ['pekanbaru', 'pontianak', 'palangkaraya'];

  it('prefers the city in the link, then the saved one, then the first', () => {
    assert.deepEqual(resolveCity(ids, 'palangkaraya', 'pontianak'), { id: 'palangkaraya', source: 'hash' });
    assert.deepEqual(resolveCity(ids, '', 'pontianak'), { id: 'pontianak', source: 'saved' });
    assert.deepEqual(resolveCity(ids, '', null), { id: 'pekanbaru', source: 'default' });
  });

  it('ignores ids that are not in the data', () => {
    assert.deepEqual(resolveCity(ids, 'jakarta', 'bandung'), { id: 'pekanbaru', source: 'default' });
  });
});

describe('upcomingDays', () => {
  it('starts the outlook tomorrow', () => {
    const outlook = [{ date: '2026-10-14' }, { date: '2026-10-15' }, { date: '2026-10-16' }];
    assert.deepEqual(upcomingDays(outlook, '2026-10-14').map(d => d.date), ['2026-10-15', '2026-10-16']);
  });
});

describe('nearest', () => {
  it('picks the closest city with its distance', () => {
    const locations = [
      { id: 'pontianak', lat: -0.03194, lon: 109.325 },
      { id: 'palembang', lat: -2.91673, lon: 104.7458 }
    ];
    const result = nearest(locations, -2.98, 104.76);
    assert.equal(result.location.id, 'palembang');
    assert.ok(result.km > 6 && result.km < 8);
  });
});

describe('mapsSearchUrl', () => {
  it('builds a Google Maps search without any position', () => {
    assert.equal(
      mapsSearchUrl('rumah sakit dan puskesmas terdekat'),
      'https://www.google.com/maps/search/?api=1&query=rumah%20sakit%20dan%20puskesmas%20terdekat'
    );
  });
});

describe('ago', () => {
  it('speaks in minutes under an hour, then hours', () => {
    assert.equal(ago(hoursAgo(40 / 60), NOW), '40 menit lalu');
    assert.equal(ago(hoursAgo(3), NOW), '3 jam lalu');
  });
});
