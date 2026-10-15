// Pure functions for the page. No DOM, so tests/web-logic.test.ts can import them in Node.
import { bandForPm25 } from '../ingest/bands.ts';

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
 * (viewer's local hours, from `localHour(iso)`), with the ISPU band of its mean PM2.5. Ties go to the earliest. Null when no stretch fits.
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
  return { start: hours[best.start].time, end, indexes: Array.from({ length: span }, (_, k) => best.start + k), band: bandForPm25(best.mean) };
}

/**
 * The cards under "Kapan udara paling lega?" for the day's level: [{ id, variant, window }]. `window` says the card may show the best window.
 * Laundry: rain wins, then smoke (level 3+), else clear. Windows keep the level's own status. Three cards at most, window card first. ISPU cards (exercise, outdoor, kidsHigh) quote
 * the `variant` field of OFFICIAL_ISPU; only kidsHigh (levels 4–5, restrictive wording) takes the sensitive-group sentence. No window on smoky or rainy laundry, closed windows or ISPU quotes.
 */
export function todayCards(level, levelActivities, rainMm, wetDayMm, hasWindow) {
  const laundry = rainMm >= wetDayMm ? 'rain' : levelActivities.laundry === 'ok' ? 'clear' : 'smoke';
  const laundryCard = { id: 'laundry', variant: laundry, window: hasWindow && laundry === 'clear' };
  const windowsCard = { id: 'windows', variant: levelActivities.windows, window: hasWindow && levelActivities.windows !== 'no' };
  const exercise = { id: 'exercise', variant: 'everyone', window: false };
  // Three cards at most; the card that shows the best window goes first (stable sort keeps the level's own order otherwise).
  const first = (cards) => [...cards].sort((a, b) => Number(b.window) - Number(a.window));
  if (level <= 2) return first([{ id: 'terrace', variant: null, window: hasWindow }, laundryCard, exercise]);
  if (level === 3) return first([laundryCard, windowsCard, { id: 'outdoor', variant: 'everyone', window: false }]);
  return first([windowsCard, laundryCard, { id: 'kidsHigh', variant: 'sensitive', window: false }]);
}

// 1 mm: the usual wet-day threshold. 50 mm: BMKG's "hujan lebat" daily band starts here.
export const WET_DAY_MM = 1;
export const HEAVY_RAIN_MM = 50;

/** Daily rain as a word key instead of millimetres. */
export function rainKind(mm) {
  if (mm < WET_DAY_MM) return 'none';
  return mm >= HEAVY_RAIN_MM ? 'heavy' : 'some';
}

const WORLDVIEW = 'https://worldview.earthdata.nasa.gov/';
const WORLDVIEW_LAYERS = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor,VIIRS_NOAA20_Thermal_Anomalies_375m_All';

/** Interactive NASA Worldview link for the same box, day and layers as the photo; null when the index entry has no box. */
export function worldviewUrl(bbox, date) {
  return bbox && date ? `${WORLDVIEW}?v=${bbox}&l=${WORLDVIEW_LAYERS}&t=${date}` : null;
}

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
/** Leaflet tile template for a NASA GIBS true-colour layer (EPSG:3857, GoogleMapsCompatible_Level9) on one day. */
export const gibsTileUrl = (layer, date) => `${GIBS}/${layer}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;

/** [[south, west], [north, east]] box of `deg` degrees around a point, for the map's maxBounds. */
export const mapBounds = (lat, lon, deg = 15) => [[lat - deg, lon - deg], [lat + deg, lon + deg]];

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

/**
 * "Kapan membaik?" for levels 3–5, from the days after today: the first day whose band is lower than today's level,
 * else how many days were checked. Null at levels 1–2 and when the forecast has no later day.
 */
export function improvement(outlook, today, level) {
  if (level < 3) return null;
  const days = upcomingDays(outlook, today);
  if (days.length === 0) return null;
  const better = days.find(day => day.band < level);
  return better ? { date: better.date } : { days: days.length };
}

export const WATCH_MAX = 3;

/**
 * Pinned family cities: known ids only, no duplicates, at most WATCH_MAX besides the city on screen. The city on screen
 * may stay in the list (it was pinned earlier) but is not counted, so switching to a pinned city never drops another.
 */
export function normalizeWatch(list, ids, current = null) {
  const out = [];
  let others = 0;
  for (const id of Array.isArray(list) ? list : []) {
    if (!ids.includes(id) || out.includes(id)) continue;
    if (id !== current) {
      if (others >= WATCH_MAX) continue;
      others++;
    }
    out.push(id);
  }
  return out;
}

/** Pins or unpins `id`. `refused` when pinning would pass WATCH_MAX. */
export function toggleWatch(list, id, ids, current = null) {
  const now = normalizeWatch(list, ids, current);
  if (now.includes(id)) return { list: now.filter(x => x !== id), refused: false };
  if (!ids.includes(id)) return { list: now, refused: false };
  if (now.filter(x => x !== current).length >= WATCH_MAX) return { list: now, refused: true };
  return { list: [...now, id], refused: false };
}

/** The cities shown as chips: pinned, minus the one on screen. */
export const watchRow = (list, current) => list.filter(id => id !== current);

/** iPhone, iPad (also when it reports as a Mac) in Safari itself; other iOS browsers are left out. */
export function isIosSafari(ua, platform, touchPoints) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
  return ios && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua);
}

/** Which install control to show: 'prompt' (Chromium event in hand), 'ios' (steps in a sheet) or null. Not before the second visit. */
export function installMode({ standalone, hasPrompt, ios, dismissed, visits }) {
  if (standalone || dismissed || visits < 2) return null;
  if (hasPrompt) return 'prompt';
  return ios ? 'ios' : null;
}

/** The shareable link to a city: the page address plus #<city id>. */
export const cityLink = (base, id) => `${base}#${encodeURIComponent(id)}`;

