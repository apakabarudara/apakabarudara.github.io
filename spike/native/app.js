import { ACTIVITIES, EMERGENCY_NUMBER, LEVELS, SENSITIVE, UI } from './copy.js';
import { activityStatuses, bestWindow, greeting, localDate, mapsSearchUrl, nearest, rankByLevel } from './logic.js';

// Served at /coba/native/, reading the live hourly file at the site root.
const DATA_URL = '../../data/latest.json';
const BEST_WINDOW = { span: 2, fromHour: 6, toHour: 21, localHour: iso => new Date(iso).getHours() };
const TICK_EVERY = 8; // three labels across the 24-hour strip
const MAX_ACTIONS = 3;

const num = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
const hourMinute = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
const weekdayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long' });

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
const cityName = loc => loc.name.split(',')[0];
const province = loc => loc.name.split(',').slice(1).join(',').trim();
const lowerFirst = text => text.charAt(0).toLowerCase() + text.slice(1);

let report = null;

/** What the URL asks for: `?city=<id>` (optionally `&level=1–5` to force the band), anything else the overview. */
function route() {
  const params = new URLSearchParams(location.search);
  const loc = report.locations.find(l => l.id === params.get('city'));
  if (!loc || params.get('view') === 'overview') return { loc: null, level: 0 };
  const forced = Number(params.get('level'));
  return { loc, level: Number.isInteger(forced) && forced >= 1 && forced <= 5 ? forced : loc.pm25_model.band };
}

function navigate(search) {
  history.pushState({ fromList: !!new URLSearchParams(search).get('city') }, '', search);
  render();
  window.scrollTo(0, 0);
}

/** Links stay real links (new tab, copy), but a plain tap navigates in place. */
function onPlainClick(link, handler) {
  link.addEventListener('click', e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    handler();
  });
}

function renderOverview() {
  $('welcomeTitle').textContent = UI.welcome(greeting(new Date().getHours()));
  $('overviewSub').textContent = UI.overviewSub(report.locations.length);
  $('cityList').replaceChildren(...rankByLevel(report.locations).map(loc => {
    const level = loc.pm25_model.band;
    const row = el('a', null, 'city-row');
    row.href = `?city=${encodeURIComponent(loc.id)}`;
    row.dataset.level = String(level);
    row.append(el('span', cityName(loc), 'name'), el('span', LEVELS[level].name, 'pill'), icon('next', 20));
    onPlainClick(row, () => navigate(row.search));
    const item = el('li');
    item.append(row);
    return item;
  }));
}

function renderAnswer(loc, level) {
  const copy = LEVELS[level];
  const card = $('answer');
  const changed = card.dataset.level !== String(level) || card.dataset.city !== loc.id;
  card.dataset.level = String(level);
  card.dataset.city = loc.id;
  [...$('scale').children].forEach((segment, i) => segment.classList.toggle('on', i === level - 1));
  $('levelLabel').textContent = UI.levelLabel(copy.name, level);
  $('headline').textContent = copy.headline;
  $('quip').textContent = copy.quip ?? '';

  // One list: everyone's actions, then the sensitive group's first action as a single prefixed line.
  const items = copy.everyone.map(text => el('li', text));
  if (copy.sensitive.length > 0) {
    const line = el('li');
    line.append(el('b', UI.sensitiveLead), ` ${lowerFirst(copy.sensitive[0])}`);
    items.push(line);
  }
  $('actions').replaceChildren(...items.slice(0, MAX_ACTIONS));

  $('symptoms').textContent = copy.faskes ? UI.symptoms(copy.emergency) : '';
  $('shareGood').hidden = !copy.goodNews;
  $('faskes').hidden = !copy.faskes;
  $('call').hidden = !copy.emergency;
  $('shareNote').textContent = '';
  $('stamp').textContent = UI.stamp(clock.format(new Date(loc.pm25_model.updated_at)));

  $('explainList').replaceChildren(...UI.explain(num.format(Math.round(loc.pm25_model.value))).map(text => el('li', text)));
  $('official').href = loc.ispu.source_url;

  if (changed) {
    card.classList.remove('enter');
    void card.offsetWidth;
    card.classList.add('enter');
  }
}

