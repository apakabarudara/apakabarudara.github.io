// "Hari Libur Asap": a kids-at-home pack from Si Kapas. Loaded on first open of its sheet, so none of this is in the main bundle.
// For children and the grown-ups beside them: gentle, no jokes about anyone's body or breathing, no health advice, nothing needing a screen.
// The card that opens it lives in copy.js (it shows before this file loads).

const PARENT_NOTE = 'Semua kegiatan ini untuk di dalam rumah dan tidak menggantikan panduan resmi.';

const PAGE = { w: 400, h: 560 };
const LINE = 6; // outline thickness in page units: thick enough for crayons and for a printer's black
const FINE = 4; // inner details

// Si Kapas as in the app's #blob symbol (72×64): one ellipse and three circles.
const SHAPES = '<ellipse cx="36" cy="42" rx="26" ry="17"/><circle cx="24" cy="31" r="12"/><circle cx="38" cy="24" r="14"/><circle cx="52" cy="31" r="11"/>';
const FACES = {
  smile: '<ellipse cx="29" cy="40" rx="3.2" ry="3.8"/><ellipse cx="43" cy="40" rx="3.2" ry="3.8"/><ellipse cx="22" cy="46" rx="4" ry="2.4"/><ellipse cx="50" cy="46" rx="4" ry="2.4"/><path d="M30 46Q36 55 42 46Z"/><path d="M27 19Q31 16 36 16.5"/>',
  calm: '<path d="M26 40q3 3 6 0M40 40q3 3 6 0"/><path d="M32 46q4 3.5 8 0"/><ellipse cx="22" cy="46" rx="4" ry="2.4"/><ellipse cx="50" cy="46" rx="4" ry="2.4"/>',
  none: ''
};

/** Si Kapas centred on (cx, cy), `s` times the 72×64 symbol. Outer line only: the filled copy on top hides the lines where the shapes overlap. */
function kapas(cx, cy, s, face = 'smile') {
  const x = (cx - 36.5 * s).toFixed(1);
  const y = (cy - 34.5 * s).toFixed(1);
  const inner = face === 'none' ? '' : `<g stroke-width="${(FINE / s).toFixed(2)}">${FACES[face]}</g>`;
  return `<g transform="translate(${x} ${y}) scale(${s})"><g stroke-width="${((2 * LINE) / s).toFixed(2)}" fill="#fff">${SHAPES}</g><g stroke="none" fill="#fff">${SHAPES}</g>${inner}</g>`;
}

const sparkle = (x, y, r = 18) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z"/>`;
const grass = (x, y) => `<path d="M${x} ${y}q2-22 -8-34M${x} ${y}q0-26 0-40M${x} ${y}q-2-22 8-34"/>`;
const drop = (x, y) => `<path d="M${x} ${y}C${x + 4} ${y + 10} ${x + 12} ${y + 16} ${x + 12} ${y + 24}A12 12 0 0 1 ${x - 12} ${y + 24}C${x - 12} ${y + 16} ${x - 4} ${y + 10} ${x} ${y}Z"/>`;

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE.w} ${PAGE.h}" fill="none" stroke="#111" stroke-width="${LINE}" stroke-linecap="round" stroke-linejoin="round" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

const SMILING = svg(
  [
    sparkle(80, 90), sparkle(330, 120, 22), sparkle(60, 440, 16), sparkle(345, 430),
    kapas(52, 340, 1.1, 'none'), kapas(350, 300, 1, 'none'),
    kapas(200, 265, 4.2),
    '<path d="M20 500Q60 484 100 500T180 500T260 500T340 500T380 500"/>', grass(60, 530), grass(200, 535), grass(340, 530)
  ].join('')
);

