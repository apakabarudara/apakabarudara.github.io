// Every user-facing line, in one place for review.
// Principle: the app suggests, official sources prescribe, the user decides. Suggest ("sebaiknya", "ada baiknya"); never order.
// Voice: everyday Indonesian. "kamu" only in the light parts (welcome, levels 1–2); levels 3–5, safety lines and errors
// use plain imperatives and "tidak". No slang older readers do not know. Never joke about the reader's body or breathing,
// and no jokes at levels 4–5, "Lainnya" facts included. Numbers are estimates: say so once, in the label or headline.
// DRAFT: level 3–5 safety copy, the activity statuses and the symptom lines follow the plan's safety table, ISPU
// (Permen LHK P.14/2020, Lampiran II) and Kemenkes haze guidance. They still need sign-off from the health reviewer.

/** Who counts as sensitive, after Kemenkes: children, older people, pregnant women, people with lung or heart disease. */
export const SENSITIVE = 'Anak, lansia, ibu hamil, sakit paru/jantung';

/** Per ISPU level. quips (one shown per day, see dailyQuip) only where the tone allows a light line: levels 1–2. */
export const LEVELS = {
  1: {
    name: 'Baik',
    headline: 'Udara diperkirakan bagus hari ini.',
    quips: [
      'Waktu yang enak untuk keluar.',
      'Langit lagi bersih. Cocok buat jalan pagi.',
      'Udaranya lagi bersahabat.',
      'Cocok buat buka jendela lebar-lebar.',
      'Hari yang pas buat main di luar.',
      'Ajak keluarga jalan sore, yuk.'
    ],
    everyone: [],
    sensitive: [],
    dayLine: 'Udara diperkirakan bagus.',
    activities: { laundry: 'ok', exercise: 'ok', windows: 'ok', kids: 'ok' },
    goodNews: 'Kabari grup: udara lagi bagus',
    health: false,
    emergency: false
  },
  2: {
    name: 'Sedang',
    headline: 'Masih oke untuk kebanyakan orang.',
    quips: ['Belum sempurna, tapi masih nyaman untuk keluar.', 'Masih enak buat jalan santai.', 'Cukup baik untuk kegiatan biasa.'],
    everyone: [],
    sensitive: ['Kurangi olahraga berat yang lama di luar'],
    dayLine: 'Masih oke untuk kebanyakan orang.',
    activities: { laundry: 'ok', exercise: 'caution', windows: 'ok', kids: 'ok' },
    goodNews: 'Kabari grup: udara masih oke',
    health: false,
    emergency: false
  },
  3: {
    name: 'Tidak Sehat',
    headline: 'Kurangi aktivitas di luar.',
    everyone: ['Kurangi olahraga di luar', 'Kalau bisa, kurangi kerja berat di luar. Kalau harus, istirahat lebih sering.'],
    sensitive: ['Lebih banyak di dalam ruangan'],
    dayLine: 'Kurangi aktivitas berat di luar.',
    activities: { laundry: 'no', exercise: 'no', windows: 'caution', kids: 'caution' },
    goodNews: null,
    health: true,
    emergency: false
  },
  4: {
    name: 'Sangat Tidak Sehat',
    headline: 'Sebisa mungkin di dalam ruangan.',
    everyone: ['Tutup jendela dan pintu', 'Kalau harus keluar, sebaiknya pakai masker N95'],
    sensitive: ['Tetap di dalam ruangan'],
    dayLine: 'Rencanakan kegiatan di dalam ruangan.',
    activities: { laundry: 'no', exercise: 'no', windows: 'no', kids: 'no' },
    goodNews: null,
    health: true,
    emergency: true
  },
  5: {
    name: 'Berbahaya',
    headline: 'Sebaiknya tetap di dalam ruangan.',
    everyone: ['Tutup jendela dan pintu', 'Kalau terpaksa keluar, sebaiknya pakai masker N95'],
    sensitive: ['Tetap di dalam ruangan sepanjang hari'],
    dayLine: 'Tetap di dalam ruangan sepanjang hari.',
    activities: { laundry: 'no', exercise: 'no', windows: 'no', kids: 'no' },
    goodNews: null,
    health: true,
    emergency: true
  }
};

