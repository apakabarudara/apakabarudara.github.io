import { distanceKm } from './geo.ts';
import type { Location } from './types.ts';

const AREA_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
// Suomi NPP stops delivering on 2026-11-02, so NOAA-20 it is. One satellite only: mixing them double-counts a fire.
const SOURCE = 'VIIRS_NOAA20_NRT';
export const SOURCE_LABEL = 'NASA FIRMS VIIRS NOAA-20 NRT';
// Two UTC days so the 24-hour window is covered whatever the hour.
const DAY_RANGE = 2;
const DAY_MS = 24 * 60 * 60 * 1000;
const REQUIRED_COLUMNS = ['latitude', 'longitude', 'acq_date', 'acq_time', 'confidence'] as const;
// The API sends l/n/h; the public 24h files spell the words out.
const CONFIDENCE: Readonly<Record<string, 'low' | 'nominal' | 'high'>> = { l: 'low', n: 'nominal', h: 'high', low: 'low', nominal: 'nominal', high: 'high' };

export interface Hotspot {
  lat: number;
  lon: number;
  acquiredAt: Date;
  confidence: 'low' | 'nominal' | 'high';
}

export interface BoundingBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** The box around all locations, padded so every radius around them fits inside. */
export function boundingBox(locations: readonly Location[], padDeg: number): BoundingBox {
  const lats = locations.map(l => l.lat);
  const lons = locations.map(l => l.lon);
  return {
    west: Math.min(...lons) - padDeg,
    south: Math.min(...lats) - padDeg,
    east: Math.max(...lons) + padDeg,
    north: Math.max(...lats) + padDeg
  };
}

/** Raw CSV of detections in the box over the last two UTC days. The key stays out of any error message. */
export async function fetchHotspotsCsv(mapKey: string, box: BoundingBox): Promise<string> {
  const area = [box.west, box.south, box.east, box.north].map(n => n.toFixed(4)).join(',');
  const res = await fetch(`${AREA_URL}/${encodeURIComponent(mapKey)}/${SOURCE}/${area}/${DAY_RANGE}`);
  const body = await res.text();
  if (!res.ok) throw new Error(`FIRMS failed (${res.status}): ${body.slice(0, 200).trim()}`);
  return body;
}

/** Parses a FIRMS VIIRS CSV. An unexpected header or value throws, so a format change fails the run instead of reading as zero fires. */
export function parseFirmsCsv(csv: string): Hotspot[] {
  const [header = '', ...rows] = csv.trim().split(/\r?\n/);
  const columns = header.split(',');
  const index = Object.fromEntries(
    REQUIRED_COLUMNS.map(name => {
      const i = columns.indexOf(name);
      if (i < 0) throw new Error(`FIRMS CSV has no "${name}" column; got: ${header.slice(0, 200)}`);
      return [name, i];
    })
  ) as Record<(typeof REQUIRED_COLUMNS)[number], number>;

  return rows.map((row, n) => {
    const cells = row.split(',');
    const time = (cells[index.acq_time] ?? '').padStart(4, '0');
    const hotspot: Hotspot = {
      lat: Number(cells[index.latitude]),
      lon: Number(cells[index.longitude]),
      acquiredAt: new Date(`${cells[index.acq_date]}T${time.slice(0, 2)}:${time.slice(2)}:00Z`),
      confidence: CONFIDENCE[cells[index.confidence]]
    };
    if (!Number.isFinite(hotspot.lat) || !Number.isFinite(hotspot.lon) || Number.isNaN(hotspot.acquiredAt.getTime()) || !hotspot.confidence) {
      throw new Error(`FIRMS CSV row ${n + 2} is malformed: ${row.slice(0, 200)}`);
    }
    return hotspot;
  });
}

/** Nominal- and high-confidence detections acquired in the 24 hours up to now: the ones that count as a fire. */
export function recentFires(hotspots: readonly Hotspot[], now: Date): Hotspot[] {
  const since = now.getTime() - DAY_MS;
  return hotspots.filter(h => h.confidence !== 'low' && h.acquiredAt.getTime() >= since && h.acquiredAt.getTime() <= now.getTime());
}

/** Fires (see recentFires) within radiusKm of the location. */
export function countNearby(hotspots: readonly Hotspot[], location: Location, radiusKm: number, now: Date): number {
  return recentFires(hotspots, now).filter(h => distanceKm(location.lat, location.lon, h.lat, h.lon) <= radiusKm).length;
}
