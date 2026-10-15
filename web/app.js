import './ionic.js';
import { cleanPoints, compassName, FAR_KM, nearestHotspot } from './nearby.js';
import { EMERGENCY_NUMBER, ENCOURAGE, FACTS, GLOSSARY, LEVELS, OFFICIAL_ISPU, RAIN, STORY, TODAY_CARDS, UI } from './copy.js';
import {
  ago, bestWindow, cityLink, dailyQuip, dayPartOf, daySegments, isFlatDay, nowIndex, presentBands, tickIndexes, segmentTags, icsReminder, feedbackUrl, freshness, greeting, hourBands, improvedFrom, improvement, installMode, isIosSafari, levelRange, localDate, mapsSearchUrl,
  glanceChips, trend, nearest, normalizeWatch, previewOverride, rainKind, outlookLines, orderShareActions, followsOtherIndex, rankByLevel, rankingLines, relativeDay, resolveCity, storyKey, storyLines, todayCards, toggleWatch, upcomingDays, watchRow, WATCH_MAX, whatsappUrl, worldviewUrl, worsenedFrom, WET_DAY_MM
} from './logic.js';

const DATA_URL = './data/latest.json';
// iOS Safari ignores user-scalable=no; cancelling the pinch gesture is the reliable way to keep the page at 100%.
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
const ISPU_URL = 'https://ispu.kemenlh.go.id/app/#/';
const FEEDBACK_URL = 'https://tally.so/r/vG7RPD'; // Tally form link; empty hides the feedback row
const FEEDBACK_CITY_PARAM = 'kota'; // the form's hidden field that records the city
const CITY_KEY = 'bisanapasgak.city';
const WATCH_KEY = 'bisanapasgak.watch';
const INSTALL_KEY = 'bisanapasgak.installHidden';
const VISITS_KEY = 'bisanapasgak.visits';
const SEEN_KEY = 'bisanapasgak.seen';
const ALL = '__all';
const REFRESH_MS = 15 * 60e3;
const BEST = { span: 2, fromHour: 6, toHour: 21, localHour: iso => new Date(iso).getHours() };
const TICK_EVERY = 6;
const TICK_CLEAR = 7; // hours a regular tick label keeps from the "Sekarang" label

const num = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
const hm = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
const dayTime = new Intl.DateTimeFormat('id-ID', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
const weekdayShort = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });
const weekdayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: 'UTC' });
const dayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });

const $ = id => document.getElementById(id);
function el(tag, className, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}
function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ic');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}
const cityName = loc => loc.name.split(',')[0];
const when = iso => `${clock.format(new Date(iso))} (${ago(iso, new Date())})`;
const dateOf = day => new Date(`${day}T00:00:00Z`);
const levelText = level => UI.levelLabel(LEVELS[level].name, level);

// Only the chosen city is remembered, on this device. Storage can be blocked; the page works without it.
const savedCity = {
  get() { try { return localStorage.getItem(CITY_KEY); } catch { return null; } },
  set(id) { try { localStorage.setItem(CITY_KEY, id); } catch { /* nothing to remember in private mode */ } }
};

// Pinned family cities and the "install" dismissal: also device-only, also optional.
const MAP_HINT_KEY = 'akud-map-hint'; // set once the map's gesture hint has been shown
const SOLIDARITY_KEY = 'akud-solidarity-day'; // the day it was closed; it returns the next day
const today = () => new Date().toLocaleDateString('en-CA');
// Anonymous, aggregate counting through GoatCounter: no cookie, no per-person profile. Off with Do Not Track and in preview.
const GOATCOUNTER = 'https://hady.goatcounter.com/count';
const doNotTrack = navigator.doNotTrack === '1' || window.doNotTrack === '1';
if (!doNotTrack && !new URLSearchParams(location.search).has('preview')) {
  const gc = document.createElement('script');
  gc.async = true;
  gc.dataset.goatcounter = GOATCOUNTER;
  gc.src = 'https://gc.zgo.at/count.js';
  document.head.append(gc);
}
const count = name => {
  if (doNotTrack || preview) return;
  try { window.goatcounter?.count({ path: name, title: name, event: true }); } catch { /* counting is optional */ }
};
let lastCounted = null;
const store = {
  read(key) { try { return localStorage.getItem(key); } catch { return null; } },
  write(key, value) { try { localStorage.setItem(key, value); } catch { /* nothing to remember in private mode */ } }
};
// Counted once per page load; the install control waits for the second visit.
const visits = Number(store.read(VISITS_KEY) ?? 0) + 1;
store.write(VISITS_KEY, String(visits));
const readSeen = () => { try { return JSON.parse(store.read(SEEN_KEY) ?? '{}') ?? {}; } catch { return {}; } };
const readWatch = () => { try { return JSON.parse(store.read(WATCH_KEY) ?? '[]'); } catch { return []; } };

let report = null;
let watch = readWatch();
let installEvent = null; // Chromium's beforeinstallprompt, kept until the button is used
let current = null; // chosen city id; null shows the overview
let preview = null; // { city, level } from ?city=&level=&preview=1, otherwise null
let dayIndex = 0;
let lastFact = -1;

const selected = () => report?.locations.find(l => l.id === current) ?? null;
const bandOf = loc => (preview && preview.city === loc.id ? preview.level : loc.pm25_model.band);

/** Shows one of: 'message' (loading, failed, expired), 'overview', 'city'. */
function show(view) {
  $('message').hidden = view !== 'message';
  $('overview').hidden = view !== 'overview';
  $('city').hidden = view !== 'city';
  $('skelBar').hidden = $('skelRest').hidden = true; // showMessage brings them back while loading
  renderInstall();
  $('tagline').hidden = view !== 'overview';
  $('headNote').hidden = view === 'overview'; // always there on city and message views, no close button
  // City view: the share row sits right under the answer card. Overview: one share button at the bottom.
  if (view === 'city') $('answer').after($('shareBlock'), $('watchSolo'));
  else $('city').after($('shareBlock'));
  $('shareBlock').hidden = view === 'message' || (view === 'city' && Boolean(preview));
  if (view !== 'city') {
    $('shareBlock').classList.remove('urgent');
    $('watchSolo').hidden = true;
    $('factsBlock').hidden = false;
  }
}


/** Neutral card for loading and problems: no verdict, only the official link. */
function showMessage(headline, text, busy) {
  show('message');
  $('message').toggleAttribute('aria-busy', busy);
  $('messageTitle').textContent = headline;
  $('messageText').textContent = text ?? '';
  $('messageText').hidden = !text;
  $('skeleton').hidden = !busy;
  $('skelBar').hidden = $('skelRest').hidden = !busy;
  $('messageOfficial').hidden = busy;
  $('messageOfficial').href = ISPU_URL;
  $('banner').hidden = true;
}

