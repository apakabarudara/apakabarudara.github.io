import { rename, writeFile } from 'node:fs/promises';
import { buildReport } from './build.ts';
import { boundingBox, fetchHotspotsCsv, parseFirmsCsv } from './firms.ts';
import { LOCATIONS } from './locations.ts';
import { fetchAirQuality, fetchForecast } from './open-meteo.ts';
import { validateReport } from './validate.ts';

// 1° is over 100 km at these latitudes (all within 4° of the equator), so every radius fits in the box.
const BBOX_PAD_DEG = 1;
const OUTPUT = new URL('../data/latest.json', import.meta.url);
const TEMP = new URL('../data/latest.json.tmp', import.meta.url);

/** One run: fetch every source, build, validate, then replace latest.json. Any failure leaves the last good file in place. */
async function main(): Promise<void> {
  const mapKey = process.env.FIRMS_MAP_KEY;
  if (!mapKey) throw new Error('FIRMS_MAP_KEY is not set');

  const now = new Date();
  const [airQuality, forecast, csv] = await Promise.all([
    fetchAirQuality(LOCATIONS),
    fetchForecast(LOCATIONS),
    fetchHotspotsCsv(mapKey, boundingBox(LOCATIONS, BBOX_PAD_DEG))
  ]);
  const report = buildReport(LOCATIONS, { airQuality, forecast, hotspots: parseFirmsCsv(csv) }, now);

  const problems = validateReport(report, LOCATIONS.map(l => l.id));
  if (problems.length > 0) throw new Error(`report rejected:\n- ${problems.join('\n- ')}`);

  await writeFile(TEMP, `${JSON.stringify(report, null, 2)}\n`);
  await rename(TEMP, OUTPUT);
  console.log(`wrote ${report.locations.length} locations to data/latest.json`);
}

main().catch((err: unknown) => {
  console.error(`ingest failed, data/latest.json left as it was: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
