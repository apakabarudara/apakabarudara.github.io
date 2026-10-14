import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { LOCATIONS } from './locations.ts';
import type { Location } from './types.ts';

const WMS_URL = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
// Same satellite as the FIRMS hotspots; the thermal-anomaly layer draws the detections as red marks on the photo.
const LAYERS = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor,VIIRS_NOAA20_Thermal_Anomalies_375m_All';
export const SOURCE_LABEL = 'NASA GIBS (VIIRS NOAA-20)';
const SPAN_DEG = 3;
const SIZE_PX = 480;
// A day without coverage comes back as a ~1.6 KB near-uniform image (or as an XML error); real scenes are 15 KB or more.
export const MIN_IMAGE_BYTES = 8000;
const DAYS_BACK = 3;
const DAY_MS = 24 * 60 * 60 * 1000;
const OUT_DIR = new URL('../web/public/sat/', import.meta.url);
const TIMEOUT_MS = 30_000;
const ATTEMPTS = 2;

export interface SatEntry {
  id: string;
  date: string;
  source: string;
}

/** WMS 1.1.1 EPSG:4326 box (west,south,east,north) of SPAN_DEG degrees around the point. */
export function satBbox(lat: number, lon: number, spanDeg = SPAN_DEG): string {
  const half = spanDeg / 2;
  return [lon - half, lat - half, lon + half, lat + half].map(n => n.toFixed(4)).join(',');
}

/** UTC dates to try, newest first: today, then the two days before. The satellite's pass for today is often not processed yet. */
export function candidateDates(now: Date): string[] {
  return Array.from({ length: DAYS_BACK }, (_, i) => new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10));
}

/** A real scene is a JPEG of some size; coverage gaps give an XML exception or a tiny blank image. */
export function isUsableImage(contentType: string | null, bytes: number): boolean {
  return (contentType ?? '').startsWith('image/jpeg') && bytes >= MIN_IMAGE_BYTES;
}

function imageUrl(loc: Location, date: string): string {
  const query = new URLSearchParams({
    SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetMap', LAYERS, STYLES: '', SRS: 'EPSG:4326',
    BBOX: satBbox(loc.lat, loc.lon), WIDTH: String(SIZE_PX), HEIGHT: String(SIZE_PX), FORMAT: 'image/jpeg', TIME: date
  });
  return `${WMS_URL}?${query}`;
}

async function fetchImage(url: string): Promise<Buffer | null> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const body = Buffer.from(await res.arrayBuffer());
      return res.ok && isUsableImage(res.headers.get('content-type'), body.length) ? body : null;
    } catch (err) {
      if (attempt >= ATTEMPTS) throw err;
    }
  }
}

/** Newest usable day for one city, or null when none of the candidate days has a photo. */
async function fetchCity(loc: Location, now: Date): Promise<{ date: string; body: Buffer } | null> {
  for (const date of candidateDates(now)) {
    const body = await fetchImage(imageUrl(loc, date));
    if (body) return { date, body };
  }
  return null;
}

async function readPreviousIndex(): Promise<SatEntry[]> {
  try {
    return JSON.parse(await readFile(new URL('index.json', OUT_DIR), 'utf8')) as SatEntry[];
  } catch {
    return [];
  }
}

/** One photo per city into web/public/sat/. A city that fails is skipped with a warning and keeps its previous file and index entry. */
async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const now = new Date();
  const previous = new Map((await readPreviousIndex()).map(e => [e.id, e]));
  const entries = new Map<string, SatEntry>();
  let fresh = 0;
  for (const loc of LOCATIONS) {
    try {
      const photo = await fetchCity(loc, now);
      if (!photo) throw new Error(`no usable image for ${candidateDates(now).join(', ')}`);
      const target = new URL(`${loc.id}.jpg`, OUT_DIR);
      await writeFile(new URL(`${loc.id}.jpg.tmp`, OUT_DIR), photo.body);
      await rename(new URL(`${loc.id}.jpg.tmp`, OUT_DIR), target);
      entries.set(loc.id, { id: loc.id, date: photo.date, source: SOURCE_LABEL });
      fresh++;
      console.log(`${loc.id}: ${photo.date}, ${(photo.body.length / 1024).toFixed(1)} KB`);
    } catch (err) {
      const old = previous.get(loc.id);
      if (old) entries.set(loc.id, old);
      console.log(`::warning::satellite photo for ${loc.id} skipped${old ? ` (kept ${old.date})` : ''}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await writeFile(new URL('index.json', OUT_DIR), `${JSON.stringify([...entries.values()], null, 2)}\n`);
  console.log(`satellite photos: ${fresh}/${LOCATIONS.length} fresh`);
  if (fresh === 0) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((err: unknown) => {
    console.log(`::warning::satellite photos failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
