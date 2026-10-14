import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compassLabel } from '../ingest/wind.ts';
import { NB, bearingDeg, cleanPoints, compassName, countWithin, haversineKm, isUpwind, labelDegrees, nearbyLines, nearestHotspot, upwindSector } from '../web/nearby.js';

const HERE: [number, number] = [-2.21, 113.92];
const BANNED = /\b(akurat|valid|pasti|gratis|boleh|harus|aman)\b/i;

describe('geometry', () => {
  it('haversine: one degree of latitude is about 111 km', () => {
    assert.ok(Math.abs(haversineKm([0, 100], [1, 100]) - 111.2) < 0.5);
    assert.equal(haversineKm(HERE, HERE), 0);
  });

  it('bearing: cardinal directions', () => {
    assert.ok(Math.abs(bearingDeg(HERE, [HERE[0] + 0.5, HERE[1]]) - 0) < 0.5);
    assert.ok(Math.abs(bearingDeg(HERE, [HERE[0], HERE[1] + 0.5]) - 90) < 0.5);
    assert.ok(Math.abs(bearingDeg(HERE, [HERE[0] - 0.5, HERE[1]]) - 180) < 0.5);
    assert.ok(Math.abs(bearingDeg(HERE, [HERE[0], HERE[1] - 0.5]) - 270) < 0.5);
  });
});

describe('compass', () => {
  it('uses exactly the labels the ingest writes into wind_dir', () => {
    for (let d = 0; d < 360; d += 5) assert.equal(compassName(d), compassLabel(d));
  });

  it('maps a label back to its degrees and rejects unknown ones', () => {
    assert.equal(labelDegrees('Timur'), 90);
    assert.equal(labelDegrees('Barat laut'), 315);
    assert.equal(labelDegrees('selatan'), 180);
    assert.equal(labelDegrees(''), null);
    assert.equal(labelDegrees(undefined), null);
  });
});

describe('hotspots', () => {
  const south: [number, number] = [HERE[0] - 0.2, HERE[1]];
  const north: [number, number] = [HERE[0] + 0.5, HERE[1]];

  it('finds the nearest one with its bearing', () => {
    const n = nearestHotspot([north, south], HERE[0], HERE[1]);
    assert.ok(n && Math.abs(n.km - 22.2) < 0.5 && Math.abs(n.bearing - 180) < 0.5);
    assert.equal(nearestHotspot([], 0, 0), null);
  });

  it('counts within a radius', () => {
    assert.equal(countWithin([north, south], HERE[0], HERE[1], 50), 1);
    assert.equal(countWithin([north, south], HERE[0], HERE[1], 100), 2);
  });

  it('wind convention: wind FROM Selatan makes a hotspot due south upwind and one due north not', () => {
    const from = labelDegrees('Selatan') as number;
    assert.equal(isUpwind(bearingDeg(HERE, south), from), true);
    assert.equal(isUpwind(bearingDeg(HERE, north), from), false);
  });

  it('isUpwind wraps around north and respects the tolerance', () => {
    assert.equal(isUpwind(350, 10), true);
    assert.equal(isUpwind(10, 350), true);
    assert.equal(isUpwind(100, 0), false);
    assert.equal(isUpwind(45, 0), true);
    assert.equal(isUpwind(46, 0), false);
  });

  it('upwindSector keeps only upwind points within 100 km, nearest first', () => {
    const far: [number, number] = [HERE[0] - 2, HERE[1]];
    assert.deepEqual(upwindSector([north, far, south], HERE[0], HERE[1], 180), [south]);
    assert.deepEqual(upwindSector([south], HERE[0], HERE[1], null), []);
  });

  it('cleanPoints accepts a good file and rejects the rest', () => {
    assert.deepEqual(cleanPoints({ points: [[1, 2], ['x', 3], [4]] }), [[1, 2]]);
    for (const bad of [null, undefined, {}, { points: 'x' }, { points: [] }, '<html>']) assert.equal(cleanPoints(bad), null);
  });
});

describe('sentences', () => {
  const south: [number, number] = [HERE[0] - 0.2, HERE[1]];

  it('nearest, count and the upwind sector', () => {
    const lines = nearbyLines([south, [HERE[0] - 0.25, HERE[1]]], HERE[0], HERE[1], 'Selatan');
    assert.equal(lines[0], 'Titik panas terdekat dari titik ini: 22 km ke selatan.');
    assert.equal(lines[1], 'Ada 2 titik panas dalam 50 km.');
    assert.equal(lines[2], 'Angin di kota ini hari ini datang dari selatan. Di arah itu ada 2 titik panas dalam 100 km (lingkaran oranye).');
  });

  it('says so when the upwind sector is empty, even with a hotspot downwind', () => {
    const lines = nearbyLines([south], HERE[0], HERE[1], 'Utara');
    assert.equal(lines[1], 'Angin di kota ini hari ini datang dari utara, dan di arah itu tidak ada titik panas dalam 100 km.');
    assert.equal(nearbyLines([south], HERE[0], HERE[1], '').length, 2);
  });

  it('the N in the sentence is the size of the set the rings draw', () => {
    const pts: [number, number][] = [south, [HERE[0] - 0.4, HERE[1] + 0.1], [HERE[0] + 0.3, HERE[1]], [HERE[0] - 2, HERE[1]]];
    const n = upwindSector(pts, HERE[0], HERE[1], 180).length;
    assert.equal(n, 2);
    assert.match(nearbyLines(pts, HERE[0], HERE[1], 'Selatan').join(' '), new RegExp(`ada ${n} titik panas dalam 100 km`));
  });

  it('says so when nothing is within 100 km', () => {
    assert.equal(nearbyLines([[HERE[0] - 3, HERE[1]]], HERE[0], HERE[1], 'Timur')[0], 'Tidak ada titik panas dalam 100 km dari titik ini dalam 24 jam terakhir. Asap tetap bisa datang dari tempat yang lebih jauh.');
  });

  it('no sentence has a banned word', () => {
    const all = [
      ...Object.values(NB).filter((v): v is string => typeof v === 'string'),
      NB.nearest(0.4, 'Utara'), NB.nearest(30, 'Barat daya'), NB.count(3), NB.windSome('Timur', 3), NB.windNone('Timur'),
      ...nearbyLines([south], HERE[0], HERE[1], 'Selatan'), ...nearbyLines([], 0, 0, '')
    ];
    for (const line of all) assert.doesNotMatch(line, BANNED, line);
  });
});
