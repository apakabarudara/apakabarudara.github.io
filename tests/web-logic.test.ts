import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEVELS, STORY } from '../web/copy.js';
import {
  activityStatuses, ago, bestWindow, feedbackUrl, freshness, greeting, hourBands, improvement, installMode, isIosSafari, levelRange, mapsSearchUrl, nearest, normalizeWatch,
  previewOverride, rainKind, rankByLevel, relativeDay, resolveCity, storyKey, storyLines, toggleWatch, upcomingDays, watchRow
} from '../web/logic.js';

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

describe('rainKind', () => {
  it('turns millimetres into words: none below 1 mm, heavy from 50 mm', () => {
    assert.deepEqual([0, 0.9, 1, 49.9, 50].map(rainKind), ['none', 'none', 'some', 'some', 'heavy']);
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
      mapsSearchUrl('fasilitas kesehatan terdekat'),
      'https://www.google.com/maps/search/?api=1&query=fasilitas%20kesehatan%20terdekat'
    );
  });
});

describe('ago', () => {
  it('speaks in minutes under an hour, then hours', () => {
    assert.equal(ago(hoursAgo(40 / 60), NOW), '40 menit lalu');
    assert.equal(ago(hoursAgo(3), NOW), '3 jam lalu');
  });
});

describe('previewOverride', () => {
  const ids = ['palangkaraya', 'pontianak'];

  it('lets ?level= through only together with preview=1', () => {
    assert.deepEqual(previewOverride('?city=palangkaraya&level=5&preview=1', ids), { city: 'palangkaraya', level: 5 });
    assert.equal(previewOverride('?city=palangkaraya&level=5', ids), null);
    assert.equal(previewOverride('?level=5', ids), null);
    assert.equal(previewOverride('?city=palangkaraya&level=5&preview=0', ids), null);
  });

  it('rejects unknown cities and levels outside 1 to 5', () => {
    assert.equal(previewOverride('?city=jakarta&level=3&preview=1', ids), null);
    for (const level of ['0', '6', '2.5', 'x', '']) assert.equal(previewOverride(`?city=pontianak&level=${level}&preview=1`, ids), null, level);
  });
});

describe('improvement ("Kapan membaik?")', () => {
  const day = (date: string, band: number) => ({ date, band, pm25_mean: 1, rain_mm: 0 });
  const outlook = [day('2026-10-14', 4), day('2026-10-15', 4), day('2026-10-16', 3), day('2026-10-17', 3)];

  it('names the first later day with a lower band', () => {
    assert.deepEqual(improvement(outlook, '2026-10-14', 4), { date: '2026-10-16' });
  });

  it('counts the days checked when nothing improves', () => {
    assert.deepEqual(improvement(outlook, '2026-10-14', 3), { days: 3 });
    assert.deepEqual(improvement([day('2026-10-14', 5), day('2026-10-15', 5)], '2026-10-14', 5), { days: 1 });
  });

  it('is silent at levels 1–2 and without later days', () => {
    assert.equal(improvement(outlook, '2026-10-14', 2), null);
    assert.equal(improvement(outlook, '2026-10-14', 1), null);
    assert.equal(improvement([day('2026-10-14', 4)], '2026-10-14', 4), null);
  });

  it('judges against the level on screen, not the forecast for today', () => {
    assert.deepEqual(improvement(outlook, '2026-10-14', 5), { date: '2026-10-15' });
  });
});

describe('family cities', () => {
  const ids = ['a', 'b', 'c', 'd', 'e'];

  it('keeps known ids once and at most 3 besides the city on screen', () => {
    assert.deepEqual(normalizeWatch(['a', 'x', 'a', 'b', 'c', 'd', 'e'], ids), ['a', 'b', 'c']);
    assert.deepEqual(normalizeWatch(['a', 'b', 'c', 'd'], ids, 'a'), ['a', 'b', 'c', 'd']);
    assert.deepEqual(normalizeWatch('rusak', ids), []);
    assert.deepEqual(normalizeWatch(null, ids), []);
  });

  it('refuses a 4th city and unpins on a second toggle', () => {
    let list: string[] = [];
    for (const id of ['a', 'b', 'c']) list = toggleWatch(list, id, ids).list;
    assert.deepEqual(list, ['a', 'b', 'c']);
    assert.deepEqual(toggleWatch(list, 'd', ids), { list, refused: true });
    assert.deepEqual(toggleWatch(list, 'b', ids), { list: ['a', 'c'], refused: false });
  });

  it('ignores unknown ids and counts the city on screen separately', () => {
    assert.deepEqual(toggleWatch(['a'], 'zzz', ids), { list: ['a'], refused: false });
    assert.equal(toggleWatch(['a', 'b', 'c', 'd'], 'e', ids, 'a').refused, true);
  });

  it('leaves the city on screen out of the row', () => {
    assert.deepEqual(watchRow(['a', 'b', 'c'], 'b'), ['a', 'c']);
  });
});