function renderOverview() {
  show('overview');
  $('welcomeTitle').textContent = UI.welcome(greeting(new Date().getHours()));
  $('overviewSub').textContent = UI.overviewSub(report.locations.length);
  $('cityList').replaceChildren(...rankByLevel(report.locations).map(loc => {
    const level = loc.pm25_model.band;
    const dot = el('span', 'dot');
    dot.slot = 'start';
    const badge = el('ion-badge', 'lv', LEVELS[level].name);
    badge.slot = 'end';
    const item = el('ion-item', null, dot, el('ion-label', null, cityName(loc)), badge);
    item.button = true;
    item.detail = false;
    item.dataset.level = String(level);
    item.setAttribute('aria-label', `${loc.name}, ${levelText(level)}`);
    item.addEventListener('click', () => choose(loc.id));
    return item;
  }));
}

/** "Kapan membaik?" as one line, or null at levels 1–2 and when the forecast has no later day. */
function improveText(loc, level) {
  const found = improvement(loc.outlook, localDate(new Date()), level);
  if (!found) return null;
  return 'date' in found ? UI.improveOn(weekdayLong.format(dateOf(found.date))) : UI.improveNone(found.days);
}

const quipFor = level => dailyQuip(LEVELS[level].quips, localDate(new Date()));

function renderAnswer(loc, level) {
  const copy = LEVELS[level];
  $('answer').dataset.level = String(level);
  $('shareBlock').classList.toggle('urgent', level >= 4);
  $('levelName').textContent = copy.name;
  $('scale').setAttribute('aria-label', UI.scaleLabel(level));
  [...$('scale').children].forEach((seg, i) => seg.classList.toggle('on', i + 1 === level));
  const better = improveText(loc, level);
  $('improve').textContent = better ?? '';
  $('improve').hidden = !better;
  const official = OFFICIAL_ISPU[level];
  $('aboutDesc').textContent = official.description;
  const quip = quipFor(level);
  $('quip').textContent = quip ?? '';
  $('quip').hidden = !quip;
  $('scaleLo').textContent = LEVELS[1].name;
  $('scaleHi').textContent = LEVELS[5].name;
  const before = improvedFrom(readSeen()[loc.id]?.level, level);
  $('better').textContent = before ? UI.betterSince(LEVELS[before].name) : '';
  $('better').hidden = !before;
  const worse = preview ? null : worsenedFrom(readSeen()[loc.id]?.level, level);
  $('worse').textContent = worse ? UI.worseSince(LEVELS[worse].name) : '';
  $('worse').hidden = !worse;
  $('answer').classList.remove('hop');
  if (before) {
    void $('answer').offsetWidth; // restart the hop
    $('answer').classList.add('hop');
  }
  // Official ISPU guidance, quoted as is. Level 1 has no separate sensitive-group line.
  // Levels 1–2 quote the verbatim category description in the same block; the guidance lines only show from level 3.
  const guidance = level >= 3;
  $('guideTitle').textContent = guidance ? UI.guideTitle : UI.guideTitleMeaning;
  $('guideDesc').textContent = official.description;
  $('guideDesc').hidden = guidance;
  $('guideNote').hidden = !followsOtherIndex(loc.id);
  $('guideSensitive').hidden = !guidance || !official.sensitive;
  $('guideSensitive').lastElementChild.textContent = official.sensitive ?? '';
  $('guideEveryone').hidden = !guidance;
  $('guideEveryone').lastElementChild.textContent = official.everyone;
  $('guideSource').href = loc.ispu?.source_url ?? ISPU_URL;
  $('symptoms').hidden = !copy.health;
  $('health').hidden = !copy.health;
  $('call').hidden = !copy.emergency;
  $('stamp').textContent = UI.stamp(clock.format(new Date(loc.pm25_model.updated_at)));
  $('explain').replaceChildren(...UI.explain(num.format(Math.round(loc.pm25_model.value))).map(text => el('p', null, text)));
  $('official').href = loc.ispu?.source_url ?? ISPU_URL;
  $('factsBlock').hidden = level >= 4; // no jokes or trivia at levels 4–5
  $('more').hidden = level >= 4; // the card only holds the facts
  $('kids').hidden = level < 3; // the kids pack is for the days school may be closed
  renderTrend(loc);
  renderSatThumb(loc);
}

// Satellite photo: sat/index.json is fetched on the first city view. Missing index, entry or file hides the thumbnail.
const satDay = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
let satIndex = null; // Promise of the entries, or null before the first fetch
const getSatIndex = () => (satIndex ??= fetch('./sat/index.json', { cache: 'no-cache' }).then(res => (res.ok ? res.json() : [])).catch(() => []));

const satLines = (loc, entry) => `${UI.satCaption(satDay.format(new Date(`${entry.date}T00:00:00Z`)))} ${UI.satPin} ${UI.satWind(loc.wind_dir)}`;

// The thumbnail row on the answer card: one small round photo, tap for the satellite map in a sheet. Missing data hides it.
async function renderSatThumb(loc) {
  const btn = $('satThumb');
  const entry = (await getSatIndex()).find?.(e => e.id === loc.id);
  if (selected()?.id !== loc.id || $('city').hidden) return;
  if (!entry) {
    btn.hidden = true;
    delete btn.dataset.date;
    renderGlance(loc);
    return;
  }
  const src = `./sat/${loc.id}.jpg?d=${entry.date}`;
  const img = $('satThumbImg');
  img.onerror = () => { btn.hidden = true; };
  img.alt = '';
  if (img.getAttribute('src') !== src) img.src = src;
  btn.dataset.src = src;
  btn.dataset.caption = satLines(loc, entry);
  btn.dataset.link = worldviewUrl(entry.bbox, entry.date) ?? '';
  btn.dataset.alt = UI.satAlt(cityName(loc));
  btn.dataset.date = entry.date;
  btn.hidden = false;
  renderGlance(loc);
}

// Trend line: a model guide from next_hours, quiet and neutral. Hidden without 9 hours.
const TREND_PATHS = { better: 'M7 7l10 10M17 11v6h-6', worse: 'M7 17L17 7M11 7h6v6', steady: 'M5 12h14M15 8l4 4-4 4' };
function renderTrend(loc) {
  const t = trend(loc.next_hours);
  $('trend').hidden = !t;
  if (!t) return;
  $('trendText').textContent = UI.glanceTrend[t];
  $('trendPath').setAttribute('d', TREND_PATHS[t]);
  $('trend').setAttribute('aria-label', UI.glanceTrendLabel(UI.glanceTrend[t]));
}

