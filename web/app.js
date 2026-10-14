import { ACTIVITIES, EMERGENCY_NUMBER, LEVELS, POLLS, STATUS_MARK, TWISTS, UI } from './copy.js';
import { activityStatuses, ago, bestWindow, freshness, greeting, localDate, mapsSearchUrl, nearest, rankByLevel, resolveCity, upcomingDays } from './logic.js';

const DATA_URL = 'data/latest.json';
const CITY_KEY = 'bisanapasgak.city';
const REFRESH_MS = 15 * 60e3;
const BUBBLE_MS = 3000;
const WET_DAY_MM = 1; // the usual wet-day threshold
const BEST_WINDOW = { span: 2, fromHour: 6, toHour: 21, localHour: iso => new Date(iso).getHours() };
const hourMinute = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });

const ACTIVITY_ICONS = {
  laundry: '<path d="M9 3l-5 3 2 4 2-1v11h8V9l2 1 2-4-5-3a3 3 0 0 1-6 0z"/>',
  exercise: '<path d="M11 5a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M4 17l5 1l.75 -1.5"/><path d="M15 21v-4l-4 -3l1 -6"/><path d="M7 12v-3l5 -1l3 3l3 1"/>',
  windows: '<path d="M5 3h14v18H5z"/><path d="M12 3v18M5 12h14"/>',
  kids: '<path d="M9.5 5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0"/><path d="M12 8v7M8 11l4-2 4 2M9 21l3-6 3 6"/>'
};

const num = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short', timeZone: 'UTC' });
const dayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = id => document.getElementById(id);
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const when = iso => `${clock.format(new Date(iso))}, ${ago(iso, new Date())}`;
const dateOf = day => new Date(`${day}T00:00:00Z`);
const cityName = loc => loc.name.split(',')[0];

// Only the chosen city is remembered, on this device. Storage can be blocked; the page works without it.
const savedCity = {
  get() { try { return localStorage.getItem(CITY_KEY); } catch { return null; } },
  set(id) { try { localStorage.setItem(CITY_KEY, id); } catch { /* nothing to remember in private mode */ } }
};

let report = null;
let currentId = null;
// 'overview' lists every city (first visit, or "Lihat semua kota"); 'city' is one city's answer card.
let view = 'city';
let lastTwist = -1;
let bubbleTimer = 0;

function selected() {
  return report.locations.find(l => l.id === currentId) ?? report.locations[0];
}

function setDots(level) {
  [...$('dots').children].forEach((dot, i) => dot.classList.toggle('on', i === level - 1));
}

/** Neutral card for loading problems and data too old to judge by: no verdict, only the official link. */
function showMessage(headline, text) {
  const card = $('answer');
  card.dataset.level = '0';
  card.removeAttribute('aria-busy');
  setDots(0);
  $('levelLabel').textContent = '';
  $('headline').textContent = headline;
  $('quip').textContent = text;
  $('quip').hidden = false;
  $('actions').replaceChildren();
  $('buttons').hidden = true;
  $('stamp').textContent = '';
  $('bubble').hidden = true;
  $('mascot').tabIndex = -1;
  $('banner').hidden = true;
  $('overview').hidden = true;
  $('answer').hidden = false;
  for (const id of ['today', 'outlook', 'reasons']) $(id).hidden = true;
}

function renderOverview() {
  $('cityBar').hidden = true;
  for (const id of ['answer', 'today', 'outlook', 'reasons']) $(id).hidden = true;
  $('overview').hidden = false;
  $('welcomeTitle').textContent = UI.welcome(greeting(new Date().getHours()));
  $('welcomeSub').textContent = UI.welcomeSub;
  $('overviewSub').textContent = UI.overviewSub(report.locations.length);
  $('cityList').replaceChildren(...rankByLevel(report.locations).map(loc => {
    const level = loc.pm25_model.band;
    const chip = el('button', null, 'city-chip');
    chip.type = 'button';
    chip.dataset.level = String(level);
    chip.setAttribute('aria-label', `${loc.name}, level ${level}, ${LEVELS[level].name}`);
    chip.append(el('b', cityName(loc)), el('small', LEVELS[level].name));
    chip.addEventListener('click', () => choose(loc.id));
    const item = el('li');
    item.append(chip);
    return item;
  }));
}

