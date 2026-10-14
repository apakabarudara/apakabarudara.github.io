import { ACTIVITIES, EMERGENCY_NUMBER, FACTS, LEVELS, POLLS, RAIN, STATUS_ICON, UI } from './copy.js';
import {
  activityStatuses, ago, bestWindow, freshness, greeting, localDate, mapsSearchUrl, nearest, rainKind, rankByLevel, resolveCity, upcomingDays, WET_DAY_MM
} from './logic.js';

const DATA_URL = 'data/latest.json';
const CITY_KEY = 'bisanapasgak.city';
const ALL_CITIES = '__all';
const REFRESH_MS = 15 * 60e3;
const BUBBLE_MS = 3000;
const BEST_WINDOW = { span: 2, fromHour: 6, toHour: 21, localHour: iso => new Date(iso).getHours() };
const TICK_EVERY = 6;

const num = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
const hourMinute = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
const weekdayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long' });
const weekdayShort = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });
const dayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = id => document.getElementById(id);
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const icon = (name, size) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ic');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
};
const when = iso => `${clock.format(new Date(iso))} (${ago(iso, new Date())})`;
const dateOf = day => new Date(`${day}T00:00:00Z`);
const cityName = loc => loc.name.split(',')[0];
const levelText = level => UI.levelLabel(LEVELS[level].name, level);

// Only the chosen city is remembered, on this device. Storage can be blocked; the page works without it.
const savedCity = {
  get() { try { return localStorage.getItem(CITY_KEY); } catch { return null; } },
  set(id) { try { localStorage.setItem(CITY_KEY, id); } catch { /* nothing to remember in private mode */ } }
};

let report = null;
let currentId = null;
// 'overview' lists every city (first visit, or "Lihat semua kota"); 'city' is one city's answer card.
let view = 'city';
let lastFact = -1;
let bubbleTimer = 0;

function selected() {
  return report.locations.find(l => l.id === currentId) ?? report.locations[0];
}

function setScale(level) {
  [...$('scale').children].forEach((segment, i) => segment.classList.toggle('on', i === level - 1));
}

function fillList(list, items) {
  list.replaceChildren(...items.map(text => el('li', text)));
  list.hidden = items.length === 0;
}

/** Neutral card for loading problems and data too old to judge by: no verdict, only the official link. */
function showMessage(headline, text) {
  const card = $('answer');
  card.dataset.level = '0';
  card.removeAttribute('aria-busy');
  setScale(0);
  $('levelLabel').textContent = '';
  $('headline').textContent = headline;
  $('quip').textContent = text;
  $('quip').hidden = false;
  fillList($('everyone'), []);
  fillList($('sensitive'), []);
  $('everyoneLabel').hidden = true;
  $('sensitiveLabel').hidden = true;
  for (const id of ['symptoms', 'buttons', 'explain', 'bubble', 'banner', 'overview', 'today', 'outlook', 'reasons', 'shareBlock']) $(id).hidden = true;
  $('stamp').textContent = '';
  $('mascot').tabIndex = -1;
  $('answer').hidden = false;
}

function renderOverview() {
  for (const id of ['cityBar', 'answer', 'today', 'outlook', 'reasons']) $(id).hidden = true;
  $('overview').hidden = false;
  $('shareBlock').hidden = false;
  $('welcomeTitle').textContent = UI.welcome(greeting(new Date().getHours()));
  $('overviewSub').textContent = UI.overviewSub(report.locations.length);
  $('cityList').replaceChildren(...rankByLevel(report.locations).map(loc => {
    const level = loc.pm25_model.band;
    const chip = el('button', null, 'city-chip');
    chip.type = 'button';
    chip.dataset.level = String(level);
    chip.setAttribute('aria-label', `${loc.name}, ${levelText(level)}`);
    chip.append(el('b', cityName(loc)), el('small', LEVELS[level].name));
    chip.addEventListener('click', () => choose(loc.id));
    const item = el('li');
    item.append(chip);
    return item;
  }));
}

function burst() {
  if (reduceMotion) return;
  const box = $('confetti');
  const colors = ['var(--l1-solid)', 'var(--l2-solid)', 'var(--l3-solid)', 'var(--brand)', 'var(--cheek)'];
  box.replaceChildren(...Array.from({ length: 18 }, (_, i) => {
    const bit = el('i');
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colors[i % colors.length];
    bit.style.animationDelay = `${Math.random() * 0.4}s`;
    return bit;
  }));
  setTimeout(() => box.replaceChildren(), 2400);
}

