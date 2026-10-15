// "Di balik asap": sourced facts about the causes and policy behind the haze. Loaded on first open of its sheet, so none of this is in the main bundle.
// The app only quotes: every statement is attributed and linked, estimates are labelled as estimates, nobody is named or blamed.
// DRAFT wording awaiting the owner's review.

const MONGABAY_AUG = 'https://mongabay.co.id/2026/08/25/karhutla-kalsel-menyoal-penegakan-hukum-dorong-peradilan-lingkungan/';
const MONGABAY_SEP = 'https://mongabay.co.id/2026/09/07/walhi-beberkan-karhutla-di-konsesi-dan-psn/';

export const WHY = {
  title: 'Di balik asap',
  intro: 'Asap ini bukan hanya soal cuaca. Ini yang dicatat sumber resmi, peneliti, dan organisasi independen tahun ini. Kami hanya mengutip.',
  more: 'Selengkapnya',
  sourceLabel: 'Sumber',
  yearTitle: 'Tahun ini (2026)',
  gapNote: 'Kami belum menemukan data kebijakan dan anggaran 2026 yang bisa diverifikasi.',
  backgroundTitle: 'Latar dari tahun-tahun sebelumnya',
  monitorTitle: 'Pantau sendiri',
  closing: 'Setiap angka adalah laporan sumbernya masing-masing; kami belum bisa memeriksanya sendiri.',
  cards: [
    {
      kicker: '',
      statement: 'El Niño tahun ini tergolong sangat kuat, dan musim hujan diperkirakan datang terlambat dan lebih singkat.',
      attribution: 'Menurut BMKG, 22 September 2026.',
      detail: 'Indeks ENSO Juli–September +2,63 (El Niño sangat kuat). Awal musim hujan 2026/2027 diperkirakan mundur di 529 zona musim, sekitar 61 persen wilayah.',
      sources: [{ label: 'BMKG', url: 'https://www.bmkg.go.id/siaran-pers/bmkg-el-nino-sangat-kuat-sedang-terjadi-musim-hujan-2026-2027-diprediksi-datang-lebih-lambat' }]
    },
    {
      kicker: '',
      statement: 'Kemenhut mencatat 107.465 hektare hutan dan lahan terbakar pada Januari sampai Juni 2026.',
      attribution: 'Menurut Kemenhut, dilaporkan Sindonews, 19 Juli 2026.',
      detail: 'Terluas: Kalimantan Barat 28.680 hektare, Riau 15.478 hektare, Nusa Tenggara Timur 10.538 hektare.',
      sources: [{ label: 'RCTI+ (Sindonews)', url: 'https://www.rctiplus.com/news/detail/berita-utama/5431984/kemenhut--107-465-hektare-hutan-dan-lahan-ludes-terbakar-sepanjang-2026' }]
    },
    {
      kicker: '',
      statement: 'Titik panas berkeyakinan tinggi di SiPongi naik dari 527 pada 4 Oktober menjadi 1.359 pada 5 Oktober.',
      attribution: 'Menurut Kemenhut, 6 Oktober 2026.',
      detail: 'Kemenhut menyebut titik panas tidak sama dengan kejadian kebakaran atau luas terbakar. Terbanyak: Kalimantan Tengah 569, Sumatera Selatan 142, Kalimantan Barat 69.',
      sources: [{ label: 'RCTI+ (Sindonews)', url: 'https://www.rctiplus.com/news/detail/sindonews/5488019/titik-panas-kembali-meningkat--kemenhut-perkuat-operasi-pengendalian-karhutla' }]
    },
    {
      kicker: '',
      statement: 'Kemenkes mencatat 13.449 kasus ISPA kumulatif di 63 kabupaten/kota di tujuh provinsi per 27 Agustus.',
      attribution: 'Menurut Kemenkes, 29 Agustus 2026.',
      detail: 'Angka kumulatif yang dilaporkan sampai 27 Agustus.',
      sources: [{ label: 'RCTI+ (Sindonews)', url: 'https://www.rctiplus.com/news/detail/sindonews/5461738/karhutla-picu-13-449-kasus-ispa--kemenkes-kerahkan-ratusan-tenaga-kesehatan' }]
    },
    {
      kicker: 'Menurut pemerintah',
      statement: 'Pemerintah menyebut 42 kasus diproses Gakkum, sembilan tersangka ditetapkan polisi, dan enam perusahaan pemegang izin di Kalimantan dikenai sanksi.',
      attribution: 'Menurut Menteri Kehutanan Raja Juli Antoni, 25 Agustus 2026, dan Kemenhut, 7 September 2026.',
      detail: 'Menhut: penindakan dilakukan "tanpa pandang bulu". Nama perusahaan yang disanksi belum dibuka.',
      sources: [{ label: 'Mongabay Indonesia, 25 Agustus', url: MONGABAY_AUG }, { label: 'Mongabay Indonesia, 7 September', url: MONGABAY_SEP }]
    },
    {
      kicker: 'Menurut organisasi lingkungan',
      statement: 'Walhi menyebut kebakaran sebagian besar terjadi di area berizin, dan Greenpeace menyebut penagihan ganti rugi dari perusahaan belum tuntas.',
      attribution: 'Menurut Walhi (7 September 2026) dan Greenpeace Indonesia (25 Agustus 2026), dimuat Mongabay Indonesia.',
      detail: 'Walhi Nasional: kebakaran "sebagian besar terjadi di area berizin". Greenpeace: pemerintah menggugat 11 perusahaan senilai Rp2,7 triliun, tetapi pembayaran dan pemulihan belum tuntas. Jawaban pemerintah ada di kartu sebelumnya.',
      sources: [{ label: 'Mongabay Indonesia, 25 Agustus', url: MONGABAY_AUG }, { label: 'Mongabay Indonesia, 7 September', url: MONGABAY_SEP }]
    },
    {
      kicker: '',
      statement: 'Singapura memperingatkan kabut asap sesekali dapat mencapai wilayahnya, dan seorang wakil menteri Malaysia menyebut ini bukan soal saling menyalahkan.',
      attribution: 'Menurut CNA Indonesia, 8 September 2026.',
      detail: '',
      sources: [{ label: 'CNA Indonesia', url: 'https://www.cna.id/indonesia/kabut-asap-asean-malaysia-indonesia-50476' }]
    }
  ],
  background: [
    {
      statement: 'Sebagian besar kejadian kebakaran lahan disebabkan perbuatan manusia.',
      attribution: 'Menurut BNPB, 12 September 2023: sekitar 90 persen.',
      source: { label: 'Medcom', url: 'https://www.medcom.id/nasional/peristiwa/0kpMpBLK-bnpb-menilai-denda-pelaku-karhutla-bromo-masih-kurang' }
    },
    {
      statement: 'Gambut yang dikeringkan lewat kanal lebih mudah terbakar, dan apinya bisa membara di bawah tanah.',
      attribution: 'Menurut NASA Earth Observatory, 2015.',
      source: { label: 'NASA Earth Observatory', url: 'https://science.nasa.gov/earth/earth-observatory/seeing-through-the-smoky-pall-observations-from-a-grim-indonesian-fire-season' }
    },
    {
      statement: 'Sebuah penelitian memperkirakan asap 2015 menyebabkan sekitar 100.300 kematian dini.',
      attribution: 'Estimasi model Koplitz dkk., Harvard dan Columbia, 2016; bukan jumlah yang dihitung satu per satu.',
      source: { label: 'Koplitz dkk. (Harvard)', url: 'https://dash.harvard.edu/handle/1/37365505' }
    }
  ],
  monitor: [
    { name: 'NASA FIRMS', text: 'Titik api dari satelit, hampir waktu nyata', url: 'https://firms.modaps.eosdis.nasa.gov' },
    { name: 'BMKG prakiraan musim', text: 'Prediksi musim dari lembaga resmi', url: 'https://www.bmkg.go.id/iklim/prediksi-musim' },
    { name: 'Global Forest Watch', text: 'Peta hutan dan peringatan kehilangan tutupan', url: 'https://globalnaturewatch.org/map/' },
    { name: 'Auriga Nusantara', text: 'Organisasi yang menganalisis data kehutanan', url: 'https://auriga.or.id' },
    { name: 'Mongabay Indonesia', text: 'Berita lingkungan nirlaba', url: 'https://www.mongabay.co.id' }
  ]
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const link = (url, label) => `<a class="why-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/** One fact card as HTML (DOM-free so it can be tested). */
export function cardHtml(card) {
  const kicker = card.kicker ? `<p class="why-attr why-kicker">${esc(card.kicker)}</p>` : '';
  const detail = card.detail ? `<p>${esc(card.detail)}</p>` : '';
  const links = card.sources.map(s => link(s.url, `${WHY.sourceLabel}: ${s.label}`)).join('');
  return `<article class="why-card">${kicker}<p class="why-statement">${esc(card.statement)}</p><p class="why-attr">${esc(card.attribution)}</p><details class="why-more"><summary>${esc(WHY.more)}</summary>${detail}${links}</details></article>`;
}

/** One compact background item: statement, attribution, link (no nested details). */
export function backgroundHtml(item) {
  return `<article class="why-card"><p class="why-statement">${esc(item.statement)}</p><p class="why-attr">${esc(item.attribution)}</p>${link(item.source.url, `${WHY.sourceLabel}: ${item.source.label}`)}</article>`;
}

export function whyHtml() {
  const monitor = WHY.monitor.map(m => `<li>${link(m.url, m.name)}<span class="why-attr">${esc(m.text)}</span></li>`).join('');
  return `<p class="why-intro">${esc(WHY.intro)}</p><h3 class="why-h">${esc(WHY.yearTitle)}</h3>${WHY.cards.map(cardHtml).join('')}<p class="why-intro">${esc(WHY.gapNote)}</p><details class="why-more why-bg"><summary>${esc(WHY.backgroundTitle)}</summary>${WHY.background.map(backgroundHtml).join('')}</details><h3 class="why-h">${esc(WHY.monitorTitle)}</h3><ul class="why-monitor">${monitor}</ul><p class="why-intro">${esc(WHY.closing)}</p>`;
}

export function renderWhy() {
  return { title: WHY.title, html: whyHtml() };
}