function renderToday(loc) {
  const level = loc.pm25_model.band;
  const todayRain = loc.outlook.find(d => d.date === localDate(new Date()))?.rain_mm ?? 0;
  const statuses = activityStatuses(LEVELS[level].activities, todayRain, WET_DAY_MM);
  $('activities').replaceChildren(...ACTIVITIES.map(activity => {
    const status = statuses[activity.id];
    const tile = el('li', null, 'activity');
    tile.dataset.status = status;
    tile.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ACTIVITY_ICONS[activity.id]}</svg>`;
    const text = el('span', null, 'text');
    text.append(el('span', activity.label, 'label'), el('span', `${STATUS_MARK[status]} ${activity.notes[status]}`, 'status'));
    tile.append(text);
    return tile;
  }));

  const hours = Array.isArray(loc.next_hours) ? loc.next_hours : [];
  const win = level <= 3 && hours.length > 0 ? bestWindow(hours, BEST_WINDOW) : null;
  const from = win ? hourMinute.format(new Date(win.start)) : '';
  const to = win ? hourMinute.format(new Date(win.end)) : '';
  $('bestWindow').textContent = level >= 4 ? UI.windowsShut : win ? UI.bestWindow(from, to) : '';
  $('bestWindow').hidden = !$('bestWindow').textContent;

  const peak = Math.max(...hours.map(h => h.pm25), 1);
  const best = new Set(win?.indexes ?? []);
  $('strip').replaceChildren(...hours.map((h, i) => {
    const bar = el('i', null, best.has(i) ? 'best' : '');
    bar.style.height = `${Math.max(8, (h.pm25 / peak) * 100)}%`;
    return bar;
  }));
  $('strip').setAttribute('aria-label', win ? UI.stripLabel(from, to) : UI.stripEnd);
  $('strip').hidden = hours.length === 0;
  $('stripAxis').hidden = hours.length === 0;
  $('today').hidden = false;
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
  setDots(level);
  $('levelLabel').textContent = `Level ${level} · ${copy.name}`;
  $('headline').textContent = copy.headline;
  $('quip').textContent = copy.quip ?? '';
  $('quip').hidden = !copy.quip;
  const numbered = level >= 4;
  $('actions').replaceChildren(...copy.actions.map((text, i) => {
    const mark = el('i', numbered ? String(i + 1) : '✓');
    mark.setAttribute('aria-hidden', 'true');
    const item = el('li');
    item.append(mark, text);
    return item;
  }));
  $('buttons').hidden = !copy.faskes && !copy.goodNews;
  $('shareGood').hidden = !copy.goodNews;
  $('faskes').hidden = !copy.faskes;
  $('faskes').href = mapsSearchUrl(UI.faskesQuery);
  $('faskes').textContent = copy.emergency ? UI.faskesShort : UI.faskes;
  $('call').hidden = !copy.emergency;
  $('call').href = `tel:${EMERGENCY_NUMBER}`;
  $('call').textContent = UI.call(EMERGENCY_NUMBER);
  $('stamp').textContent = UI.stamp(num.format(Math.round(loc.pm25_model.value)), when(loc.pm25_model.updated_at));
  $('official').href = loc.ispu.source_url;
  $('official').textContent = UI.official;
  $('mascot').tabIndex = copy.bubble ? 0 : -1;
  $('bubble').hidden = true;
  if (changed) {
    card.classList.remove('enter');
    void card.offsetWidth;
    card.classList.add('enter');
    if (level === 1) burst();
  }
}

function showDay(days, idx) {
  const day = days[idx];
  const copy = LEVELS[day.band];
  const detail = $('dayDetail');
  detail.replaceChildren(
    el('strong', `${dayLong.format(dateOf(day.date))} · Level ${day.band} ${copy.name}`),
    `${copy.dayLine} ${UI.dayDetail(num.format(day.pm25_mean), num.format(day.rain_mm))}`
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
    chip.setAttribute('aria-label', `${dayLong.format(dateOf(day.date))}, level ${day.band}, ${LEVELS[day.band].name}`);
    chip.append(el('span', weekday.format(dateOf(day.date)), 'd'), el('span', LEVELS[day.band].name, 'n'), el('span', `PM2.5 ${Math.round(day.pm25_mean)}`, 'pm'));
    chip.onclick = () => showDay(days, i);
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
  $('rainLabel').textContent = UI.rain(rainDays.length);
  $('rain').textContent = `${num.format(rainDays.reduce((sum, d) => sum + d.rain_mm, 0))} mm`;
  $('source').textContent = UI.source(loc.hotspots_24h.source, when(loc.hotspots_24h.updated_at));
}

function render() {
  const state = freshness(report.generated_at, new Date());
  if (state === 'expired') {
    showMessage(UI.expiredHeadline, UI.expiredText);
    return;
  }
  $('banner').hidden = state !== 'stale';
  $('banner').textContent = UI.stale(when(report.generated_at));
  $('camsCredit').textContent = `Contains modified Copernicus Atmosphere Monitoring Service information ${report.generated_at.slice(0, 4)}`;
  if (view === 'overview') {
    renderOverview();
    return;
  }
  const loc = selected();
  currentId = loc.id;
  $('overview').hidden = true;
  $('cityBar').hidden = false;
  $('allCities').hidden = false;
  $('answer').hidden = false;
  renderAnswer(loc);
  renderToday(loc);
  renderReasons(loc, renderOutlook(loc));
}

function fillPicker() {
  const select = $('city');
  const ids = report.locations.map(l => l.id);
  if (select.dataset.ids !== ids.join()) {
    select.replaceChildren(...report.locations.map(l => {
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

function pickTwist() {
  let i;
  do i = Math.floor(Math.random() * TWISTS.length); while (i === lastTwist && TWISTS.length > 1);
  lastTwist = i;
  $('twist').textContent = TWISTS[i];
}

function renderPoll() {
  const box = $('poll');
  box.replaceChildren(...POLLS.map(p => {
    const choice = el('button', p.label, 'choice');
    choice.type = 'button';
    choice.setAttribute('aria-pressed', 'false');
    choice.onclick = () => {
      [...box.children].forEach(c => c.setAttribute('aria-pressed', String(c === choice)));
      $('pollNote').textContent = p.reply;
    };
    return choice;
  }));
}

$('city').addEventListener('change', e => {
  showHint('');
  choose(e.target.value);
});
$('overviewTitle').textContent = UI.overviewTitle;
$('allCities').textContent = UI.allCities;
$('todayTitle').textContent = UI.todayTitle;
$('shareGoodLabel').textContent = UI.goodNews;
$('stripNow').textContent = UI.stripNow;
$('stripEnd').textContent = UI.stripEnd;

function useLocation() {
  if (!report) return;
  showHint(UI.locating);
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { location: loc, km } = nearest(report.locations, pos.coords.latitude, pos.coords.longitude);
      choose(loc.id);
      showHint(UI.nearest(cityName(loc), num.format(Math.round(km))));
      window.scrollTo(0, 0);
    },
    () => showHint(UI.locateFailed),
    { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
  );
}

if (!('geolocation' in navigator)) {
  $('locate').hidden = true;
  $('locateOverview').hidden = true;
}
$('locate').addEventListener('click', useLocation);
$('locateOverview').addEventListener('click', useLocation);
$('allCities').addEventListener('click', showAllCities);

$('mascot').addEventListener('click', () => {
  const lines = report ? LEVELS[selected().pm25_model.band].bubble : null;
  if (!lines || $('answer').dataset.level === '0') return;
  const bubble = $('bubble');
  bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
  bubble.hidden = false;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { bubble.hidden = true; }, BUBBLE_MS);
});

async function share(goodNews) {
  if (!report) return;
  const fresh = freshness(report.generated_at, new Date()) !== 'expired';
  const cityView = view === 'city' && fresh;
  const loc = cityView ? selected() : null;
  const url = `${location.origin}${location.pathname}${loc ? `#${loc.id}` : ''}`;
  const level = loc?.pm25_model.band;
  const text = !loc ? (fresh ? UI.shareOverview : document.title)
    : goodNews ? UI.shareGood(cityName(loc), level) : UI.shareText(cityName(loc), level, LEVELS[level].headline);
  try {
    if (navigator.share) {
      await navigator.share({ title: document.title, text, url });
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      $('shareNote').textContent = UI.shared;
      $('shareNote').hidden = false;
    }
  } catch {
    // Share sheet dismissed or clipboard refused: nothing to undo.
  }
}
$('share').addEventListener('click', () => share(false));
$('shareGood').addEventListener('click', () => share(true));

$('twistBtn').addEventListener('click', pickTwist);
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
pickTwist();
load();
