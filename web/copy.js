// Every user-facing line, in one place for review.
// Principle: the app suggests, official sources prescribe, the user decides. Suggest ("sebaiknya", "ada baiknya"); never order.
// Voice: everyday Indonesian. "kamu" only in the light parts (welcome, levels 1–2); levels 3–5, safety lines and errors
// use plain imperatives and "tidak". No slang older readers do not know. Never joke about the reader's body or breathing,
// and no jokes at levels 4–5, "Lainnya" facts included. Numbers are estimates: say so once, in the label or headline.
// DRAFT: level 3–5 safety copy, the activity statuses and the symptom lines follow the plan's safety table, ISPU
// (Permen LHK P.14/2020, Lampiran II) and Kemenkes haze guidance. They still need sign-off from the health reviewer.

/**
 * The official ISPU guidance, quoted word for word from the ISPU app of the Kementerian Lingkungan Hidup (ispu.kemenlh.go.id:
 * category descriptions and the per-category "Apa yang harus dilakukan" texts). Never reword; the test freezes it.
 * Level 1 has one undivided line, so it has no `sensitive`.
 */
export const OFFICIAL_ISPU = {
  1: {
    description: 'Tingkat kualitas udara yang sangat baik, tidak memberikan efek negatif terhadap manusia, hewan, tumbuhan.',
    sensitive: null,
    everyone: 'Sangat baik untuk melakukan kegiatan di luar ruangan.'
  },
  2: {
    description: 'Tingkat kualitas udara masih dapat diterima pada kesehatan manusia, hewan dan tumbuhan.',
    sensitive: 'Kurangi aktivitas fisik yang terlalu lama atau berat.',
    everyone: 'Masih dapat beraktivitas di luar ruangan.'
  },
  3: {
    description: 'Tingkat kualitas udara yang bersifat merugikan pada manusia, hewan dan tumbuhan.',
    sensitive: 'Boleh beraktivitas di luar dengan rehat lebih sering dan aktivitas ringan. Amati gejala seperti batuk atau sesak napas. Penderita asma harus mengikuti petunjuk kesehatan dan membawa obat. Penderita penyakit jantung perlu mewaspadai gejala seperti palpitasi, sesak napas, atau kelelahan tidak biasa.',
    everyone: 'Kurangi aktivitas fisik yang terlalu lama di luar ruangan.'
  },
  4: {
    description: 'Tingkat kualitas udara yang dapat meningkatkan resiko kesehatan pada sejumlah segmen populasi yang terpapar.',
    sensitive: 'Hindari semua aktivitas di luar ruangan, perbanyak aktivitas di dalam ruangan atau jadwalkan ulang.',
    everyone: 'Hindari aktivitas fisik terlalu lama di luar ruangan dan pertimbangkan beraktivitas di dalam ruangan.'
  },
  5: {
    description: 'Tingkat kualitas udara yang dapat merugikan kesehatan serius pada populasi dan perlu penanganan cepat.',
    sensitive: 'Tetap di dalam ruangan dan hanya melakukan sedikit aktivitas.',
    everyone: 'Hindari seluruh aktivitas di luar ruangan.'
  }
};

/** Per ISPU level. quips (one shown per day, see dailyQuip) only where the tone allows a light line: levels 1–2. Non-health lines only. */
export const LEVELS = {
  1: {
    name: 'Baik',
    quips: ['Kabar baik: udara lagi ramah.', 'Udaranya baik hari ini. Syukurlah.', 'Hari baik. Nikmati ya.'],
    activities: { laundry: 'ok', windows: 'ok' },
    health: false,
    emergency: false
  },
  2: {
    name: 'Sedang',
    quips: ['Udaranya biasa-biasa saja hari ini.', 'Kita pantau terus ya.'],
    activities: { laundry: 'ok', windows: 'ok' },
    health: false,
    emergency: false
  },
  3: {
    name: 'Tidak Sehat',
    activities: { laundry: 'no', windows: 'caution' },
    health: true,
    emergency: false
  },
  4: {
    name: 'Sangat Tidak Sehat',
    activities: { laundry: 'no', windows: 'no' },
    health: true,
    emergency: true
  },
  5: {
    name: 'Berbahaya',
    activities: { laundry: 'no', windows: 'no' },
    health: true,
    emergency: true
  }
};