describe('install control', () => {
  const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
  it('recognises iOS Safari only', () => {
    assert.equal(isIosSafari(IPHONE, 'iPhone', 5), true);
    assert.equal(isIosSafari(IPHONE.replace('Version/18.0', 'CriOS/120'), 'iPhone', 5), false);
    assert.equal(isIosSafari(MAC, 'MacIntel', 5), true);
    assert.equal(isIosSafari(MAC, 'MacIntel', 0), false);
    assert.equal(isIosSafari('Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36', 'Linux armv8l', 5), false);
  });

  it('picks prompt, ios or nothing, and hides when installed or dismissed', () => {
    assert.equal(installMode({ standalone: false, hasPrompt: true, ios: false, dismissed: false }), 'prompt');
    assert.equal(installMode({ standalone: false, hasPrompt: false, ios: true, dismissed: false }), 'ios');
    assert.equal(installMode({ standalone: false, hasPrompt: false, ios: false, dismissed: false }), null);
    assert.equal(installMode({ standalone: true, hasPrompt: true, ios: true, dismissed: false }), null);
    assert.equal(installMode({ standalone: false, hasPrompt: true, ios: true, dismissed: true }), null);
  });
});

describe('storyLines', () => {
  const make = (level: number) => storyLines({ city: 'Palembang', level, copy: LEVELS[level], story: STORY, improve: null, day: 'Rabu 10.00' });

  it('carries city, level, headline and the time, and no numbers from the data', () => {
    const lines = make(3);
    assert.equal(lines.levelName, 'Tidak Sehat');
    assert.equal(lines.headline, 'Kurangi aktivitas di luar.');
    assert.equal(lines.stamp, 'Perkiraan · Rabu 10.00');
    assert.equal(lines.url, 'bisanapasgak.github.io');
    assert.doesNotMatch(JSON.stringify(lines), /µg|PM2/);
  });

  it('is light at levels 1–2 and calm, without "kamu" or a quip, at 3–5', () => {
    assert.ok(make(1).quip && make(2).quip);
    assert.match(make(1).footer, /kotamu/);
    for (const level of [3, 4, 5]) {
      const lines = make(level);
      assert.equal(lines.quip, null);
      assert.doesNotMatch(Object.values(lines).join(' '), /\bkamu|kotamu/i);
    }
  });
});

describe('storyKey', () => {
  const make = (level: number, improve: string | null = null, day = 'Rabu 10.00', city = 'Palembang') =>
    storyKey(storyLines({ city, level, copy: LEVELS[level], story: STORY, improve, day }));

  it('is stable for the same card and changes with city, level, day or improve line', () => {
    assert.equal(make(3), make(3));
    assert.notEqual(make(3), make(4));
    assert.notEqual(make(3), make(3, null, 'Rabu 11.00'));
    assert.notEqual(make(3), make(3, 'Besok membaik.'));
    assert.notEqual(make(3), make(3, null, 'Rabu 10.00', 'Jambi'));
  });
});

describe('hourly strip levels', () => {
  it('bands each hour by the PM2.5 breakpoints and reports the range', () => {
    const bands = hourBands([{ pm25: 10 }, { pm25: 15.6 }, { pm25: 150.4 }, { pm25: 400 }, { pm25: 851 }]);
    assert.deepEqual(bands, [1, 2, 3, 5, 5]);
    assert.deepEqual(levelRange(bands), { min: 1, max: 5 });
  });
});

describe('relativeDay', () => {
  it('says today or tomorrow by the viewer\'s local date', () => {
    const now = new Date(2026, 9, 14, 11, 53);
    assert.equal(relativeDay(new Date(2026, 9, 14, 13).toISOString(), now), 'today');
    assert.equal(relativeDay(new Date(2026, 9, 15, 9).toISOString(), now), 'tomorrow');
  });
});

describe('feedbackUrl', () => {
  const base = 'https://docs.google.com/forms/d/e/abc/viewform';
  it('prefills the city when the entry id is set, and handles a base with a query', () => {
    assert.equal(feedbackUrl(base, '123', 'Pangkal Pinang'), `${base}?usp=pp_url&entry.123=Pangkal%20Pinang`);
    assert.equal(feedbackUrl(`${base}?hl=id`, '123', 'Jambi'), `${base}?hl=id&usp=pp_url&entry.123=Jambi`);
  });

  it('returns the base without an entry id or a city', () => {
    assert.equal(feedbackUrl(base, '', 'Jambi'), base);
    assert.equal(feedbackUrl(base, '123', ''), base);
  });
});
