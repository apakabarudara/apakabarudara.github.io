import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEVELS, OFFICIAL_ISPU, STORY, UI } from '../web/copy.js';
import {
  ago, bestWindow, cityLink, dailyQuip, dayPartOf, daySegments, isFlatDay, nowIndex, segmentTags, feedbackUrl, freshness, gibsTileUrl, mapBounds, greeting, hourBands, improvedFrom, improvement, installMode, isIosSafari, levelRange, mapsSearchUrl, nearest, normalizeWatch,
  icsReminder, outlookLines, previewOverride, rainKind, worldviewUrl, rankByLevel, rankRowHeight, rankingLines, relativeDay, resolveCity, storyKey, storyLines, todayCards, toggleWatch, upcomingDays, watchRow, worsenedFrom, whatsappUrl, orderShareActions, trend, glanceChips
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
    assert.deepEqual(bestWindow(hours, opts), { start: '2026-10-14T07:00:00.000Z', end: '2026-10-14T09:00:00.000Z', indexes: [7, 8], band: 2 }); // mean 41 µg/m³
  });

  it('bands the window by its mean PM2.5, not by its cleanest hour', () => {
    const smoky = hours.map(h => ({ ...h, pm25: 200 }));
    assert.equal(bestWindow(smoky, opts)?.band, 4); // 200 µg/m³: Sangat Tidak Sehat
  });

  it('keeps the window inside 06:00–21:00 and prefers the earliest tie', () => {
    const flat = hours.map(h => ({ ...h, pm25: 50 }));
    assert.equal(bestWindow(flat, opts)?.start, '2026-10-14T00:00:00.000Z'); // 07:00 WIB
    const night = hours.filter(h => wib(h.time) >= 21 || wib(h.time) < 6);
    assert.equal(bestWindow(night, opts), null);
  });
});

describe('todayCards', () => {
  const ids = (level: number, laundry = 'ok', windows = 'ok', rain = 0, win = true) => todayCards(level, { laundry, windows }, rain, 1, win);
  it('picks the cards by level', () => {
    assert.deepEqual(ids(1).map(c => c.id), ['terrace', 'laundry', 'exercise']);
    assert.deepEqual(ids(2).map(c => c.id), ['terrace', 'laundry', 'exercise']);
    assert.deepEqual(ids(3, 'no', 'caution').map(c => c.id), ['windows', 'laundry', 'outdoor']); // window card first
    assert.deepEqual(ids(4, 'no', 'no').map(c => c.id), ['windows', 'laundry', 'kidsHigh']);
    assert.deepEqual(ids(5, 'no', 'no').map(c => c.id), ['windows', 'laundry', 'kidsHigh']);
  });
  it('shows three cards at most at every level and puts the window card first', () => {
    for (let level = 1; level <= 5; level++) assert.equal(ids(level).length, 3);
    assert.equal(ids(3, 'ok', 'no').at(0)?.id, 'laundry');
    assert.equal(ids(3, 'no', 'caution').at(0)?.id, 'windows');
  });
  it('lets rain override laundry at every level, then smoke, else clear', () => {
    const laundry = (level: number, la: string, rain: number) => ids(level, la, 'ok', rain).find(c => c.id === 'laundry')?.variant;
    assert.equal(laundry(1, 'ok', 1), 'rain');
    assert.equal(laundry(5, 'no', 12), 'rain');
    assert.equal(laundry(1, 'ok', 0.9), 'clear');
    assert.equal(laundry(3, 'no', 0), 'smoke');
  });
  it('shows the best window only where it helps, never on ISPU quotes', () => {
    assert.deepEqual(ids(1).map(c => c.window), [true, true, false]);
    assert.deepEqual(ids(1, 'ok', 'ok', 5).map(c => c.window), [true, false, false]);
    assert.deepEqual(ids(3, 'no', 'caution').map(c => c.window), [true, false, false]);
    assert.deepEqual(ids(4, 'no', 'no').map(c => c.window), [false, false, false]);
    assert.ok(ids(1, 'ok', 'ok', 0, false).every(c => !c.window));
  });
  it('quotes the general sentence for exercise and level 3 outdoor, the sensitive one only for kids at levels 4–5', () => {
    assert.equal(ids(3, 'no', 'caution').find(c => c.id === 'outdoor')?.variant, 'everyone');
    assert.equal(ids(4, 'no', 'no').find(c => c.id === 'kidsHigh')?.variant, 'sensitive');
    assert.equal(ids(1).find(c => c.id === 'exercise')?.variant, 'everyone');
  });
});

