import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ACTIVITIES, FACTS, LEVELS, POLLS, UI } from '../web/copy.js';

const ISPU_NAMES = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'];
const SLANG = /\b(gas|halu|plis|lebay|ngebut|vonis|faskes|mantan|DJ|sinetron)\b/i;
const KAMU = /\b(kamu|kotamu|napasmu|lokasimu)\b/i;
// The app suggests, official sources prescribe, the user decides: no orders in health lines.
const COMMANDING = /segera ke\b|harus segera|\b(kamu|anda) harus\b|\bwajib\b/i;
const BANNED_WORDS = /puskesmas|\bRS\b|\bIGD\b|faskes/;

/** Every string in copy.js, with function entries called on sample arguments. */
function allCopy(): string[] {
  const out: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') out.push(value);
    else if (typeof value === 'function') walk((value as (...args: unknown[]) => unknown)('Pagi!', 'Rabu 10.00', 3, 'Kurangi aktivitas di luar.'));
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(LEVELS); walk(ACTIVITIES); walk(UI); walk(FACTS); walk(POLLS);
  return out;
}

describe('LEVELS', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    const copy = LEVELS[level];

    it(`level ${level} uses the official ISPU name, a headline and short advice`, () => {
      assert.equal(copy.name, ISPU_NAMES[level - 1]);
      assert.ok(copy.headline.length > 0);
      assert.ok(copy.everyone.length >= 1 && copy.everyone.length <= 2);
      assert.ok(copy.sensitive.length <= 1);
      assert.equal(copy.sensitive.length === 0, level === 1);
      assert.ok(copy.dayLine.length > 0);
    });

    it(`level ${level} is light, and says "kamu", only at levels 1–2`, () => {
      assert.equal(copy.quip === null, level >= 3);
      const lines = [copy.headline, copy.quip ?? '', ...copy.everyone, ...copy.sensitive, copy.dayLine];
      for (const line of lines) if (level >= 3) assert.doesNotMatch(line, KAMU, line);
    });

    it(`level ${level} offers health access from level 3, 119 from level 4, good news up to level 2`, () => {
      assert.equal(copy.health, level >= 3);
      assert.equal(copy.emergency, level >= 4);
      assert.equal(copy.goodNews, level <= 2);
    });

    it(`level ${level} has a status for every activity, consistent with the safety actions`, () => {
      for (const activity of ACTIVITIES) assert.ok(['ok', 'caution', 'no'].includes(copy.activities[activity.id]), activity.id);
      if (level >= 4) assert.deepEqual(copy.activities, { laundry: 'no', exercise: 'no', windows: 'no', kids: 'no' });
      if (level >= 3) assert.equal(copy.activities.exercise, 'no');
    });

    it(`level ${level} copy avoids slang older readers stumble on`, () => {
      const lines = [copy.headline, copy.quip ?? '', ...copy.everyone, ...copy.sensitive, copy.dayLine];
      for (const line of lines) assert.doesNotMatch(line, SLANG, line);
    });

    it(`level ${level} never claims "aman" in its headline or actions`, () => {
      for (const line of [copy.headline, ...copy.everyone, ...copy.sensitive, copy.dayLine]) assert.doesNotMatch(line, /\baman\b/i, line);
    });
  }

  it('words levels 1 and 2 as agreed, with the actions', () => {
    assert.equal(LEVELS[1].headline, 'Udara diperkirakan bagus hari ini.');
    assert.deepEqual(LEVELS[1].everyone, ['Aktivitas di luar oke']);
    assert.equal(LEVELS[2].headline, 'Masih oke untuk kebanyakan orang.');
  });

  it('keeps the level 3 work line and the levels 4–5 window line', () => {
    assert.ok(LEVELS[3].everyone.includes('Kalau bisa, kurangi kerja berat di luar. Kalau harus, istirahat lebih sering.'));
    assert.equal(UI.windowsShut, 'Sebaiknya jendela ditutup hari ini.');
  });
});

