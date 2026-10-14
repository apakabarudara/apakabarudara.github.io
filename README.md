# Bisa napas gak?

A playful, mobile-first page that tells people in Indonesia whether the air is safe to go out in during the karhutla (forest and land fire) season.

Live: https://bisanapasgak.github.io/

Status: Phase 2 done. The ingest job writes real data and `web/index.html` reads it. Hosting, the health review of the band copy and the beta are still to come.

## How it works

An hourly GitHub Actions job fetches three sources, builds one report, validates it, commits `data/latest.json`, and deploys `dist/` to GitHub Pages. The page only reads that file. If any source fails or validation rejects the report, the job stops before committing or deploying, so the site keeps the last good data and its staleness banner takes over.

```
npm test                              # unit tests, fixtures only
FIRMS_MAP_KEY=<key> npm run ingest    # writes data/latest.json
npm run build                         # dist/ = the page + data/latest.json, ready for any static host
python3 -m http.server -d dist        # preview at http://localhost:8000
```

Node 22.18 or newer runs the TypeScript directly (type stripping). There are no dependencies.

The page follows a small design system, described in `docs/superpowers/specs/2026-10-14-design-system-design.md`:
- `web/tokens.css` holds every colour, size and radius. Level colours mean air quality only, and `tests/tokens.test.ts` fails the build if any text/background pair drops below WCAG AA.
- `web/copy.js` holds every line of copy per level. Level 3–5 safety copy is a draft until the health reviewer signs off.
- `web/logic.js` holds the pure rules (freshness, city choice, outlook from tomorrow); `web/app.js` renders.

The answer card's tone follows the level: jokes at 1–2, plain at 3 with a small quip, calm and direct at 4–5. From level 3 it offers "Cari faskes terdekat" (a Google Maps search; the page sends no position), and from level 4 "Telepon 119" ([Kemenkes](https://kemkes.go.id/id/terjadi-darurat-kesehatan-saat-mudik-hubungi-119)). Below the answer card, "Hari ini cocok untuk…" turns the level into four everyday calls (laundry, outdoor exercise, opening windows, kids playing outside), names the freshest two hours from `next_hours`, and draws those 24 hourly values as a neutral strip (hourly values are never banded). Levels 1–2 offer "Kabari grup" to share good air.

A first visit opens a welcome card ("Pagi! Kamu di kota mana?") with "Pakai lokasiku", then every city as a compact chip ranked worst first, so nobody sees a verdict for a city they did not pick. The chosen city is remembered on the device and opens directly next time; a `#city` link wins over it, and "Lihat semua kota" returns to the overview.

The page refetches `data/latest.json` every 15 minutes and whenever it comes back into view. When data is over 3 hours old it shows a "Data lama" banner. Over 12 hours, or when the fetch fails, it hides the verdict and points to the official ISPU. "Kota terdekat" picks the nearest city in the browser; the position is never stored or sent. `#<city id>` in the URL selects a city, which is what "Lempar ke grup" shares.

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
