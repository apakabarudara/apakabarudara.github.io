import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WHY, cardHtml, renderWhy } from '../web/why.js';
import { FACTS, UI } from '../web/copy.js';

const BANNED = /\b(akurat|valid|pasti|gratis|aman|boleh|harus|ternyata|mengejutkan)\b|tidak akan percaya|!|\?/i;
const NAMES = /Sinar Mas|\bAPP\b|APRIL|Wilmar|Asia Pulp|\bPT /;
const UNVERIFIED = /\b99\b|\b221\b|2,6 juta/;
const HOSTS = ['firms.modaps.eosdis.nasa.gov', 'globalnaturewatch.org', 'auriga.or.id', 'www.mongabay.co.id'];

const strings = (): string[] => [
  WHY.title, WHY.intro, WHY.more, WHY.sourceLabel, WHY.monitorTitle, WHY.closing,
  ...WHY.cards.flatMap(c => [c.statement, c.attribution, c.detail, ...c.sources.map(s => s.label)]),
  ...WHY.monitor.flatMap(m => [m.name, m.text]),
  UI.whyLink, UI.whyFail, FACTS[0]
];

describe('WHY sheet', () => {
  it('has six cards, each with statement, attribution and an https source', () => {
    assert.equal(WHY.cards.length, 6);
    for (const c of WHY.cards) {
      assert.ok(c.statement.length > 10);
      assert.match(c.attribution, /^(Menurut|Perkiraan|Estimasi)/);
      assert.ok(c.sources.length >= 1);
      for (const s of c.sources) assert.match(s.url, /^https:\/\//);
    }
  });
  it('stays calm: no banned words, no accusations, no unverified figures', () => {
    for (const line of strings()) {
      assert.doesNotMatch(line, BANNED, line);
      assert.ok(!/[A-Z]{6,}/.test(line.replace(/USD|BNPB|NASA|ISPU/g, '')), line);
      assert.doesNotMatch(line, NAMES, line);
      assert.doesNotMatch(line, UNVERIFIED, line);
    }
  });
  it('labels the death figure as an estimate', () => {
    const card = WHY.cards.find(c => /kematian/.test(c.statement));
    assert.ok(card && /estimasi|perkiraan/i.test(card.statement + card.attribution));
  });
  it('lists only the expected monitoring hosts', () => {
    assert.deepEqual(WHY.monitor.map(m => new URL(m.url).host), HOSTS);
  });
  it('renders links that open in a new tab with noopener', () => {
    const html = renderWhy().html;
    const anchors = html.match(/<a [^>]*>/g) ?? [];
    assert.ok(anchors.length >= 10);
    for (const a of anchors) assert.match(a, /target="_blank" rel="noopener"/);
    assert.match(cardHtml(WHY.cards[0]), /<details class="why-more">/);
  });
  it('adds the BNPB attribution as the first rotating fact', () => {
    assert.match(FACTS[0], /^Menurut BNPB/);
  });
});