function renderAnswer(loc) {
  const level = loc.pm25_model.band;
  const copy = LEVELS[level];
  const card = $('answer');
  const changed = card.dataset.level !== String(level) || card.dataset.city !== loc.id;
  card.dataset.level = String(level);
  card.dataset.city = loc.id;
  card.removeAttribute('aria-busy');
  setScale(level);
  $('levelLabel').textContent = levelText(level);
  $('headline').textContent = copy.headline;
  $('quip').textContent = copy.quip ?? '';
  $('quip').hidden = !copy.quip;

  const grouped = copy.sensitive.length > 0;
  $('everyoneLabel').hidden = !grouped;
  fillList($('everyone'), copy.everyone);
  $('sensitiveLabel').hidden = !grouped;
  fillList($('sensitive'), copy.sensitive);

  $('symptoms').hidden = !copy.faskes;
  $('symptoms').textContent = UI.symptoms(copy.emergency);
  $('buttons').hidden = !copy.faskes && !copy.goodNews;
  $('shareGood').hidden = !copy.goodNews;
  $('faskes').hidden = !copy.faskes;
  $('call').hidden = !copy.emergency;

  $('stamp').textContent = UI.stamp(when(loc.pm25_model.updated_at));
  $('explain').hidden = false;
  $('explainBody').replaceChildren(...UI.explain(num.format(Math.round(loc.pm25_model.value))).map(text => el('p', text)));
  $('official').href = loc.ispu.source_url;
  $('mascot').tabIndex = copy.bubble ? 0 : -1;
  $('bubble').hidden = true;
  $('factsBlock').hidden = !copy.quip; // no jokes at levels 4–5, not even under "Lainnya"
  if (changed) {
    card.classList.remove('enter');
    void card.offsetWidth;
    card.classList.add('enter');
    if (level === 1) burst();
  }
}

function renderToday(loc) {
  const level = loc.pm25_model.band;
  const todayRain = loc.outlook.find(d => d.date === localDate(new Date()))?.rain_mm ?? 0;
  const statuses = activityStatuses(LEVELS[level].activities, todayRain, WET_DAY_MM);
  $('activities').replaceChildren(...ACTIVITIES.map(activity => {
    const status = statuses[activity.id];
    const tile = el('li', null, 'activity');
    tile.dataset.status = status;
    const text = el('span', null, 'text');
    const note = el('span', null, 'status');
    note.append(icon(STATUS_ICON[status], 16), activity.notes[status]);
    text.append(el('span', activity.label, 'label'), note);
    tile.append(icon(activity.icon, 24), text);
    return tile;
  }));

  const hours = Array.isArray(loc.next_hours) ? loc.next_hours : [];
  const win = level <= 3 && hours.length > 0 ? bestWindow(hours, BEST_WINDOW) : null;
  const from = win ? hourMinute.format(new Date(win.start)) : '';
  const to = win ? hourMinute.format(new Date(win.end)) : '';
  $('bestWindow').textContent = level >= 4 ? UI.windowsShut : win ? UI.bestWindow(level, from, to) : '';
  $('bestWindow').hidden = !$('bestWindow').textContent;

  const peak = Math.max(...hours.map(h => h.pm25), 1);
  const best = new Set(win?.indexes ?? []);
  $('strip').replaceChildren(...hours.map((h, i) => {
    const bar = el('i', null, best.has(i) ? 'best' : i === 0 ? 'now' : '');
    bar.style.height = `${Math.max(10, (h.pm25 / peak) * 100)}%`;
    return bar;
  }));
  $('strip').setAttribute('aria-label', win ? UI.stripLabel(from, to) : UI.stripLegend);
  $('stripTicks').replaceChildren(...hours.filter((_, i) => i % TICK_EVERY === 0).map((h, i) => el('span', i === 0 ? UI.stripNow : hourMinute.format(new Date(h.time)))));
  for (const id of ['strip', 'stripTicks', 'stripLegend']) $(id).hidden = hours.length === 0;
  $('today').hidden = false;
}

function showDay(days, idx) {
  const day = days[idx];
  $('dayDetail').replaceChildren(
    el('strong', `${dayLong.format(dateOf(day.date))} · ${levelText(day.band)}`),
    `${LEVELS[day.band].dayLine} ${RAIN[rainKind(day.rain_mm)]}.`
  );
  [...$('days').children].forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === idx)));
}

