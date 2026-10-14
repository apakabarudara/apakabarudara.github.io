import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bandForPm25 } from '../ingest/bands.ts';

describe('bandForPm25', () => {
  const cases: [number, number][] = [
    [0, 1],
    [15.5, 1],
    [15.6, 2],
    [55.4, 2],
    [55.5, 3],
    [150.4, 3],
    [150.5, 4],
    [250.4, 4],
    [250.5, 5],
    [500, 5],
    [3241, 5]
  ];
  for (const [ugm3, band] of cases) {
    it(`${ugm3} µg/m³ is band ${band}`, () => assert.equal(bandForPm25(ugm3), band));
  }
});
