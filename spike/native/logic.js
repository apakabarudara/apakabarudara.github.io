// Pure functions for the page. No DOM.

const EARTH_RADIUS_KM = 6371.0088;
// 1 mm: the usual wet-day threshold.
export const WET_DAY_MM = 1;

/** Worst air first; within a level, higher PM2.5 first. */
export function rankByLevel(locations) {
  return [...locations].sort((a, b) => b.pm25_model.band - a.pm25_model.band || b.pm25_model.value - a.pm25_model.value);
}

/** YYYY-MM-DD of `now` in the viewer's time zone. */
export function localDate(now) {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  const rad = d => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** The closest location to a position. */
export function nearest(locations, lat, lon) {
  return locations
    .map(location => ({ location, km: distanceKm(lat, lon, location.lat, location.lon) }))
    .reduce((best, next) => (next.km < best.km ? next : best)).location;
}

/**
 * The `span`-hour stretch with the lowest mean PM2.5 that starts at or after `fromHour` and ends by `toHour`
 * (viewer's local hours, from `localHour(iso)`). Ties go to the earliest. Null when no stretch fits.
 */
export function bestWindow(hours, { span, fromHour, toHour, localHour }) {
  let best = null;
  for (let i = 0; i + span <= hours.length; i++) {
    const startHour = localHour(hours[i].time);
    if (startHour < fromHour || startHour + span > toHour) continue;
    const mean = hours.slice(i, i + span).reduce((sum, h) => sum + h.pm25, 0) / span;
    if (!best || mean < best.mean) best = { start: i, mean };
  }
  if (!best) return null;
  const end = new Date(Date.parse(hours[best.start + span - 1].time) + 3600e3).toISOString();
  return { start: hours[best.start].time, end, indexes: Array.from({ length: span }, (_, k) => best.start + k) };
}

/** Today's activity statuses: the level's own, except that forecast rain makes "ok" laundry a "caution". */
export function activityStatuses(levelActivities, rainMm) {
  const laundry = levelActivities.laundry === 'ok' && rainMm >= WET_DAY_MM ? 'caution' : levelActivities.laundry;
  return { ...levelActivities, laundry };
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