function renderOutlook(loc) {
  const days = upcomingDays(loc.outlook, localDate(new Date()));
  $('outlook').hidden = days.length === 0;
  const box = $('days');
  box.style.setProperty('--n', String(days.length));
  box.replaceChildren(...days.map((day, i) => {
    const chip = el('button', null, 'day');
    chip.type = 'button';
    chip.dataset.level = String(day.band);
    chip.setAttribute('aria-pressed', 'false');
    chip.setAttribute('aria-label', `${dayLong.format(dateOf(day.date))}, ${levelText(day.band)}`);
    chip.append(el('span', weekdayShort.format(dateOf(day.date)), 'd'), el('span', LEVELS[day.band].name, 'n'));
    chip.addEventListener('click', () => showDay(days, i));
    return chip;
  }));
  if (days.length > 0) showDay(days, 0);
  return days;
}

function renderReasons(loc, days) {
  const rainDays = days.slice(0, 3);
  $('reasons').hidden = false;
  $('hotLabel').textContent = UI.hotspots(loc.hotspots_24h.radius_km);
  $('hot').textContent = num.format(loc.hotspots_24h.count);
  $('wind').textContent = loc.wind_dir;
  $('rainLabel').textContent = UI.rainDays(rainDays.length);
  $('rain').textContent = UI.rainDaysValue(rainDays.filter(d => rainKind(d.rain_mm) !== 'none').length, rainDays.length);
  $('source').textContent = UI.source(when(loc.hotspots_24h.updated_at));
}

function render() {
  const state = freshness(report.generated_at, new Date());
  $('camsCredit').textContent = `Contains modified Copernicus Atmosphere Monitoring Service information ${report.generated_at.slice(0, 4)}`;
  if (state === 'expired') {
    showMessage(UI.expiredHeadline, UI.expiredText);
    return;
  }
  $('banner').hidden = state !== 'stale';
  $('banner').textContent = UI.stale(when(report.generated_at));
  if (view === 'overview') {
    renderOverview();
    return;
  }
  const loc = selected();
  currentId = loc.id;
  $('overview').hidden = true;
  $('cityBar').hidden = false;
  $('answer').hidden = false;
  renderAnswer(loc);
  renderToday(loc);
  renderReasons(loc, renderOutlook(loc));
  // Levels 1–2 share good news from inside the card; the bottom share is for everything else.
  $('shareBlock').hidden = LEVELS[loc.pm25_model.band].goodNews;
}

function fillPicker() {
  const select = $('city');
  const ids = report.locations.map(l => l.id);
  if (select.dataset.ids !== ids.join()) {
    const all = el('option', UI.allCitiesOption);
    all.value = ALL_CITIES;
    select.replaceChildren(all, ...report.locations.map(l => {
      const option = el('option', cityName(l));
      option.value = l.id;
      return option;
    }));
    select.dataset.ids = ids.join();
    select.disabled = false;
  }
  if (!currentId && view === 'city') {
    const pick = resolveCity(ids, decodeURIComponent(location.hash.slice(1)), savedCity.get());
    currentId = pick.id;
    if (!pick.id) view = 'overview';
  }
  if (currentId) select.value = selected().id;
}

function showHint(text) {
  $(view === 'overview' ? 'overviewHint' : 'hint').textContent = text;
}

function choose(id) {
  view = 'city';
  currentId = id;
  $('city').value = id;
  history.replaceState(null, '', `#${id}`);
  savedCity.set(id);
  render();
  window.scrollTo(0, 0);
}

function showAllCities() {
  view = 'overview';
  showHint('');
  history.replaceState(null, '', location.pathname);
  render();
  window.scrollTo(0, 0);
}

async function load() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.locations) || data.locations.length === 0) throw new Error('no locations');
    report = data;
    fillPicker();
  } catch {
    // A failed refresh keeps the last report; render() still judges how old it is.
    if (!report) {
      showMessage(UI.errorHeadline, UI.errorText);
      return;
    }
  }
  render();
}

function nextFact() {
  let i;
  do i = Math.floor(Math.random() * FACTS.length); while (i === lastFact && FACTS.length > 1);
  lastFact = i;
  $('fact').textContent = FACTS[i];
}

