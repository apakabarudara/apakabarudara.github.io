import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { LEVELS, UI } from '../web/copy.js';

const ISPU_NAMES = ['Baik', 'Sedang', 'Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya'];

describe('LEVELS', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    const copy = LEVELS[level];

    it(`level ${level} uses the official ISPU name and has a headline and 1–3 actions`, () => {
      assert.equal(copy.name, ISPU_NAMES[level - 1]);
      assert.ok(copy.headline.length > 0);
      assert.ok(copy.actions.length >= 1 && copy.actions.length <= 3);
      assert.ok(copy.dayLine.length > 0);
    });

    it(`level ${level} jokes only where the tone allows`, () => {
      const serious = level >= 4;
      assert.equal(copy.quip === null, serious);
      assert.equal(copy.bubble === null, serious);
    });

    it(`level ${level} offers health access from level 3 and 119 from level 4`, () => {
      assert.equal(copy.faskes, level >= 3);
      assert.equal(copy.emergency, level >= 4);
    });
  }
});

describe('UI', () => {
  it('shares the level, its name and the headline', () => {
    assert.equal(UI.shareText('Palembang', 3, LEVELS[3].headline), 'Palembang: Level 3 · Tidak Sehat. Kurangi aktivitas di luar.');
  });
});
