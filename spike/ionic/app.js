import { ACTIVITIES, EMERGENCY_NUMBER, LEVELS, SENSITIVE, UI } from './copy.js';
import { activityStatuses, bestWindow, greeting, localDate, mapsSearchUrl, nearest, rankByLevel, WET_DAY_MM } from './logic.js';

const ALL = '__all';
const SENSITIVE_PREFIX = 'Anak & lansia:';
const symptoms = level => `Sesak atau nyeri dada? Ke puskesmas/RS${level >= 4 ? ` atau telepon ${EMERGENCY_NUMBER}` : ''}.`;
const BEST = { span: 2, fromHour: 6, toHour: 21, localHour: iso => new Date(iso).getHours() };

const hm = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' });
const clock = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
const dayTime = new Intl.DateTimeFormat('id-ID', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
const num = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

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
const lowerFirst = text => text[0].toLowerCase() + text.slice(1);

// URL controls for screenshots: ?view=overview, ?city=<id>&level=<1-5>. No params: overview.
const query = new URLSearchParams(location.search);
const forced = { city: query.get('city'), level: Number(query.get('level')) };
let current = query.get('view') === 'overview' ? null : query.get('city');
let report = null;

const bandOf = loc => (loc.id === forced.city && forced.level >= 1 && forced.level <= 5 ? forced.level : loc.pm25_model.band);
const selected = () => report?.locations.find(l => l.id === current) ?? null;

function renderOverview() {
  $('welcomeTitle').textContent = UI.welcome(greeting(new Date().getHours()));
  $('overviewSub').textContent = UI.overviewSub(report.locations.length);
  $('cityList').replaceChildren(...rankByLevel(report.locations).map(loc => {
    const level = loc.pm25_model.band;
    const item = el('ion-item', null, el('span', 'dot'), el('ion-label', null, cityName(loc)), el('ion-badge', 'lv', LEVELS[level].name));
    item.button = true;
    item.dataset.level = String(level);
    item.firstChild.slot = 'start';
    item.lastChild.slot = 'end';
    item.addEventListener('click', () => go(loc.id));
    return item;
  }));
}

function renderAnswer(loc, level) {
  const copy = LEVELS[level];
  $('answer').dataset.level = String(level);
  // Wrap only after the dot, so a narrow card shows "Sangat Tidak Sehat ·" / "level 4 dari 5".
  $('levelLabel').textContent = UI.levelLabel(copy.name, level).replace(/ · (.+)$/, (_, rest) => `\u00a0· ${rest.replaceAll(' ', '\u00a0')}`);
  $('headline').textContent = copy.headline;
  $('quip').textContent = level <= 3 ? copy.quip ?? '' : '';
  $('quip').hidden = !$('quip').textContent;
  // One list, max 3: everyone's actions, then the sensitive group as one prefixed line.
  const sensitive = copy.sensitive.slice(0, 1).map(text => el('li', null, el('b', null, SENSITIVE_PREFIX), ` ${lowerFirst(text)}`));
  $('actions').replaceChildren(...[...copy.everyone.map(text => el('li', null, text)), ...sensitive].slice(0, 3));
  $('symptoms').textContent = symptoms(level);
  $('symptoms').hidden = level < 3;
  $('shareGood').hidden = !copy.goodNews;
  $('faskes').hidden = !copy.faskes;
  $('call').hidden = !copy.emergency;
  $('stamp').textContent = `Perkiraan · ${clock.format(new Date(loc.pm25_model.updated_at))} ·`;
  $('explain').replaceChildren(...UI.explain(num.format(Math.round(loc.pm25_model.value))).map(text => el('p', null, text)));
  $('official').href = loc.ispu.source_url;
}

function renderToday(loc, level) {
  const rain = loc.outlook.find(d => d.date === localDate(new Date()))?.rain_mm ?? 0;
  const statuses = activityStatuses(LEVELS[level].activities, rain, WET_DAY_MM);
  $('activities').replaceChildren(...ACTIVITIES.map(a =>
    el('li', 'activity', icon(a.icon), el('span', 'text', el('span', 'label', a.label), el('strong', 'status', a.notes[statuses[a.id]])))
  ));

  const hours = Array.isArray(loc.next_hours) ? loc.next_hours : [];
  const win = level <= 3 && hours.length > 0 ? bestWindow(hours, BEST) : null;
  const from = win ? hm.format(new Date(win.start)) : '';
  const to = win ? hm.format(new Date(win.end)) : '';
  $('best').textContent = level >= 4 ? UI.windowsShut : win ? UI.bestWindow(level, from, to) : '';
  $('best').hidden = !$('best').textContent;

  const peak = Math.max(...hours.map(h => h.pm25), 1);
  const best = new Set(win?.indexes ?? []);
  $('strip').replaceChildren(...hours.map((h, i) => {
    const bar = el('i', best.has(i) ? 'best' : i === 0 ? 'now' : '');
    bar.style.height = `${Math.max(10, (h.pm25 / peak) * 100)}%`;
    return bar;
  }));
  $('strip').setAttribute('aria-label', win ? UI.stripLabel(from, to) : UI.stripLegend);
  $('ticks').replaceChildren(...hours.filter((_, i) => i % 6 === 0).map((h, i) => el('span', null, i === 0 ? UI.stripNow : hm.format(new Date(h.time)))));
  $('strip').hidden = $('ticks').hidden = hours.length === 0;
}

function render() {
  const loc = selected();
  $('overview').hidden = Boolean(loc);
  $('city').hidden = !loc;
  if (!loc) return renderOverview();
  const level = bandOf(loc);
  $('select').value = loc.id;
  renderAnswer(loc, level);
  renderToday(loc, level);
}

function go(id) {
  current = id;
  history.replaceState(null, '', id ? `?city=${encodeURIComponent(id)}` : '?view=overview');
  for (const hint of ['overviewHint', 'cityHint']) $(hint).textContent = '';
  render();
  $('content').scrollToTop(0);
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

function useLocation() {
  if (!report) return;
  const hint = text => { $(current ? 'cityHint' : 'overviewHint').textContent = text; };
  hint(UI.locating);
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { location: loc, km } = nearest(report.locations, pos.coords.latitude, pos.coords.longitude);
      go(loc.id);
      hint(UI.nearest(cityName(loc), num.format(Math.round(km))));
    },
    () => hint(UI.locateFailed),
    { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
  );
}

async function toast(message) {
  const t = Object.assign(document.createElement('ion-toast'), { message, duration: 2500, position: 'bottom' });
  t.addEventListener('ionToastDidDismiss', () => t.remove());
  document.querySelector('ion-app').append(t);
  await t.present();
}

async function shareGood() {
  const loc = selected();
  if (!loc) return;
  const text = UI.shareGood(cityName(loc), dayTime.format(new Date(loc.pm25_model.updated_at)), bandOf(loc));
  const url = `${location.origin}${location.pathname}?city=${encodeURIComponent(loc.id)}`;
  try {
    if (navigator.share) await navigator.share({ title: document.title, text, url });
    else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      await toast(UI.shared);
    }
  } catch {
    // Share sheet dismissed or clipboard refused: nothing to undo.
  }
}

