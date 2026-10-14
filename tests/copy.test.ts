import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ACTIVITIES, LEVELS, UI } from '../web/copy.js';

const ISPU_NAMES = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'];
const SLANG = /\b(gas|halu|plis|lebay|ngebut|vonis|faskes)\b/i;

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

    it(`level ${level} jokes only where the tone allows`, () => {
      const serious = level >= 4;
      assert.equal(copy.quip === null, serious);
      assert.equal(copy.bubble === null, serious);
    });

    it(`level ${level} offers health access from level 3, 119 from level 4, good news up to level 2`, () => {
      assert.equal(copy.faskes, level >= 3);
      assert.equal(copy.emergency, level >= 4);
      assert.equal(copy.goodNews, level <= 2);
    });

    it(`level ${level} has a status for every activity, consistent with the safety actions`, () => {
      for (const activity of ACTIVITIES) assert.ok(['ok', 'caution', 'no'].includes(copy.activities[activity.id]), activity.id);
      if (level >= 4) assert.deepEqual(copy.activities, { laundry: 'no', exercise: 'no', windows: 'no', kids: 'no' });
      if (level >= 3) assert.equal(copy.activities.exercise, 'no');
    });

    it(`level ${level} copy avoids slang older readers stumble on`, () => {
      const lines = [copy.headline, copy.quip ?? '', ...copy.everyone, ...copy.sensitive, ...(copy.bubble ?? []), copy.dayLine];
      for (const line of lines) assert.doesNotMatch(line, SLANG, line);
    });
  }
});

describe('UI', () => {
  it('shows the level against its scale', () => {
    assert.equal(UI.levelLabel('Tidak Sehat', 3), 'Tidak Sehat · level 3 dari 5');
  });

  it('names 119 in the symptom line only when the call button shows', () => {
    assert.doesNotMatch(UI.symptoms(false), /119/);
    assert.match(UI.symptoms(true), /telepon 119/);
  });

  it('dates shared messages, since forwards travel for days', () => {
    assert.equal(
      UI.shareText('Palembang', 'Rabu 10.00', 3, LEVELS[3].headline),
      'Palembang, Rabu 10.00: Tidak Sehat (level 3 dari 5). Kurangi aktivitas di luar.'
    );
  });
});
