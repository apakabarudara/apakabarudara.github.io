import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { activityStatuses, ago, bestWindow, freshness, greeting, mapsSearchUrl, nearest, rankByLevel, resolveCity, upcomingDays } from '../web/logic.js';

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

  it('prefers the city in the link, then the saved one, then none (the overview)', () => {
    assert.deepEqual(resolveCity(ids, 'palangkaraya', 'pontianak'), { id: 'palangkaraya', source: 'hash' });
    assert.deepEqual(resolveCity(ids, '', 'pontianak'), { id: 'pontianak', source: 'saved' });
    assert.deepEqual(resolveCity(ids, '', null), { id: null, source: 'none' });
  });

  it('never falls back to a city nobody chose', () => {
    assert.deepEqual(resolveCity(ids, 'jakarta', 'bandung'), { id: null, source: 'none' });
  });
});

describe('rankByLevel', () => {
  it('puts the worst air first and breaks ties by PM2.5', () => {
    const loc = (id: string, band: number, value: number) => ({ id, pm25_model: { band, value } });
    const ranked = rankByLevel([loc('a', 3, 60), loc('b', 5, 1133), loc('c', 3, 117), loc('d', 2, 30)]);
    assert.deepEqual(ranked.map(l => l.id), ['b', 'c', 'a', 'd']);
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

describe('bestWindow', () => {
  // 24 hours from 07:00 WIB; the two cleanest daytime hours are 14:00–16:00 WIB, a cleaner pair at 23:00 is outside the window.
  const wib = (iso: string): number => (new Date(iso).getUTCHours() + 7) % 24;
  const values = Array.from({ length: 24 }, (_, i) => 100);
  values[7] = 40; values[8] = 42; // 14:00, 15:00 WIB
  values[16] = 10; values[17] = 10; // 23:00, 00:00 WIB
  const hours = values.map((pm25, i) => ({ time: new Date(Date.parse('2026-10-14T00:00:00Z') + i * 3600e3).toISOString(), pm25 }));
  const opts = { span: 2, fromHour: 6, toHour: 21, localHour: wib };

  it('finds the cleanest two daytime hours', () => {
    assert.deepEqual(bestWindow(hours, opts), { start: '2026-10-14T07:00:00.000Z', end: '2026-10-14T09:00:00.000Z', indexes: [7, 8] });
  });

  it('keeps the window inside 06:00–21:00 and prefers the earliest tie', () => {
    const flat = hours.map(h => ({ ...h, pm25: 50 }));
    assert.equal(bestWindow(flat, opts)?.start, '2026-10-14T00:00:00.000Z'); // 07:00 WIB
    const night = hours.filter(h => wib(h.time) >= 21 || wib(h.time) < 6);
    assert.equal(bestWindow(night, opts), null);
  });
});

describe('activityStatuses', () => {
  const clear = { laundry: 'ok', exercise: 'ok', windows: 'ok', kids: 'ok' };
  it('turns ok laundry into caution when rain is forecast', () => {
    assert.equal(activityStatuses(clear, 0.5, 1).laundry, 'ok');
    assert.equal(activityStatuses(clear, 1, 1).laundry, 'caution');
  });
  it('never relaxes a smoky no', () => {
    assert.equal(activityStatuses({ ...clear, laundry: 'no' }, 12, 1).laundry, 'no');
  });
});

describe('greeting', () => {
  it('follows the hour of day', () => {
    assert.deepEqual([6, 12, 16, 20, 2].map(greeting), ['Pagi!', 'Siang!', 'Sore!', 'Malam!', 'Malam!']);
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
