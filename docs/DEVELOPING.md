# Developing Apa Kabar Udara

Developer detail moved out of the README. For the short, public page see [../README.md](../README.md).

## Contents

- [How it works](#how-it-works)
- [Branches and data](#branches-and-data)
- [Pull requests](#pull-requests)
- [Architecture](#architecture)
- [Size](#size)
- [Brand, install, family cities, Story card](#brand-install-family-cities-story-card)
- [Copy rules](#copy-rules)
- [Behaviour](#behaviour)
- [data/latest.json](#datalatestjson)
- [data/hotspots.json](#datahotspotsjson)
- [Sources and required credit](#sources-and-required-credit)
- [Setup](#setup)

## How it works

An hourly GitHub Actions job installs dependencies (`npm ci`), runs the tests, fetches three sources, builds one report, validates it, commits the data files to the `data` branch (see below), builds the site with Vite and deploys `dist/` to GitHub Pages. The page only reads those files. If the tests or the build fail, the job stops before deploying and the site keeps the last good deployment. If only the ingest fails (a source error or validation), the run logs a warning, skips the data commit and still builds and deploys the new code with the previous data files; the page's own staleness banner takes over as that data ages.

```
npm ci                                # one runtime dependency (leaflet, lazy map chunk) plus @ionic/core and vite as devDependencies, pinned
npm test                              # unit tests, fixtures only
FIRMS_MAP_KEY=<key> npm run ingest    # writes data/latest.json and data/hotspots.json
npm run satellite                     # per-city true-colour photos into web/public/sat (gitignored, regenerated each run)
npm run build                         # dist/ = hashed bundle + data files + robots.txt + sw.js
npm run preview                       # serves dist/ at http://127.0.0.1:4173
npm run dev                           # Vite dev server (serves data/, no service worker)
```

Node 22 or newer (`.nvmrc`) runs the ingest TypeScript directly (type stripping); Vite is only needed for the page.

## Branches and data

- The hourly ingest commits `data/latest.json` and `data/hotspots.json` to a dedicated `data` branch, not to `main`.
- Every run restores the data files from `data` before the build, so the deployed site always carries the newest data.
- `main` is protected: a pull request and a passing `test` check are required, and force pushes are blocked. It holds only a stale snapshot of the data files so local `npm run dev` works.
- To refresh the data locally:

```
git fetch origin data && git checkout origin/data -- data/
```

## Pull requests

`.github/workflows/pr.yml` runs `npm ci`, `npm test` and `npm run build` on every pull request, with read-only permissions and no secrets. A first-time contributor's run waits for the owner's one-click approval. Forks never see the repo's secrets.

## Architecture

- `web/` is the Vite root. `web/app.js` is the entry; `web/ionic.js` imports the Ionic CSS and defines only the custom elements the page uses (`@ionic/core/components`). The satellite map (`web/satmap.js`, with Leaflet and its CSS) is a lazy chunk fetched only when the satellite sheet opens, so it never reaches the first visit; `vite.config.js` keeps it out of the service worker precache. Everything is self-hosted: no CDN and no Google Fonts request at runtime. (Map tiles come from NASA GIBS when the sheet is opened.)
- Plus Jakarta Sans is self-hosted: one variable woff2 (weights 500–800, latin subset) in `web/fonts/` with its OFL licence, `font-display: swap`.
- `vite.config.js` also emits the data files (from `data/`) and `sw.js` (from `web/sw.js`) into `dist/`. `web/public/robots.txt` is copied as is.
- Service worker (`web/sw.js`, no library): the precached shell is cache-first for hashed assets; page loads are network-first (3 s wait, then the cached `index.html`) so an online visitor always gets the current build; `data/latest.json` and `data/hotspots.json` are network-first (4 s wait, then the cached copy; latest.json is seeded on install, hotspots.json is cached on its first fetch), so the page opens offline with the last data and the usual "Data lama" / expired logic decides what to show. The cache name carries a hash of the built file list, so it only changes when the code does, not on the hourly data refresh. The previous shell cache is kept for one generation (tracked in `bng-meta`) so a page still on the old index can load its old assets; older caches are deleted on activate. Registered only in production builds.
- Design system: `docs/superpowers/specs/2026-10-14-design-system-design.md`. `web/tokens.css` holds every colour, size and radius (level colours mean air quality only; `tests/tokens.test.ts` fails the build if a text/background pair drops below WCAG AA). `web/app.css` themes Ionic to the tokens. `web/copy.js` holds every line of copy. `web/logic.js` holds the pure rules (freshness, city choice, outlook from tomorrow, preview rule). `web/nearby.js` holds the pure helpers for the "Di sekitarmu" card (nearest hotspot, upwind sector). `web/app.js` renders.

## Size

Roughly 170 KB gzip on a first visit (HTML, CSS, JS, one font, data), as GitHub Pages serves it; exact numbers drift with every change, so run `npm run build` and read Vite's report. The lazy map chunk (Leaflet), the icons and the manifest are not part of the first load. The link-preview image is only fetched by crawlers. Later visits and offline reloads come from the service worker cache.

## Brand, install, family cities, Story card

- **Senja** is the brand colour (plum `#6B4E71` on a sand page `#F6F1EA`; dark `#D2B4D8` on `#171218`), used only in chrome, never on level cards or chips.
- **Level scale**: the answer card shows the level name and a five-segment scale (current one solid and taller); "level X dari 5" stays in the aria-label and in shared text. **Kapan membaik?** (levels 3–5) is one hedged line from the outlook (`improvement()` in `web/logic.js`).
- **Pasang di layar utama**: `web/public/manifest.webmanifest` and icons in `web/public/icons/` (192, 512, 512 maskable, 180 apple-touch; rendered from `assets/*.svg` with a browser). The control uses `beforeinstallprompt` on Chromium and a two-step sheet on iOS Safari; shown only from the second visit (a visit counter in localStorage, once per page load) and only at the bottom of the city page; hidden when standalone or dismissed.
- **Alive at levels 1–2**: the mascot floats and blinks in CSS (blink only at level 3, still at 4–5 and on the neutral card; all off under `prefers-reduced-motion`). One light line per day (`LEVELS[1|2].quips`, picked by local date with `dailyQuip()`). "Membaik sejak terakhir kamu cek": the last level seen per city is kept in localStorage (never in preview); a better level 1–2 shows one line and a small hop.
- **Pantau kota lain**: up to 3 pinned cities (localStorage) as level-coloured chips above the answer card, the city on screen left out of the row. With none pinned there is no chip row; a soft "Pantau kota lain" button sits under the share row instead.
- **Bagikan ke Story**: `web/story.js` draws a 1080×1920 PNG on a canvas inside Instagram's safe zones and shares it as a file, else downloads it. The default card leads with the finding: the daily quip at levels 1–2, the quoted ISPU sentence at levels 3–5 (text from `storyLines()` and `STORY` in copy). Instagram Stories take no web link from the web, so tapping the button also copies the city link (for the Link sticker); the clipboard write is not awaited, so the share still runs inside the tap. Loaded on first tap, no extra chunk.
- **Disclaimer banner**: first thing inside `main.wrap`, `role="note"`, dismissed with × (stored under `akud-disclaimer-v1`; bump the version to show it again); hidden in preview mode. Text: `UI.disclaimer`, with a link that opens the method sheet.
- Tagline "Perkiraan asap & kualitas udara hari ini" in the title, the header (overview only), manifest and Open Graph tags; `web/public/og-image.png` is 1200×630.

## Copy rules

- The app suggests, official sources prescribe, the user decides. Suggest ("sebaiknya", "ada baiknya"); never order. No "Segera ke…", "wajib" or "harus segera".
- All user-facing text lives in `web/copy.js`. "kamu" only in light parts (welcome, levels 1–2); levels 3–5, safety lines and errors use plain imperatives and "tidak". No slang older readers do not know.
- No jokes about the reader's body or breathing; no jokes at levels 4–5, "Lainnya" facts included.
- Numbers are estimates: say so once, in the label ("Perkiraan") or headline, not in every line. Never claim "aman".
- Health access by urgency, never "puskesmas", "RS", "IGD" or "faskes": mild, lasting symptoms suggest a "fasilitas kesehatan"; severe symptoms suggest medical help or 119. The button reads "Cari fasilitas kesehatan" (a Google Maps search; the page sends no position).
- Level 3–5 safety copy, activity statuses and symptom lines are drafts awaiting a health reviewer (comment at the top of `copy.js`). The ISPU guidance itself (`OFFICIAL_ISPU`) is quoted word for word and frozen by a test.
- `tests/copy.test.ts` checks these rules.

## Behaviour

A first visit opens a welcome card ("Pagi! Kamu di kota mana?") with "Pakai lokasiku", then every city worst first, so nobody sees a verdict for a city they did not pick. The chosen city is remembered on the device (localStorage, in try/catch). Precedence: `#city` in the URL, then the saved city, then the overview; "Lihat semua kota" returns to the overview. "Terdekat" picks the nearest city in the browser; the position is never stored or sent.

The city view: answer card with "Bagikan ke grup" and "Bagikan ke Story" right under it (level name with "(N dari 5)", the quoted ISPU description and "Panduan resmi ISPU" block, symptom lines from level 3, "Cari fasilitas kesehatan" from level 3, 119 from level 4, "Apa ini?" as a bottom sheet), a satellite thumbnail row, "Kapan udara paling lega?" (subtitle "24 jam ke depan"; Jemur baju/Jendela cards, day-part capsules with Si Kapas and the best window, a flat-day line, and the per-hour strip folded under "Lihat per jam"), "Besok gimana?" from tomorrow with day detail, and the **"Fakta asap"** accordion ("Cek napas hari ini" at levels 4–5, where facts are hidden). A "Kirim masukan" link opens an external Tally form (hidden while `FEEDBACK_URL` in `web/app.js` is empty; `FEEDBACK_CITY_PARAM` passes the city as the form's `kota` hidden field). Data credits live in the "Sumber data" section and "Privasi" in its own section; "Metode & sumber" is a bottom sheet opened from there and from the end of "Apa ini?" (sources, how the level is computed, limits, health-review status, who makes the app; all `UI.method*` in `web/copy.js`).

**Satellite and "Di sekitarmu".** The photo no longer sits in the accordion. The per-city NASA true-colour photo (`sat/<id>.jpg`, index in `sat/index.json`, made by `npm run satellite`) is a round thumbnail on the answer card; a missing index, entry or file hides it. Tapping it opens a sheet that goes straight into an interactive Leaflet map (`web/satmap.js`, lazy chunk): NASA GIBS true colour (`VIIRS_NOAA20_CorrectedReflectance_TrueColor`), the NOAA-20 375 m thermal anomalies layer through GIBS WMS (GIBS serves hotspots as vector tiles only), and transparent coastline tiles. If the map cannot load, the sheet falls back to the photo. Tapping the map shows a "Di sekitarmu" card built in the browser from `data/hotspots.json` (`web/nearby.js`): nearest hotspot with distance and direction, and whether hotspots lie upwind (within 45 degrees of the wind direction). The air model is not per point, so there is no per-point air quality. A missing or bad hotspots file just hides the card.

The page refetches `data/latest.json` every 15 minutes, when it returns to the tab and on pull-to-refresh. Over 3 hours old it shows "Data lama". Over 12 hours, or on a failed first load, it hides the verdict and points to the official ISPU. A failed refresh keeps the last data.

`?city=<id>&level=<1-5>&preview=1` shows a level for design review with a visible "Pratinjau" banner. Without `preview=1` the `level` parameter is ignored, so a shared link can never show a made-up level (`previewOverride` in `web/logic.js`).

## data/latest.json

The shape lives in `ingest/types.ts`.

| Field | Meaning |
| --- | --- |
| `ispu` | Always `link_only` with the official URL. No permitted feed exists yet, and validation rejects a number here. |
| `pm25_model.value` | Modelled PM2.5, mean of the 24 hours ending at `updated_at`. ISPU defines its PM2.5 breakpoints on 24-hour averages. |
| `pm25_model.band` | 1 Baik, 2 Sedang, 3 Tidak Sehat, 4 Sangat Tidak Sehat, 5 Berbahaya. Upper bounds 15.5 / 55.4 / 150.4 / 250.4 µg/m³ from [Permen LHK P.14/2020, Lampiran I](https://peraturan.go.id/files/bn774-2020.pdf). |
| `hotspots_24h.count` | VIIRS NOAA-20 detections of nominal or high confidence within 100 km, acquired in the last 24 hours. |
| `wind_dir` | Where the wind blows from, 8-point Indonesian compass. |
| `outlook` | Mean PM2.5 per complete local day from today, banded like `pm25_model`, plus that day's forecast rain in mm. CAMS global forecasts 5 days, so expect about 4 entries, not 7. |
| `next_hours` | Modelled PM2.5 for each of the next 24 hours from the current hour, UTC times. Hourly values. The strip colours each bar with the daily PM2.5 breakpoints as a guide; the level itself always comes from `pm25_model.band`. |

Cities are in `ingest/locations.ts`.

## data/hotspots.json

Shape `{ generated_at, source, points: [[lat, lon], ...] }` (`HotspotsFile` in `ingest/types.ts`). Built by `buildHotspotsFile()` in `ingest/build.ts` from the same fires `latest.json` counts: coordinates rounded to 3 decimals (about 110 m), de-duplicated and sorted, so a re-run with no new fires gives the same file. Optional for the page.

## Sources and required credit

| Source | Used for | Terms |
| --- | --- | --- |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (CAMS global, ~45 km) | PM2.5 now and outlook | Free for non-commercial use only, CC BY 4.0. Link "Weather data by Open-Meteo.com" next to the data and credit CAMS ("Contains modified Copernicus Atmosphere Monitoring Service information <year>"). |
| [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | Wind direction, daily rain | As above. |
| [NASA FIRMS Area API](https://firms.modaps.eosdis.nasa.gov/api/area/) | Hotspots | Free MAP_KEY, 5,000 transactions per 10 minutes. Credit "NASA FIRMS". Suomi NPP stops on 2026-11-02, hence NOAA-20. |
| NASA GIBS / Worldview (VIIRS NOAA-20) | Satellite photos and the interactive map | Credit "NASA GIBS / Worldview (VIIRS)" (`UI.creditGibs`, `UI.satMapCredit`). |
| ISPU level limits, [Permen LHK P.14/2020](https://peraturan.go.id/files/bn774-2020.pdf) | Level bands | Credit "batas level: ISPU (Permen LHK P.14/2020)". |

Not used: the ISPU KLH feed (no documented API; access is an information request to humas@kemenlh.go.id) and BMKG PM2.5 (the [terms](https://www.bmkg.go.id/ketentuan-penggunaan) forbid scraping and require written permission for third-party apps).

## Setup

1. Get a free MAP_KEY at https://firms.modaps.eosdis.nasa.gov/api/map_key/.
2. Add it as the repository secret `FIRMS_MAP_KEY`. Until it is set, every scheduled run fails the ingest step.
3. Settings → Pages → Source: GitHub Actions. On the free plan Pages needs a public repository.
4. Protect `main` as described in [Branches and data](#branches-and-data).

A failed run emails the repo owner, which is the only alert so far.
