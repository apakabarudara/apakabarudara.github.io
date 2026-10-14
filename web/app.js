import './ionic.js';
import { ACTIVITIES, EMERGENCY_NUMBER, FACTS, LEVELS, POLLS, RAIN, STORY, UI } from './copy.js';
import {
  activityStatuses, ago, bestWindow, cityLink, dailyQuip, feedbackUrl, freshness, greeting, hourBands, improvedFrom, improvement, installMode, isIosSafari, levelRange, localDate, mapsSearchUrl,
  nearest, normalizeWatch, previewOverride, rainKind, rankByLevel, relativeDay, resolveCity, storyKey, storyLines, toggleWatch, upcomingDays, watchRow, WET_DAY_MM
} from './logic.js';

const DATA_URL = './data/latest.json';
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
const lowerFirst = text => text[0].toLowerCase() + text.slice(1);
const when = iso => `${clock.format(new Date(iso))} (${ago(iso, new Date())})`;
const dateOf = day => new Date(`${day}T00:00:00Z`);
const levelText = level => UI.levelLabel(LEVELS[level].name, level);

// Only the chosen city is remembered, on this device. Storage can be blocked; the page works without it.
const savedCity = {
  get() { try { return localStorage.getItem(CITY_KEY); } catch { return null; } },
  set(id) { try { localStorage.setItem(CITY_KEY, id); } catch { /* nothing to remember in private mode */ } }
};

// Pinned family cities and the "install" dismissal: also device-only, also optional.
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
  renderInstall();
  $('tagline').hidden = view !== 'overview';
  $('story').hidden = view !== 'city';
  // City view: the share row sits right under the answer card. Overview: one share button at the bottom.
  if (view === 'city') $('answer').after($('shareBlock'), $('watchSolo'));
  else $('city').after($('shareBlock'));
  $('shareBlock').hidden = view === 'message' || (view === 'city' && Boolean(preview));
  if (view !== 'city') {
    $('watchSolo').hidden = true;
    $('factsBlock').hidden = false;
    $('moreTitle').textContent = UI.moreTitle;
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
  $('levelName').textContent = UI.levelHeading(copy.name);
  $('scale').setAttribute('aria-label', UI.scaleLabel(level));
  [...$('scale').children].forEach((seg, i) => seg.classList.toggle('on', i + 1 === level));
  const better = improveText(loc, level);
  $('improve').textContent = better ?? '';
  $('improve').hidden = !better;
  $('headline').textContent = copy.headline;
  const quip = quipFor(level);
  $('quip').textContent = quip ?? '';
  $('quip').hidden = !quip;
  const before = improvedFrom(readSeen()[loc.id]?.level, level);
  $('better').textContent = before ? UI.betterSince(LEVELS[before].name) : '';
  $('better').hidden = !before;
  $('answer').classList.remove('hop');
  if (before) {
    void $('answer').offsetWidth; // restart the hop
    $('answer').classList.add('hop');
  }
  // One list, max 3: everyone's actions, then the sensitive group as one prefixed line.
  const sensitive = copy.sensitive.slice(0, 1).map(text => el('li', null, el('b', null, UI.sensitivePrefix), ` ${lowerFirst(text)}`));
  const actions = [...copy.everyone.map(text => el('li', null, text)), ...sensitive].slice(0, 3);
  $('actions').replaceChildren(...actions);
  $('actions').hidden = actions.length === 0;
  $('symptoms').hidden = !copy.health;
  $('shareGood').hidden = !copy.goodNews;
  $('goodNewsLabel').textContent = copy.goodNews ?? '';
  $('health').hidden = !copy.health;
  $('call').hidden = !copy.emergency;
  $('stamp').textContent = UI.stamp(clock.format(new Date(loc.pm25_model.updated_at)));
  $('explain').replaceChildren(...UI.explain(num.format(Math.round(loc.pm25_model.value))).map(text => el('p', null, text)));
  $('official').href = loc.ispu?.source_url ?? ISPU_URL;
  $('factsBlock').hidden = level >= 4; // no jokes or trivia at levels 4–5
  $('moreTitle').textContent = level >= 4 ? UI.moreTitleNoFacts : UI.moreTitle;
}

