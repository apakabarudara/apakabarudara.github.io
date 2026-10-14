# Bisa napas gak?

A playful, mobile-first page that tells people in Indonesia whether the air is safe to go out in during the karhutla (forest and land fire) season.

Status: Phase 1 (ingest). `web/index.html` is the beta prototype with sample data; it is wired to real data in Phase 2.

## How it works

An hourly GitHub Actions job fetches three sources, builds one report, validates it, and commits `data/latest.json`. The page only reads that file. If any source fails or validation rejects the report, the job exits non-zero and the last good file stays.

```
npm test                              # unit tests, fixtures only
FIRMS_MAP_KEY=<key> npm run ingest    # writes data/latest.json
```

Node 22.18 or newer runs the TypeScript directly (type stripping). There are no dependencies.

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