// "Sekilas" chips. The hotspot file is fetched once, lazily, and shared with the satellite sheet.
let glanceWindow = null;
let glanceRain = 0;
let glanceHotspot; // undefined until known; {km, dir} | null (none within FAR_KM)
let glanceHotspotId = null;
function renderGlance(loc) {
  const nearest = glanceHotspotId === loc.id ? glanceHotspot : undefined;
  const chips = glanceChips({ nearestHotspot: nearest, bestWindow: glanceWindow, rainMm: glanceRain, canOpenMap: Boolean($('satThumb').dataset.date) && !$('satThumb').hidden });
  const list = $('glance');
  list.replaceChildren(...chips.map(chip => {
    const li = el('li', null);
    if (!chip.interactive) {
      li.className = 'gchip';
      li.textContent = chip.text;
      return li;
    }
    const b = el('button', 'gchip', el('span', null, chip.text), icon('chevron'));
    b.type = 'button';
    b.dataset.chip = chip.kind;
    li.append(b);
    return li;
  }));
  list.hidden = chips.length === 0;
  if (glanceHotspotId !== loc.id) loadGlanceHotspot(loc);
}
function loadGlanceHotspot(loc) {
  glanceHotspotId = loc.id;
  glanceHotspot = undefined;
  const run = async () => {
    const points = cleanPoints(await getHotspots());
    if (!points || selected()?.id !== loc.id) return;
    const near = nearestHotspot(points, loc.lat, loc.lon);
    glanceHotspot = near && near.km <= FAR_KM ? { km: near.km, dir: compassName(near.bearing) } : null;
    renderGlance(loc);
  };
  (window.requestIdleCallback ?? (fn => setTimeout(fn, 300)))(run);
}
$('glance').addEventListener('click', e => {
  const kind = e.target.closest('button[data-chip]')?.dataset.chip;
  if (kind === 'hotspot') {
    count('sekilas-peta');
    $('satThumb').click();
  } else if (kind === 'best') {
    count('sekilas-paling-lega');
    const title = $('todayTitle');
    title.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    title.focus({ preventScroll: true });
  }
});

const PART_ICONS = { pagi: 'sunrise', siang: 'sun', sore: 'sunset', malam: 'moon' };
const ACTIVITY_TONE = { ok: 1, caution: 3, no: 4 }; // status picks a level colour
const KAPAS_FACE = '<use class="body" href="#blob"/><ellipse class="shine" cx="31" cy="21" rx="6" ry="3.2" transform="rotate(-18 31 21)"/><path class="brow" d="M24 35l6-2.5M48 35l-6-2.5"/><ellipse class="eye" cx="29" cy="40" rx="3" ry="3.6"/><ellipse class="eye" cx="43" cy="40" rx="3" ry="3.6"/><ellipse class="cheek" cx="22" cy="46" rx="4" ry="2.4"/><ellipse class="cheek" cx="50" cy="46" rx="4" ry="2.4"/><path class="mouth happy" d="M31 46q5 5 10 0"/><path class="mouth flat" d="M32 47.5h8"/><path class="mouth sad" d="M31 49q5-5 10 0"/><g class="mask"><path class="strap" d="M25 46l-11-4M47 46l11-4"/><rect x="25" y="43" width="22" height="12" rx="5"/><path class="pleat" d="M29 47.5h14M29 51h14"/></g>';

/** Si Kapas's face; its look comes from the data-level of the element it sits in. */
function kapasFace() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'mascot-art');
  svg.setAttribute('viewBox', '0 0 72 64');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = KAPAS_FACE;
  return svg;
}

function renderParts(segments, bands, win, level) {
  const flat = isFlatDay(segments);
  const tags = segmentTags(segments, level <= 3 ? win : null);
  $('parts').hidden = flat;
  $('flat').hidden = !flat;
  $('best').hidden = flat || !win || level > 3;
  if (flat) {
    $('flat').dataset.level = String(segments[0].band);
    $('flat').replaceChildren(kapasFace(), UI.flatDay(LEVELS[segments[0].band].name));
    $('parts').replaceChildren();
    return;
  }
  $('parts').replaceChildren(...segments.map((seg, i) => {
    const tagText = [seg.now ? UI.tagNow : '', i === tags.worst ? UI.tagWorst : ''].filter(Boolean);
    const text = el('span', 'text', el('span', 'name', UI.partName(UI.dayParts[seg.part], seg.tomorrow)), el('span', 'meta', el('span', 'range', UI.partRange(hm.format(new Date(seg.start)), hm.format(new Date(seg.end)))), ...tagText.map(t => el('span', 'tag', t))));
    const item = el('li', i === tags.best ? 'part is-best' : 'part', icon(PART_ICONS[seg.part]), text, el('span', 'lvl-name', LEVELS[seg.band].name), kapasFace());
    item.dataset.level = String(seg.band);
    if (i === tags.best) item.title = UI.legendBest;
    return item;
  }));
}

/** One card: icon, label, our line (or the verbatim ISPU sentence with its lead-in and tag), and the best window when it applies. */
function todayCard(card, level, windowText) {
  const def = TODAY_CARDS[card.id];
  const children = [el('span', 'label', def.label)];
  const quoted = card.id === 'exercise';
  if (quoted) {
    children[0] = el('span', 'label', `${UI.ispuBadge} · ${def.label}`);
    children.push(el('span', 'quote', el('span', 'lead', UI.ispuLead), ` ${OFFICIAL_ISPU[level][card.variant]}`), el('span', 'tag', UI.ispuTag));
  } else {
    children.push(el('span', 'status', typeof def.text === 'string' ? def.text : def.text[card.variant]));
    if (card.window) children.push(el('span', 'when', windowText));
  }
  const item = el('li', quoted ? 'activity official' : 'activity', icon(def.icon), el('span', 'text', ...children));
  item.dataset.level = String(level);
  return item;
}