function renderToday(loc, level) {
  $('todayTitle').textContent = level <= 2 ? UI.todayTitle : UI.todayTitleNeutral;
  const rain = loc.outlook.find(d => d.date === localDate(new Date()))?.rain_mm ?? 0;
  const statuses = activityStatuses(LEVELS[level].activities, rain, WET_DAY_MM);
  $('activities').replaceChildren(...ACTIVITIES.map(a =>
    el('li', 'activity', icon(a.icon), el('span', 'text', el('span', 'label', a.label), el('strong', 'status', a.notes[statuses[a.id]])))
  ));

  const hours = Array.isArray(loc.next_hours) ? loc.next_hours : [];
  const win = level <= 3 && hours.length > 0 ? bestWindow(hours, BEST) : null;
  const from = win ? hm.format(new Date(win.start)) : '';
  const to = win ? hm.format(new Date(win.end)) : '';
  const dayWord = win ? UI.dayWord[relativeDay(win.start, new Date())] : '';
  $('best').textContent = level >= 4 ? UI.windowsShut : win ? UI.bestWindow(level, dayWord, from, to, win.band) : '';
  $('best').hidden = !$('best').textContent;

  const peak = Math.max(...hours.map(h => h.pm25), 1);
  const best = new Set(win?.indexes ?? []);
  const bands = hourBands(hours);
  $('strip').replaceChildren(...hours.map((h, i) => {
    const bar = el('i', [best.has(i) ? 'best' : '', i === 0 ? 'now' : ''].join(' ').trim());
    bar.dataset.bar = String(bands[i]);
    bar.style.height = `${Math.max(10, (h.pm25 / peak) * 100)}%`;
    return bar;
  }));
  const range = hours.length ? levelRange(bands) : null;
  $('strip').setAttribute('aria-label', range ? UI.stripLabel(UI.stripRange(LEVELS[range.min].name, LEVELS[range.max].name), win ? UI.stripBest(from, to) : '') : '');
  $('ticks').replaceChildren(...hours.filter((_, i) => i % TICK_EVERY === 0).map((h, i) => el('span', null, i === 0 ? UI.stripNow : hm.format(new Date(h.time)))));
  $('stripLegend').textContent = range ? UI.stripLegend(LEVELS[range.min].name, LEVELS[range.max].name) : '';
  for (const id of ['strip', 'ticks', 'stripLegend']) $(id).hidden = hours.length === 0;
}

function showDay(days, idx) {
  dayIndex = idx;
  const day = days[idx];
  $('dayDetail').replaceChildren(el('strong', null, `${dayLong.format(dateOf(day.date))} · ${LEVELS[day.band].name}`), `${LEVELS[day.band].dayLine} ${RAIN[rainKind(day.rain_mm)]}.`);
  [...$('days').children].forEach((chip, i) => chip.setAttribute('aria-pressed', String(i === idx)));
}

function renderOutlook(loc) {
  const days = upcomingDays(loc.outlook, localDate(new Date()));
  $('outlook').hidden = days.length === 0;
  $('days').style.setProperty('--n', String(days.length));
  $('days').replaceChildren(...days.map((day, i) => {
    const chip = el('button', 'day', el('span', 'd', weekdayShort.format(dateOf(day.date))), el('span', 'n', LEVELS[day.band].name));
    chip.type = 'button';
    chip.dataset.level = String(day.band);
    chip.setAttribute('aria-pressed', 'false');
    chip.setAttribute('aria-label', `${dayLong.format(dateOf(day.date))}, ${levelText(day.band)}`);
    chip.addEventListener('click', () => showDay(days, i));
    return chip;
  }));
  if (days.length > 0) showDay(days, Math.min(dayIndex, days.length - 1));
  return days;
}

function renderReasons(loc, days) {
  const rainDays = days.slice(0, 3);
  $('hotLabel').textContent = UI.hotspots(loc.hotspots_24h.radius_km);
  $('hot').textContent = num.format(loc.hotspots_24h.count);
  $('wind').textContent = loc.wind_dir;
  $('rainLabel').textContent = UI.rainDays(rainDays.length);
  $('rain').textContent = UI.rainDaysValue(rainDays.filter(d => rainKind(d.rain_mm) !== 'none').length, rainDays.length);
  $('source').textContent = UI.source(when(loc.hotspots_24h.updated_at));
}

