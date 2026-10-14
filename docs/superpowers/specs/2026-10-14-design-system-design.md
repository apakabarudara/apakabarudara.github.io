# Design system and page redesign

Date: 2026-10-14. Status: approved in chat and implemented.

## Who and when

Residents living in the smoke, opening the page in the morning before going out. They need the level and what to do within five seconds, on a phone.

## Decisions

| Topic | Decision |
| --- | --- |
| Structure | "Answer first": one answer card on the first screen, then the outlook, then why, then the light extras folded under "Lainnya". |
| Tone | Scales with severity. Levels 1–2 joke, level 3 is plain with a small quip, levels 4–5 are calm and direct. |
| Visual direction | Option C: clean, warm, playful. ISPU hue order (green, blue, yellow, red, dark) tuned on a warm grey ground, soft shadows instead of thick outlines, Plus Jakarta Sans, blob mascot. |
| City | Remembered on the device (localStorage). Precedence: `#city` in the link, then the saved city, then the first city with a hint. GPS position is never stored or sent. |
| Health access | "Cari faskes terdekat" from level 3 opens a Google Maps search; the page sends no position. "Telepon 119" from level 4 ([Kemenkes](https://kemkes.go.id/id/terjadi-darurat-kesehatan-saat-mudik-hubungi-119)). |
| Outlook | Starts tomorrow, because the answer card covers today. |

## Design tokens (`web/tokens.css`)

- Neutrals: background, surface, ink, secondary ink, line, brand indigo, light and dark.
- Level 1–5, each: `solid`, `surface`, `ink`, `label`, `soft`, `soft-ink`, `btn`, `btn-ink`, `mascot`, `eye`. A `[data-level]` scope maps them onto `--lv-*` roles, so one attribute recolours a component.
- Level colours mean air quality only. Neutral components never use them.
- Type: Plus Jakarta Sans 500/700/800, scale 12 · 14 · 16 · 19 · 23 · 30. Inputs 16px.
- Spacing 4 · 8 · 12 · 16 · 24 · 32. Radius: chip 10, button 14, card 24, pill.
- Motion: levels 1–2 bob and enter, level 3 enters, levels 4–5 none. `prefers-reduced-motion` turns all of it off.

## Components

TopBar · CityPicker · AnswerCard (dots, level label, headline, quip, actions, buttons, data stamp, official ISPU link, mascot) · StatusBanner · OutlookStrip with day detail · ReasonList · Disclosure ("Lainnya": plot twist, poll, feedback) · Button · Footer.

## Copy (`web/copy.js`)

Every user-facing line per level lives in one file. Level 3–5 headlines and actions follow the plan's "safety action that must stay" table and are drafts until the health reviewer signs off.

## States

Loading skeleton; "Data lama" banner past 3 hours; past 12 hours or on a failed first load a neutral card with the official ISPU link; a failed refresh keeps the last data.

## Files

`index.html` markup · `tokens.css` · `components.css` · `copy.js` · `logic.js` (pure functions) · `app.js` (fetch and render). `npm run build` copies `web/` and `data/latest.json` to `dist/`.

## Testing

- `tests/web-logic.test.ts`: freshness thresholds, city precedence, outlook from tomorrow, nearest city, share text.
- `tests/tokens.test.ts`: WCAG AA (4.5:1) for every text and background token pair, light and dark.
- `tests/copy.test.ts`: every level has a name, headline and 1–3 actions; levels 4–5 have no quip; level 3+ shows faskes, level 4+ shows 119.
- Browser, local: iPhone 15, SE and 320px; light and dark; reduced motion; all five levels and the stale, expired and error states from mocked data; no console errors, no sideways scroll.
- Budget: HTML + CSS + JS under 60 KB, fonts excluded.