/** One line per day from a list, the same all day (local date) and different from yesterday's. Null when the level has none. */
export function dailyQuip(quips, today) {
  if (!quips?.length) return null;
  return quips[Math.floor(Date.parse(`${today}T00:00:00Z`) / 864e5) % quips.length];
}

/** The level seen last time when this check is better and good (level 1–2); otherwise null. */
export const improvedFrom = (previous, level) => (Number.isInteger(previous) && level < previous && level <= 2 ? previous : null);

/** The level seen last time when this check is worse; otherwise null. Any level. */
export const worsenedFrom = (previous, level) => (Number.isInteger(previous) && level > previous ? previous : null);

/** Row height for `count` ranking rows between two y positions (whole pixels, so rows never run past `bottom`). */
export const rankRowHeight = (count, top = 270, bottom = 1360) => Math.floor((bottom - top) / count);

/** WhatsApp's "send to" link: the text and the link as one message, every newline encoded. */
export const whatsappUrl = (text, link) => `https://wa.me/?text=${encodeURIComponent(`${text}\n${link}`)}`;

export const SHARE_ACTIONS = ['wa', 'system', 'save', 'copy'];

/** The share rows with the one used last on top; the rest keep their default order. An unknown `last` changes nothing. */
export const orderShareActions = last => (SHARE_ACTIONS.includes(last) ? [last, ...SHARE_ACTIONS.filter(a => a !== last)] : [...SHARE_ACTIONS]);

/** Cache key for a drawn Story card: everything printed on it. */
export function storyKey(lines) {
  return JSON.stringify(lines);
}

/** What the Story card says: the level, then the finding as headline. Levels 1–2: a quip. Levels 3–5: the official ISPU sentence for everyone (`official`, quoted) with its source; no advice of our own. */
export function storyLines({ city, level, copy, story, official, quip, improve, day }) {
  const light = level <= 2;
  return {
    kind: 'city',
    city,
    level,
    levelName: story.levelName(copy.name),
    guide: light ? null : official,
    source: light ? null : story.guideSource,
    quip: light ? quip : null,
    improve,
    stamp: story.stamp(day),
    estimate: story.estimate,
    footer: story.footer,
    salam: story.salam,
    url: story.url
  };
}

/** ISPU band of each hour, from the same PM2.5 breakpoints as the daily level. Hourly values are not 24-hour means, so this is a guide to the strip. */
export const hourBands = hours => hours.map(h => bandForPm25(h.pm25));

/** Lowest and highest band in a list of bands. */
export const levelRange = bands => ({ min: Math.min(...bands), max: Math.max(...bands) });

// Day-part boundaries in the viewer's local hours: Pagi 05–11, Siang 11–15, Sore 15–18, Malam 18–05.
export const DAY_PART_STARTS = { pagi: 5, siang: 11, sore: 15, malam: 18 };

/** 'pagi' | 'siang' | 'sore' | 'malam' for a local hour (0–23). */
export function dayPartOf(hour) {
  if (hour >= DAY_PART_STARTS.malam || hour < DAY_PART_STARTS.pagi) return 'malam';
  if (hour >= DAY_PART_STARTS.sore) return 'sore';
  return hour >= DAY_PART_STARTS.siang ? 'siang' : 'pagi';
}