/** Household-fact tiles only ("Urusan rumah hari ini"); no health activities. Statuses come from LEVELS[n].activities. */
export const ACTIVITIES = [
  { id: 'laundry', icon: 'shirt', label: 'Jemur baju', notes: { ok: 'Oke', caution: 'Bisa hujan', no: 'Bisa bau asap' } },
  { id: 'windows', icon: 'window', label: 'Jendela', notes: { ok: 'Oke', caution: 'Saat asap tipis', no: 'Tutup' } }
];

const LAUNDRY = ACTIVITIES[0];
const WINDOWS = ACTIVITIES[1];

/**
 * The adaptive cards under "Kapan udara paling lega?" (which ones: todayCards in logic.js). Friend voice: playful only at levels 1–2.
 * The health-adjacent card (levels 1–2) carries no wording of ours: they show the verbatim OFFICIAL_ISPU sentence under a short lead-in and the ISPU tag.
 */
export const TODAY_CARDS = {
  terrace: { icon: 'sun', label: 'Ngopi di teras', text: 'Teras lagi baik hati. Kopi dulu?' },
  laundry: {
    icon: 'shirt',
    label: LAUNDRY.label,
    text: { rain: 'Hujan hari ini, jemur di dalam saja', smoke: LAUNDRY.notes.no, clear: 'Jemuran senang hari ini' }
  },
  windows: { icon: 'window', label: WINDOWS.label, text: WINDOWS.notes },
  exercise: { icon: 'pin', label: 'Olahraga di luar' }
};

/** One line under the cards, one per day (see dailyQuip). Levels 1–2 have none (the card quip already says it). gentle: level 3, quiet: levels 4–5 (no "kamu", no jokes). */
export const ENCOURAGE = {
  gentle: ['Tetap semangat, kita pantau bareng.', 'Pelan-pelan saja hari ini, kita lihat sama-sama.', 'Kita terus pantau, sama-sama.'],
  quiet: ['Hari yang berat. Pelan-pelan saja, kita lewati bareng.', 'Kita lewati hari ini bareng, satu jam demi satu jam.', 'Turut prihatin. Kita di sini, bareng-bareng.']
};

export const RAIN = { none: 'Tidak hujan', some: 'Ada hujan', heavy: 'Hujan lebat' };

export const EMERGENCY_NUMBER = '119';

/** The public address, written once. The Open Graph tags in index.html and the README repeat it as static text. */
export const SITE_HOST = 'apakabarudara.github.io';

/** Shared texts carry the level and this pointer, never our own advice. */
const GUIDE_IN_LINK = 'Bukan angka resmi. Panduan ISPU ada di link.';

// DRAFT wording awaiting review
export const GLOSSARY = [
  { term: 'PM2.5', text: 'Partikel debu yang sangat halus, jauh lebih kecil dari sehelai rambut, dan bisa ikut terhirup. Angka di sini adalah perkiraan model, bukan hasil alat ukur.' },
  { term: 'ISPU', text: 'Indeks Standar Pencemar Udara: acuan resmi pemerintah untuk menamai kualitas udara. Kita memakai batas levelnya (Permen LHK P.14/2020), dan panduan di sini dikutip dari ISPU apa adanya.' },
  { term: 'Titik panas', text: 'Titik yang terdeteksi satelit lebih panas dari sekitarnya. Bisa api, bisa juga bukan.' }
];