/** "Hari ini cocok untuk…" tiles. Statuses come from LEVELS[n].activities. */
export const ACTIVITIES = [
  { id: 'laundry', icon: 'shirt', label: 'Jemur baju', notes: { ok: 'Oke', caution: 'Bisa hujan', no: 'Bisa bau asap' } },
  { id: 'exercise', icon: 'run', label: 'Olahraga di luar', notes: { ok: 'Oke', caution: 'Ringan saja', no: 'Tunda dulu' } },
  { id: 'windows', icon: 'window', label: 'Buka jendela', notes: { ok: 'Oke', caution: 'Saat asap tipis', no: 'Tutup' } },
  { id: 'kids', icon: 'child', label: 'Anak main di luar', notes: { ok: 'Oke', caution: 'Sebentar saja', no: 'Di dalam saja' } }
];

export const RAIN = { none: 'Tidak hujan', some: 'Ada hujan', heavy: 'Hujan lebat' };

export const EMERGENCY_NUMBER = '119';

/** The public address, written once. The Open Graph tags in index.html and the README repeat it as static text. */
export const SITE_HOST = 'bisanapasgak.github.io';

/** First line of every shared text: forwarded without context, a claim reads as a hoax unless it says it is an estimate. */
const SHARE_PREFIX = 'Apa Kabar Udara (perkiraan, bukan angka resmi)\n';

