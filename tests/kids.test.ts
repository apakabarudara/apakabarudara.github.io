import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KIDS } from '../web/kids.js';
import { UI } from '../web/copy.js';

const BANNED = /\b(akurat|valid|pasti|gratis|boleh|harus|aman)\b/i;
const KAMU = /\b(kamu|kotamu|napasmu|lokasimu)\b/i;
const EMOJI = /\p{Extended_Pictographic}/u;
const PARENT_NOTE = 'Semua kegiatan ini untuk di dalam rumah dan tidak menggantikan panduan resmi.';

const text = (): string[] => [
  KIDS.title, KIDS.intro, KIDS.print, KIDS.colorTitle, KIDS.riddleTitle, KIDS.answer, KIDS.answersFor, KIDS.challengeTitle, KIDS.parentNote,
  ...KIDS.coloring.flatMap(p => [p.title, p.alt]),
  ...KIDS.riddles.flatMap(r => [r.q, r.a]),
  ...KIDS.challenges.flatMap(c => [c.title, c.text]),
  UI.kidsTitle, UI.kidsText, UI.kidsButton, UI.kidsFail
];

describe('KIDS pack', () => {
  it('has 3 coloring pages, 8 riddles with answers and 6 challenges', () => {
    assert.equal(KIDS.coloring.length, 3);
    assert.equal(KIDS.riddles.length, 8);
    for (const r of KIDS.riddles) assert.ok(r.q.length > 10 && r.a.length > 0);
    assert.equal(KIDS.challenges.length, 6);
  });

  it('carries the one-line note for the grown-up, word for word', () => {
    assert.equal(KIDS.parentNote, PARENT_NOTE);
  });

  it('avoids the banned words, "kamu", exclamation marks and emoji in every string', () => {
    for (const line of text()) {
      assert.doesNotMatch(line, BANNED, line);
      assert.doesNotMatch(line, KAMU, line);
      assert.doesNotMatch(line, /!/, line);
      assert.doesNotMatch(line, EMOJI, line);
    }
  });

  it('gives no health advice and nothing that needs a flame, a knife or a screen', () => {
    for (const line of text()) assert.doesNotMatch(line, /\b(masker|obat|napas|batuk|dokter|api|pisau|kompor|layar|hp|tablet)\b/i, line);
  });
});

describe('coloring pages', () => {
  for (const page of KIDS.coloring) {
    it(`"${page.title}" is well-formed line art`, () => {
      assert.match(page.svg, /^<svg [^>]*viewBox="0 0 \d+ \d+"/);
      assert.ok(page.svg.endsWith('</svg>'));
      // Every opening tag closes (or self-closes), in order.
      const stack: string[] = [];
      for (const [, closing, name, selfClosing] of page.svg.matchAll(/<(\/?)([a-z]+)\b[^>]*?(\/?)>/g)) {
        if (selfClosing) continue;
        if (closing) assert.equal(stack.pop(), name, `${name} closes out of order`);
        else stack.push(name);
      }
      assert.deepEqual(stack, []);
      for (const [, value] of page.svg.matchAll(/\bfill="([^"]*)"/g)) assert.match(value, /^(none|#fff|white)$/i, `fill="${value}"`);
      assert.doesNotMatch(page.svg, /\bstyle=|<image|<text/);
    });

    it(`"${page.title}" has a short description for screen readers`, () => {
      assert.match(page.alt, /^Halaman mewarnai: /);
    });
  }
});
