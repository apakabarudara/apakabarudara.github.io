// Every user-facing line, in one place for review. Spike: trimmed to the overview, the first city screen and "Apa ini?".
// Voice: everyday Indonesian. "kamu" only in the light parts (welcome, levels 1–2); levels 3–5, safety lines and errors
// use plain imperatives and "tidak". Never joke about the reader's body or breathing.
// DRAFT: level 3–5 headlines, actions, activity statuses and the symptom line follow the plan's safety table, ISPU
// (Permen LHK P.14/2020, Lampiran II) and Kemenkes haze guidance. They still need sign-off from the health reviewer.

/** Who counts as sensitive, after Kemenkes: children, older people, pregnant women, people with lung or heart disease. */
export const SENSITIVE = 'Anak, lansia, ibu hamil, sakit paru/jantung';

/** Per ISPU level. A quip only where the tone allows a joke. */
export const LEVELS = {
  1: {
    name: 'Baik',
    headline: 'Udaranya lagi bagus banget.',
    quip: 'Paru-parumu lagi joget. Yuk, keluar!',
    everyone: ['Bebas beraktivitas di luar'],
    sensitive: [],
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

export const EMERGENCY_NUMBER = '119';

export const UI = {
  welcome: hello => `${hello} Kamu di kota mana?`,
  useLocation: 'Pakai lokasiku',
  locating: 'Lagi mencari lokasimu…',
  locateFailed: 'Lokasimu tidak terbaca. Pilih kota dari daftar, ya.',
  overviewTitle: 'Asap hari ini',
  overviewSub: count => `${count} kota di Sumatera dan Kalimantan, mulai dari yang paling parah.`,
  allCities: 'Semua kota',

  levelLabel: (name, level) => `${name} · level ${level} dari 5`,
  sensitiveLead: 'Anak & lansia:',
  symptoms: emergency => `Sesak atau nyeri dada? Ke puskesmas/RS${emergency ? ' atau telepon 119' : ''}`,
  goodNews: 'Kabari grup: udara lagi bagus',
  faskes: 'Cari puskesmas/RS',
  faskesQuery: 'puskesmas dan rumah sakit terdekat',
  call: number => `Telepon ${number}`,
  shareGood: (city, day, level) => `${city}, ${day}: ${LEVELS[level].name} (level ${level} dari 5). Udaranya lagi bagus, cek kotamu juga.`,
  shared: 'Link disalin. Tinggal tempel di grup.',
  stamp: time => `Perkiraan · ${time}`,

  explainTitle: 'Apa ini?',
  explain: pm => [
    'Angka ini perkiraan komputer dari data satelit dan cuaca, bukan hasil alat ukur di kotamu.',
    'Di dekat kebakaran gambut, asap bisa lebih tebal dari perkiraan. Kalau asap di sekitarmu terlihat tebal, ikuti yang kamu lihat.',
    `PM2.5 adalah partikel asap yang sangat halus dan bisa masuk sampai ke paru-paru. Rata-rata 24 jam terakhir: ${pm} µg/m³ (mikrogram per meter kubik udara).`,
    'Level 1 sampai 5 memakai batas resmi pemerintah (ISPU).'
  ],
  sensitiveTitle: 'Yang termasuk "anak & lansia"',
  official: 'Cek angka resmi pemerintah (ISPU)',
  close: 'Tutup',

  todayTitle: 'Hari ini cocok untuk…',
  bestWindow: (level, from, to) => `${level === 1 ? 'Udara paling segar' : 'Asap paling tipis'}: ${from}–${to}`,
  windowsShut: 'Jendela tetap tutup seharian.',
  stripLabel: (from, to) => `Perkiraan asap per jam, 24 jam ke depan. Paling tipis ${from}–${to}.`,
  stripNoWindow: 'Perkiraan asap per jam, 24 jam ke depan. Makin tinggi batang, makin tebal asap.',
  stripNow: 'Sekarang',

  errorHeadline: 'Datanya belum bisa diambil.',
  errorText: 'Coba buka lagi beberapa menit lagi. Sementara itu, cek angka resmi pemerintah (ISPU).',
  credit: 'Data: Open-Meteo (CC BY 4.0), Copernicus CAMS, NASA FIRMS\u00a0· Proyek sukarela oleh Khi Hady'
};
