import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { distanceKm } from '../ingest/geo.ts';
import { compassLabel } from '../ingest/wind.ts';

describe('distanceKm', () => {
  it('measures one degree of longitude on the equator as ~111.2 km', () => {
    assert.ok(Math.abs(distanceKm(0, 0, 0, 1) - 111.195) < 0.01);
  });

  it('is zero for the same point', () => {
    assert.equal(distanceKm(-2.2, 113.9, -2.2, 113.9), 0);
  });
});

describe('compassLabel', () => {
  const cases: [number, string][] = [
    [0, 'Utara'],
    [22.4, 'Utara'],
    [22.5, 'Timur laut'],
    [133, 'Tenggara'],
    [180, 'Selatan'],
    [270, 'Barat'],
    [337.5, 'Utara'],
    [359, 'Utara'],
    [-45, 'Barat laut'],
    [720, 'Utara']
  ];
  for (const [deg, label] of cases) {
    it(`${deg}° is ${label}`, () => assert.equal(compassLabel(deg), label));
  }
});
