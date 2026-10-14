// Pure functions for the page. No DOM, so tests/web-logic.test.ts can import them in Node.

export const STALE_MS = 3 * 3600e3;
export const EXPIRED_MS = 12 * 3600e3;
const EARTH_RADIUS_KM = 6371.0088;

/** 'fresh' under 3 hours, 'stale' under 12, otherwise 'expired' (also for a missing or unreadable timestamp). */
export function freshness(generatedAt, now) {
  const age = now.getTime() - Date.parse(generatedAt);
  if (!(age < EXPIRED_MS)) return 'expired';
  return age < STALE_MS ? 'fresh' : 'stale';
}

/** Which city to show: the one in the link, else the one saved on this device, else the first. */
export function resolveCity(ids, hashId, savedId) {
  if (ids.includes(hashId)) return { id: hashId, source: 'hash' };
  if (ids.includes(savedId)) return { id: savedId, source: 'saved' };
  return { id: ids[0], source: 'default' };
}

/** YYYY-MM-DD of `now` in the viewer's time zone. */
export function localDate(now) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Outlook days after today; today is what the answer card is about. */
export function upcomingDays(outlook, today) {
  return outlook.filter(day => day.date > today);
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = d => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** The closest location to a position, with its distance in km. */
export function nearest(locations, lat, lon) {
  return locations
    .map(location => ({ location, km: distanceKm(lat, lon, location.lat, location.lon) }))
    .reduce((best, next) => (next.km < best.km ? next : best));
}

/** Google Maps search; Maps uses the phone's own location, the page sends none. */
export function mapsSearchUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** "40 menit lalu" / "3 jam lalu". */
export function ago(fromIso, now) {
  const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(fromIso)) / 60000));
  return minutes < 60 ? `${minutes} menit lalu` : `${Math.round(minutes / 60)} jam lalu`;
}