function renderToday(loc, level) {
  const todayRain = loc.outlook.find(d => d.date === localDate(new Date()))?.rain_mm ?? 0;
  const statuses = activityStatuses(LEVELS[level].activities, todayRain);
  $('activities').replaceChildren(...ACTIVITIES.map(activity => {
    const tile = el('li', null, 'activity');
    const glyph = el('span', null, 'glyph');
    glyph.append(icon(activity.icon, 22));
    tile.append(glyph, el('span', activity.label, 'label'), el('span', activity.notes[statuses[activity.id]], 'status'));
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
  $('strip').setAttribute('aria-label', win ? UI.stripLabel(from, to) : UI.stripNoWindow);
  $('stripTicks').replaceChildren(...hours.filter((_, i) => i % TICK_EVERY === 0).map((h, i) => el('span', i === 0 ? UI.stripNow : hourMinute.format(new Date(h.time)))));
  for (const id of ['strip', 'stripTicks']) $(id).hidden = hours.length === 0;
}

function render() {
  const { loc, level } = route();
  $('overview').hidden = !!loc;
  $('cityView').hidden = !loc;
  if ($('sheet').open) $('sheet').close();
  if (!loc) {
    document.title = 'Bisa napas gak?';
    renderOverview();
    return;
  }
  document.title = `${cityName(loc)} · Bisa napas gak?`;
  $('cityName').textContent = cityName(loc);
  $('province').textContent = province(loc);
  renderAnswer(loc, level);
  renderToday(loc, level);
}

function showError() {
  $('overview').hidden = true;
  $('cityView').hidden = true;
  $('error').hidden = false;
}

async function load() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.locations) || data.locations.length === 0) throw new Error('no locations');
    report = data;
  } catch {
    showError();
    return;
  }
  render();
}

function useLocation() {
  if (!report) return;
  $('locateNote').textContent = UI.locating;
  navigator.geolocation.getCurrentPosition(
    pos => {
      $('locateNote').textContent = '';
      navigate(`?city=${encodeURIComponent(nearest(report.locations, pos.coords.latitude, pos.coords.longitude).id)}`);
    },
    () => { $('locateNote').textContent = UI.locateFailed; },
    { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
  );
}

async function shareGoodNews() {
  const { loc, level } = route();
  if (!loc) return;
  const at = new Date(loc.pm25_model.updated_at);
  const text = UI.shareGood(cityName(loc), `${weekdayLong.format(at)} ${hourMinute.format(at)}`, level);
  const url = `${location.origin}${location.pathname}?city=${encodeURIComponent(loc.id)}`;
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
  locateLabel: UI.useLocation, overviewTitle: UI.overviewTitle, shareGoodLabel: UI.goodNews, faskesLabel: UI.faskes,
  explainOpen: UI.explainTitle, sheetTitle: UI.explainTitle, whoTitle: UI.sensitiveTitle, whoText: SENSITIVE, officialLabel: UI.official,
  todayTitle: UI.todayTitle, errorHeadline: UI.errorHeadline, errorText: UI.errorText, errorLink: UI.official, credit: UI.credit
};
for (const [id, text] of Object.entries(LABELS)) $(id).textContent = text;
$('back').setAttribute('aria-label', UI.allCities);
$('sheetClose').setAttribute('aria-label', UI.close);
$('faskes').href = mapsSearchUrl(UI.faskesQuery);
$('call').href = `tel:${EMERGENCY_NUMBER}`;
$('call').setAttribute('aria-label', UI.call(EMERGENCY_NUMBER));

if ('geolocation' in navigator) $('locate').addEventListener('click', useLocation);
else $('locate').hidden = true;
// Back returns to the list we came from; opened straight from a link, it goes to the list instead.
onPlainClick($('back'), () => (history.state?.fromList ? history.back() : navigate('?view=overview')));
$('shareGood').addEventListener('click', shareGoodNews);

const sheet = $('sheet');
$('explainOpen').addEventListener('click', () => sheet.showModal());
$('sheetClose').addEventListener('click', () => sheet.close());
// A tap on the dimmed backdrop lands on the <dialog> itself; taps inside land on .sheet-body.
sheet.addEventListener('click', e => { if (e.target === sheet) sheet.close(); });

window.addEventListener('popstate', () => { if (report) render(); });
load();
