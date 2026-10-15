import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CAL, calendarPage, monthChoices, monthGrid } from '../web/calendar.js';
import { LEVELS } from '../web/copy.js';

const BANNED = /\b(akurat|valid|pasti|gratis|boleh|harus|aman)\b/i;
const KAMU = /\b(kamu|kotamu|napasmu|lokasimu)\b/i;
const days = (grid: (number | null)[][]): number[] => grid.flat().filter((d): d is number => d !== null);
const strings = (v: unknown): string[] => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : []);

describe('monthGrid', () => {
  it('starts October 2026 on Thursday: three blanks, 31 days, 5 weeks', () => {
    const g = monthGrid(2026, 9);
    assert.equal(g.length, 5);
    assert.deepEqual(g[0], [null, null, null, 1, 2, 3, 4]);
    assert.equal(days(g).length, 31);
  });
  it('starts November 2026 on Sunday: six blanks first, 6 weeks', () => {
    const g = monthGrid(2026, 10);
    assert.equal(g.length, 6);
    assert.deepEqual(g[0], [null, null, null, null, null, null, 1]);
    assert.equal(days(g).length, 30);
  });
  it('has 29 days in February 2028 and 28 in February 2027 (exactly 4 weeks, starting Monday)', () => {
    assert.equal(days(monthGrid(2028, 1)).length, 29);
    const g = monthGrid(2027, 1);
    assert.equal(days(g).length, 28);
    assert.equal(g.length, 4);
  });
  it('lists every day once, in order, in rows of seven', () => {
    for (const [y, m, n] of [[2026, 9, 31], [2026, 10, 30], [2028, 1, 29], [2027, 1, 28], [2026, 11, 31]]) {
      const g = monthGrid(y, m);
      assert.deepEqual(days(g), Array.from({ length: n }, (_, i) => i + 1));
      for (const week of g) assert.equal(week.length, 7);
    }
  });
});

describe('monthChoices', () => {
  it('offers this month and the next, rolling over the year', () => {
    assert.deepEqual(monthChoices(new Date(2026, 9, 15)), [{ year: 2026, month: 9 }, { year: 2026, month: 10 }]);
    assert.deepEqual(monthChoices(new Date(2026, 11, 3)), [{ year: 2026, month: 11 }, { year: 2027, month: 0 }]);
  });
});

describe('calendar copy and sheet', () => {
  it('has no banned word and no "kamu" in any string', () => {
    for (const line of strings(CAL)) {
      assert.doesNotMatch(line, BANNED, line);
      assert.doesNotMatch(line, KAMU, line);
    }
  });
  it('lists the five level names from LEVELS in the legend', () => {
    const html = calendarPage({ year: 2026, month: 9 });
    const names = Object.values(LEVELS).map(l => l.name);
    assert.equal(names.length, 5);
    for (const name of names) assert.ok(html.includes(`</em>${name}</span>`), name);
  });
  it('draws one circle per day, the month name, and a blank or filled city line', () => {
    const html = calendarPage({ year: 2028, month: 1 });
    assert.equal(html.match(/<i><\/i>/g)?.length, 29);
    assert.ok(html.includes('Februari 2028'));
    assert.ok(html.includes('Kota: ______'));
    assert.ok(calendarPage({ year: 2026, month: 9 }, 'Palangka Raya').includes('<u>Palangka Raya</u>'));
  });
});