describe('encouragement rotation', () => {
  it('is the same all day and moves with the date', () => {
    const lines = ['a', 'b', 'c'];
    assert.equal(dailyQuip(lines, '2026-10-15'), dailyQuip(lines, '2026-10-15'));
    assert.notEqual(dailyQuip(lines, '2026-10-15'), dailyQuip(lines, '2026-10-16'));
    assert.equal(new Set(['15', '16', '17'].map(d => dailyQuip(lines, `2026-10-${d}`))).size, 3);
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
    // only the city on screen is pinned: it does not count, three others can still be added
    let list = ['a'];
    for (const id of ['b', 'c', 'd']) list = toggleWatch(list, id, ids, 'a').list;
    assert.deepEqual(list, ['a', 'b', 'c', 'd']);
    assert.equal(toggleWatch(list, 'e', ids, 'a').refused, true);
    assert.deepEqual(watchRow(['a'], 'a'), []);
    assert.deepEqual(watchRow(['a', 'b'], 'a'), ['b']);
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
    assert.equal(installMode({ standalone: false, hasPrompt: true, ios: false, dismissed: false, visits: 2 }), 'prompt');
    assert.equal(installMode({ standalone: false, hasPrompt: false, ios: true, dismissed: false, visits: 2 }), 'ios');
    assert.equal(installMode({ standalone: false, hasPrompt: false, ios: false, dismissed: false, visits: 2 }), null);
    assert.equal(installMode({ standalone: true, hasPrompt: true, ios: true, dismissed: false, visits: 2 }), null);
    assert.equal(installMode({ standalone: false, hasPrompt: true, ios: true, dismissed: true, visits: 2 }), null);
  });

  it('waits for the second visit', () => {
    assert.equal(installMode({ standalone: false, hasPrompt: true, ios: true, dismissed: false, visits: 1 }), null);
    assert.equal(installMode({ standalone: false, hasPrompt: true, ios: true, dismissed: false, visits: 3 }), 'prompt');
  });
});

describe('storyLines', () => {
  const make = (level: number) => storyLines({ city: 'Palembang', level, copy: LEVELS[level], story: STORY, official: OFFICIAL_ISPU[level].everyone, quip: dailyQuip(LEVELS[level].quips, '2026-10-14'), improve: null, day: 'Rabu 10.00' });

  it('carries city, level, the quoted ISPU sentence with its source and the time, and no numbers from the data', () => {
    const lines = make(3);
    assert.equal(lines.levelName, 'Perkiraan: Tidak Sehat');
    assert.equal(lines.guide, 'Kurangi aktivitas fisik yang terlalu lama di luar ruangan.');
    assert.equal(lines.source, '— ISPU, KLHK');
    assert.equal(lines.estimate, 'Perkiraan model, bisa meleset');
    assert.ok(!('headline' in lines));
    assert.equal(lines.stamp, 'Diperbarui Rabu 10.00');
    assert.equal(lines.url, 'apakabarudara.github.io');
    assert.doesNotMatch(JSON.stringify(lines), /µg|PM2/);
  });

  it('has a quip headline at levels 1–2 and the quoted ISPU "everyone" sentence, no quip, at 3–5', () => {
    for (const level of [1, 2]) {
      assert.ok(make(level).quip);
      assert.equal(make(level).guide, null);
      assert.equal(make(level).source, null);
    }
    for (const level of [3, 4, 5]) {
      const lines = make(level);
      assert.equal(lines.quip, null);
      assert.equal(lines.guide, OFFICIAL_ISPU[level].everyone);
      assert.doesNotMatch(Object.values(lines).join(' '), /\bkamu\b/i);
    }
  });

  it('has the same call to action at every level', () => {
    for (const level of [1, 2, 3, 4, 5]) assert.equal(make(level).footer, 'Cek kotamu sebelum keluar');
  });
});

