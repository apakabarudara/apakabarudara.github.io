import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { candidateDates, isUsableImage, MIN_IMAGE_BYTES, satBbox } from '../ingest/satellite.ts';

describe('satBbox', () => {
  it('is 5 degrees wide, west,south,east,north, around the city', () => {
    assert.equal(satBbox(-2.20833, 113.91667), '111.4167,-4.7083,116.4167,0.2917');
  });
});

describe('candidateDates', () => {
  it('tries today, yesterday, then the day before, in UTC', () => {
    assert.deepEqual(candidateDates(new Date('2026-10-14T00:30:00Z')), ['2026-10-14', '2026-10-13', '2026-10-12']);
    assert.deepEqual(candidateDates(new Date('2026-03-01T23:59:00Z')), ['2026-03-01', '2026-02-28', '2026-02-27']);
  });
});

describe('isUsableImage', () => {
  it('rejects XML errors and blank-sized images, accepts real scenes', () => {
    assert.equal(isUsableImage('application/vnd.ogc.se_xml; charset=UTF-8', 40_000), false);
    assert.equal(isUsableImage('image/jpeg', 1634), false);
    assert.equal(isUsableImage('image/jpeg', MIN_IMAGE_BYTES), true);
    assert.equal(isUsableImage(null, 40_000), false);
  });
});
