# Design system and page redesign

Date: 2026-10-14. Status: approved in chat and implemented. Updated the same day: Ionic chosen by the owner, bundled and self-hosted.

## Who and when

Residents living in the smoke, opening the page in the morning before going out. They need the level and what to do within five seconds, on a phone.

## Decisions

| Topic | Decision |
| --- | --- |
| Structure | "Answer first": one answer card on the first screen, then the outlook, then the light extras, folded. |
| Tone | Scales with severity. Levels 1–2 are light, levels 3–5 plain and direct; no jokes from level 3. |
| Framework | **Ionic 9 (`@ionic/core` 9.0.5), chosen by the owner after the live A/B** against the plain native page ("feels more expensive"). Bundled with Vite 8.3.1 (the only two devDependencies, pinned), custom elements imported one by one from `@ionic/core/components`, no CDN. Plus Jakarta Sans self-hosted (variable woff2, latin, OFL). A hand-written service worker precaches the shell for offline use. The spike and `/coba/` are removed. |
| Visual direction | Option C: clean, warm, playful. ISPU hue order (green, blue, yellow, red, dark) tuned on a warm grey ground, soft shadows instead of thick outlines, Plus Jakarta Sans, blob mascot. |
| City | Remembered on the device (localStorage). Precedence: `#city` in the link, then the saved city, then the overview. GPS position is never stored or sent. |
| First visit | Welcome card with the mascot ("Pagi! Kamu di kota mana?") and "Pakai lokasiku", then every city as a compact two-column chip grid ranked worst first. Tapping a chip opens and remembers it. Never a verdict for a city nobody picked. "Lihat semua kota" returns to it. Added after a UX review on 2026-10-14. |
| Everyday calls | "Hari ini cocok untuk…": laundry, outdoor exercise, opening windows, kids outside, each ✓ / ! / ✕ from the level (rain turns ok laundry into caution). Health-related statuses are drafts for the reviewer. |
| Freshest hours | The two cleanest consecutive hours between 06:00 and 21:00 in the next 24, from `next_hours`; levels 4–5 say windows stay shut instead. The label names the day ("hari ini" or "besok") and says it is limited to daytime. The 24-bar strip colours each bar by that hour's ISPU level (`--l1-bar` … `--l5-bar`, 3:1 on the surface in both themes); "now" is a dot above its bar and the best window a brand underline, so neither overrides the level colour. The aria-label names the level range across the 24 hours. |
| Good news | Levels 1–2 get a share of good air: "Kabari grup: udara lagi bagus" (level 1), "… udara masih oke" (level 2). |
| Health access | By urgency: a mild line and a severe line from level 3, "Cari fasilitas kesehatan" (Google Maps search; the page sends no position) from level 3, "119" from level 4 ([Kemenkes](https://kemkes.go.id/id/terjadi-darurat-kesehatan-saat-mudik-hubungi-119)). Never "puskesmas", "RS", "IGD" or "faskes". |
| Preview | `?level=` works only with `&preview=1` and shows a "Pratinjau" banner, so a shared link cannot show a fake level. |
| Offline | Service worker: cache-first shell, network-first data with the cached copy as fallback; the stale and expired rules then apply. |
| Outlook | Starts tomorrow, because the answer card covers today. |

## Design tokens (`web/tokens.css`)

- Neutrals: background, surface, ink, secondary ink, line, brand **Senja** (plum on sand: light brand #6B4E71, page #F6F1EA, chip #EEE4EF/#5A3F60, mascot #B9A9BD; dark brand #D2B4D8, page #171218, chip #35283A/#E6D0EA, mascot #8F7C95; chrome only, never on level cards), light and dark.
- Level 1–5, each: `solid`, `surface`, `ink`, `label`, `soft`, `soft-ink`, `btn`, `btn-ink`, `mascot`, `eye`. A `[data-level]` scope maps them onto `--lv-*` roles, so one attribute recolours a component.
- Level colours mean air quality only. Neutral components never use them.
- Type: Plus Jakarta Sans (self-hosted); weights body 500, label 600, strong 700, display 800 (headlines only). Scale 13 · 15 · 17 · 20 · 24 · 30: a 13px floor for older readers, 17px body, inputs 16px.
- Spacing 4 · 8 · 12 · 16 · 20 (panel padding) · 24 · 32. Radius 8 · 14 · 24 · pill.
- Containers are white with a shadow; controls inside them are tonal fills without one. Dark surfaces get a 1px hairline.
- One icon set: an inline SVG sprite, 1.75 stroke. The mascot is one SVG cloud whose face follows the level and wears a mask at levels 4–5.
- Motion (CSS only): the mascot floats 3 px and blinks every ~5 s at levels 1–2, blinks more slowly at level 3, and is still at levels 4–5 and on the neutral card. `prefers-reduced-motion` turns all of it off.

## Components

TopBar · CityPicker · AnswerCard (dots, level label, headline, quip, actions, buttons, data stamp, official ISPU link, mascot) · StatusBanner · OutlookStrip with day detail · ReasonList · Ionic accordions ("Kenapa begini?", "Cek napas & fakta asap": facts, poll) · "Apa ini?" bottom-sheet modal · pull-to-refresh · Button · Footer.

## Copy (`web/copy.js`)

Every user-facing line per level lives in one file. Level 3–5 headlines and actions follow the plan's "safety action that must stay" table, ISPU Lampiran II and Kemenkes haze guidance, and are drafts until the health reviewer signs off.

Principle: the app suggests, official sources prescribe, the user decides.

Voice, after a UX-writer review and a plain-language research pass on 2026-10-14, revised after the owner's review:
- Lead with the official level word, its colour and one action; numbers go behind "Apa ini?".
- Everyday Indonesian, no slang older readers do not know. "kamu" only in the light parts (welcome, levels 1–2); levels 3–5, safety lines and errors use plain imperatives and "tidak".
- Never joke about the reader's body or breathing; no jokes at levels 4–5, including under "Lainnya". Two preachy facts were removed.
- Numbers are estimates: said once, in the label or headline ("Udara diperkirakan bagus hari ini."), not in every line. Never "aman".
- Health lines suggest and never order: "Batuk terus atau mata perih? Ada baiknya periksa ke fasilitas kesehatan." and "Sesak napas atau nyeri dada? Sebaiknya segera cari pertolongan medis, atau hubungi 119." The "Apa ini?" sheet notes the advice follows Kemenkes and does not replace a doctor.
- Level 3 work line: "Kalau bisa, kurangi kerja berat di luar. Kalau harus, istirahat lebih sering."
- The level reads "Tidak Sehat · level 3 dari 5"; shared messages carry city, weekday, time and level.

## Batch 2 (owner approved)

- **Level scale**: level name plus a 5-segment scale in the answer card; the segment of the current level is solid and taller, the others sit at 30% opacity; at level 5 the active segment uses the level-5 accent. The visible "· level X dari 5" is gone; it stays in the aria-label and shared text.
- **Kapan membaik?**: levels 3–5, first later outlook day with a lower band ("Diperkirakan mulai membaik Jumat.") or "Belum ada tanda membaik dalam n hari ke depan."; nothing at levels 1–2.
- **Metode & sumber**: a bottom sheet (`#method`) opened from the footer link beside Privasi and from "Lihat metode & sumber" at the end of "Apa ini?". Short headings: data sources, how the level is computed, limits, health advice status, who makes it. Copy in `UI.method*`; no claim of "aman".
- **PWA install**: manifest plus icons, install control only at the bottom of the city view and only from the second visit, dismissible; iOS Safari gets a two-step sheet.
- **Pantau kota lain**: up to 3 pinned cities as chips at the top of the city view (with none pinned, a soft button under the share row instead), picked in a sheet with checkboxes; works offline.
- **Bagikan ke Story**: canvas card, Web Share with a file, download fallback; text kept between 250 px and 1580 px of the 1920 px height. Levels 1–2 get a bigger mascot and the day's quip.
- **Daily quip** (levels 1–2): `LEVELS[n].quips`; one is picked by local date (`dailyQuip`), so it is the same all day. Levels 1–2 have no "everyone" bullets; level 2 keeps only the sensitive line.
- **Membaik sejak terakhir kamu cek**: the level last seen per city is kept on the device (`{level, date}`, never in preview). When the new level is lower and 1–2, the card says so once and the mascot hops.
- **Feedback**: a "Kirim masukan" button above the footer opens an external Tally form in a new tab, with the city passed as the `kota` hidden field (`FEEDBACK_URL` and `FEEDBACK_CITY_PARAM` in `web/app.js`; the row stays hidden while `FEEDBACK_URL` is empty). Nothing is typed into or sent from the page.
- **Sensitive group**: the answer card names the full list (children, older people, pregnant women, lung or heart disease) instead of "Anak & lansia".
- **Share row**: "Bagikan ke grup" and "Bagikan ke Story" side by side right under the answer card (stacked below 360 px); the overview keeps one button at the bottom. The Story button also copies the city link for Instagram's Link sticker.
- **Outlook days**: the selected day is filled with its level colour, ringed 2 px in the level label colour and bold; the others are surface with a hairline and a level marker.
- **Tagline** in title, header (overview only), manifest and Open Graph tags.

## States

Loading skeleton; "Data lama" banner past 3 hours; past 12 hours or on a failed first load a neutral card with the official ISPU link; a failed refresh keeps the last data.

## Files

`web/index.html` markup · `story.js` (Story card canvas) · `public/` (manifest, icons, og image) · `tokens.css` · `app.css` (Ionic themed to the tokens) · `fonts.css` + `fonts/` · `copy.js` · `logic.js` (pure functions) · `ionic.js` (CSS and the custom elements in use) · `app.js` (fetch and render) · `sw.js` (service worker template) · `public/robots.txt`. `vite.config.js` bundles them and adds `data/latest.json` and the final `sw.js` to `dist/`.

## Testing

- `tests/web-logic.test.ts`: freshness thresholds, city precedence, outlook from tomorrow, nearest city, preview-only level override.
- `tests/tokens.test.ts`: WCAG AA (4.5:1) for every text and background token pair, light and dark.
- `tests/copy.test.ts`: per-level names, headlines and actions; no "puskesmas", "RS", "IGD", "faskes", commanding phrases or "aman" in headlines and actions; symptom lines per level; no jokes at levels 3–5.
- Browser, local: iPhone 15, 320 and 375px; light and dark; all five levels via `?preview=1`; first-visit overview, remembered city, stale, expired, failed-load and failed-refresh states from mocked data; offline reload after the service worker is active; no console errors, no sideways scroll, no request to any CDN.

## Budget

First visit transfers about 170 KB gzip after batch 2: HTML 4.3 + CSS 9.0 + JS 126.5 + font 27.4 + data 3.2 (raw 17.4 + 40.0 + 547 + 27.3 + 44.3). Most of the JS is Ionic's components (both platform styles are included per component). Budget, a little above the measurement: **175 KB gzip for a first visit, of which JS 130 KB**. The earlier native page was 21 KB gzip without fonts; the owner accepted the larger payload for the Ionic look, and the service worker makes every later visit and offline open free.
