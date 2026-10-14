# Bisa napas gak?

A playful, mobile-first page that tells people in Indonesia whether the air is safe to go out in during the karhutla (forest and land fire) season.

Live: https://bisanapasgak.github.io/

Status: the Ionic version is the main site (chosen by the owner after a live A/B). Hosting, the health review of the level 3–5 copy and the beta are still to come.

## How it works

An hourly GitHub Actions job installs dependencies (`npm ci`), runs the tests, fetches three sources, builds one report, validates it, commits `data/latest.json`, builds the site with Vite and deploys `dist/` to GitHub Pages. The page only reads that file. If any step fails (tests, a source, validation, the build), the job stops before deploying, so the site keeps the last good deployment and the page's own staleness banner takes over.

```
npm ci                                # two devDependencies only: @ionic/core 9.0.5 and vite 8.3.1, pinned exactly
npm test                              # unit tests, fixtures only
FIRMS_MAP_KEY=<key> npm run ingest    # writes data/latest.json
npm run build                         # dist/ = hashed bundle + data/latest.json + robots.txt + sw.js
npm run preview                       # serves dist/ at http://127.0.0.1:4173
npm run dev                           # Vite dev server (serves data/latest.json, no service worker)
```

Node 22.18 or newer runs the ingest TypeScript directly (type stripping); Vite is only needed for the page.

### Architecture

- `web/` is the Vite root. `web/app.js` is the entry; `web/ionic.js` imports the Ionic CSS and defines only the custom elements the page uses (`@ionic/core/components`), so the output is one JS file, one CSS file and one font file, with no lazy chunks. Everything is self-hosted: no CDN and no Google Fonts request at runtime.
- Plus Jakarta Sans is self-hosted: one variable woff2 (weights 500–800, latin subset) in `web/fonts/` with its OFL licence, `font-display: swap`.
- `vite.config.js` also emits `data/latest.json` (from `data/`) and `sw.js` (from `web/sw.js`) into `dist/`. `web/public/robots.txt` is copied as is.
- Service worker (`web/sw.js`, no library): precaches the built shell, cache-first for static files, network-first for `data/latest.json` (4 s wait, then the cached copy), so the page opens offline with the last data and the usual "Data lama" / expired logic decides what to show. The cache name carries a hash of the built file list, so it only changes when the code does, not on the hourly data refresh; old caches are deleted on activate. It is registered only in production builds.
- Design system: `docs/superpowers/specs/2026-10-14-design-system-design.md`. `web/tokens.css` holds every colour, size and radius (level colours mean air quality only; `tests/tokens.test.ts` fails the build if a text/background pair drops below WCAG AA). `web/app.css` themes Ionic to the tokens. `web/copy.js` holds every line of copy. `web/logic.js` holds the pure rules (freshness, city choice, outlook from tomorrow, preview rule). `web/app.js` renders.

### Size (first visit, gzip, as GitHub Pages serves it)

HTML 3.6 KB, CSS 8.4 KB, JS 121.6 KB, font 27.4 KB, data 3.2 KB: about 164 KB in total (raw 13.7 + 36.9 + 538 + 27.3 + 44.3 KB). Later visits and offline reloads come from the service worker cache.

### Copy rules

- The app suggests, official sources prescribe, the user decides. Suggest ("sebaiknya", "ada baiknya"); never order. No "Segera ke…", "wajib" or "harus segera".
- All user-facing text lives in `web/copy.js`. "kamu" only in light parts (welcome, levels 1–2); levels 3–5, safety lines and errors use plain imperatives and "tidak". No slang older readers do not know.
- No jokes about the reader's body or breathing; no jokes at levels 4–5, "Lainnya" facts included.
- Numbers are estimates: say so once, in the label ("Perkiraan") or headline, not in every line. Never claim "aman".
- Health access by urgency, never "puskesmas", "RS", "IGD" or "faskes": mild, lasting symptoms suggest a "fasilitas kesehatan"; severe symptoms suggest medical help or 119. The button reads "Cari fasilitas kesehatan" (a Google Maps search; the page sends no position).
- Level 3–5 safety copy, activity statuses and symptom lines are drafts awaiting a health reviewer (comment at the top of `copy.js`).
- `tests/copy.test.ts` checks these rules.

### Behaviour

A first visit opens a welcome card ("Pagi! Kamu di kota mana?") with "Pakai lokasiku", then every city worst first, so nobody sees a verdict for a city they did not pick. The chosen city is remembered on the device (localStorage, in try/catch). Precedence: `#city` in the URL, then the saved city, then the overview; "Lihat semua kota" returns to the overview. "Terdekat" picks the nearest city in the browser; the position is never stored or sent.

The city view: answer card (headline, actions, symptom lines from level 3, "Cari fasilitas kesehatan" from level 3, 119 from level 4, "Kabari grup" at levels 1–2, "Apa ini?" as a bottom sheet), "Hari ini cocok untuk…" (activities, freshest two hours, labelled 24-hour strip), "Besok gimana?" from tomorrow with day detail, "Kenapa begini?" and "Lainnya" folded (accordions), "Bagikan ke grup", and a footer with the data credits (Open-Meteo CC BY 4.0, Copernicus CAMS with the year, NASA FIRMS, ISPU).

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
| `next_hours` | Modelled PM2.5 for each of the next 24 hours from the current hour, UTC times. Hourly values, so the page never bands them. |

Cities are in `ingest/locations.ts`.

## Made by

A volunteer project by [Khi Hady](https://github.com/khihadysucahyo). Suggestions and issues are welcome in this repo.

## Sources and required credit

| Source | Used for | Terms |
| --- | --- | --- |
| [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) (CAMS global, ~45 km) | PM2.5 now and outlook | Free for non-commercial use only, CC BY 4.0. Link "Weather data by Open-Meteo.com" next to the data and credit CAMS. |
| [Open-Meteo Forecast API](https://open-meteo.com/en/docs) | Wind direction, daily rain | As above. |
| [NASA FIRMS Area API](https://firms.modaps.eosdis.nasa.gov/api/area/) | Hotspots | Free MAP_KEY, 5,000 transactions per 10 minutes. Credit "NASA FIRMS". Suomi NPP stops on 2026-11-02, hence NOAA-20. |

Not used:
- **ISPU KLH:** there is no documented API. Data access goes through an information request to humas@kemenlh.go.id ([process](https://www.kemenlh.go.id/contents/43/Pelayanan-Informasi)).
- **BMKG PM2.5:** the [terms](https://www.bmkg.go.id/ketentuan-penggunaan) forbid scraping and require written permission for third-party apps.

## Setup

1. Get a free MAP_KEY at https://firms.modaps.eosdis.nasa.gov/api/map_key/.
2. Add it as the repository secret `FIRMS_MAP_KEY`. Until it is set, every scheduled run fails.
3. Settings → Pages → Source: GitHub Actions. On the free plan Pages needs a public repository.

A failed run emails the repo owner, which is the only alert so far.
