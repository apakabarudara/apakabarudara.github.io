import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const read = (path: string): string => readFileSync(new URL(`../web/${path}`, import.meta.url), 'utf8');
const pngSize = (path: string): [number, number] => {
  const buf = readFileSync(new URL(`../web/public/${path}`, import.meta.url));
  assert.equal(buf.subarray(1, 4).toString(), 'PNG', path);
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
};

describe('web app manifest', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));

  it('names the app and starts it standalone in Senja colours', () => {
    assert.equal(manifest.name, 'Apa Kabar Udara');
    assert.equal(manifest.short_name, 'Kabar Udara');
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.lang, 'id');
    assert.equal(manifest.description, 'Perkiraan asap & kualitas udara hari ini');
    assert.equal(manifest.background_color, '#F6F1EA');
  });

  it('has 192, 512 and 512 maskable icons that exist at that size', () => {
    const got = manifest.icons.map((i: { src: string; sizes: string; purpose: string }) => [i.sizes, i.purpose, pngSize(i.src).join('x')]);
    assert.deepEqual(got, [['192x192', 'any', '192x192'], ['512x512', 'any', '512x512'], ['512x512', 'maskable', '512x512']]);
  });
});

describe('page head', () => {
  const html = read('index.html');
  it('carries the tagline in the title and Open Graph tags with a 1200×630 image', () => {
    assert.match(html, /<title>Apa Kabar Udara · Perkiraan asap & kualitas udara hari ini<\/title>/);
    for (const tag of ['og:title', 'og:description', 'og:type" content="website', 'og:url" content="https://bisanapasgak.github.io/', 'og:locale" content="id_ID', 'og:image" content="https://bisanapasgak.github.io/og-image.png']) {
      assert.ok(html.includes(`property="${tag}"`), tag);
    }
    assert.match(html, /twitter:card" content="summary_large_image"/);
    assert.deepEqual(pngSize('og-image.png'), [1200, 630]);
  });
});

describe('story card tokens', () => {
  it('copies the light level tokens of tokens.css', () => {
    const css = read('tokens.css');
    const story = read('story.js');
    for (const [n, field, token] of [[1, 'surface', 'surface'], [1, 'ink', 'ink'], [1, 'label', 'label'], [1, 'mascot', 'mascot'], [2, 'surface', 'surface'], [3, 'ink', 'ink'],
      [4, 'label', 'label'], [5, 'surface', 'surface'], [5, 'ink', 'ink'], [5, 'label', 'label'], [5, 'mascot', 'mascot']] as const) {
      const hex = css.match(new RegExp(`--l${n}-${token}: (#[0-9A-F]{6})`))![1];
      const block = story.match(new RegExp(`^  ${n}: \\{[^\\n]*`, 'm'))![0];
      assert.ok(block.includes(`${field}: '${hex}'`), `level ${n} ${field} ${hex}`);
    }
  });
});