function renderToday(loc, level) {
  $('todayTitle').textContent = UI.todayTitle;
  const rain = loc.outlook.find(d => d.date === localDate(new Date()))?.rain_mm ?? 0;

  const hours = Array.isArray(loc.next_hours) ? loc.next_hours : [];
  const now = new Date();
  const win = hours.length > 0 ? bestWindow(hours, BEST) : null;
  const from = win ? hm.format(new Date(win.start)) : '';
  const to = win ? hm.format(new Date(win.end)) : '';
  const bands = hourBands(hours);
  const range = hours.length ? levelRange(bands) : null;
  const segments = hours.length > 0 ? daySegments(hours, bands, now) : [];
  // The cards show a window only when the headline above does (levels 1–3, not a flat day).
  const hasWindow = Boolean(win) && level <= 3 && hours.length > 0 && !isFlatDay(segments);
  $('activities').replaceChildren(...todayCards(level, LEVELS[level].activities, rain, WET_DAY_MM, hasWindow).map(card => todayCard(card, level, UI.cardWindow(from, to))));
  // Levels 1–2: the headline quip already encourages, so no second line here.
  $('encourage').hidden = level <= 2;
  $('encourage').textContent = level <= 2 ? '' : dailyQuip(ENCOURAGE[level === 3 ? 'gentle' : 'quiet'], localDate(new Date()));
  for (const id of ['best', 'parts', 'flat', 'hours']) $(id).hidden = hours.length === 0;
  if (hours.length === 0) return;

  glanceWindow = win && level <= 3 && !isFlatDay(segments) ? { when: UI.whenWord(UI.dayParts[dayPartOf(new Date(win.start).getHours())], relativeDay(win.start, now) === 'tomorrow'), from } : null;
  glanceRain = rain;
  renderGlance(loc);
  renderParts(segments, bands, win, level);
  $('best').textContent = !$('best').hidden && win ? UI.bestWindow(UI.whenWord(UI.dayParts[dayPartOf(new Date(win.start).getHours())], relativeDay(win.start, now) === 'tomorrow'), from, to, level, win.band) : '';

  const peak = Math.max(...hours.map(h => h.pm25), 1);
  const best = new Set(level <= 3 && !isFlatDay(segments) ? win?.indexes ?? [] : []);
  const current = nowIndex(hours, now);
  const note = $('hourNote');
  note.textContent = '';
  $('strip').replaceChildren(...hours.map((h, i) => {
    const time = hm.format(new Date(h.time));
    const bar = el('button', [best.has(i) ? 'best' : '', i === current ? 'now' : ''].join(' ').trim());
    bar.type = 'button';
    bar.dataset.bar = String(bands[i]);
    bar.style.height = `${Math.max(10, (h.pm25 / peak) * 100)}%`;
    bar.setAttribute('aria-label', `${time} · ${LEVELS[bands[i]].name}`);
    bar.setAttribute('aria-pressed', 'false');
    bar.addEventListener('click', () => {
      for (const other of $('strip').querySelectorAll('button')) other.setAttribute('aria-pressed', String(other === bar));
      note.textContent = UI.hourNote(time, LEVELS[bands[i]].name, relativeDay(h.time, new Date()) === 'tomorrow');
    });
    return bar;
  }));
  $('strip').setAttribute('aria-label', UI.stripLabel(UI.stripRange(LEVELS[range.min].name, LEVELS[range.max].name), win && level <= 3 ? UI.stripBest(from, to) : ''));
  if (best.size) {
    const first = Math.min(...best);
    const mark = el('span', 'window');
    mark.style.setProperty('--from', String(first));
    mark.style.setProperty('--span', String(Math.max(...best) - first + 1));
    $('strip').append(mark);
  }
  const tickAt = (i, text, cls) => {
    const tick = el('span', cls, text);
    tick.style.left = `calc(${((i + 0.5) / hours.length) * 100}% )`;
    return tick;
  };
  $('ticks').replaceChildren(
    ...tickIndexes(hours.length, TICK_EVERY, current, TICK_CLEAR).map(i => tickAt(i, hm.format(new Date(hours[i].time)), '')),
    ...(current >= 0 ? [tickAt(current, UI.tagNow, ['now', current > hours.length - 4 ? 'end' : ''].join(' ').trim())] : [])
  );
  const legend = $('stripLegend');
  const item = (swatch, text) => el('span', 'key', swatch, text);
  legend.replaceChildren(
    ...presentBands(bands).map(b => {
      const sw = el('i', 'sw');
      sw.dataset.bar = String(b);
      return item(sw, LEVELS[b].name);
    }),
    ...(current >= 0 ? [item(el('i', 'sw now'), UI.tagNow)] : []),
    ...(best.size ? [item(el('i', 'sw window'), UI.legendBest)] : []),
    el('span', 'legend-scale', UI.stripScale)
  );
  // Opens on its own only on a day that varies; a reader's own toggle survives the 15-minute refresh.
  const key = `${loc.id}:${range.max - range.min >= 2}`;
  if ($('hours').dataset.auto !== key) {
    $('hours').dataset.auto = key;
    $('hours').open = range.max - range.min >= 2;
  }
}

function showDay(days, idx) {
  dayIndex = idx;
  const day = days[idx];
  $('dayDetail').replaceChildren(el('strong', null, `${dayLong.format(dateOf(day.date))} · ${LEVELS[day.band].name}`), `${RAIN[rainKind(day.rain_mm)]}.`);
  [...$('days').children].forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === idx)));
}

function renderOutlook(loc) {
  const days = upcomingDays(loc.outlook, localDate(new Date()));
  $('outlook').hidden = days.length === 0;
  $('days').style.setProperty('--n', String(days.length));
  $('days').replaceChildren(...days.map((day, i) => {
    const wet = rainKind(day.rain_mm) !== 'none';
    const chip = el('button', 'day', el('span', 'd', weekdayShort.format(dateOf(day.date))), el('span', 'n', LEVELS[day.band].name));
    if (wet) {
      const drop = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      drop.setAttribute('class', 'ic drop');
      drop.setAttribute('aria-hidden', 'true');
      drop.innerHTML = '<use href="#i-drop"/>';
      chip.append(drop);
    }
    chip.type = 'button';
    chip.dataset.level = String(day.band);
    chip.setAttribute('aria-pressed', 'false');
    chip.setAttribute('aria-label', `${dayLong.format(dateOf(day.date))}, ${levelText(day.band)}${wet ? `, ${UI.rainDay}` : ''}`);
    chip.addEventListener('click', () => showDay(days, i));
    return chip;
  }));
  if (days.length > 0) showDay(days, Math.min(dayIndex, days.length - 1));
  return days;
}

function render() {
  const state = freshness(report.generated_at, new Date());
  $('camsCredit').textContent = UI.creditCams(report.generated_at.slice(0, 4));
  $('previewBanner').hidden = !preview;
  renderSolidarity();
  $('previewBanner').textContent = UI.preview;
  if (state === 'expired') {
    showMessage(UI.expiredHeadline, UI.expiredText, false);
    return;
  }
  $('banner').hidden = state !== 'stale';
  $('banner').textContent = UI.stale(when(report.generated_at));
  const loc = selected();
  $('feedbackBtn').href = feedbackUrl(FEEDBACK_URL, FEEDBACK_CITY_PARAM, loc ? cityName(loc) : '');
  if (loc && lastCounted !== loc.id) {
    lastCounted = loc.id;
    count(`kota/${loc.id}`);
  }
  if (!loc) {
    renderOverview();
    return;
  }
  show('city');
  const level = bandOf(loc);
  $('select').value = loc.id;
  renderAnswer(loc, level);
  renderToday(loc, level);
  renderOutlook(loc);
  renderWatch();
  prepareStory();
  if (!preview) {
    // After the render, so "membaik" shows once.
    store.write(SEEN_KEY, JSON.stringify({ ...readSeen(), [loc.id]: { level, date: localDate(new Date()) } }));
  }
}

function fillPicker() {
  const all = el('ion-select-option', null, UI.allCitiesOption);
  all.value = ALL;
  $('select').replaceChildren(all, ...report.locations.map(loc => {
    const option = el('ion-select-option', null, cityName(loc));
    option.value = loc.id;
    return option;
  }));
}

function clearHints() {
  for (const id of ['overviewHint', 'cityHint', 'shareNote']) $(id).textContent = '';
}

function choose(id) {
  current = id;
  preview = null;
  dayIndex = 0;
  history.replaceState(null, '', `${location.pathname}#${encodeURIComponent(id)}`);
  savedCity.set(id);
  clearHints();
  render();
  $('content').scrollToTop(0);
}

function showAllCities() {
  current = null;
  preview = null;
  history.replaceState(null, '', location.pathname);
  clearHints();
  render();
  $('content').scrollToTop(0);
}