export const UI = {
  loadingHeadline: 'Mengecek udara…',
  brand: 'Apa Kabar Udara',
  tagline: 'Perkiraan asap & kualitas udara hari ini',
  eyebrow: 'Perkiraan 24 jam terakhir',
  beta: 'BETA',
  solidarity: 'Turut prihatin untuk warga yang terdampak asap.',
  solidarityClose: 'Tutup untuk hari ini',
  headNote: 'Perkiraan, bisa meleset ·',
  welcome: hello => `${hello} Kamu di kota mana?`,
  overviewTitle: 'Perkiraan asap hari ini',
  overviewSub: count => `${count} kota di Sumatera, Kalimantan, dan Kuala Lumpur, diurutkan dari perkiraan asap paling tebal. Pilih kota.`,
  pickCity: 'Pilih kota',
  cancel: 'Batal',
  close: 'Tutup',
  allCitiesOption: 'Lihat semua kota…',
  useLocation: 'Pakai lokasiku',
  nearestButton: 'Terdekat',
  nearestLabel: 'Kota terdekat',
  locating: 'Mencari lokasi…',
  locateFailed: 'Lokasi tidak terbaca. Pilih kota dari daftar.',
  nearest: (city, km) => `Kota terdekat: ${city}, sekitar ${km} km. Lokasi tidak disimpan atau dikirim.`,

  levelLabel: (name, level) => `${name} · level ${level} dari 5`,
  scaleLabel: level => `level ${level} dari 5`,
  betterSince: previous => `Perkiraannya membaik sejak terakhir kamu cek (sebelumnya ${previous}).`,
  worseSince: previous => `Perkiraannya memburuk sejak terakhir kamu cek (sebelumnya ${previous}).`,
  improveOn: weekday => `Diperkirakan mulai membaik ${weekday}.`,
  improveNone: days => `Perkiraan ${days} hari ke depan belum menunjukkan perbaikan.`,
  rainFirst: (when, mm) => `Hujan pertama yang diperkirakan: ${when}, sekitar ${mm} mm. Ini perkiraan hujan, bukan jaminan asap berkurang.`,
  rainNone: () => 'Belum ada hujan berarti dalam perkiraan beberapa hari ke depan.', // no day count: the improvement line above counts from tomorrow, this one from today
  rainToday: 'hari ini',
  rainTomorrow: 'besok',
  rainLink: 'Prakiraan musim hujan resmi (BMKG)',
  guideTitle: 'Menurut ISPU, kalau levelnya memang begini:',
  guideTitleMeaning: 'Kata ISPU:',
  guideSensitive: 'Kelompok sensitif:',
  guideEveryone: 'Setiap orang:',
  guideSource: 'Sumber: ISPU, Kementerian Lingkungan Hidup (dikutip 14 Okt 2026)',
  guideWho: 'Panduan umum saat asap tebal: WHO/Europe ↗',
  guideMore: 'Sumber & dasar aturan',
  glossaryTitle: 'Istilah',
  sourcesTitle: 'Sumber panduan',
  guideCaution: 'Perkiraan bisa meleset. Kalau ragu, anggap satu tingkat lebih buruk.',
  guideOtherIndex: 'Level di sini memakai batas ISPU Indonesia. Malaysia punya indeks sendiri (API), jadi angkanya bisa berbeda dari yang diumumkan di sana.',
  guideRegulation: 'Dasar aturan: Permen LHK No. 14 Tahun 2020 tentang ISPU',
  symptoms: `Batuk terus atau sesak? Periksa ke fasilitas kesehatan. Sesak berat atau nyeri dada: hubungi ${EMERGENCY_NUMBER}.`,
  medicalNote: 'Panduan di sini dikutip dari ISPU (Kementerian Lingkungan Hidup). Untuk kondisi kesehatan, tanyakan ke tenaga kesehatan.',
  healthButton: 'Cari fasilitas kesehatan',
  healthQuery: 'fasilitas kesehatan terdekat',
  call: number => `Telepon ${number}`,
  stamp: time => `Diperbarui ${time} · bisa meleset ·`,
  explainTitle: 'Apa ini?',
  explain: pm => [
    'Level ini perkiraan komputer dari data satelit dan cuaca, bukan hasil alat ukur di kota ini.',
    'Di dekat kebakaran gambut, asap bisa lebih tebal dari perkiraan. Kalau asap di sekitar terlihat tebal, ikuti yang terlihat.',
    `PM2.5 adalah partikel asap yang sangat halus dan bisa masuk sampai ke paru-paru. Rata-rata 24 jam terakhir: ${pm} µg/m³ (mikrogram per meter kubik udara).`,
    'Perkiraan ini untuk titik pusat kota. Di kecamatan lain di sekitarnya, asap bisa lebih tebal atau lebih tipis.',
    'Level 1 sampai 5 memakai batas resmi pemerintah (ISPU).'
  ],
  explainMethod: 'Lihat metode & sumber',
  official: 'Cek angka resmi pemerintah (ISPU)',

  methodLink: 'Metode & sumber',
  calendarLink: 'Kalender cetak',
  hazeLabel: 'Suasana latar',
  hazeOn: 'nyala',
  hazeOff: 'mati',
  hazeAbout: 'Warna latar mengikuti level perkiraan. Bisa dimatikan di bagian bawah halaman.',
  calendarFail: 'Kalender belum bisa dibuka. Coba lagi sebentar lagi.',
  methodTitle: 'Metode & sumber',
  methodSourcesTitle: 'Dari mana datanya',
  methodSources: [
    'Asap (PM2.5) per jam: model CAMS global dari Copernicus, lewat Open-Meteo. Kotak petanya sekitar 45 km.',
    'Titik panas: satelit NASA FIRMS (VIIRS, NOAA-20) dalam 100 km, 24 jam terakhir. Hanya yang tingkat yakinnya sedang atau tinggi.',
    'Foto satelit: NASA GIBS / Worldview (VIIRS NOAA-20). Membuka peta memuat gambar dari gibs.earthdata.nasa.gov; tidak ada data lain dikirim.',
    'Angin dan hujan: prakiraan cuaca Open-Meteo. Datanya diperbarui setiap jam.'
  ],
  methodLevelTitle: 'Cara menghitung level',
  methodLevel: [
    'Level dari rata-rata PM2.5 selama 24 jam terakhir, dengan batas ISPU untuk PM2.5 (Permen LHK P.14/2020).',
    'Batang per jam memakai batas yang sama, sebagai gambaran kasar.'
  ],
  methodLimitsTitle: 'Batasannya',
  methodLimits: [
    'Ini perkiraan kasar dari model komputer, bukan hasil alat ukur di kota ini, jadi bisa meleset.',
    'Petanya kasar, jadi asap di dekat kebakaran gambut bisa lebih tebal dari yang tampil.',
    'Kalau langit di luar bilang lain, percayai langit.',
    'Angka resmi ada di ISPU.'
  ],
  methodHealthTitle: 'Panduan kesehatan',
  methodHealth: 'Panduan di sini dikutip dari ISPU (Kementerian Lingkungan Hidup). Untuk kondisi kesehatan, tanyakan ke tenaga kesehatan.',
  methodMakerTitle: 'Siapa yang membuat',
  methodMaker: 'Proyek kecil yang dibuat sukarela, dengan sepenuh hati. Masih terus belajar.',
  methodFeedback: 'Kalau ada yang menurutmu salah, kabari lewat “Kirim masukan”.',

  remind: 'Ingatkan tiap pagi',
  remindTitle: 'Cek Apa Kabar Udara',
  remindBody: url => `Perkiraan asap dan kualitas udara di kotamu hari ini: ${url}`,
  remindDone: 'Pengingat 07.00 selama 30 hari dibuat. Buka berkasnya untuk menambahkannya ke Kalender.',
  todayTitle: 'Kapan udara paling lega?',
  todaySub: '24 jam ke depan',
  // The headline answers the title. From level 3 the window can still be smoky: say its own estimated band so it never reads as a nudge outdoors.
  bestWindow: (when, from, to, level, windowBand) => {
    const line = `${when}, ${from}–${to}`;
    return level >= 3 && windowBand >= 3 ? `${line} · masih ${LEVELS[windowBand].name}` : line;
  },
  dayParts: { pagi: 'Pagi', siang: 'Siang', sore: 'Sore', malam: 'Malam' },
  partName: (name, tomorrow) => (tomorrow ? `Besok ${name.toLowerCase()}` : name),
  whenWord: (name, tomorrow) => (tomorrow ? `Besok ${name.toLowerCase()}` : `${name} ini`),
  partRange: (from, to) => `${from}–${to}`,
  tagNow: 'Sekarang',
  tagWorst: 'Paling tebal',
  flatDay: levelName => `Rata sepanjang 24 jam: ${levelName}. Tidak ada jam yang jauh lebih baik.`,
  cardWindow: (from, to) => `paling pas ${from}–${to}`,
  ispuBadge: 'Panduan resmi',
  ispuLead: 'Menurut ISPU:',
  ispuTag: 'ISPU, KLHK',
  hoursSummary: 'Lihat per jam',
  hourNote: (time, name, tomorrow) => `${tomorrow ? 'besok ' : ''}${time} · ${name}`,
  legendBest: 'paling lega',
  // First line of every shared text says "perkiraan": forwarded without context, a claim reads as a hoax unless it says it is an estimate.
  shareFallback: title => `${title}\nBukan angka resmi.`,
  stripLabel: (range, window) => `Asap per jam, 24 jam ke depan, ${range}.${window}`,
  stripRange: (low, high) => (low === high ? `semuanya ${low}` : `dari ${low} sampai ${high}`),
  stripBest: (from, to) => ` Paling tipis ${from}–${to}.`,
  stripScale: 'Tinggi batang dibandingkan jam terparah dalam 24 jam.',
  stripNow: 'Sekarang',

  outlookTitle: 'Besok gimana?',
  outlookSub: 'Perkiraan beberapa hari ke depan. Pilih hari untuk lihat detail.',
  rainDay: 'ada hujan',

  installButton: 'Pasang di layar utama',
  installHide: 'Sembunyikan',
  iosTitle: 'Pasang di layar utama',
  iosIntro: 'Di Safari, ada dua langkah:',
  iosSteps: ['Ketuk tombol Bagikan di bilah Safari.', 'Pilih “Tambah ke Layar Utama”, lalu ketuk Tambah.'],

  watchAdd: 'Pantau kota lain',
  watchManage: 'Atur kota pantauan',
  watchHelp: 'Ketuk untuk menambah atau melepas',
  watchAddSolo: 'Pantau kota keluarga',
  watchRowLabel: 'Kota pantauan',
  watchSub: 'Pilih sampai 3 kota, misalnya tempat keluarga tinggal. Tersimpan di HP ini saja.',
  watchCount: n => `${n} dari 3 kota dipantau`,
  watchFull: 'Sudah 3 kota. Lepas satu dulu untuk menambah.',
  watchChip: (city, level, name) => `${city}, ${name}, level ${level} dari 5`,

  share: 'Bagikan',
  shareSheetTitle: 'Bagikan kabar udara',
  shareSheetChoices: 'Pilih kartu yang dikirim',
  shareSheetPreviewAlt: (city, levelName) => `Kartu kabar udara ${city}: ${levelName}`,
  shareSheetWa: 'Kirim ke WhatsApp',
  shareSheetSystem: 'Bagikan lewat…',
  shareSheetSave: 'Simpan gambar',
  shareSheetCopy: 'Salin link',
  kidsTitle: 'Anak di rumah? Ada kegiatan dari Si Kapas',
  kidsText: 'Halaman mewarnai, teka-teki, dan tantangan 10 menit. Bisa dicetak.',
  kidsButton: 'Buka paket kegiatan',
  kidsFail: 'Paket kegiatan belum bisa dibuka. Coba lagi sebentar lagi.',
  storyChoiceToday: 'Kota ini hari ini',
  storyChoice3d: 'Kota ini 3 hari ke depan',
  storyChoiceRank: count => `Peringkat ${count} kota`,
  storySaved: 'Gambar diunduh. Unggah ke Story dari galeri. Kalau tidak muncul, buka halaman ini di Safari atau Chrome.',
  storyLinkCopied: 'Link kota ini sudah disalin. Di Instagram, tambahkan stiker Link lalu tempel.',
  storyTapAgain: 'Gambarnya sudah siap. Ketuk sekali lagi untuk membagikan.',
  storyFailed: 'Gambar belum bisa dibuat. Coba lagi.',
  shared: 'Link disalin. Tinggal tempel di grup.',
  shareText: (city, day, level, quip) => `Udara ${city} ${day} (perkiraan): ${LEVELS[level].name}, level ${level} dari 5.${quip ? `\n${quip}` : ''}\n${GUIDE_IN_LINK}\nApa Kabar Udara`,
  shareOverview: 'Perkiraan asap hari ini di Sumatera, Kalimantan, dan Kuala Lumpur. Cek kota sebelum keluar.\nBukan angka resmi.\nApa Kabar Udara',

  preview: 'Pratinjau: level contoh untuk melihat tampilan, bukan data nyata.',
  stale: when => `Data lama: terakhir diperbarui ${when}. Cek juga angka resmi (ISPU).`,
  errorHeadline: 'Datanya belum bisa diambil.',
  errorText: 'Coba buka lagi beberapa menit lagi. Sementara itu, cek angka resmi pemerintah (ISPU).',
  expiredHeadline: 'Datanya sudah terlalu lama.',
  expiredText: 'Data terakhir lebih dari 12 jam lalu, jadi kondisi udara sekarang tidak bisa dinilai. Cek angka resmi pemerintah (ISPU).',

  moreTitle: 'Fakta asap',
  satTitle: 'Foto satelit',
  // Answer-card glance: model-based trend line and the "Sekilas" chips. Wind and rain are data; no sky or weather talk.
  glanceTrend: { better: '6 jam ke depan: cenderung membaik', worse: '6 jam ke depan: cenderung memburuk', steady: '6 jam ke depan: tidak banyak berubah' },
  glanceTrendLabel: text => `Perkiraan: ${text}`,
  glanceLabel: 'Sekilas',
  glanceHotspot: (km, dir) => `Titik panas terdekat ${km < 1 ? 'kurang dari 1 km' : `${Math.round(km)} km ke ${String(dir).toLowerCase()}`}`,
  glanceHotspotNone: 'Tidak ada titik panas dalam 100 km',
  glanceBest: (when, from) => `Paling lega: ${String(when).toLowerCase()}, ${from}`,
  glanceRain: mm => `Hujan hari ini sekitar ${mm} mm`,
  satThumbLabel: 'Lihat asap dari satelit',
  satAlt: kota => `Foto satelit NASA untuk ${kota}`,
  satCaption: tanggal => `Foto satelit NASA, ${tanggal}. Titik merah: titik panas. Kalau berawan, asap bisa tertutup awan.`,
  satPin: 'Pin: pusat kota.',
  satWind: arah => `Angin dari ${arah}.`,
  satLink: 'Buka di NASA Worldview ↗',
  satHint: 'Geser & cubit untuk perbesar. Ketuk peta untuk cek sekitarmu.',
  satMapCaption: 'Peta satelit NASA. Geser, perbesar, atau perkecil. Titik merah: titik panas. Pin: pusat kota.',
  satMapLabel: kota => `Peta satelit NASA yang bisa digeser dan diperbesar, berpusat di ${kota}`,
  satMapCredit: 'NASA GIBS / Worldview (VIIRS NOAA-20)',
  satMapFail: 'Petanya belum bisa dimuat. Ini fotonya saja.',
  satNote: 'Foto diambil saat satelit lewat, bukan saat ini.',
  factsTitle: 'Fakta singkat',
  factsNext: 'Fakta lain',
  feedbackButton: 'Kirim masukan',
  feedbackNote: 'Terbuka di Tally. Bisa lapor masalah, kasih saran, atau minta kota baru.',

  footerDisclaimer: `Level dan angka di sini perkiraan, bukan hasil alat ukur. Untuk keputusan kesehatan, ikuti panduan resmi. Darurat kesehatan: ${EMERGENCY_NUMBER}.`,
  creditsTitle: 'Sumber data',
  creditOpenMeteo: 'Weather data by Open-Meteo.com',
  creditOpenMeteoLicence: '(CC BY 4.0)',
  creditCams: year => `Contains modified Copernicus Atmosphere Monitoring Service information ${year}`,
  creditFirms: 'NASA FIRMS',
  creditGibs: 'NASA GIBS / Worldview (VIIRS)',
  creditIspu: 'batas level: ISPU (Permen LHK P.14/2020).',
  privacyTitle: 'Privasi',
  privacy: 'Tanpa akun dan tanpa cookie. Kunjungan dan ketukan tombol dihitung secara anonim dan agregat lewat GoatCounter, tanpa profil per orang, dan tidak dihitung kalau browsermu mengaktifkan Do Not Track. Kota pilihan dan kota pantauan disimpan di HP ini saja. Lokasi, kalau diizinkan, cuma dipakai di browser untuk mencari kota terdekat dan tidak disimpan. Masukan lewat Tally tersimpan di Tally. Kalau kamu membuka peta satelit, gambar petanya dimuat dari server NASA (gibs.earthdata.nasa.gov); selain itu tidak ada yang dikirim ke sana.',
  creditLine: ['Proyek sukarela oleh ', 'Khi Hady', ' · kodenya terbuka di ', 'GitHub']
};

/** Facts in the "Cek langit & fakta asap" fold. Plain statements; hidden at levels 4–5. */
export const FACTS = [
  'Asap tidak mengenal batas negara. Bisa menyeberang sampai Sarawak dan membuat udara di sana ikut tidak sehat.',
  'Lahan gambut bisa terbakar diam-diam di bawah tanah. Api yang kelihatan padam belum tentu benar-benar selesai.',
  'El Niño cenderung membuat musim kemarau lebih kering dan lebih panjang, sehingga api lebih mudah menyebar.'
];

/** Instagram Story card (1080×1920). Every line on it comes from here. */
export const STORY = {
  levelName: name => `Perkiraan: ${name}`,
  stamp: day => `Diperbarui ${day}`,
  guideSource: '— ISPU, KLHK',
  estimate: 'Perkiraan model, bisa meleset',
  rain: 'hujan',
  outlookHeading: days => `Perkiraan ${days} hari ke depan`,
  rankTitle: 'Perkiraan asap hari ini',
  salam: 'Turut prihatin untuk warga yang terdampak asap.',
  footer: 'Cek kotamu sebelum keluar',
  url: SITE_HOST
};