function render() {
  const state = freshness(report.generated_at, new Date());
  $('camsCredit').textContent = UI.creditCams(report.generated_at.slice(0, 4));
  $('previewBanner').hidden = !preview;
  $('previewBanner').textContent = UI.preview;
  if (state === 'expired') {
    showMessage(UI.expiredHeadline, UI.expiredText, false);
    return;
  }
  $('banner').hidden = state !== 'stale';
  $('banner').textContent = UI.stale(when(report.generated_at));
  const loc = selected();
  $('feedbackBtn').href = feedbackUrl(FEEDBACK_URL, FEEDBACK_CITY_PARAM, loc ? cityName(loc) : '');
  if (!loc) {
    renderOverview();
    return;
  }
  show('city');
  const level = bandOf(loc);
  $('select').value = loc.id;
  renderAnswer(loc, level);
  renderToday(loc, level);
  renderReasons(loc, renderOutlook(loc));
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

async function share(goodNews) {
  if (!report) return;
  const loc = selected();
  const live = freshness(report.generated_at, new Date()) !== 'expired';
  const target = loc && live && !preview ? loc : null;
  const page = `${location.origin}${location.pathname}`;
  const url = target ? cityLink(page, target.id) : page;
  let text = live ? UI.shareOverview : UI.shareFallback(document.title);
  if (target) {
    const level = target.pm25_model.band;
    const day = dayTime.format(new Date(target.pm25_model.updated_at));
    text = goodNews ? UI.shareGood(cityName(target), day, level) : UI.shareText(cityName(target), day, level, LEVELS[level].headline);
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

// The Story card, drawn ahead of the tap: iOS only lets navigator.share run while the tap's user activation is still live.
let storyJob = { key: null, promise: null };
let storyFile = { key: null, file: null };

function storyInput(loc) {
  const level = loc.pm25_model.band;
  const day = dayTime.format(new Date(loc.pm25_model.updated_at));
  return storyLines({ city: cityName(loc), level, copy: LEVELS[level], story: STORY, quip: quipFor(level), improve: improveText(loc, level), day });
}

function makeStory(lines, key) {
  if (storyFile.key === key) return Promise.resolve(storyFile.file);
  if (storyJob.key === key) return storyJob.promise;
  const promise = import('./story.js')
    .then(({ renderStory }) => renderStory(lines))
    .then(blob => {
      const file = new File([blob], 'bisa-napas-gak.png', { type: 'image/png' });
      storyFile = { key, file };
      return file;
    })
    .finally(() => {
      if (storyJob.promise === promise) storyJob = { key: null, promise: null };
    });
  storyJob = { key, promise };
  return promise;
}

function prepareStory() {
  const loc = selected();
  if (!loc || preview) return;
  const lines = storyInput(loc);
  const key = storyKey(lines);
  if (storyFile.key === key || storyJob.key === key) return;
  const run = () => { makeStory(lines, key).catch(() => {}); }; // a failed warm-up is retried by the tap
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 300);
}

/** The Story card as a PNG: shared as a file where the browser can (phones offer Instagram Story), otherwise downloaded. */
async function shareStory() {
  const loc = selected();
  if (!report || !loc || preview) return;
  const lines = storyInput(loc);
  const key = storyKey(lines);
  $('shareNote').textContent = '';
  // Instagram Stories take no web link from the web: copy it for the Link sticker. Not awaited, and before share, which consumes the tap.
  let linkCopied = false;
  navigator.clipboard?.writeText(cityLink(`${location.origin}${location.pathname}`, loc.id)).then(() => { linkCopied = true; }, () => {});
  // Ready file: share is the first await, so the tap's activation is still live.
  const ready = storyFile.key === key ? storyFile.file : null;
  let file = ready;
  try {
    if (ready && navigator.canShare?.({ files: [ready] })) {
      await navigator.share({ files: [ready] });
      if (linkCopied) $('shareNote').textContent = UI.storyLinkCopied;
      return;
    }
    file = ready ?? (await makeStory(lines, key));
  } catch (error) {
    shareFailed(error);
    return;
  }
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
      if (linkCopied) $('shareNote').textContent = UI.storyLinkCopied;
      return;
    }
    const link = el('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    $('shareNote').textContent = linkCopied ? `${UI.storySaved} ${UI.storyLinkCopied}` : UI.storySaved;
  } catch (error) {
    shareFailed(error);
  }
}

function shareFailed(error) {
  if (error?.name === 'AbortError') return; // share sheet dismissed
  $('shareNote').textContent = error?.name === 'NotAllowedError' && storyFile.file ? UI.storyTapAgain : UI.storyFailed;
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
    const chip = el('button', 'chip', el('span', 'c', cityName(loc)), el('span', 'n', LEVELS[level].name));
    chip.type = 'button';
    chip.dataset.level = String(level);
    chip.setAttribute('aria-label', UI.watchChip(cityName(loc), level, LEVELS[level].name));
    chip.addEventListener('click', () => choose(id));
    return chip;
  });
  const add = el('button', 'chip add', el('span', null, `+ ${UI.watchAdd}`));
  add.type = 'button';
  add.addEventListener('click', openWatchSheet);
  $('watch').replaceChildren(...chips, add);
  // Nobody pinned yet: no chip row above the answer, one soft button below the share row.
  $('watch').hidden = chips.length === 0;
  $('watchSolo').hidden = chips.length > 0;
}

