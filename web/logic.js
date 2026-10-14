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

/** Which city to show: the one in the link, else the one saved on this device, else none, which opens the overview. */
export function resolveCity(ids, hashId, savedId) {
  if (ids.includes(hashId)) return { id: hashId, source: 'hash' };
  if (ids.includes(savedId)) return { id: savedId, source: 'saved' };
  return { id: null, source: 'none' };
}

/** Worst air first; within a level, higher PM2.5 first. */
export function rankByLevel(locations) {
  return [...locations].sort((a, b) => b.pm25_model.band - a.pm25_model.band || b.pm25_model.value - a.pm25_model.value);
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

/**
 * The `span`-hour stretch with the lowest mean PM2.5 that starts at or after `fromHour` and ends by `toHour`
 * (viewer's local hours, from `localHour(iso)`). Ties go to the earliest. Null when no stretch fits.
 */
export function bestWindow(hours, { span, fromHour, toHour, localHour }) {
  let best = null;
  for (let i = 0; i + span <= hours.length; i++) {
    const startHour = localHour(hours[i].time);
    const endHour = startHour + span;
    if (startHour < fromHour || endHour > toHour) continue;
    const mean = hours.slice(i, i + span).reduce((sum, h) => sum + h.pm25, 0) / span;
    if (!best || mean < best.mean) best = { start: i, mean };
  }
  if (!best) return null;
  const end = new Date(Date.parse(hours[best.start + span - 1].time) + 3600e3).toISOString();
  return { start: hours[best.start].time, end, indexes: Array.from({ length: span }, (_, k) => best.start + k) };
}

/** Today's activity statuses: the level's own, except that forecast rain makes "ok" laundry a "caution". */
export function activityStatuses(levelActivities, rainMm, wetDayMm) {
  const laundry = levelActivities.laundry === 'ok' && rainMm >= wetDayMm ? 'caution' : levelActivities.laundry;
  return { ...levelActivities, laundry };
}

// 1 mm: the usual wet-day threshold. 50 mm: BMKG's "hujan lebat" daily band starts here.
export const WET_DAY_MM = 1;
export const HEAVY_RAIN_MM = 50;

/** Daily rain as a word key instead of millimetres. */
export function rainKind(mm) {
  if (mm < WET_DAY_MM) return 'none';
  return mm >= HEAVY_RAIN_MM ? 'heavy' : 'some';
}

/** Greeting for the viewer's local hour. */
export function greeting(hour) {
  if (hour >= 4 && hour < 11) return 'Pagi!';
  if (hour >= 11 && hour < 15) return 'Siang!';
  if (hour >= 15 && hour < 18) return 'Sore!';
  return 'Malam!';
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

/**
 * `?city=&level=` shows a level for screenshots and design review. It only counts together with `preview=1`, so a link
 * shared without it can never show a made-up level for real readers. Null means: ignore the query.
 */
export function previewOverride(search, ids) {
  const query = new URLSearchParams(search);
  if (query.get('preview') !== '1') return null;
  const city = query.get('city');
  const level = Number(query.get('level'));
  if (!ids.includes(city) || !Number.isInteger(level) || level < 1 || level > 5) return null;
  return { city, level };
}