async function load() {
  try {
    // Served at /coba/ionic/, reading the live hourly file at the site root.
    const res = await fetch('../../data/latest.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.locations) || data.locations.length === 0) throw new Error('no locations');
    report = data;
    if (current && !selected()) current = null;
    fillPicker();
    render();
  } catch {
    // A failed refresh keeps the last report; without one, say so on the welcome card.
    if (report) return;
    $('overview').hidden = false;
    $('welcomeTitle').textContent = UI.errorHeadline;
    $('overviewHint').textContent = UI.errorText;
  }
}

await customElements.whenDefined('ion-modal');

for (const node of document.querySelectorAll('[data-copy]')) node.textContent = UI[node.dataset.copy];
$('sensitive').textContent = SENSITIVE;
$('faskes').href = mapsSearchUrl(UI.faskesQuery);
$('select').interfaceOptions = { header: 'Pilih kota', cssClass: 'city-sheet' };
$('select').cancelText = 'Batal';
$('select').addEventListener('ionChange', e => {
  if (e.detail.value === ALL) go(null);
  else if (e.detail.value !== current) go(e.detail.value);
});
for (const id of ['locate', 'locateOverview']) {
  if ('geolocation' in navigator) $(id).addEventListener('click', useLocation);
  else $(id).hidden = true;
}
$('shareGood').addEventListener('click', shareGood);

const sheet = $('about');
sheet.breakpoints = [0, 1];
sheet.initialBreakpoint = 1;
$('aboutClose').addEventListener('click', () => sheet.dismiss());

$('refresher').addEventListener('ionRefresh', async e => {
  await load();
  e.target.complete();
});

load();