function openWatchSheet() {
  const ids = report.locations.map(l => l.id);
  const note = $('watchNote');
  const count = () => { note.textContent = UI.watchCount(watchRow(watch, current).length); };
  $('watchList').replaceChildren(...rankByLevel(report.locations).filter(l => l.id !== current).map(loc => {
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

function renderPoll() {
  const box = $('poll');
  box.replaceChildren(...POLLS.map(p => {
    const choice = el('button', 'choice', p.label);
    choice.type = 'button';
    choice.setAttribute('aria-pressed', 'false');
    choice.addEventListener('click', () => {
      [...box.children].forEach(c => c.setAttribute('aria-pressed', String(c === choice)));
      $('pollNote').textContent = p.reply;
    });
    return choice;
  }));
}

// Static labels come from copy.js so every line lives in one file.
for (const node of document.querySelectorAll('[data-copy]')) node.textContent = UI[node.dataset.copy];
for (const node of document.querySelectorAll('[data-method]')) node.textContent = UI[node.dataset.method][Number(node.dataset.i)];
for (const node of document.querySelectorAll('[data-copy-credit]')) node.textContent = UI.creditLine[Number(node.dataset.copyCredit)];
for (const node of document.querySelectorAll('[data-copy-label]')) node.setAttribute('aria-label', UI[node.dataset.copyLabel]);
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
$('share').addEventListener('click', () => share(false));
$('shareGood').addEventListener('click', () => share(true));
$('factsNext').addEventListener('click', nextFact);

// Bottom sheets that fit their content: "Apa ini?", the iOS install steps, "Pantau kota lain".
for (const id of ['about', 'method', 'iosSheet', 'watchSheet']) {
  $(id).breakpoints = [0, 1];
  $(id).initialBreakpoint = 1;
}
$('watchSoloBtn').addEventListener('click', openWatchSheet);
const sheet = $('about');
$('aboutBtn').addEventListener('click', () => sheet.present());
$('aboutClose').addEventListener('click', () => sheet.dismiss());
$('methodClose').addEventListener('click', () => $('method').dismiss());
$('methodLink').addEventListener('click', () => $('method').present());
$('methodFromAbout').addEventListener('click', async () => {
  await sheet.dismiss();
  $('method').present();
});
$('methodOfficial').href = ISPU_URL;
$('methodFeedbackBtn').href = FEEDBACK_URL;
$('methodFeedbackBtn').hidden = !FEEDBACK_URL;
$('iosClose').addEventListener('click', () => $('iosSheet').dismiss());
$('watchClose').addEventListener('click', () => $('watchSheet').dismiss());
$('story').addEventListener('click', shareStory);
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
renderPoll();
nextFact();
load();

// Offline shell. Production builds only, so the dev server never serves a stale page.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => { /* the page works without it */ }));
}