/** First report: the link beats the saved city, which beats the overview. A preview link beats both. */
function pickInitialView() {
  const ids = report.locations.map(l => l.id);
  preview = previewOverride(location.search, ids);
  if (preview) {
    current = preview.city;
    return;
  }
  let hash = '';
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed link: treat as none */ }
  current = resolveCity(ids, hash, savedCity.get()).id;
}

async function load() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.locations) || data.locations.length === 0) throw new Error('no locations');
    const first = !report;
    report = data;
    fillPicker();
    if (first) pickInitialView();
    else if (current && !selected()) current = null;
  } catch {
    // A failed refresh keeps the last report; render() still judges how old it is.
    if (!report) {
      showMessage(UI.errorHeadline, UI.errorText, false);
      return;
    }
  }
  render();
}

function useLocation() {
  if (!report) return;
  const hint = text => { $(current ? 'cityHint' : 'overviewHint').textContent = text; };
  hint(UI.locating);
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { location: loc, km } = nearest(report.locations, pos.coords.latitude, pos.coords.longitude);
      choose(loc.id);
      hint(UI.nearest(cityName(loc), num.format(Math.round(km))));
    },
    () => hint(UI.locateFailed),
    { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
  );
}

// The Story cards, drawn ahead of the tap: iOS only lets navigator.share run while the tap's user activation is still live.
const storyJobs = new Map(); // key -> Promise<File>, while drawing
const storyFiles = new Map(); // key -> File, drawn

/** The three cards for a city, in the order of the chooser. The outlook card is left out when no later day is known. */
function storyCards(loc) {
  const level = loc.pm25_model.band;
  const day = dayTime.format(new Date(loc.pm25_model.updated_at));
  const days = upcomingDays(loc.outlook, localDate(new Date()));
  const cards = [{ label: UI.storyChoiceToday, lines: storyLines({ city: cityName(loc), level, copy: LEVELS[level], story: STORY, official: OFFICIAL_ISPU[level].everyone, quip: quipFor(level), improve: improveText(loc, level), day }) }];
  if (days.length > 0) {
    cards.push({
      label: UI.storyChoice3d,
      lines: outlookLines({ city: cityName(loc), level, copy: LEVELS[level], story: STORY, days, weekday: date => weekdayShort.format(dateOf(date)), levelName: band => LEVELS[band].name, day })
    });
  }
  cards.push({
    label: UI.storyChoiceRank(report.locations.length),
    lines: rankingLines({ locations: report.locations, currentId: loc.id, levelName: band => LEVELS[band].name, cityName, story: STORY, day })
  });
  return cards.map(card => ({ ...card, key: storyKey(card.lines) }));
}

function makeStory(lines, key) {
  if (storyFiles.has(key)) return Promise.resolve(storyFiles.get(key));
  if (storyJobs.has(key)) return storyJobs.get(key);
  const promise = import('./story.js')
    .then(({ renderStory }) => renderStory(lines))
    .then(blob => {
      const file = new File([blob], 'apa-kabar-udara.png', { type: 'image/png' });
      storyFiles.set(key, file);
      return file;
    })
    .finally(() => storyJobs.delete(key));
  storyJobs.set(key, promise);
  return promise;
}

function prepareStory() {
  const loc = selected();
  if (!loc || preview) return;
  const run = () => { for (const { lines, key } of storyCards(loc)) makeStory(lines, key).catch(() => {}); }; // a failed warm-up is retried by the tap
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 300);
}

// "Bagikan": one sheet with a preview of the card, WhatsApp, the system share, the PNG and the link.
const SHARE_LAST_KEY = 'akud-share-last'; // the action used last, so it leads next time
const previewUrls = new Map(); // card key -> object URL of the drawn PNG
let shareCtx = null; // { loc, cards, card, text, link } while the sheet is open; loc is null in the overview
let previewSeq = 0;

/** What a share says and links to: the city on screen while the data is live, otherwise the overview. */
function shareTarget() {
  const loc = selected();
  const live = freshness(report.generated_at, new Date()) !== 'expired';
  const target = loc && live && !preview ? loc : null;
  const page = `${location.origin}${location.pathname}`;
  let text = live ? UI.shareOverview : UI.shareFallback(document.title);
  if (target) {
    const level = target.pm25_model.band;
    text = UI.shareText(cityName(target), dayTime.format(new Date(target.pm25_model.updated_at)), level, quipFor(level));
  }
  return { loc: target, text, link: target ? cityLink(page, target.id) : page };
}

const setStatus = text => { $('shareStatus').textContent = text; };

function openShare() {
  if (!report) return;
  count('bagikan-buka');
  const { loc, text, link } = shareTarget();
  const cards = loc ? storyCards(loc) : [];
  shareCtx = { loc, cards, card: cards[0] ?? null, text, link };
  setStatus('');
  $('sharePreviewBlock').hidden = !loc;
  $('shareSave').hidden = !loc;
  $('shareSystem').hidden = !navigator.share;
  $('shareWa').href = whatsappUrl(text, link);
  const rows = Object.fromEntries([...$('shareActions').children].map(node => [node.dataset.act, node]));
  $('shareActions').append(...orderShareActions(store.read(SHARE_LAST_KEY)).map(act => rows[act]));
  $('shareChoices').replaceChildren(...cards.map((card, i) => {
    const chip = el('button');
    chip.type = 'button';
    chip.className = 'share-choice';
    chip.setAttribute('role', 'radio');
    chip.textContent = card.label;
    chip.addEventListener('click', () => selectCard(i));
    return chip;
  }));
  if (loc) selectCard(0);
  $('shareSheet').present();
}

function selectCard(i) {
  const card = shareCtx.cards[i];
  shareCtx.card = card;
  [...$('shareChoices').children].forEach((chip, j) => chip.setAttribute('aria-checked', String(i === j)));
  const seq = ++previewSeq;
  const img = $('sharePreview');
  if (previewUrls.has(card.key)) {
    img.src = previewUrls.get(card.key);
    img.alt = previewAlt();
    img.hidden = false;
    $('sharePreviewSk').hidden = true;
    return;
  }
  img.hidden = true;
  $('sharePreviewSk').hidden = false;
  makeStory(card.lines, card.key).then(
    file => {
      if (!previewUrls.has(card.key)) previewUrls.set(card.key, URL.createObjectURL(file));
      if (seq !== previewSeq) return;
      img.src = previewUrls.get(card.key);
      img.alt = previewAlt();
      img.hidden = false;
      $('sharePreviewSk').hidden = true;
    },
    () => { if (seq === previewSeq) { $('sharePreviewSk').hidden = true; setStatus(UI.storyFailed); } }
  );
}

const previewAlt = () => UI.shareSheetPreviewAlt(cityName(shareCtx.loc), LEVELS[shareCtx.loc.pm25_model.band].name);

/** Counts, remembers the choice, clears the status line. */
function used(act) {
  count(`bagikan-${act === 'system' ? 'sistem' : act === 'copy' ? 'salin' : act === 'save' ? 'simpan' : 'wa'}`);
  store.write(SHARE_LAST_KEY, act);
  setStatus('');
}

