import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WHY, backgroundHtml, cardHtml, renderWhy } from '../web/why.js';
import { FACTS, UI } from '../web/copy.js';

const BANNED = /\b(akurat|valid|pasti|gratis|aman|boleh|harus|ternyata|mengejutkan)\b|tidak akan percaya|!|\?/i;
const NAMES = /Sinar Mas|\bAPP\b|APRIL|Wilmar|Asia Pulp|PT /;
const UNVERIFIED = /99 persen|221|2,6 juta|34\.262|50\.891|20\.802|32\.637|20 kali/;
const HOSTS = new Set([
  'www.bmkg.go.id', 'www.rctiplus.com', 'mongabay.co.id', 'www.mongabay.co.id', 'www.cna.id', 'www.medcom.id',
  'science.nasa.gov', 'dash.harvard.edu', 'firms.modaps.eosdis.nasa.gov', 'globalnaturewatch.org', 'auriga.or.id'
]);

const strings = (): string[] => [
  WHY.title, WHY.intro, WHY.more, WHY.sourceLabel, WHY.yearTitle, WHY.gapNote, WHY.backgroundTitle, WHY.monitorTitle, WHY.closing,
  ...WHY.cards.flatMap(c => [c.kicker, c.statement, c.attribution, c.detail, ...c.sources.map(s => s.label)]),
  ...WHY.background.flatMap(b => [b.statement, b.attribution, b.source.label]),
  ...WHY.monitor.flatMap(m => [m.name, m.text]),
  UI.whyLink, UI.whyFail, FACTS[0]
];
const urls = (): string[] => [...WHY.cards.flatMap(c => c.sources.map(s => s.url)), ...WHY.background.map(b => b.source.url), ...WHY.monitor.map(m => m.url)];

describe('WHY sheet', () => {
  it('has seven 2026 cards, each with statement, "Menurut" attribution and an https source', () => {
    assert.equal(WHY.cards.length, 7);
    for (const c of WHY.cards) {
      assert.ok(c.statement.length > 10);
      assert.match(c.attribution, /^Menurut/);
      assert.ok(c.sources.length >= 1);
      for (const s of c.sources) assert.match(s.url, /^https:\/\//);
    }
  });
  it('puts kickers only on cards 5 and 6', () => {
    assert.deepEqual(WHY.cards.map(c => Boolean(c.kicker)), [false, false, false, false, true, true, false]);
  });
  it('has three background items and five monitoring links', () => {
    assert.equal(WHY.background.length, 3);
    assert.equal(WHY.monitor.length, 5);
    for (const b of WHY.background) assert.match(b.source.url, /^https:\/\//);
  });
  it('stays calm: no banned words, no accusations, no unverified figures', () => {
    for (const line of strings()) {
      assert.doesNotMatch(line, BANNED, line);
      assert.ok(!/[A-Z]{6,}/.test(line.replace(/USD|BNPB|NASA|ISPU|ENSO|SiPongi/g, '')), line);
      assert.doesNotMatch(line, NAMES, line);
      assert.doesNotMatch(line, UNVERIFIED, line);
    }
  });
  it('labels the death figure as an estimate', () => {
    const item = WHY.background.find(b => /kematian/.test(b.statement));
    assert.ok(item && /estimasi|perkiraan/i.test(item.statement + item.attribution));
  });
  it('links only to the expected hosts', () => {
    for (const u of urls()) assert.ok(HOSTS.has(new URL(u).host), u);
  });
  it('notes the missing 2026 policy and budget data', () => {
    assert.match(WHY.gapNote, /belum menemukan data kebijakan/);
    assert.ok(renderWhy().html.includes(WHY.gapNote));
  });
  it('renders links that open in a new tab with noopener, background folded by default', () => {
    const html = renderWhy().html;
    const anchors = html.match(/<a [^>]*>/g) ?? [];
    assert.equal(anchors.length, urls().length);
    for (const a of anchors) assert.match(a, /target="_blank" rel="noopener"/);
    assert.match(cardHtml(WHY.cards[0]), /<details class="why-more">/);
    assert.doesNotMatch(backgroundHtml(WHY.background[0]), /<details/);
    assert.doesNotMatch(html, /<details class="why-more why-bg" open/);
  });
  it('leads the rotating facts with the Kemenhut 2026 figure', () => {
    assert.match(FACTS[0], /^Menurut Kemenhut, 107\.465 hektare/);
  });
});
