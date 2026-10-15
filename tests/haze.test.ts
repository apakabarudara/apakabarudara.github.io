import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// Suasana: the haze tints the page behind the header and loose text. At its strongest, text still has to reach WCAG AA.
const css = readFileSync(new URL('../web/tokens.css', import.meta.url), 'utf8');
const [light, dark] = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map(m => m[1]);
const parse = (block: string): Record<string, string> =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6}|\.?\d*\.?\d+)\s*;/g)].map(m => [m[1], m[2]]));

type Rgb = [number, number, number];
const rgb = (hex: string): Rgb => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
const luminance = (c: Rgb): number => {
  const [r, g, b] = c.map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const over = (top: Rgb, alpha: number, base: Rgb): Rgb => top.map((v, i) => v * alpha + base[i] * (1 - alpha)) as Rgb;

/** Worst case: veil, orb and both fog layers all at their strongest alpha on the same pixel. */
export const worstCase = (t: Record<string, string>, level: number, bg: Rgb): Rgb => {
  const k = `hz${level}`;
  let c = over(rgb(t[`${k}-tint`]), Number(t[`${k}-veil`]), bg);
  c = over(rgb(t[`${k}-orb`]), Number(t[`${k}-orb-a`]), c);
  for (let i = 0; i < 2; i++) c = over(rgb(t[`${k}-tint`]), Number(t[`${k}-fog-a`]), c);
  return c;
};

const TEXT = ['ink', 'ink-2', 'brand'];
describe('Suasana haze contrast', () => {
  const themes = { light: parse(light), dark: { ...parse(light), ...parse(dark) } };
  for (const [theme, t] of Object.entries(themes)) {
    for (const level of [2, 3, 4, 5]) {
      const bg = worstCase(t, level, rgb(t.bg));
      for (const name of TEXT) {
        it(`${theme} level ${level}: --${name} on the strongest haze reaches 4.5:1`, () => {
          const ratio = contrast(rgb(t[name]), bg);
          assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1`);
        });
      }
    }
  }
});
