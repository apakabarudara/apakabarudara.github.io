// "Di balik asap": sourced facts about the causes and policy behind the haze. Loaded on first open of its sheet, so none of this is in the main bundle.
// The app only quotes: every statement is attributed and linked, estimates are labelled as estimates, nobody is named or blamed.
// DRAFT wording awaiting the owner's review.

const KOPLITZ = 'https://dash.harvard.edu/handle/1/37365505';

export const WHY = {
  title: 'Di balik asap',
  intro: 'Asap ini bukan hanya soal cuaca. Ini yang dicatat sumber resmi dan penelitian. Kami hanya mengutip.',
  more: 'Selengkapnya',
  sourceLabel: 'Sumber',
  monitorTitle: 'Pantau sendiri',
  closing: 'Tidak ada satu penyebab tunggal, dan setiap angka adalah perkiraan sumbernya masing-masing.',
  cards: [
    {
      // Verified on the page: Abdul Muhari (Kapusdatinkom BNPB), Antara/Medcom, 12 Sep 2023: "90 persen kejadian karhutla disebabkan oleh perbuatan manusia, baik langsung maupun tidak langsung".
      statement: 'Sebagian besar kejadian kebakaran lahan disebabkan perbuatan manusia.',
      attribution: 'Menurut BNPB, 2023: sekitar 90 persen, langsung maupun tidak langsung.',
      detail: '',
      sources: [{ label: 'Medcom', url: 'https://www.medcom.id/nasional/peristiwa/0kpMpBLK-bnpb-menilai-denda-pelaku-karhutla-bromo-masih-kurang' }]
    },
    {
      statement: 'Gambut yang dikeringkan lewat kanal lebih mudah terbakar, dan apinya bisa membara di bawah tanah.',
      attribution: 'Menurut NASA Earth Observatory, 2015.',
      detail: 'Kanal drainase menurunkan muka air tanah sehingga hutan rawa gambut rentan terbakar; api gambut bisa membara di bawah tanah dan sulit dipadamkan.',
      sources: [{ label: 'NASA Earth Observatory', url: 'https://science.nasa.gov/earth/earth-observatory/seeing-through-the-smoky-pall-observations-from-a-grim-indonesian-fire-season' }]
    },
    {
      statement: 'Krisis asap 2015 diperkirakan merugikan sekitar USD 16,1 miliar, setara 1,9 persen produk domestik bruto.',
      attribution: 'Perkiraan Bank Dunia, dikutip BenarNews, 2015.',
      detail: 'Angka ini perkiraan dan belum menghitung kerugian di negara tetangga.',
      sources: [{ label: 'BenarNews', url: 'https://www.benarnews.org/english/news/indonesian/indonesia-fires-12152015170230.html' }]
    },
    {
      statement: 'Sebuah penelitian memperkirakan asap 2015 menyebabkan sekitar 100.300 kematian dini.',
      attribution: 'Estimasi model Koplitz dkk., Universitas Harvard dan Columbia, 2016.',
      detail: 'Estimasi untuk Indonesia, Malaysia, dan Singapura; bukan jumlah yang dihitung satu per satu.',
      sources: [{ label: 'Koplitz dkk. (Harvard)', url: KOPLITZ }]
    },
    {
      statement: 'Setelah krisis 2015, pemerintah membentuk Badan Restorasi Gambut dan melanjutkan penundaan izin baru hutan alam primer dan lahan gambut.',
      attribution: 'Menurut Perpres 1/2016 dan Inpres 8/2015.',
      detail: 'Badan Restorasi Gambut ditugaskan merestorasi 2 juta hektare di tujuh provinsi prioritas selama lima tahun (Mongabay Indonesia, 2020).',
      sources: [
        { label: 'Sekretariat Kabinet', url: 'https://setkab.go.id/?p=28035' },
        { label: 'Mongabay Indonesia', url: 'https://www.mongabay.co.id/2020/09/16/menanti-perpanjangan-dan-penguatan-badan-restorasi-gambut/' }
      ]
    },
    {
      statement: 'Asap kebakaran lahan 2015 terbawa sampai Malaysia dan Singapura.',
      attribution: 'Menurut Koplitz dkk., 2016.',
      detail: '',
      sources: [{ label: 'Koplitz dkk. (Harvard)', url: KOPLITZ }]
    }
  ],
  monitor: [
    { name: 'NASA FIRMS', text: 'Titik api dari satelit, hampir waktu nyata', url: 'https://firms.modaps.eosdis.nasa.gov' },
    { name: 'Global Forest Watch', text: 'Peta hutan dan peringatan kehilangan tutupan', url: 'https://globalnaturewatch.org/map/' },
    { name: 'Auriga Nusantara', text: 'Organisasi yang menganalisis data kehutanan', url: 'https://auriga.or.id' },
    { name: 'Mongabay Indonesia', text: 'Berita lingkungan nirlaba', url: 'https://www.mongabay.co.id' }
  ]
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const link = (url, label) => `<a class="why-link" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;

/** One fact card as HTML (DOM-free so it can be tested). */
export function cardHtml(card) {
  const detail = card.detail ? `<p>${esc(card.detail)}</p>` : '';
  const links = card.sources.map(s => link(s.url, `${WHY.sourceLabel}: ${s.label}`)).join('');
  return `<article class="why-card"><p class="why-statement">${esc(card.statement)}</p><p class="why-attr">${esc(card.attribution)}</p><details class="why-more"><summary>${esc(WHY.more)}</summary>${detail}${links}</details></article>`;
}

export function whyHtml() {
  const monitor = WHY.monitor.map(m => `<li>${link(m.url, m.name)}<span class="why-attr">${esc(m.text)}</span></li>`).join('');
  return `<p class="why-intro">${esc(WHY.intro)}</p>${WHY.cards.map(cardHtml).join('')}<h3 class="why-h">${esc(WHY.monitorTitle)}</h3><ul class="why-monitor">${monitor}</ul><p class="why-intro">${esc(WHY.closing)}</p>`;
}

export function renderWhy() {
  return { title: WHY.title, html: whyHtml() };
}
