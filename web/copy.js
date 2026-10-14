// Every user-facing line, in one place for review.
// Voice: everyday Indonesian. "kamu" only in the light parts (welcome, levels 1–2); levels 3–5, safety lines and errors
// use plain imperatives and "tidak". Never joke about the reader's body or breathing.
// DRAFT: level 3–5 headlines, actions, activity statuses and the symptom line follow the plan's safety table, ISPU
// (Permen LHK P.14/2020, Lampiran II) and Kemenkes haze guidance. They still need sign-off from the health reviewer.

/** Who counts as sensitive, after Kemenkes: children, older people, pregnant women, people with lung or heart disease. */
export const SENSITIVE = 'Anak, lansia, ibu hamil, sakit paru/jantung';

/** Per ISPU level. quip and bubble only where the tone allows a joke. */
export const LEVELS = {
  1: {
    name: 'Baik',
    headline: 'Udaranya lagi bagus banget.',
    quip: 'Paru-parumu lagi joget. Yuk, keluar!',
    everyone: ['Bebas beraktivitas di luar'],
    sensitive: [],
    bubble: ['Yuk, keluar!', 'Hirup yang dalam~', 'Udaranya lagi cakep.'],
    dayLine: 'Udara bagus, bebas beraktivitas.',
    activities: { laundry: 'ok', exercise: 'ok', windows: 'ok', kids: 'ok' },
    goodNews: true,
    faskes: false,
    emergency: false
  },
  2: {
    name: 'Sedang',
    headline: 'Aman buat hampir semua.',
    quip: 'Nggak sempurna, tapi masih oke.',
    everyone: ['Aktivitas di luar masih oke'],
    sensitive: ['Kurangi olahraga berat yang lama di luar'],
    bubble: ['Lumayan, sih.', 'Jangan memaksakan diri di lapangan.', 'Santai saja, nggak dramatis kok.'],
    dayLine: 'Aman, tapi jangan olahraga terlalu berat.',
    activities: { laundry: 'ok', exercise: 'caution', windows: 'ok', kids: 'ok' },
    goodNews: true,
    faskes: false,
    emergency: false
  },
  3: {
    name: 'Tidak Sehat',
    headline: 'Kurangi aktivitas di luar.',
    quip: 'Paru-paru ikut demo.',
    everyone: ['Kurangi olahraga dan kerja berat di luar'],
    sensitive: ['Lebih banyak di dalam ruangan'],
    bubble: ['Minum air putih dulu, ya.', 'Paru-paru minta istirahat.'],
    dayLine: 'Kurangi aktivitas berat di luar.',
    activities: { laundry: 'no', exercise: 'no', windows: 'caution', kids: 'caution' },
    goodNews: false,
    faskes: true,
    emergency: false
  },
  4: {
    name: 'Sangat Tidak Sehat',
    headline: 'Sebisa mungkin di dalam ruangan.',
    quip: null,
    everyone: ['Tutup jendela dan pintu', 'Kalau harus keluar, pakai masker N95'],
    sensitive: ['Tetap di dalam ruangan'],
    bubble: null,
    dayLine: 'Rencanakan kegiatan di dalam ruangan.',
    activities: { laundry: 'no', exercise: 'no', windows: 'no', kids: 'no' },
    goodNews: false,
    faskes: true,
    emergency: true
  },
  5: {
    name: 'Berbahaya',
    headline: 'Tetap di dalam ruangan.',
    quip: null,
    everyone: ['Tutup jendela dan pintu', 'Keluar hanya kalau terpaksa, dan pakai masker N95'],
    sensitive: ['Tetap di dalam ruangan sepanjang hari'],
    bubble: null,
    dayLine: 'Tetap di dalam ruangan sepanjang hari.',
    activities: { laundry: 'no', exercise: 'no', windows: 'no', kids: 'no' },
    goodNews: false,
    faskes: true,
    emergency: true
  }
};

/** "Hari ini cocok untuk…" tiles. Statuses come from LEVELS[n].activities. */
export const ACTIVITIES = [
  { id: 'laundry', icon: 'shirt', label: 'Jemur baju', notes: { ok: 'Aman', caution: 'Bisa hujan', no: 'Bau asap' } },
  { id: 'exercise', icon: 'run', label: 'Olahraga di luar', notes: { ok: 'Boleh', caution: 'Yang sensitif: ringan saja', no: 'Tunda dulu' } },
  { id: 'windows', icon: 'window', label: 'Buka jendela', notes: { ok: 'Boleh', caution: 'Saat asap tipis', no: 'Tutup' } },
  { id: 'kids', icon: 'child', label: 'Anak main di luar', notes: { ok: 'Boleh', caution: 'Sebentar saja', no: 'Di dalam saja' } }
];

export const STATUS_ICON = { ok: 'ok', caution: 'caution', no: 'no' };

export const RAIN = { none: 'Tidak hujan', some: 'Ada hujan', heavy: 'Hujan lebat' };

export const EMERGENCY_NUMBER = '119';