describe('storyKey', () => {
  const make = (level: number, improve: string | null = null, day = 'Rabu 10.00', city = 'Palembang') =>
    storyKey(storyLines({ city, level, copy: LEVELS[level], story: STORY, official: OFFICIAL_ISPU[level].everyone, quip: dailyQuip(LEVELS[level].quips, '2026-10-14'), improve, day }));

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

// Local-time hours (new Date(y, m, d, h)), so these run the same in any time zone.
const strip = (startHour: number, pm: (i: number) => number, day = 14) =>
  Array.from({ length: 24 }, (_, i) => ({ time: new Date(2026, 9, day, startHour + i).toISOString(), pm25: pm(i) }));

describe('dayPartOf', () => {
  it('cuts the day at 05, 11, 15 and 18', () => {
    const parts = [4, 5, 10, 11, 14, 15, 17, 18, 23, 0].map(dayPartOf);
    assert.deepEqual(parts, ['malam', 'pagi', 'pagi', 'siang', 'siang', 'sore', 'sore', 'malam', 'malam', 'malam']);
  });
});

describe('daySegments', () => {
  const bandsOf = (hours: { pm25: number }[]) => hourBands(hours);

  it('from 09:00 gives Pagi, Siang, Sore, Malam and Pagi besok, with the first one now', () => {
    const hours = strip(9, () => 10);
    const segs = daySegments(hours, bandsOf(hours), new Date(2026, 9, 14, 9, 30));
    assert.deepEqual(segs.map(s => s.part), ['pagi', 'siang', 'sore', 'malam', 'pagi']);
    assert.deepEqual(segs.map(s => s.tomorrow), [false, false, false, false, true]);
    assert.deepEqual(segs.map(s => s.now), [true, false, false, false, false]);
    assert.deepEqual(segs.map(s => [s.from, s.to]), [[0, 2], [2, 6], [6, 9], [9, 20], [20, 24]]);
    assert.equal(new Date(segs[0].end).getHours(), 11);
  });

  it('wraps past midnight: from 20:00 the night spans two dates and the next morning is besok', () => {
    const hours = strip(20, () => 10);
    const segs = daySegments(hours, bandsOf(hours), new Date(2026, 9, 14, 20, 5));
    assert.deepEqual(segs.map(s => s.part), ['malam', 'pagi', 'siang', 'sore', 'malam']);
    assert.deepEqual(segs.map(s => s.tomorrow), [false, true, true, true, true]);
    assert.equal(segs[0].to, 9); // 20:00 to 04:00
  });

  it('takes the worst band of the hours in a segment', () => {
    const hours = strip(9, i => (i === 1 ? 60 : 10)); // 10:00 is band 3, the rest band 1
    const segs = daySegments(hours, bandsOf(hours), new Date(2026, 9, 14, 9));
    assert.equal(segs[0].band, 3);
    assert.equal(segs[1].band, 1);
  });

  it('marks no segment as now when the data does not cover the current hour', () => {
    const hours = strip(9, () => 10);
    assert.equal(nowIndex(hours, new Date(2026, 9, 14, 8)), -1);
    assert.ok(daySegments(hours, bandsOf(hours), new Date(2026, 9, 14, 8)).every(s => !s.now));
  });

  it('detects a flat day and tags best and worst segments', () => {
    const flat = strip(9, () => 30);
    assert.equal(isFlatDay(daySegments(flat, bandsOf(flat), new Date(2026, 9, 14, 9))), true);
    const varied = strip(9, i => (i < 6 ? 10 : 200)); // Pagi+Siang clean, the rest thick
    const segs = daySegments(varied, bandsOf(varied), new Date(2026, 9, 14, 9));
    assert.equal(isFlatDay(segs), false);
    const win = bestWindow(varied, { span: 2, fromHour: 6, toHour: 21, localHour: iso => new Date(iso).getHours() });
    assert.deepEqual(segmentTags(segs, win), { best: 0, worst: 2 });
    assert.deepEqual(segmentTags(segs, null), { best: -1, worst: 2 });
  });

  it('does not call a one-level difference the worst', () => {
    const hours = strip(9, i => (i < 6 ? 10 : 30));
    const segs = daySegments(hours, bandsOf(hours), new Date(2026, 9, 14, 9));
    assert.equal(segmentTags(segs, null).worst, -1);
  });
});

describe('best window wording', () => {
  const opts = { span: 2, fromHour: 6, toHour: 21, localHour: (iso: string) => new Date(iso).getHours() };
  it('names the part from the window hour: a 06:00 window is pagi, never siang', () => {
    const morning = strip(5, i => (i === 1 || i === 2 ? 5 : 80), 14);
    const win = bestWindow(morning, opts)!;
    assert.equal(new Date(win.start).getHours(), 6);
    const part = UI.dayParts[dayPartOf(new Date(win.start).getHours())];
    assert.equal(part, 'Pagi');
    assert.equal(UI.bestWindow(UI.whenWord(part, false), '06.00', '08.00', 2, 1), 'Pagi ini, 06.00–08.00');
    assert.doesNotMatch(UI.bestWindow(UI.whenWord(part, true), '06.00', '08.00', 2, 1), /siang/i);
  });
  it('picks the afternoon word for a 13:00 window', () => {
    assert.equal(dayPartOf(13), 'siang');
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
  const base = 'https://tally.so/r/abc';
  it('appends the city as a query parameter', () => {
    assert.equal(feedbackUrl(base, 'kota', 'Jambi'), `${base}?kota=Jambi`);
  });

  it('joins with & when the base already has a query', () => {
    assert.equal(feedbackUrl(`${base}?hl=id`, 'kota', 'Jambi'), `${base}?hl=id&kota=Jambi`);
  });

  it('encodes a city with a space', () => {
    assert.equal(feedbackUrl(base, 'kota', 'Palangka Raya'), `${base}?kota=Palangka%20Raya`);
  });

  it('returns the base without a city', () => {
    assert.equal(feedbackUrl(base, 'kota', ''), base);
  });

  it('returns the base without a param', () => {
    assert.equal(feedbackUrl(base, '', 'Jambi'), base);
  });
});

describe('cityLink', () => {
  it('is the page address plus the encoded city id', () => {
    assert.equal(cityLink('https://apakabarudara.github.io/', 'palangkaraya'), 'https://apakabarudara.github.io/#palangkaraya');
    assert.equal(cityLink('http://127.0.0.1:8792/', 'a b'), 'http://127.0.0.1:8792/#a%20b');
  });
});

describe('dailyQuip', () => {
  const quips = ['a', 'b', 'c'];

  it('is the same all day and moves on the next day', () => {
    assert.equal(dailyQuip(quips, '2026-10-14'), dailyQuip(quips, '2026-10-14'));
    assert.notEqual(dailyQuip(quips, '2026-10-14'), dailyQuip(quips, '2026-10-15'));
    assert.deepEqual(['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'].map(d => dailyQuip(quips, d)).slice(0, 3).sort(), ['a', 'b', 'c']);
  });

  it('is null when a level has none', () => {
    assert.equal(dailyQuip(LEVELS[3].quips, '2026-10-14'), null);
    assert.equal(dailyQuip([], '2026-10-14'), null);
  });
});

describe('improvedFrom ("Membaik sejak terakhir kamu cek")', () => {
  it('returns the earlier level only when it got better and is now level 1–2', () => {
    assert.equal(improvedFrom(3, 2), 3);
    assert.equal(improvedFrom(5, 1), 5);
    assert.equal(improvedFrom(2, 1), 2);
  });

  it('is null for the same level, worse, still bad, or nothing stored', () => {
    assert.equal(improvedFrom(2, 2), null);
    assert.equal(improvedFrom(1, 2), null);
    assert.equal(improvedFrom(5, 3), null);
    assert.equal(improvedFrom(undefined, 1), null);
    assert.equal(improvedFrom('3', 1), null);
  });
});

describe('worsenedFrom', () => {
  it('returns the earlier level only when the level got worse, at every level', () => {
    for (const [previous, level] of [[1, 2], [2, 3], [3, 4], [4, 5], [1, 5]]) assert.equal(worsenedFrom(previous, level), previous);
    assert.equal(worsenedFrom(3, 3), null);
    assert.equal(worsenedFrom(4, 2), null);
  });

  it('is null without a stored level', () => {
    assert.equal(worsenedFrom(undefined, 4), null);
    assert.equal(worsenedFrom('3', 4), null);
  });
});

describe('Story outlook and ranking cards', () => {
  const day = (date: string, band: number) => ({ date, band, pm25_mean: 1, rain_mm: 0 });
  const loc = (id: string, name: string, band: number, value: number) => ({ id, name: `${name}, Sumatera`, pm25_model: { band, value } });
  const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  const locations = names.map((n, i) => loc(n.toLowerCase(), `Kota ${n}`, (i % 5) + 1, i));
  const levelName = (band: number): string => LEVELS[band].name;
  const outlook = outlookLines({
    city: 'Palembang', level: 3, copy: LEVELS[3], story: STORY, levelName, weekday: (d: string) => `H${d.slice(-2)}`, day: 'Rabu 10.00',
    days: [day('2026-10-15', 2), day('2026-10-16', 4), day('2026-10-17', 5), day('2026-10-18', 1)]
  });
  const ranking = rankingLines({ locations, currentId: 'c', levelName, cityName: (l: { name: string }) => l.name.split(',')[0], story: STORY, day: 'Rabu 10.00' });

  it('outlook: city, "Perkiraan:" level, 3 tiles with weekday and level name', () => {
    assert.equal(outlook.kind, 'outlook');
    assert.equal(outlook.levelName, 'Perkiraan: Tidak Sehat');
    assert.deepEqual(outlook.tiles, [
      { label: 'H15', level: 2, name: 'Sedang', wet: false }, { label: 'H16', level: 4, name: 'Sangat Tidak Sehat', wet: false }, { label: 'H17', level: 5, name: 'Berbahaya', wet: false }
    ]);
    assert.equal(outlook.heading, 'Perkiraan 3 hari ke depan');
  });

  it('outlook: a day is wet from rainKind, and rain changes the card key', () => {
    const wetDay = { ...day('2026-10-15', 2), rain_mm: 3 };
    const make = (days: unknown[]) => outlookLines({ city: 'Palembang', level: 3, copy: LEVELS[3], story: STORY, levelName, weekday: (d: string) => d, day: 'Rabu 10.00', days });
    assert.deepEqual(make([wetDay, day('2026-10-16', 2), { ...day('2026-10-17', 2), rain_mm: 0.9 }]).tiles.map((t: { wet: boolean }) => t.wet), [true, false, false]);
    assert.notEqual(storyKey(make([wetDay])), storyKey(make([day('2026-10-15', 2)])));
  });

  it('ranking: all rows thickest smoke first, the viewer city marked', () => {
    assert.equal(ranking.rows.length, 13);
    const levels = ranking.rows.map((r: { level: number }) => r.level);
    assert.deepEqual(levels, [...levels].sort((a, b) => b - a));
    assert.deepEqual(ranking.rows.filter((r: { current: boolean }) => r.current).map((r: { city: string }) => r.city), ['Kota C']);
    assert.equal(ranking.title, 'Perkiraan asap hari ini');
  });

  it('rankRowHeight: 13 rows fit between y 270 and 1360, whole pixels', () => {
    const h = rankRowHeight(13);
    assert.equal(Number.isInteger(h), true);
    assert.ok(h * 13 <= 1360 - 270 && (h + 1) * 13 > 1360 - 270);
  });

  it('no line on the new cards has a banned word, advice or "Panduan"', () => {
    const text = JSON.stringify([outlook, ranking]);
    assert.doesNotMatch(text, /Panduan|\baman\b|akurat|pasti|gratis|boleh|harus/i);
    assert.doesNotMatch(text, /µg|PM2/);
  });
});

describe('icsReminder', () => {
  const ics = icsReminder({ title: 'Cek, Apa Kabar Udara', description: 'Satu; dua', url: 'https://x.test/#tarakan', now: new Date(2026, 9, 14, 15, 30) });
  it('starts tomorrow at 07:00 local time and repeats daily for 30 days', () => {
    assert.match(ics, /DTSTART:20261015T070000\r\n/);
    assert.match(ics, /RRULE:FREQ=DAILY;COUNT=30\r\n/);
  });
  it('escapes commas and semicolons, and has an alarm at the start', () => {
    assert.ok(ics.includes('SUMMARY:Cek\\, Apa Kabar Udara\r\n'));
    assert.ok(ics.includes('DESCRIPTION:Satu\\; dua\r\n'));
    assert.match(ics, /TRIGGER:PT0S/);
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  });
});

describe('worldviewUrl', () => {
  it('links the same box, day and layers as the photo', () => {
    assert.equal(
      worldviewUrl('111.4167,-4.7083,116.4167,0.2917', '2026-10-14'),
      'https://worldview.earthdata.nasa.gov/?v=111.4167,-4.7083,116.4167,0.2917&l=VIIRS_NOAA20_CorrectedReflectance_TrueColor,VIIRS_NOAA20_Thermal_Anomalies_375m_All&t=2026-10-14'
    );
  });
  it('is null without a box', () => {
    assert.equal(worldviewUrl(undefined, '2026-10-14'), null);
  });
});

describe('satellite map helpers', () => {
  it('builds the GIBS tile template for a layer and day', () => {
    assert.equal(
      gibsTileUrl('VIIRS_NOAA20_CorrectedReflectance_TrueColor', '2026-10-13'),
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/2026-10-13/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg'
    );
  });
  it('boxes a point by 15 degrees, or by the given size', () => {
    assert.deepEqual(mapBounds(-2, 113), [[-17, 98], [13, 128]]);
    assert.deepEqual(mapBounds(1, 2, 1), [[0, 1], [2, 3]]);
  });
});

describe('whatsappUrl', () => {
  it('encodes the text and the link, leaving no raw newline or space', () => {
    const url = whatsappUrl('Udara Palembang (perkiraan): Baik.\nApa Kabar Udara', 'https://x.id/p/#palembang kota');
    assert.ok(url.startsWith('https://wa.me/?text='));
    assert.doesNotMatch(url, /[\n\s]/);
    const decoded = decodeURIComponent(url.slice('https://wa.me/?text='.length));
    assert.equal(decoded, 'Udara Palembang (perkiraan): Baik.\nApa Kabar Udara\nhttps://x.id/p/#palembang kota');
  });
});

describe('orderShareActions', () => {
  it('keeps the default order without a last action or with an unknown one', () => {
    assert.deepEqual(orderShareActions(null), ['wa', 'system', 'save', 'copy']);
    assert.deepEqual(orderShareActions('x'), ['wa', 'system', 'save', 'copy']);
  });
  it('puts the last used action first and keeps the others in order', () => {
    assert.deepEqual(orderShareActions('save'), ['save', 'wa', 'system', 'copy']);
    assert.deepEqual(orderShareActions('copy'), ['copy', 'wa', 'system', 'save']);
  });
});

describe('trend', () => {
  const hrs = (vals: number[]) => vals.map((pm25, i) => ({ time: `2026-10-14T${String(i).padStart(2, '0')}:00:00Z`, pm25 }));
  const flat = (a: number, b: number) => hrs([a, a, a, b, b, b, b, b, b]);
  it('says better, worse or steady', () => {
    assert.equal(trend(flat(60, 40)), 'better');
    assert.equal(trend(flat(40, 60)), 'worse');
    assert.equal(trend(flat(40, 42)), 'steady');
  });
  it('needs both 15% and 5 µg/m3 (dead band)', () => {
    assert.equal(trend(flat(20, 16)), 'steady'); // 20%, but only 4 µg/m3
    assert.equal(trend(flat(100, 90)), 'steady'); // 10 µg/m3, but only 10%
    assert.equal(trend(flat(20, 15)), 'better'); // exactly 25%, 5 µg/m3
    assert.equal(trend(flat(100, 85)), 'better'); // exactly 15%
    assert.equal(trend(flat(100, 115)), 'worse');
  });
  it('is null for short or unreadable input and ignores hours past the ninth', () => {
    assert.equal(trend(hrs([1, 2, 3, 4, 5, 6, 7, 8])), null);
    assert.equal(trend(undefined), null);
    assert.equal(trend(hrs([60, 60, 60, NaN, 40, 40, 40, 40, 40])), null);
    assert.equal(trend(hrs([40, 40, 40, 60, 60, 60, 60, 60, 60, 1, 1, 1, 1])), 'worse');
  });
});

describe('glanceChips', () => {
  const base = { nearestHotspot: { km: 12.4, dir: 'Selatan' }, bestWindow: { when: 'Besok pagi', from: '06.00' }, rainMm: 0, canOpenMap: true };
  it('orders hotspot then best window, both tappable', () => {
    const chips = glanceChips(base);
    assert.deepEqual(chips.map(c => [c.kind, c.interactive]), [['hotspot', true], ['best', true]]);
    assert.equal(chips[0].text, 'Titik panas terdekat 12 km ke selatan');
    assert.equal(chips[1].text, 'Paling lega: besok pagi, 06.00');
  });
  it('uses the 100 km phrase and omits an unknown hotspot', () => {
    assert.equal(glanceChips({ ...base, nearestHotspot: null })[0].text, 'Tidak ada titik panas dalam 100 km');
    assert.deepEqual(glanceChips({ ...base, nearestHotspot: undefined }).map(c => c.kind), ['best']);
  });
  it('is static without a satellite photo', () => {
    assert.equal(glanceChips({ ...base, canOpenMap: false })[0].interactive, false);
  });
  it('falls back to a static rain chip on wet days only', () => {
    const wet = glanceChips({ ...base, bestWindow: null, rainMm: 4.2 });
    assert.deepEqual(wet.map(c => c.kind), ['hotspot', 'rain']);
    assert.equal(wet[1].text, 'Hujan hari ini sekitar 4 mm');
    assert.equal(wet[1].interactive, false);
    assert.deepEqual(glanceChips({ ...base, bestWindow: null, rainMm: 0.5 }).map(c => c.kind), ['hotspot']);
  });
});