/** Index of the hour that contains `now`, or -1 when the strip does not cover it. */
export const nowIndex = (hours, now) => hours.findIndex(h => Date.parse(h.time) <= now.getTime() && now.getTime() < Date.parse(h.time) + 3600e3);

/**
 * Cuts the strip into chronological day-part segments (a new one whenever the part changes), each with its local range,
 * whether it starts on a later local day than `now` (`tomorrow`) and whether it holds the current hour.
 * A segment's band is the WORST band of its hours: a guide to the strip, not a 24-hour mean (the daily level still
 * comes from pm25_model.band).
 */
export function daySegments(hours, bands, now) {
  const segments = [];
  const today = localDate(now);
  const current = nowIndex(hours, now);
  hours.forEach((h, i) => {
    const part = dayPartOf(new Date(h.time).getHours());
    const last = segments[segments.length - 1];
    if (last && last.part === part) {
      last.to = i + 1;
      last.band = Math.max(last.band, bands[i]);
    } else {
      segments.push({ part, from: i, to: i + 1, band: bands[i], tomorrow: localDate(new Date(h.time)) !== today, now: false });
    }
  });
  for (const s of segments) {
    s.start = hours[s.from].time;
    s.end = new Date(Date.parse(hours[s.to - 1].time) + 3600e3).toISOString();
    s.now = current >= s.from && current < s.to;
  }
  return segments;
}

/** True when every segment has the same band (or there is at most one): no hour is worth picking over another. */
export const isFlatDay = segments => segments.every(s => s.band === segments[0].band);

/** Segment indexes tagged: `best` holds the window's first hour (never set when there is no window), `worst` the first
 * segment at least 2 bands above the lowest one. */
export function segmentTags(segments, win) {
  const lowest = Math.min(...segments.map(s => s.band));
  const highest = Math.max(...segments.map(s => s.band));
  const best = win ? segments.findIndex(s => win.indexes[0] >= s.from && win.indexes[0] < s.to) : -1;
  const worst = highest >= lowest + 2 ? segments.findIndex(s => s.band === highest) : -1;
  return { best, worst: worst === best ? -1 : worst };
}

/** 'today' or 'tomorrow' for an hour inside the 24-hour strip, by the viewer's local dates. */
export const relativeDay = (iso, now) => (localDate(new Date(iso)) === localDate(now) ? 'today' : 'tomorrow');

/** Link to the feedback form. With a query parameter name and a city, the city is passed as that parameter (a Tally hidden field); otherwise the base link is used as is. */
export function feedbackUrl(base, param, cityName) {
  if (!param || !cityName) return base;
  return `${base}${base.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(cityName)}`;
}

/** The 3-day outlook card: today's level, then up to 3 upcoming days. `weekday` turns a YYYY-MM-DD into a short name. No advice. */
export function outlookLines({ city, level, copy, story, days, weekday, levelName, day }) {
  const next = days.slice(0, 3);
  return {
    kind: 'outlook',
    city,
    level,
    levelName: story.levelName(copy.name),
    heading: story.outlookHeading(next.length),
    tiles: next.map(d => ({ label: weekday(d.date), level: d.band, name: levelName(d.band), wet: rainKind(d.rain_mm) !== 'none' })),
    rain: story.rain,
    stamp: story.stamp(day),
    salam: story.salam,
    url: story.url
  };
}

/** The ranking card: every city, thickest smoke first, with the viewer's city marked. */
export function rankingLines({ locations, currentId, levelName, cityName, story, day }) {
  return {
    kind: 'ranking',
    title: story.rankTitle,
    rows: rankByLevel(locations).map(loc => ({ city: cityName(loc), level: loc.pm25_model.band, name: levelName(loc.pm25_model.band), current: loc.id === currentId })),
    stamp: story.stamp(day),
    salam: story.salam,
    url: story.url
  };
}

/** A daily 07:00 reminder for 30 days as an iCalendar file. Floating local time, so it follows the phone's time zone. */
export function icsReminder({ title, description, url, now }) {
  const pad = n => String(n).padStart(2, '0');
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const local = `${day.getFullYear()}${pad(day.getMonth() + 1)}${pad(day.getDate())}T070000`;
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const esc = s => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Apa Kabar Udara//ID', 'BEGIN:VEVENT',
    `UID:pengingat-${stamp}@apakabarudara`, `DTSTAMP:${stamp}`, `DTSTART:${local}`, 'DURATION:PT15M', 'RRULE:FREQ=DAILY;COUNT=30',
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(description)}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n') + '\r\n';
}
