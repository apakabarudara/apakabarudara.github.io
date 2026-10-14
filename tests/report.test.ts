import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { REPORT, buildReport } from '../web/report.js';

const BANNED = /\b(akurat|valid|pasti|gratis|boleh|harus|aman)\b/i;
const NOW = new Date('2026-10-14T03:30:00Z');
const base = { lat: -2.21, lon: 113.92, city: 'Palangka Raya', now: NOW, timeZone: 'Asia/Jakarta' };
const near = { points: [[-2.21, 114.12], [-5, 100]] };

const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);

describe('buildReport', () => {
  it('formats coordinates to 5 decimals with a Maps link, city and local time', () => {
    const t = buildReport({ ...base, lat: -2.2100049, lon: 113.9 });
    assert.match(t, /Koordinat: -2\.21000, 113\.90000/);
    assert.match(t, /https:\/\/www\.google\.com\/maps\?q=-2\.21000,113\.90000/);
    assert.match(t, /Kota terdekat: Palangka Raya/);
    assert.match(t, /14 Oktober 2026.*10\.30 WIB/);
  });

  it('never prints a negative zero', () => {
    assert.match(buildReport({ ...base, lat: -0.000001, lon: 0 }), /Koordinat: 0\.00000, 0\.00000/);
  });

  it('adds the nearest NASA hotspot with the shared compass wording', () => {
    const t = buildReport({ ...base, hotspots: near });
    assert.match(t, /Titik panas satelit NASA terdekat sekitar 22 km ke timur, 24 jam terakhir\./);
  });

  it('says "kurang dari 1 km" when it is right there', () => {
    const t = buildReport({ ...base, hotspots: { points: [[-2.2101, 113.9201]] } });
    assert.match(t, /terdekat kurang dari 1 km ke /);
  });

  it('leaves the hotspot sentence out beyond 100 km, with no file, or with a bad file', () => {
    for (const hotspots of [{ points: [[-5, 100]] }, null, { points: 'x' }, { points: [] }]) {
      assert.doesNotMatch(buildReport({ ...base, hotspots }), /Titik panas/);
    }
  });

  it('never contains undefined or NaN and always ends with the request', () => {
    for (const hotspots of [near, null, { points: [[NaN, 1], [-2.2, 113.9]] }]) {
      const t = buildReport({ ...base, hotspots });
      assert.doesNotMatch(t, /undefined|NaN|null/);
      assert.ok(t.endsWith('Mohon ditindaklanjuti. Laporan ini dikirim dari Apa Kabar Udara oleh warga.'));
    }
  });

  it('uses the device time zone when none is given', () => {
    assert.doesNotMatch(buildReport({ lat: 1, lon: 2, city: 'X', now: NOW }), /undefined|NaN/);
  });
});

describe('REPORT copy', () => {
  it('has no banned word in any string, nor in a generated report', () => {
    for (const s of [...strings(REPORT), buildReport({ ...base, hotspots: near })]) assert.doesNotMatch(s, BANNED, s);
  });

  it('lists exactly 112, 113 and 117, once each, as tel links', () => {
    assert.deepEqual(REPORT.contacts.map(c => c.tel), ['112', '113', '117']);
    const all = strings(REPORT.contacts).join(' ');
    for (const n of ['112', '113', '117']) assert.equal(all.split(n).length - 1, 1, n);
    assert.doesNotMatch(all, /1131/);
  });

  it('keeps the fixed lines and the honest footer', () => {
    assert.equal(REPORT.caution, 'Utamakan keselamatanmu dan jangan mendekati api.');
    assert.match(REPORT.notSent, /tidak mengirim laporan dan tidak bisa memastikan petugas datang/);
    assert.doesNotMatch(strings(REPORT).join(' '), /https?:|BPBD [A-Z]|Manggala|SiPongi/);
  });

  it('the static button in index.html says the same as REPORT.open', () => {
    assert.match(readFileSync('web/index.html', 'utf8'), new RegExp(`id="reportBtn"[^>]*>${REPORT.open}</button>`));
  });
});