const SUNNY_HOME = svg(
  [
    // sun, its rays, then the cloud that hides part of it
    '<circle cx="110" cy="120" r="46"/>',
    ...Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      const p = r => `${(110 + r * Math.cos(a)).toFixed(1)} ${(120 + r * Math.sin(a)).toFixed(1)}`;
      return `<path d="M${p(62)}L${p(84)}"/>`;
    }),
    kapas(185, 150, 3.2, 'none'),
    kapas(330, 80, 1.7, 'none'),
    // the house
    '<g fill="#fff"><rect x="150" y="300" width="26" height="50"/><rect x="40" y="366" width="150" height="114"/><path d="M25 366L115 290L205 366Z"/></g>',
    '<path d="M95 480V438a20 20 0 0 1 40 0V480"/><circle cx="125" cy="456" r="2" stroke-width="5"/><rect x="55" y="385" width="30" height="30" stroke-width="' + FINE + '"/><path d="M70 385V415M55 400H85" stroke-width="3"/>',
    kapas(305, 395, 2.9),
    '<path d="M20 480H380"/>', grass(30, 480), grass(375, 480)
  ].join('')
);

const RAINY = svg(
  [
    kapas(200, 120, 3.3, 'calm'),
    drop(130, 222), drop(200, 222), drop(270, 222),
    drop(90, 270), drop(310, 270), drop(60, 335), drop(340, 335), drop(95, 400), drop(305, 400),
    // umbrella above Si Kapas
    '<path fill="#fff" d="M130 370A70 70 0 0 1 270 370Q252 358 235 370Q218 358 200 370Q182 358 165 370Q148 358 130 370Z"/><path d="M200 370V398"/>',
    kapas(200, 465, 2.8),
    '<ellipse cx="65" cy="525" rx="45" ry="11"/><ellipse cx="335" cy="528" rx="40" ry="10"/><path d="M47 525q18-5 36 0" stroke-width="3"/>'
  ].join('')
);

const riddle = (q, a) => ({ q, a });
const task = (title, text) => ({ title, text });

export const KIDS = {
  title: 'Hari Libur Asap',
  intro: 'Dari Si Kapas, untuk hari-hari di rumah. Ada halaman mewarnai, teka-teki, dan tantangan kecil yang cukup dengan kertas dan barang di rumah.',
  print: 'Cetak',
  colorTitle: 'Warnai Si Kapas',
  riddleTitle: 'Teka-teki',
  answer: 'Jawaban',
  answersFor: 'Jawaban teka-teki',
  challengeTitle: 'Tantangan 10 menit',
  parentNote: PARENT_NOTE,
  coloring: [
    { title: 'Si Kapas tersenyum', alt: 'Halaman mewarnai: Si Kapas tersenyum', svg: SMILING },
    { title: 'Si Kapas, rumah, dan matahari', alt: 'Halaman mewarnai: Si Kapas di dekat rumah, matahari mengintip di balik awan', svg: SUNNY_HOME },
    { title: 'Si Kapas dan awan hujan', alt: 'Halaman mewarnai: Si Kapas memakai payung di bawah awan hujan', svg: RAINY }
  ],
  riddles: [
    riddle('Jatuh dari langit, tapi tidak pernah luka. Tanah dan genting jadi basah karenanya. Apa aku?', 'Hujan'),
    riddle('Putih dan empuk, melayang di langit, kadang berbentuk seperti kelinci. Apa aku?', 'Awan'),
    riddle('Berkaki empat, berkumis panjang, suka tidur di tempat hangat dan bersuara meong. Siapa aku?', 'Kucing'),
    riddle('Punya jarum tapi tidak menjahit, punya angka tapi bukan buku. Apa aku?', 'Jam dinding'),
    riddle('Punya banyak halaman dan banyak cerita, tapi tidak bisa bicara. Apa aku?', 'Buku'),
    riddle('Berkaki empat tapi tidak pernah berjalan. Dipakai untuk duduk di meja makan. Apa aku?', 'Kursi'),
    riddle('Warnaku banyak dan lengkungku indah. Aku muncul di langit setelah hujan reda. Apa aku?', 'Pelangi'),
    riddle('Berkaki dua, bersayap, bertelur. Pagi hari suaraku membangunkan orang satu kampung. Siapa aku?', 'Ayam jantan')
  ],
  challenges: [
    task('Perahu kertas', 'Lipat selembar kertas menjadi perahu. Beri nama, gambar bendera, lalu biarkan berlayar di atas laut dari selimut biru.'),
    task('Lima benda biru', 'Cari lima benda berwarna biru di dalam rumah dan kumpulkan di satu tempat. Setelah itu, cari lima benda yang bulat.'),
    task('Menara tertinggi', 'Susun menara setinggi mungkin dari buku tipis dan bantal kecil. Ukur dengan jengkal tangan, lalu coba pecahkan rekor sendiri.'),
    task('Cerita tiga kalimat', 'Karang cerita tentang Si Kapas dalam tiga kalimat: awalnya, tengahnya, akhirnya. Ceritakan ke orang di rumah atau ke boneka.'),
    task('Gambar mata terpejam', 'Tutup mata, lalu gambar hewan kesukaan di selembar kertas. Buka mata dan beri nama pada gambarnya.'),
    task('Tiga suara', 'Duduk tenang selama satu menit dan dengarkan suara di dalam rumah. Sebutkan tiga suara yang terdengar, lalu tebak dari mana asalnya.')
  ]
};