function shareWhatsapp() { used('wa'); } // the link itself opens the chat picker

/** The ready PNG goes out inside this tap (iOS needs the activation); not drawn yet, so text and link only. */
async function shareSystem() {
  used('system');
  const { card, text, link } = shareCtx;
  const file = card ? storyFiles.get(card.key) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text, url: link });
    else await navigator.share({ text, url: link });
  } catch (error) {
    if (error?.name !== 'AbortError') setStatus(UI.storyFailed);
  }
}

/** The PNG as a download. Instagram takes no web link from the web, so the city link is copied for the Link sticker (not awaited: iOS). */
async function saveImage() {
  used('save');
  const { card, link } = shareCtx;
  let linkCopied = false;
  navigator.clipboard?.writeText(link).then(() => { linkCopied = true; }, () => {});
  try {
    const file = storyFiles.get(card.key) ?? (await makeStory(card.lines, card.key));
    const a = el('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    setStatus(linkCopied ? `${UI.storySaved} ${UI.storyLinkCopied}` : UI.storySaved);
  } catch {
    setStatus(UI.storyFailed);
  }
}

async function copyLink() {
  used('copy');
  try {
    await navigator.clipboard.writeText(shareCtx.link);
    setStatus(UI.shared);
  } catch {
    setStatus(UI.storyFailed);
  }
}

// Pantau kota lain: up to 3 pinned cities as chips; the one on screen is left out of the row.
function saveWatch() {
  store.write(WATCH_KEY, JSON.stringify(watch));
}

function renderWatch() {
  const ids = report.locations.map(l => l.id);
  watch = normalizeWatch(watch, ids, current);
  const chips = watchRow(watch, current).map(id => {
    const loc = report.locations.find(l => l.id === id);
    const level = bandOf(loc);
    const bars = el('span', 'mini-scale', ...[1, 2, 3, 4, 5].map(n => el('i', n === level ? 'on' : null)));
    bars.setAttribute('aria-hidden', 'true');
    const chip = el('button', 'gchip', bars, el('span', 'c', cityName(loc)));
    chip.type = 'button';
    chip.dataset.level = String(level);
    const label = UI.watchChip(cityName(loc), level, LEVELS[level].name);
    chip.setAttribute('aria-label', label);
    chip.title = label;
    chip.addEventListener('click', () => choose(id));
    return chip;
  });
  // End of the row, always reachable: dashed "+" while there is room, a solid sliders icon once WATCH_MAX are pinned. Both open the same sheet.
  const full = chips.length >= WATCH_MAX;
  const add = el('button', full ? 'watch-add manage' : 'watch-add');
  add.type = 'button';
  // Only the city on screen is pinned: the row still shows, with a labelled add button, so the control stays above the fold.
  if (chips.length === 0) add.append(el('span', null, UI.watchAdd));
  if (full) {
    add.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>';
  }
  add.classList.toggle('labeled', chips.length === 0);
  const label = full ? UI.watchManage : UI.watchAdd;
  add.setAttribute('aria-label', label);
  add.title = label;
  add.addEventListener('click', openWatchSheet);
  $('watch').replaceChildren(...chips, add);
  // Nobody pinned yet: no chip row above the answer, one soft button below the share row.
  const nobody = watch.length === 0;
  $('watch').hidden = nobody;
  $('watchSolo').hidden = !nobody;
}

function openWatchSheet() {
  const ids = report.locations.map(l => l.id);
  const note = $('watchNote');
  const count = () => { note.textContent = UI.watchCount(watchRow(watch, current).length); };
  $('watchList').replaceChildren(...rankByLevel(report.locations).filter(l => l.id !== current).sort((a, b) => Number(watch.includes(b.id)) - Number(watch.includes(a.id))).map(loc => {
    const box = el('input');
    box.type = 'checkbox';
    box.checked = watch.includes(loc.id);
    box.addEventListener('change', () => {
      const next = toggleWatch(watch, loc.id, ids, current);
      if (next.refused) {
        box.checked = false;
        note.textContent = UI.watchFull;
        return;
      }
      watch = next.list;
      saveWatch();
      count();
      renderWatch();
    });
    return el('label', 'pick', box, el('span', 'c', cityName(loc)), el('span', 'n', LEVELS[bandOf(loc)].name));
  }));
  count();
  $('watchSheet').present();
}

// Pasang di layar utama: Chromium gives an event to call; iOS Safari only has the Share menu, so a sheet shows the steps.
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const ios = isIosSafari(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);

function renderInstall() {
  const mode = installMode({ standalone: standalone(), hasPrompt: Boolean(installEvent), ios, dismissed: store.read(INSTALL_KEY) === '1', visits });
  for (const box of document.querySelectorAll('[data-install]')) box.hidden = !mode || $('city').hidden; // city page only
}

async function install() {
  count('pasang');
  if (installEvent) {
    const prompt = installEvent;
    installEvent = null;
    renderInstall();
    try {
      await prompt.prompt();
    } catch { /* prompt already used or refused */ }
  } else if (ios) {
    $('iosSheet').present();
  }
}

function nextFact() {
  let i;
  do i = Math.floor(Math.random() * FACTS.length); while (i === lastFact && FACTS.length > 1);
  lastFact = i;
  $('fact').textContent = FACTS[i];
}

// Static labels come from copy.js so every line lives in one file.
for (const node of document.querySelectorAll('[data-copy]')) node.textContent = UI[node.dataset.copy];
for (const node of document.querySelectorAll('[data-method]')) node.textContent = UI[node.dataset.method][Number(node.dataset.i)];
for (const node of document.querySelectorAll('[data-copy-credit]')) node.textContent = UI.creditLine[Number(node.dataset.copyCredit)];
for (const node of document.querySelectorAll('[data-copy-label]')) node.setAttribute('aria-label', UI[node.dataset.copyLabel]);
{ // the emergency number in the disclaimer becomes a tel: link
  const [before, after] = UI.footerDisclaimer.split(EMERGENCY_NUMBER);
  const call = el('a', '', EMERGENCY_NUMBER);
  call.href = `tel:${EMERGENCY_NUMBER}`;
  $('disclaimer').replaceChildren(before, call, after);
}
$('iosStep1').textContent = UI.iosSteps[0];
$('iosStep2').textContent = UI.iosSteps[1];
$('health').href = mapsSearchUrl(UI.healthQuery);
$('feedbackRow').hidden = !FEEDBACK_URL;
$('feedbackBtn').href = FEEDBACK_URL; // render() adds the city; this covers the loading, error and expired views
$('call').setAttribute('aria-label', UI.call(EMERGENCY_NUMBER));
$('locate').setAttribute('aria-label', UI.nearestLabel);
$('select').setAttribute('aria-label', UI.pickCity);
$('select').interfaceOptions = { header: UI.pickCity, cssClass: 'city-sheet' };
$('select').cancelText = UI.cancel;

$('select').addEventListener('ionChange', e => {
  if (e.detail.value === ALL) showAllCities();
  else if (e.detail.value && e.detail.value !== current) choose(e.detail.value);
});
for (const id of ['locate', 'locateOverview']) {
  if ('geolocation' in navigator) $(id).addEventListener('click', useLocation);
  else $(id).hidden = true;
}
$('share').addEventListener('click', openShare);
$('shareSheet').breakpoints = [0, 1];
$('shareSheet').initialBreakpoint = 1;
$('shareSheetClose').addEventListener('click', () => $('shareSheet').dismiss());
$('shareSheet').addEventListener('didDismiss', () => $('share').focus());
$('shareWa').addEventListener('click', shareWhatsapp);
$('shareSystem').addEventListener('click', shareSystem);
$('shareSave').addEventListener('click', saveImage);
$('shareCopy').addEventListener('click', copyLink);
$('factsNext').addEventListener('click', nextFact);

// Bottom sheets that fit their content: "Apa ini?", the iOS install steps, "Pantau kota lain".
for (const id of ['about', 'method', 'iosSheet', 'watchSheet', 'kidsSheet', 'calendarSheet']) {
  $(id).breakpoints = [0, 1];
  $(id).initialBreakpoint = 1;
}
// "Istilah": three closed rows in the "Apa ini?" sheet; each counts once when first opened.
$('glossary').append(...GLOSSARY.map(({ term, text }) => {
  const row = el('details', 'fine', el('summary', null, term), el('p', null, text));
  row.addEventListener('toggle', () => count('istilah-buka'), { once: true });
  return row;
}));
$('watchSoloBtn').addEventListener('click', openWatchSheet);
const sheet = $('about');
$('aboutBtn').addEventListener('click', () => sheet.present());
$('guideMore').addEventListener('click', () => sheet.present());
$('aboutClose').addEventListener('click', () => sheet.dismiss());
$('methodClose').addEventListener('click', () => $('method').dismiss());
$('methodLink').addEventListener('click', () => $('method').present());
$('headMethod').addEventListener('click', () => $('method').present());
$('methodFromAbout').addEventListener('click', async () => {
  await sheet.dismiss();
  $('method').present();
});
$('methodOfficial').href = ISPU_URL;
$('methodFeedbackBtn').href = FEEDBACK_URL;
$('methodFeedbackBtn').hidden = !FEEDBACK_URL;
$('iosClose').addEventListener('click', () => $('iosSheet').dismiss());
$('watchClose').addEventListener('click', () => $('watchSheet').dismiss());

// "Hari Libur Asap": the pack is its own chunk, fetched and built on first open.
let kidsReady = false;
let kidsPrint = [];
async function openKids() {
  count('paket-anak-buka');
  $('kidsNote').textContent = '';
  try {
    if (!kidsReady) {
      const { renderKids } = await import('./kids.js');
      const kids = renderKids();
      $('kidsSheetTitle').textContent = kids.title;
      $('kidsBody').replaceChildren(kids.sheet);
      kidsPrint = kids.print;
      kids.sheet.querySelector('.kids-print').addEventListener('click', printKids);
      kidsReady = true;
    }
    $('kidsSheet').present();
  } catch {
    $('kidsNote').textContent = UI.kidsFail;
  }
}
function printKids() {
  count('paket-anak-cetak');
  $('printArea').replaceChildren(...kidsPrint); // the printable area is shared with the calendar
  document.body.classList.add('kids-printing'); // app.css prints only #printArea while this is set
  window.print();
}
addEventListener('afterprint', () => document.body.classList.remove('kids-printing', 'cal-printing'));

// "Kalender Kertas": its own chunk too. The chosen month is drawn in the sheet's thumbnail and, at print time, into #printArea.
let calendar = null;
let calendarMonth = null;
const calendarCity = () => (selected() ? cityName(selected()) : '');
function selectMonth(i) {
  calendarMonth = calendar.months[i];
  [...$('calendarChoices').children].forEach((chip, j) => chip.setAttribute('aria-checked', String(i === j)));
  $('calendarThumb').innerHTML = calendar.page(calendarMonth, calendarCity());
  $('calendarThumb').setAttribute('aria-label', `${calendar.CAL.previewAlt}: ${calendar.label(calendarMonth)}`);
}
async function openCalendar() {
  count('kalender-buka');
  $('calendarNote').textContent = '';
  try {
    if (!calendar) {
      const mod = await import('./calendar.js');
      calendar = { CAL: mod.CAL, page: mod.calendarPage, label: mod.monthLabel, months: mod.monthChoices() };
      $('calendarSheetTitle').textContent = mod.CAL.title;
      $('calendarIntro').textContent = mod.CAL.intro;
      $('calendarChoices').setAttribute('aria-label', mod.CAL.monthsLabel);
      $('calendarPrint').textContent = mod.CAL.print;
      $('calendarChoices').replaceChildren(...calendar.months.map((m, i) => {
        const chip = el('button', 'share-choice', mod.monthLabel(m));
        chip.type = 'button';
        chip.setAttribute('role', 'radio');
        chip.addEventListener('click', () => selectMonth(i));
        return chip;
      }));
    }
    selectMonth(calendarMonth ? calendar.months.indexOf(calendarMonth) : 0);
    $('calendarSheet').present();
  } catch {
    $('calendarNote').textContent = UI.calendarFail;
  }
}
function printCalendar() {
  count('kalender-cetak');
  $('printArea').innerHTML = calendar.page(calendarMonth, calendarCity());
  document.body.classList.add('cal-printing');
  window.print();
}
$('calendarOpen').addEventListener('click', openCalendar);
$('calendarPrint').addEventListener('click', printCalendar);
$('calendarClose').addEventListener('click', () => $('calendarSheet').dismiss());
$('kidsOpen').addEventListener('click', openKids);
$('kidsClose').addEventListener('click', () => $('kidsSheet').dismiss());
for (const box of document.querySelectorAll('[data-install]')) {
  box.querySelector('.install-go').addEventListener('click', install);
  box.querySelector('.install-x').addEventListener('click', () => {
    store.write(INSTALL_KEY, '1');
    renderInstall();
  });
}
addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installEvent = event;
  renderInstall();
});
addEventListener('appinstalled', () => {
  installEvent = null;
  store.write(INSTALL_KEY, '1');
  renderInstall();
});