export const UI = {
  loadingHeadline: 'Mengecek udara…',
  brand: 'Apa Kabar Udara',
  tagline: 'Perkiraan asap & kualitas udara hari ini',
  beta: 'BETA',
  welcome: hello => `${hello} Kamu di kota mana?`,
  overviewTitle: 'Perkiraan asap hari ini',
  overviewSub: count => `${count} kota di Sumatera dan Kalimantan, diurutkan dari perkiraan asap paling tebal. Pilih kota.`,
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

  levelHeading: name => `Perkiraan: ${name}`,
  levelLabel: (name, level) => `${name} · level ${level} dari 5`,
  scaleLabel: level => `level ${level} dari 5`,
  betterSince: previous => `Perkiraannya membaik sejak terakhir kamu cek (sebelumnya ${previous}).`,
  improveOn: weekday => `Diperkirakan mulai membaik ${weekday}.`,
  improveNone: days => `Perkiraan ${days} hari ke depan belum menunjukkan perbaikan.`,
  sensitivePrefix: `${SENSITIVE}:`,
  symptomsMild: 'Batuk terus atau mata perih? Ada baiknya periksa ke fasilitas kesehatan.',
  symptomsEmergency: `Sesak napas atau nyeri dada? Sebaiknya segera cari pertolongan medis, atau hubungi ${EMERGENCY_NUMBER}.`,
  medicalNote: 'Saran kesehatan di sini disusun dari panduan Kemenkes, bukan pengganti pemeriksaan dokter.',
  healthButton: 'Cari fasilitas kesehatan',
  healthQuery: 'fasilitas kesehatan terdekat',
  call: number => `Telepon ${number}`,
  stamp: time => `Diperbarui ${time} ·`,
  explainTitle: 'Apa ini?',
  explain: pm => [
    'Level ini perkiraan komputer dari data satelit dan cuaca, bukan hasil alat ukur di kota ini.',
    'Di dekat kebakaran gambut, asap bisa lebih tebal dari perkiraan. Kalau asap di sekitar terlihat tebal, ikuti yang terlihat.',
    `PM2.5 adalah partikel asap yang sangat halus dan bisa masuk sampai ke paru-paru. Rata-rata 24 jam terakhir: ${pm} µg/m³ (mikrogram per meter kubik udara).`,
    'Level 1 sampai 5 memakai batas resmi pemerintah (ISPU).'
  ],
  explainMethod: 'Lihat metode & sumber',
  official: 'Cek angka resmi pemerintah (ISPU)',

  methodLink: 'Metode & sumber',
  methodTitle: 'Metode & sumber',
  methodSourcesTitle: 'Dari mana datanya',
  methodSources: [
    'Asap (PM2.5) per jam: model CAMS global dari Copernicus, lewat Open-Meteo. Kotak petanya sekitar 45 km.',
    'Titik panas: satelit NASA FIRMS (VIIRS, NOAA-20) dalam 100 km, 24 jam terakhir. Hanya yang tingkat yakinnya sedang atau tinggi.',
    'Angin dan hujan: prakiraan cuaca Open-Meteo.',
    'Datanya diperbarui setiap jam.'
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
  methodHealthTitle: 'Saran kesehatan',
  methodHealth: 'Saran disusun dari panduan Kemenkes dan masih menunggu tinjauan tenaga kesehatan. Bukan pengganti pemeriksaan dokter.',
  methodMakerTitle: 'Siapa yang membuat',
  methodMaker: 'Proyek kecil yang dibuat sukarela, dengan sepenuh hati. Masih terus belajar.',
  methodFeedback: 'Kalau ada yang menurutmu salah, kabari lewat “Kirim masukan”.',

  todayTitle: 'Hari ini cocok untuk…',
  todayTitleNeutral: 'Kegiatan hari ini',
  // From level 3 the window can still be smoky: say its own estimated band so it never reads as a nudge outdoors.
  bestWindow: (level, dayWord, from, to, windowBand) => {
    const line = `${level === 1 ? 'Udara paling segar' : 'Asap paling tipis'} di siang hari: ${dayWord}, ${from}–${to}`;
    return level >= 3 && windowBand >= 3 ? `${line} (perkiraan: masih ${LEVELS[windowBand].name})` : line;
  },
  shareFallback: title => `${SHARE_PREFIX}${title}`,
  dayWord: { today: 'hari ini', tomorrow: 'besok' },
  windowsShut: 'Sebaiknya jendela ditutup hari ini.',
  stripLabel: (range, window) => `Asap per jam, 24 jam ke depan, ${range}.${window}`,
  stripRange: (low, high) => (low === high ? `semuanya ${low}` : `dari ${low} sampai ${high}`),
  stripBest: (from, to) => ` Paling tipis ${from}–${to}.`,
  stripLegend: (low, high) =>
    low === high ? `Semua jam diperkirakan ${low}. Makin tinggi batang, makin tebal asap.` : `Warna = level per jam, dari ${low} sampai ${high}. Makin tinggi batang, makin tebal asap.`,
  stripNow: 'Sekarang',

  outlookTitle: 'Besok gimana?',
  outlookSub: 'Perkiraan beberapa hari ke depan. Pilih hari untuk lihat detail.',
  reasonsTitle: 'Yang mungkin berpengaruh',
  hotspots: km => `Titik panas dalam ${km} km (24 jam terakhir)`,
  wind: 'Angin datang dari',
  rainDays: days => `Hari hujan, ${days} hari ke depan`,
  rainDaysValue: (wet, days) => `${wet} dari ${days}`,
  source: when => `Titik panas dari satelit NASA, ${when}. Angin dan hujan dari prakiraan cuaca.`,

  installButton: 'Pasang di layar utama',
  installHide: 'Sembunyikan',
  iosTitle: 'Pasang di layar utama',
  iosIntro: 'Di Safari, ada dua langkah:',
  iosSteps: ['Ketuk tombol Bagikan di bilah Safari.', 'Pilih “Tambah ke Layar Utama”, lalu ketuk Tambah.'],

  watchAdd: 'Pantau kota lain',
  watchRowLabel: 'Kota pantauan',
  watchSub: 'Pilih sampai 3 kota, misalnya tempat keluarga tinggal. Tersimpan di HP ini saja.',
  watchCount: n => `${n} dari 3 kota dipantau`,
  watchFull: 'Sudah 3 kota. Lepas satu dulu untuk menambah.',
  watchChip: (city, level, name) => `${city}, ${name}, level ${level} dari 5`,

  share: 'Bagikan ke grup',
  storyButton: 'Bagikan ke Story',
  storySaved: 'Gambar diunduh. Unggah ke Story dari galeri. Kalau tidak muncul, buka halaman ini di Safari atau Chrome.',
  storyLinkCopied: 'Link kota ini sudah disalin. Di Instagram, tambahkan stiker Link lalu tempel.',
  storyTapAgain: 'Gambarnya sudah siap. Ketuk sekali lagi untuk membagikan.',
  storyFailed: 'Gambar belum bisa dibuat. Coba lagi.',
  shared: 'Link disalin. Tinggal tempel di grup.',
  shareText: (city, day, level, headline) => `${SHARE_PREFIX}${city}, ${day}: ${LEVELS[level].name} (level ${level} dari 5). ${headline}`,
  shareGood: (city, day, level) => `${SHARE_PREFIX}${city}, ${day}: ${LEVELS[level].name} (level ${level} dari 5). ${LEVELS[level].headline} Cek kotamu juga.`,
  shareOverview: `${SHARE_PREFIX}Kondisi asap hari ini di Sumatera dan Kalimantan. Cek kota sebelum keluar.`,

  preview: 'Pratinjau: level contoh untuk melihat tampilan, bukan data nyata.',
  stale: when => `Data lama: terakhir diperbarui ${when}. Cek juga angka resmi (ISPU).`,
  errorHeadline: 'Datanya belum bisa diambil.',
  errorText: 'Coba buka lagi beberapa menit lagi. Sementara itu, cek angka resmi pemerintah (ISPU).',
  expiredHeadline: 'Datanya sudah terlalu lama.',
  expiredText: 'Data terakhir lebih dari 12 jam lalu, jadi kondisi udara sekarang tidak bisa dinilai. Cek angka resmi pemerintah (ISPU).',

  moreTitle: 'Cek napas & fakta asap',
  moreTitleNoFacts: 'Cek napas hari ini',
  factsTitle: 'Fakta singkat',
  factsNext: 'Fakta lain',
  pollTitle: 'Bagaimana napas hari ini?',
  feedbackButton: 'Kirim masukan',
  feedbackNote: 'Terbuka di Tally. Bisa lapor masalah, kasih saran, atau minta kota baru.',

  footerDisclaimer: `Level dan angka di sini perkiraan, bukan hasil alat ukur. Untuk keputusan kesehatan, ikuti panduan resmi. Darurat kesehatan: ${EMERGENCY_NUMBER}.`,
  creditsIntro: 'Sumber data:',
  creditOpenMeteo: 'Weather data by Open-Meteo.com',
  creditOpenMeteoLicence: '(CC BY 4.0)',
  creditCams: year => `Contains modified Copernicus Atmosphere Monitoring Service information ${year}`,
  creditFirms: 'NASA FIRMS',
  creditIspu: 'batas level: ISPU (Permen LHK P.14/2020).',
  privacyTitle: 'Privasi',
  privacy: 'Tanpa akun, cookie, atau pelacak. Kota pilihan dan kota pantauan disimpan di HP ini saja. Lokasi, kalau diizinkan, cuma dipakai di browser untuk mencari kota terdekat dan tidak disimpan. Jawaban "Bagaimana napas hari ini?" tidak dikirim ke mana pun. Masukan lewat Tally tersimpan di Tally.',
  creditLine: ['Proyek sukarela oleh ', 'Khi Hady', ' · kodenya terbuka di ', 'GitHub']
};

/** Facts in the "Cek napas & fakta asap" fold. Plain statements; hidden at levels 4–5. */
export const FACTS = [
  'Asap tidak mengenal batas negara. Bisa menyeberang sampai Sarawak dan membuat udara di sana ikut tidak sehat.',
  'Lahan gambut bisa terbakar diam-diam di bawah tanah. Api yang kelihatan padam belum tentu benar-benar selesai.',
  'El Niño cenderung membuat musim kemarau lebih kering dan lebih panjang, sehingga api lebih mudah menyebar.',
  'Masker kain kurang efektif menyaring partikel asap yang sangat halus. Untuk asap, masker N95 lebih baik, asal pas di wajah.'
];

export const POLLS = [
  { label: 'Lega', reply: 'Syukurlah. Tetap minum air putih, ya.' },
  { label: 'Agak sesak', reply: 'Kurangi aktivitas di luar hari ini. Kalau tidak membaik, ada baiknya periksa ke fasilitas kesehatan.' },
  { label: 'Sesak sekali', reply: `Kalau sesaknya berat atau disertai nyeri dada, sebaiknya segera cari pertolongan medis atau hubungi ${EMERGENCY_NUMBER}. Sementara itu, tetap di dalam dan tutup jendela.` },
  { label: 'Tidak yakin', reply: 'Cek level kota di atas dan ikuti sarannya.' }
];

/** Instagram Story card (1080×1920). Every line on it comes from here. */
export const STORY = {
  levelName: name => `Perkiraan: ${name}`,
  stamp: day => `Diperbarui ${day}`,
  footer: 'Cek kota sebelum keluar',
  footerLight: 'Cek kotamu sebelum keluar',
  url: SITE_HOST
};
