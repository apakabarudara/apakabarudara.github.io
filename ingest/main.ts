import { rename, writeFile } from 'node:fs/promises';
import { buildHotspotsFile, buildReport } from './build.ts';
import { boundingBox, fetchHotspotsCsv, parseFirmsCsv } from './firms.ts';
import { LOCATIONS } from './locations.ts';
import { fetchAirQuality, fetchForecast } from './open-meteo.ts';
import { validateHotspots, validateReport } from './validate.ts';

// 1° is over 100 km at these latitudes (all within 4° of the equator), so every radius fits in the box.
const BBOX_PAD_DEG = 1;
const OUTPUT = new URL('../data/latest.json', import.meta.url);
const TEMP = new URL('../data/latest.json.tmp', import.meta.url);
const HOTSPOTS_OUTPUT = new URL('../data/hotspots.json', import.meta.url);
const HOTSPOTS_TEMP = new URL('../data/hotspots.json.tmp', import.meta.url);

/** One run: fetch every source, build, validate, then replace latest.json and hotspots.json. Any failure leaves the last good file in place. */
async function main(): Promise<void> {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) throw new Error('FIRMS_MAP_KEY is not set');

  const now = new Date();
  const [airQuality, forecast, csv] = await Promise.all([
    fetchAirQuality(LOCATIONS),
    fetchForecast(LOCATIONS),
    fetchHotspotsCsv(mapKey, boundingBox(LOCATIONS, BBOX_PAD_DEG))
  ]);
  const hotspots = parseFirmsCsv(csv);
  const report = buildReport(LOCATIONS, { airQuality, forecast, hotspots }, now);
  const points = buildHotspotsFile(hotspots, now);

  const problems = [...validateReport(report, LOCATIONS.map(l => l.id)), ...validateHotspots(points)];
  if (problems.length > 0) throw new Error(`report rejected:\n- ${problems.join('\n- ')}`);

  await writeFile(TEMP, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(HOTSPOTS_TEMP, `${JSON.stringify(points)}\n`);
  await rename(TEMP, OUTPUT);
  await rename(HOTSPOTS_TEMP, HOTSPOTS_OUTPUT);
  console.log(`wrote ${report.locations.length} locations to data/latest.json and ${points.points.length} points to data/hotspots.json`);
}

main().catch((err: unknown) => {
  console.error(`ingest failed, data/latest.json and data/hotspots.json left as they were: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