const esc = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const figure = (page, i, print) =>
  print
    ? `<section class="kp"><h2>${esc(page.title)}</h2>${page.svg.replace('<svg ', `<svg role="img" aria-label="${esc(page.alt)}" `)}</section>`
    : `<figure class="kids-page"><div class="kids-art" role="img" aria-label="${esc(page.alt)}">${page.svg}</div><figcaption>${i + 1}. ${esc(page.title)}</figcaption></figure>`;

const challenges = () => `<ol class="kids-tasks">${KIDS.challenges.map(c => `<li><b>${esc(c.title)}.</b> ${esc(c.text)}</li>`).join('')}</ol>`;

/** The sheet's content, and the same pack laid out for paper: each coloring page on its own A4 sheet, riddles and challenges on the last. */
export function renderKids() {
  const sheet = document.createElement('div');
  sheet.className = 'kids';
  sheet.innerHTML =
    `<p class="sheet-intro">${esc(KIDS.intro)}</p>` +
    `<button class="kids-print" type="button">${esc(KIDS.print)}</button>` +
    `<h3>${esc(KIDS.colorTitle)}</h3><div class="kids-pages">${KIDS.coloring.map((p, i) => figure(p, i, false)).join('')}</div>` +
    `<h3>${esc(KIDS.riddleTitle)}</h3><div class="kids-riddles">${KIDS.riddles
      .map((r, i) => `<details><summary>${i + 1}. ${esc(r.q)}</summary><p>${esc(KIDS.answer)}: <b>${esc(r.a)}</b></p></details>`)
      .join('')}</div>` +
    `<h3>${esc(KIDS.challengeTitle)}</h3>${challenges()}` +
    `<p class="small">${esc(KIDS.parentNote)}</p>`;
  const print = document.createElement('div');
  print.innerHTML =
    KIDS.coloring.map((p, i) => figure(p, i, true)).join('') +
    `<section class="kp kp-text"><h2>${esc(KIDS.riddleTitle)}</h2><ol class="kp-riddles">${KIDS.riddles.map(r => `<li>${esc(r.q)}</li>`).join('')}</ol>` +
    `<h2>${esc(KIDS.challengeTitle)}</h2>${challenges()}` +
    `<p class="kp-answers"><b>${esc(KIDS.answersFor)}:</b> ${KIDS.riddles.map((r, i) => `${i + 1}. ${esc(r.a)}`).join(' · ')}</p>` +
    `<p class="kp-note">${esc(KIDS.parentNote)}</p></section>`;
  return { title: KIDS.title, sheet, print: [...print.children] };
}