function renderPoll() {
  const box = $('poll');
  box.replaceChildren(...POLLS.map(p => {
    const choice = el('button', p.label, 'choice');
    choice.type = 'button';
    choice.setAttribute('aria-pressed', 'false');
    choice.addEventListener('click', () => {
      [...box.children].forEach(c => c.setAttribute('aria-pressed', String(c === choice)));
      $('pollNote').textContent = p.reply;
    });
    return choice;
  }));
}

function useLocation() {
  if (!report) return;
  showHint(UI.locating);
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { location: loc, km } = nearest(report.locations, pos.coords.latitude, pos.coords.longitude);
      choose(loc.id);
      showHint(UI.nearest(cityName(loc), num.format(Math.round(km))));
    },
    () => showHint(UI.locateFailed),
    { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
  );
}

async function share(goodNews) {
  if (!report) return;
  const fresh = freshness(report.generated_at, new Date()) !== 'expired';
  const loc = view === 'city' && fresh ? selected() : null;
  const url = `${location.origin}${location.pathname}${loc ? `#${loc.id}` : ''}`;
  let text = fresh ? UI.shareOverview : document.title;
  if (loc) {
    const level = loc.pm25_model.band;
    const at = new Date(loc.pm25_model.updated_at);
    const day = `${weekdayLong.format(at)} ${hourMinute.format(at)}`;
    text = goodNews ? UI.shareGood(cityName(loc), day, level) : UI.shareText(cityName(loc), day, level, LEVELS[level].headline);
  }
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      $('shareNote').textContent = UI.shared;
    }
  } catch {
    // Share sheet dismissed or clipboard refused: nothing to undo.
  }
}

// Static labels come from copy.js so every line lives in one file.
const LABELS = {
  welcomeSub: UI.welcomeSub, locateOverviewLabel: UI.useLocation, overviewTitle: UI.overviewTitle,
  everyoneLabel: UI.everyone, sensitiveLabel: UI.sensitive, shareGoodLabel: UI.goodNews, faskesLabel: UI.faskes,
  callLabel: UI.callShort(EMERGENCY_NUMBER), explainTitle: UI.explainTitle, officialLabel: UI.official,
  todayTitle: UI.todayTitle, stripLegend: UI.stripLegend, outlookTitle: UI.outlookTitle, outlookSub: UI.outlookSub,
  reasonsTitle: UI.reasonsTitle, windLabel: UI.wind, shareLabel: UI.share, moreTitle: UI.moreTitle,
  factsTitle: UI.factsTitle, factsNext: UI.factsNext, pollTitle: UI.pollTitle, feedbackTitle: UI.feedbackTitle, feedbackNote: UI.feedbackNote
};
for (const [id, text] of Object.entries(LABELS)) $(id).textContent = text;
$('faskes').href = mapsSearchUrl(UI.faskesQuery);
$('call').href = `tel:${EMERGENCY_NUMBER}`;
$('call').setAttribute('aria-label', UI.call(EMERGENCY_NUMBER));

$('city').addEventListener('change', e => {
  showHint('');
  if (e.target.value === ALL_CITIES) showAllCities();
  else choose(e.target.value);
});
if (!('geolocation' in navigator)) {
  $('locate').hidden = true;
  $('locateOverview').hidden = true;
}
$('locate').addEventListener('click', useLocation);
$('locateOverview').addEventListener('click', useLocation);
$('mascot').addEventListener('click', () => {
  const lines = report && view === 'city' ? LEVELS[selected().pm25_model.band].bubble : null;
  if (!lines || $('answer').dataset.level === '0') return;
  const bubble = $('bubble');
  bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
  bubble.hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { bubble.hidden = true; }, BUBBLE_MS);
});
$('share').addEventListener('click', () => share(false));
$('shareGood').addEventListener('click', () => share(true));
$('factsNext').addEventListener('click', nextFact);
$('feedback').addEventListener('input', () => { $('fbNote').textContent = ''; });
$('sendFb').addEventListener('click', () => {
  const note = $('fbNote');
  const empty = !$('feedback').value.trim();
  note.textContent = empty ? UI.feedbackEmpty : UI.feedbackThanks;
  note.classList.toggle('warn', empty);
  if (!empty) $('feedback').value = '';
});

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') load(); });
setInterval(load, REFRESH_MS);

renderPoll();
nextFact();
load();