describe('activities', () => {
  it('uses the agreed notes', () => {
    const notes = Object.fromEntries(ACTIVITIES.map(a => [a.id, a.notes]));
    assert.equal(notes.laundry.no, 'Bisa bau asap');
    for (const id of ['laundry', 'exercise', 'windows', 'kids']) assert.equal(notes[id].ok, 'Oke');
  });
});

describe('health lines', () => {
  it('suggests, by urgency: a mild line and a severe line, with 119 only in the severe one', () => {
    assert.equal(UI.symptomsMild, 'Batuk terus atau mata perih? Ada baiknya periksa ke fasilitas kesehatan.');
    assert.equal(UI.symptomsEmergency, 'Sesak napas atau nyeri dada? Sebaiknya segera cari pertolongan medis, atau hubungi 119.');
    assert.doesNotMatch(UI.symptomsMild, /119/);
  });

  it('shows both lines from level 3 and the 119 button from level 4; none before', () => {
    assert.deepEqual([1, 2, 3, 4, 5].map(n => LEVELS[n].health), [false, false, true, true, true]);
    assert.deepEqual([1, 2, 3, 4, 5].map(n => LEVELS[n].emergency), [false, false, false, true, true]);
  });

  it('searches for health facilities without sending a position', () => {
    assert.equal(UI.healthButton, 'Cari fasilitas kesehatan');
    assert.equal(UI.healthQuery, 'fasilitas kesehatan terdekat');
  });

  it('answers "Sesak sekali" with the same suggestion', () => {
    const reply = POLLS.find(p => p.label === 'Sesak sekali')?.reply ?? '';
    assert.match(reply, /Kalau sesak berat atau nyeri dada, sebaiknya segera cari pertolongan medis, atau hubungi 119\./);
  });

  it('says whose guidance this follows', () => {
    assert.equal(UI.medicalNote, 'Saran kesehatan di sini mengikuti panduan Kemenkes, bukan pengganti pemeriksaan dokter.');
  });
});

describe('all copy', () => {
  it('never uses puskesmas, RS, IGD or faskes', () => {
    for (const line of allCopy()) assert.doesNotMatch(line, BANNED_WORDS, line);
  });

  it('does not order the reader around in health lines ("kalau harus …" stays fine)', () => {
    for (const line of allCopy()) assert.doesNotMatch(line, COMMANDING, line);
  });

  it('has no jokes in the facts and no body or breathing jokes anywhere', () => {
    for (const line of [...FACTS, ...allCopy()]) assert.doesNotMatch(line, /paru-paru (lagi|ikut)|\bjoget|\bmantan\b|\bdemo\b/i, line);
    assert.equal(FACTS.length, 4);
    assert.ok(!FACTS.some(f => /Titik panas bukan cuma/.test(f)));
  });

  it('keeps the owner-approved draft note for the health reviewer', () => {
    const source = readFileSync(new URL('../web/copy.js', import.meta.url), 'utf8');
    assert.match(source, /DRAFT: level 3–5 safety copy, the activity statuses and the symptom lines/);
    assert.match(source, /the app suggests, official sources prescribe, the user decides/i);
  });
});

describe('UI', () => {
  it('shows the level against its scale', () => {
    assert.equal(UI.levelLabel('Tidak Sehat', 3), 'Tidak Sehat · level 3 dari 5');
  });

  it('dates shared messages with city, weekday, time, level name and "level X dari 5"', () => {
    assert.equal(
      UI.shareText('Palembang', 'Rabu 10.00', 3, LEVELS[3].headline),
      'Palembang, Rabu 10.00: Tidak Sehat (level 3 dari 5). Kurangi aktivitas di luar.'
    );
    assert.match(UI.shareGood('Palembang', 'Rabu 10.00', 1), /^Palembang, Rabu 10\.00: Baik \(level 1 dari 5\)\./);
  });

  it('credits the data sources', () => {
    assert.equal(UI.creditOpenMeteo, 'Weather data by Open-Meteo.com');
    assert.match(UI.creditCams(2026), /Copernicus Atmosphere Monitoring Service information 2026/);
  });
});
