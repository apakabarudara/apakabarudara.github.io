# Spike: decluttered native vs Ionic

Throwaway code to compare two ways of building the same first screen. Nothing here ships.

## The app
"Bisa napas gak?" (live: https://bisanapasgak.github.io/) tells residents of haze-hit cities in Sumatra and Kalimantan the air level today and what to do. Mobile first; users include older adults. Current source: `web/` (index.html, tokens.css, components.css, copy.js, logic.js, app.js). Data: `data/latest.json` (each location: `pm25_model.band` 1–5, `pm25_model.value`, `pm25_model.updated_at`, `ispu.source_url`, `outlook[]` with `date`, `band`, `rain_mm`, `next_hours[]` with `time`, `pm25`, `hotspots_24h`, `wind_dir`, `name`, `lat`, `lon`). A copy sits in each variant's `data/`.

Visual direction to keep in both variants ("option C"): warm grey page `#F7F4F0`, white cards with soft shadows, ISPU level colours (green, blue, yellow, red, near-black; tokens in `web/tokens.css`) used only to mean the level, Plus Jakarta Sans, the cloud mascot SVG from `web/index.html` (face follows the level, mask at levels 4–5).

## Scope (both variants)
1. Overview (first visit): welcome card with mascot, "Pagi! Kamu di kota mana?", "Pakai lokasiku" button, then every city ranked worst first (name + level name, level-coloured).
2. City view, first screen: the answer card and the "Hari ini cocok untuk…" panel (4 activities, freshest hours line, 24-hour strip). Nothing below that (no outlook, reasons, Lainnya, footer) beyond a single small footer credit line.
3. "Apa ini?" detail.
4. URL controls for screenshots: `?view=overview` shows the overview; `?city=<id>&level=<1-5>` shows that city with its band forced to the level. Default with no params: overview.
5. Light and dark (prefers-color-scheme), reduced motion respected, no horizontal scroll at 320–430px, zero console errors.

## Decluttered content (identical in both)
Use `web/copy.js` for level names, headlines, quips and the `everyone`/`sensitive` actions, but present less:
- Label "Berbahaya · level 5 dari 5", headline, quip (levels 1–3 only, small).
- ONE list, max 3 items: the `everyone` items, then the sensitive item as one line prefixed in bold "Anak & lansia:" (e.g. "**Anak & lansia:** tetap di dalam ruangan"). No group headings.
- Levels 3+: one short line above the buttons: "Sesak atau nyeri dada? Ke puskesmas/RS" plus " atau telepon 119" from level 4. Not a boxed block.
- Buttons: levels 1–2 "Kabari grup: udara lagi bagus"; level 3 "Cari puskesmas/RS"; levels 4–5 "Cari puskesmas/RS" + a compact "119" call button on the same row.
- Card footer: one row "Perkiraan · 10.00 WIB · Apa ini?". "Apa ini?" opens the detail: the four explain lines from `UI.explain`, the full sensitive group ("Anak, lansia, ibu hamil, sakit paru/jantung"), and the "Cek angka resmi pemerintah (ISPU)" link.
- Hari ini: four activities as icon + label + status word (no separate status icons needed), the freshest-hours line, the strip with tick labels. No legend line.

## Rules
- Static files only; no npm install, no build step. Serve with `python3 -m http.server <port> --bind 127.0.0.1 -d <variant dir>`.
- You may import `web/copy.js` / `web/logic.js` by copying them into your variant dir; do not edit anything under `web/`, `ingest/` or `data/`, and do not run git.
- Accessibility: tap targets ≥44px, visible focus, text ≥13px, AA contrast.
- Keep the code small and readable; it is a spike, but it must look finished.
