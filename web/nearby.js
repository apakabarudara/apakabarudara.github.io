// "Di sekitarmu": pure helpers for the satellite map. Hotspots are points; the air model is not, so no per-point air quality here.
const R_KM = 6371;
const rad = d => (d * Math.PI) / 180;
// Same labels and order as ingest/wind.ts; wind_dir is where the wind blows FROM (meteorological degrees).
const POINTS = ['Utara', 'Timur laut', 'Timur', 'Tenggara', 'Selatan', 'Barat daya', 'Barat', 'Barat laut'];
export const NEAR_KM = 50;
export const FAR_KM = 100;

export function haversineKm(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from `from` to `to` in degrees, 0 = north, clockwise. */
export function bearingDeg(from, to) {
  const dLon = rad(to[1] - from[1]);
  const y = Math.sin(dLon) * Math.cos(rad(to[0]));
  const x = Math.cos(rad(from[0])) * Math.sin(rad(to[0])) - Math.sin(rad(from[0])) * Math.cos(rad(to[0])) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export const compassName = deg => POINTS[Math.round((((deg % 360) + 360) % 360) / 45) % POINTS.length];

/** Degrees for a wind_dir label, or null when the label is missing or unknown. */
export function labelDegrees(label) {
  const i = POINTS.findIndex(p => p.toLowerCase() === String(label ?? '').trim().toLowerCase());
  return i < 0 ? null : i * 45;
}

/** Keeps only [lat, lon] pairs of finite numbers; anything else means "no hotspot file". */
export function cleanPoints(data) {
  if (!data || !Array.isArray(data.points)) return null;
  const pts = data.points.filter(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]));
  return pts.length > 0 ? pts : null;
}

export function nearestHotspot(points, lat, lon) {
  let best = null;
  for (const p of points) {
    const km = haversineKm([lat, lon], p);
    if (!best || km < best.km) best = { km, p };
  }
  return best ? { km: best.km, bearing: bearingDeg([lat, lon], best.p) } : null;
}

export const countWithin = (points, lat, lon, km) => points.filter(p => haversineKm([lat, lon], p) <= km).length;

/** A hotspot is upwind when it lies in the direction the wind comes from (within tolDeg). */
export function isUpwind(bearingToHotspot, windFromDeg, tolDeg = 45) {
  const d = Math.abs((((bearingToHotspot - windFromDeg) % 360) + 540) % 360 - 180);
  return d <= tolDeg;
}

export const RING_CAP = 300;

/** Hotspots within FAR_KM whose bearing is within 45 degrees of where the wind comes from, nearest first. The card counts it and the map rings draw it. */
export function upwindSector(points, lat, lon, windFromDeg) {
  if (windFromDeg === null) return [];
  return points
    .map(p => ({ p, km: haversineKm([lat, lon], p) }))
    .filter(h => h.km <= FAR_KM && isUpwind(bearingDeg([lat, lon], h.p), windFromDeg))
    .sort((a, b) => a.km - b.km)
    .map(h => h.p);
}

const lc = s => s.toLowerCase();
export const NB = {
  you: 'Titik ini',
  locate: 'Lokasiku',
  wind: 'angin',
  area: 'Lingkaran putus-putus: perkiraan udara berlaku untuk area ini.',
  denied: 'Lokasi tidak terbaca. Ketuk petanya saja.',
  nearest: (km, dir) => `Titik panas terdekat dari titik ini: ${km < 1 ? 'kurang dari 1 km' : `${Math.round(km)} km ke ${lc(dir)}`}.`,
  count: n => `Ada ${n} titik panas dalam ${NEAR_KM} km.`,
  windSome: (dir, n) => `Angin di kota ini hari ini datang dari ${lc(dir)}. Di arah itu ada ${n} titik panas dalam ${FAR_KM} km (lingkaran oranye).`,
  windNone: dir => `Angin di kota ini hari ini datang dari ${lc(dir)}, dan di arah itu tidak ada titik panas dalam ${FAR_KM} km.`,
  none: `Tidak ada titik panas dalam ${FAR_KM} km dari titik ini dalam 24 jam terakhir. Asap tetap bisa datang dari tempat yang lebih jauh.`,
  caveat: 'Ini perkiraan kasar, untuk referensi saja.'
};

/** The result card sentences for a tapped spot; windDir is the city's wind_dir label. */
export function nearbyLines(points, lat, lon, windDir) {
  const near = nearestHotspot(points, lat, lon);
  if (!near || near.km > FAR_KM) return [NB.none, NB.caveat];
  const lines = [NB.nearest(near.km, compassName(near.bearing))];
  const n = countWithin(points, lat, lon, NEAR_KM);
  if (n > 1) lines.push(NB.count(n));
  const from = labelDegrees(windDir);
  if (from !== null) {
    const n = upwindSector(points, lat, lon, from).length;
    lines.push(n > 0 ? NB.windSome(windDir, n) : NB.windNone(windDir));
  }
  lines.push(NB.caveat);
  return lines;
}