export const UI = {
  loadingHeadline: 'Lagi mengecek udara…',
  welcome: hello => `${hello} Kamu di kota mana?`,
  welcomeSub: 'Pilih sekali, besok langsung muncul.',
  overviewTitle: 'Asap hari ini',
  overviewSub: count => `${count} kota di Sumatera dan Kalimantan, mulai dari yang paling parah. Pilih kotamu.`,
  allCitiesOption: 'Lihat semua kota…',
  useLocation: 'Pakai lokasiku',
  locating: 'Lagi mencari lokasimu…',
  locateFailed: 'Lokasimu tidak terbaca. Pilih kota dari daftar, ya.',
  nearest: (city, km) => `Kota terdekat: ${city}, sekitar ${km} km. Lokasimu tidak disimpan atau dikirim.`,

  levelLabel: (name, level) => `${name} · level ${level} dari 5`,
  everyone: 'Semua orang',
  sensitive: SENSITIVE,
  symptoms: emergency => `Sesak, batuk terus, atau nyeri dada? Segera ke puskesmas/RS${emergency ? ' atau telepon 119' : ''}.`,
  goodNews: 'Kabari grup: udara lagi bagus',
  faskes: 'Cari puskesmas/RS',
  faskesQuery: 'puskesmas dan rumah sakit terdekat',
  call: number => `Telepon ${number}`,
  callShort: number => number,
  stamp: when => `Perkiraan · diperbarui ${when}`,
  explainTitle: 'Apa ini?',
  explain: pm => [
    'Angka ini perkiraan komputer dari data satelit dan cuaca, bukan hasil alat ukur di kotamu.',
    'Di dekat kebakaran gambut, asap bisa lebih tebal dari perkiraan. Kalau asap di sekitarmu terlihat tebal, ikuti yang kamu lihat.',
    `PM2.5 adalah partikel asap yang sangat halus dan bisa masuk sampai ke paru-paru. Rata-rata 24 jam terakhir: ${pm} µg/m³ (mikrogram per meter kubik udara).`,
    'Level 1 sampai 5 memakai batas resmi pemerintah (ISPU).'
  ],
  official: 'Cek angka resmi pemerintah (ISPU)',

  todayTitle: 'Hari ini cocok untuk…',
  bestWindow: (level, from, to) => `${level === 1 ? 'Udara paling segar' : 'Asap paling tipis'}: ${from}–${to}`,
  windowsShut: 'Jendela tetap tutup seharian.',
  stripLabel: (from, to) => `Perkiraan asap per jam, 24 jam ke depan. Paling tipis ${from}–${to}.`,
  stripLegend: 'Makin tinggi batang, makin tebal asap · perkiraan',
  stripNow: 'Sekarang',

  outlookTitle: 'Besok gimana?',
  outlookSub: 'Perkiraan. Pilih hari untuk lihat detail.',
  reasonsTitle: 'Kenapa begini?',
  hotspots: km => `Titik panas dalam ${km} km (24 jam terakhir)`,
  wind: 'Angin datang dari',
  rainDays: days => `Hari hujan, ${days} hari ke depan`,
  rainDaysValue: (wet, days) => `${wet} dari ${days}`,
  source: when => `Titik panas dari satelit NASA, ${when}. Angin dan hujan: perkiraan cuaca.`,

  share: 'Bagikan ke grup',
  shared: 'Link disalin. Tinggal tempel di grup.',
  shareText: (city, day, level, headline) => `${city}, ${day}: ${LEVELS[level].name} (level ${level} dari 5). ${headline}`,
  shareGood: (city, day, level) => `${city}, ${day}: ${LEVELS[level].name} (level ${level} dari 5). Udaranya lagi bagus, cek kotamu juga.`,
  shareOverview: 'Kondisi asap hari ini di Sumatera dan Kalimantan. Cek kotamu sebelum keluar.',

  stale: when => `Data lama: terakhir diperbarui ${when}. Cek juga angka resmi (ISPU).`,
  errorHeadline: 'Datanya belum bisa diambil.',
  errorText: 'Coba buka lagi beberapa menit lagi. Sementara itu, cek angka resmi pemerintah (ISPU).',
  expiredHeadline: 'Datanya sudah terlalu lama.',
  expiredText: 'Data terakhir lebih dari 12 jam lalu, jadi kami belum bisa bilang aman atau tidak. Cek angka resmi pemerintah (ISPU).',

  moreTitle: 'Lainnya',
  factsTitle: 'Tahukah kamu?',
  factsNext: 'Fakta lain',
  pollTitle: 'Napasmu hari ini gimana?',
  feedbackTitle: 'Lapor masalah atau saran',
  feedbackNote: 'Versi uji coba: masukan belum terkirim ke mana pun.',
  feedbackEmpty: 'Tulis dulu, ya.',
  feedbackThanks: 'Terima kasih. Versi uji coba: masukan ini belum terkirim.'
};

export const FACTS = [
  'Karhutla itu kayak mantan: kebanyakan mulainya dari ulah manusia.',
  'Asap nggak butuh paspor. Bisa menyeberang sampai Sarawak dan bikin udara di sana ikut tidak sehat.',
  'Lahan gambut bisa terbakar diam-diam di bawah tanah. Api yang kelihatan padam belum tentu benar-benar selesai.',
  'El Niño itu kayak DJ musim kemarau: volumenya dinaikkan, semuanya jadi lebih panas dan lebih kering.',
  'Titik panas bukan cuma angka di layar. Itu tanda yang harusnya bikin orang cepat bertindak.',
  'Api di lahan gambut bisa menyala berhari-hari, mirip sinetron yang nggak selesai-selesai.'
];

export const POLLS = [
  { label: 'Lega', reply: 'Syukurlah. Tetap minum air putih, ya.' },
  { label: 'Agak sesak', reply: 'Kurangi aktivitas di luar hari ini.' },
  { label: 'Sesak sekali', reply: 'Tetap di dalam dan tutup jendela. Sesak berat atau nyeri dada? Segera ke puskesmas/RS atau telepon 119.' },
  { label: 'Nggak yakin', reply: 'Cek level kotamu di atas dan ikuti sarannya.' }
];
