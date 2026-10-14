import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

// WCAG 2.x contrast for every text/background token pair, in both themes. A colour that cannot be read fails the build.
const css = readFileSync(new URL('../web/tokens.css', import.meta.url), 'utf8');
const [light, dark] = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map(m => m[1]);

const parse = (block: string): Record<string, string> =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)].map(m => [m[1], m[2]]));

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS: [string, string][] = [
  ['ink', 'bg'], ['ink', 'surface'], ['ink-2', 'bg'], ['ink-2', 'surface'], ['brand', 'bg'], ['brand', 'surface'],
  ['on-brand', 'brand'], ['brand-soft-ink', 'brand-soft'], ['brand', 'brand-soft'], ['ink', 'brand-soft'], ['notice-ink', 'notice'], ['surface', 'ink'],
  ...[1, 2, 3, 4, 5].flatMap((n): [string, string][] => [
    [`l${n}-ink`, `l${n}-surface`], [`l${n}-label`, `l${n}-surface`], [`l${n}-soft-ink`, `l${n}-soft`], [`l${n}-btn-ink`, `l${n}-btn`]
  ])
];

// Graphics (the hourly strip bars) need 3:1, not the 4.5:1 of text: WCAG 1.4.11.
const GRAPHIC_PAIRS: [string, string][] = [1, 2, 3, 4, 5].map((n): [string, string] => [`l${n}-bar`, 'surface']);

describe('tokens.css contrast', () => {
  const themes = { light: parse(light), dark: { ...parse(light), ...parse(dark) } };
  for (const [theme, tokens] of Object.entries(themes)) {
    for (const [fg, bg] of PAIRS) {
      it(`${theme}: --${fg} on --${bg} reaches 4.5:1`, () => {
        assert.ok(tokens[fg] && tokens[bg], `missing --${fg} or --${bg}`);
        const ratio = contrast(tokens[fg], tokens[bg]);
        assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}:1`);
      });
    }
    for (const [fg, bg] of GRAPHIC_PAIRS) {
      it(`${theme}: --${fg} on --${bg} reaches 3:1`, () => {
        assert.ok(tokens[fg] && tokens[bg], `missing --${fg} or --${bg}`);
        const ratio = contrast(tokens[fg], tokens[bg]);
        assert.ok(ratio >= 3, `${ratio.toFixed(2)}:1`);
      });
    }
  }
});

describe('Senja brand', () => {
  const light = parse(css.match(/:root\s*\{([^}]*)\}/)![1]);
  const dark = parse(css.match(/prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/)![1]);

  it('uses the approved light values', () => {
    assert.deepEqual(
      ['brand', 'bg', 'brand-soft', 'brand-soft-ink', 'mascot-neutral', 'on-brand'].map(k => light[k]),
      ['#6B4E71', '#F6F1EA', '#EEE4EF', '#5A3F60', '#B9A9BD', '#FFFFFF']
    );
  });

  it('uses the approved dark values', () => {
    assert.deepEqual(
      ['brand', 'on-brand', 'bg', 'brand-soft', 'brand-soft-ink', 'mascot-neutral'].map(k => dark[k]),
      ['#D2B4D8', '#171218', '#171218', '#35283A', '#E6D0EA', '#8F7C95']
    );
  });

  it('keeps the old indigo out of the web files', () => {
    for (const file of ['tokens.css', 'app.css', 'index.html']) {
      assert.doesNotMatch(readFileSync(new URL(`../web/${file}`, import.meta.url), 'utf8'), /4B3FB5|B3A9FF|EDEAFF|AFA9EC|75, 63, 181/i, file);
    }
  });
});
