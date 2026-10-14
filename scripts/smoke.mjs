// Post-deploy check of the live site: the page opens, every file it names is served, and the data is fresh.
// Exits non-zero on a problem, which emails the repo owner. Usage: node scripts/smoke.mjs <base url>
const base = (process.argv[2] ?? 'https://apakabarudara.github.io').replace(/\/?$/, '/');
const MAX_AGE_HOURS = 3;
const problems = [];
const get = async path => {
  const res = await fetch(new URL(path, base), { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) problems.push(`${path}: HTTP ${res.status}`);
  return res;
};
const page = await (await get('')).text();
const assets = [...page.matchAll(/(?:src|href)="(\.?\/?(?:assets|icons)\/[^"?#]+)"/g)].map(m => m[1]);
if (assets.length === 0) problems.push('index.html names no assets');
for (const path of new Set(['manifest.webmanifest', ...assets])) await get(path.replace(/^\.?\//, ''));
const data = await (await get('data/latest.json')).json().catch(() => null);
const ageHours = data ? (Date.now() - Date.parse(data.generated_at)) / 36e5 : Infinity;
if (!(ageHours <= MAX_AGE_HOURS)) problems.push(`data is ${Number.isFinite(ageHours) ? ageHours.toFixed(1) : '?'} h old (limit ${MAX_AGE_HOURS} h)`);
if (!Array.isArray(data?.locations) || data.locations.length === 0) problems.push('data has no locations');
const spots = await (await get('data/hotspots.json')).json().catch(() => null);
const spotsAge = spots ? (Date.now() - Date.parse(spots.generated_at)) / 36e5 : Infinity;
if (!(spotsAge <= MAX_AGE_HOURS)) problems.push(`hotspots are ${Number.isFinite(spotsAge) ? spotsAge.toFixed(1) : '?'} h old (limit ${MAX_AGE_HOURS} h)`);
if (!Array.isArray(spots?.points) || !spots.points.every(p => Array.isArray(p) && p.length === 2 && Math.abs(p[0]) <= 90 && Math.abs(p[1]) <= 180)) problems.push('hotspots has no valid points');
if (problems.length) {
  console.error(`smoke check failed for ${base}\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`smoke check ok: ${assets.length} assets, data ${ageHours.toFixed(1)} h old, ${data.locations.length} locations, ${spots.points.length} hotspots`);