$('refresher').addEventListener('ionRefresh', async e => {
  await load();
  e.target.complete();
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
setInterval(load, REFRESH_MS);

try { sessionStorage.removeItem('bng-reloaded'); } catch { /* storage blocked: the guard in index.html then cannot loop either */ }
showMessage(UI.loadingHeadline, null, true);
nextFact();
load();

// Offline shell. Production builds only, so the dev server never serves a stale page.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { /* the page works without it */ }));
}

function renderSolidarity() {
  $('solidarity').hidden = Boolean(preview) || store.read(SOLIDARITY_KEY) === today();
}
$('solidarityClose').addEventListener('click', () => {
  store.write(SOLIDARITY_KEY, today());
  renderSolidarity();
});
renderSolidarity();

$('feedbackBtn').addEventListener('click', () => count('masukan'));

$('satThumb').addEventListener('click', () => {
  const d = $('satThumb').dataset;
  $('satBig').src = d.src;
  $('satBig').alt = d.alt;
  $('satLink').href = d.link || '#';
  $('satLink').hidden = !d.link;
  count('foto-satelit');
  satOpen = true;
  showMap();
  $('satSheet').present();
});
$('satLink').addEventListener('click', () => count('peta-nasa'));
$('satClose').addEventListener('click', () => $('satSheet').dismiss());

// Interactive map: Leaflet and its CSS are a separate chunk, fetched when the sheet opens. Any failure puts the photo back with a note.
let satMap = null;
let satOpen = false; // the sheet is open or opening; guards the async mount against a quick dismiss
let hintTimer = 0;
function hideHint() {
  clearTimeout(hintTimer);
  $('satHint').hidden = true;
}
function showMap() {
  $('satStage').hidden = false;
  document.querySelector('#satSheet .sat-frame').hidden = true;
  $('satMapNote').hidden = true;
  $('satBigCaption').textContent = UI.satMapCaption;
  $('satSkel').hidden = false; // shimmer until the first tile paints
}
function showPhoto(note) {
  satMap?.destroy();
  satMap = null;
  hideHint();
  resetNearby();
  $('satStage').hidden = true;
  document.querySelector('#satSheet .sat-frame').hidden = false;
  $('satMapNote').hidden = false;
  $('satMapNote').textContent = note;
  $('satBigCaption').textContent = $('satThumb').dataset.caption;
}
// Optional extra: where the last 24 h of fires are. Anything but a good file means no "Di sekitarmu" card, quietly.
let hotspotsOnce = null; // one fetch shared by the glance chip and the satellite sheet
function getHotspots() {
  return (hotspotsOnce ??= fetch('./data/hotspots.json', { cache: 'no-cache' }).then(res => (res.ok ? res.json() : null)).catch(() => null));
}
let satPoint = null; // the tapped or GPS point, for the report
let satHotspots = null;
function showNearby(lines, point) {
  if (!satMap) return; // a late GPS answer after the sheet closed
  satPoint = point ?? null;
  $('satNearbyText').textContent = lines.join(' ');
  $('reportBtn').hidden = !satPoint;
  $('satNearby').hidden = false;
}
function resetNearby() {
  satPoint = null;
  $('reportBtn').hidden = true;
  $('satNearby').hidden = true;
}
// "Lapor titik api": report.js loads on the first tap.
let reportMod = null;
$('reportSheet').breakpoints = [0, 1];
$('reportSheet').initialBreakpoint = 1;
$('reportClose').addEventListener('click', () => $('reportSheet').dismiss());
$('reportBtn').addEventListener('click', async () => {
  const loc = selected();
  if (!satPoint || !loc) return;
  count('lapor-api-buka');
  reportMod ??= await import('./report.js');
  const { REPORT, buildReport } = reportMod;
  const set = (id, text) => { $(id).textContent = text; };
  set('reportTitle', REPORT.title);
  set('reportLead', REPORT.lead);
  set('reportCaution', REPORT.caution);
  set('reportLabel', REPORT.textLabel);
  set('reportCopy', REPORT.copy);
  set('reportShare', REPORT.share);
  set('reportStatus', '');
  set('reportCoordNote', REPORT.coordNote);
  set('reportContactsTitle', REPORT.contactsTitle);
  set('reportLocal', REPORT.local);
  set('reportNotSent', REPORT.notSent);
  $('reportShare').hidden = !navigator.share;
  $('reportContacts').replaceChildren(...REPORT.contacts.map(c => {
    const li = el('li');
    const a = el('a');
    a.href = `tel:${c.tel}`;
    a.setAttribute('aria-label', `${REPORT.call(c.tel)}, ${c.name}`);
    const num = el('b');
    num.textContent = c.tel;
    const info = el('span');
    const strong = el('strong');
    strong.textContent = c.name;
    info.append(strong, c.note);
    a.append(num, info);
    li.append(a);
    return li;
  }));
  $('reportText').value = buildReport({ lat: satPoint.lat, lon: satPoint.lon, city: cityName(loc), hotspots: satHotspots });
  $('reportSheet').present();
});
$('reportSheet').addEventListener('didPresent', () => { $('reportText').focus(); $('reportText').scrollTop = 0; });
$('reportCopy').addEventListener('click', async () => {
  count('lapor-api-salin');
  const box = $('reportText');
  try {
    await navigator.clipboard.writeText(box.value);
    $('reportStatus').textContent = reportMod.REPORT.copied;
  } catch {
    box.select();
    $('reportStatus').textContent = document.execCommand?.('copy') ? reportMod.REPORT.copied : reportMod.REPORT.copyManual;
  }
});
$('reportShare').addEventListener('click', async () => {
  count('lapor-api-bagikan');
  try { await navigator.share({ text: $('reportText').value }); } catch { /* share sheet dismissed */ }
});
async function mountSatMap() {
  const loc = selected();
  const date = $('satThumb').dataset.date;
  if (!loc || !date) return;
  $('satMap').setAttribute('aria-label', UI.satMapLabel(cityName(loc)));
  try {
    const [{ createSatMap }, hotspots] = await Promise.all([import('./satmap.js'), getHotspots()]);
    if (!satOpen) return;
    satHotspots = hotspots;
    satMap = createSatMap($('satMap'), { lat: loc.lat, lon: loc.lon, name: cityName(loc), date, credit: UI.satMapCredit, onFail: () => showPhoto(UI.satMapFail), onTile: () => { $('satSkel').hidden = true; }, onInteract: hideHint, hotspots, windDir: loc.wind_dir, onResult: showNearby });
    if (satMap.areaNote) $('satBigCaption').textContent += ` ${satMap.areaNote}`;
    if (store.read(MAP_HINT_KEY) !== '1') {
      store.write(MAP_HINT_KEY, '1');
      $('satHint').hidden = false;
      hintTimer = setTimeout(hideHint, 3000);
    }
  } catch {
    showPhoto(UI.satMapFail);
  }
}
$('satSheet').addEventListener('didPresent', mountSatMap);
$('satSheet').addEventListener('didDismiss', () => {
  satOpen = false;
  satMap?.destroy();
  satMap = null;
  hideHint();
  resetNearby();
});

// A daily calendar reminder at 07:00 for 30 days, made on the device: no account and no server.
$('remind').addEventListener('click', () => {
  const loc = selected();
  const page = `${location.origin}${location.pathname}`;
  const url = loc ? cityLink(page, loc.id) : page;
  const blob = new Blob([icsReminder({ title: UI.remindTitle, description: UI.remindBody(url), url, now: new Date() })], { type: 'text/calendar' });
  const link = el('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'apa-kabar-udara-pengingat.ics';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  $('shareNote').textContent = UI.remindDone;
  count('pengingat');
});
