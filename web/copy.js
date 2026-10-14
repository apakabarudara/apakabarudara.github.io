// Every user-facing line, in one place for review.
// DRAFT: level 3–5 headlines and actions follow the plan's "safety action that must stay" table and still need
// sign-off from the health reviewer. Change them only with that sign-off.

/** Per ISPU level (Permen LHK P.14/2020). quip and bubble only exist where the tone allows a joke. */
export const LEVELS = {
  1: {
    name: 'Baik',
    headline: 'Udara lagi halu indah.',
    quip: 'Paru-parumu lagi joget. Keluar sana, dia suka.',
    actions: ['Bebas beraktivitas di luar'],
    bubble: ['Gas keluar!', 'Hirup yang dalem dong~', 'Lagi cakep banget udaranya.'],
    dayLine: 'Napas santai, senyum lebar.',
    faskes: false,
    emergency: false
  },
  2: {
    name: 'Sedang',
    headline: 'Aman buat hampir semua.',
    quip: 'Setengah yakin, setengah ragu.',
    actions: ['Aktivitas di luar oke', 'Punya asma atau sakit jantung? Jangan lama-lama olahraga di luar'],
    bubble: ['Hmm, lumayan sih.', 'Jangan sok kuat di lapangan.', 'Santai aja, gak dramatis kok.'],
    dayLine: 'Aman, tapi jangan ngebut di luar.',
    faskes: false,
    emergency: false
  },
  3: {
    name: 'Tidak Sehat',
    headline: 'Kurangi aktivitas di luar.',
    quip: 'Paru-paru ikut demo.',
    actions: ['Kurangi olahraga dan kerja berat di luar', 'Anak, lansia, dan yang punya asma lebih banyak di dalam'],
    bubble: ['Minum air dulu, plis.', 'Paru-paru minta cuti.'],
    dayLine: 'Kurangi aktivitas berat di luar.',
    faskes: true,
    emergency: false
  },
  4: {
    name: 'Sangat Tidak Sehat',
    headline: 'Sebisa mungkin di dalam ruangan.',
    quip: null,
    actions: ['Tutup jendela dan pintu', 'Anak dan lansia tetap di dalam', 'Pakai N95 kalau harus keluar'],
    bubble: null,
    dayLine: 'Rencanakan kegiatan di dalam ruangan.',
    faskes: true,
    emergency: true
  },
  5: {
    name: 'Berbahaya',
    headline: 'Tetap di dalam ruangan.',
    quip: null,
    actions: ['Tutup jendela dan pintu', 'Anak dan lansia tetap di dalam', 'Pakai N95 hanya kalau terpaksa keluar'],
    bubble: null,
    dayLine: 'Tetap di dalam ruangan sepanjang hari.',
    faskes: true,
    emergency: true
  }
};

export const EMERGENCY_NUMBER = '119';

export const UI = {
  loadingHeadline: 'Lagi ngecek udara…',
  hintPickCity: 'Bukan kotamu? Pilih dari daftar, atau tap Terdekat.',
  locating: 'Lagi cari posisimu…',
  locateFailed: 'Posisi nggak bisa diambil. Pilih kota dari daftar aja.',
  nearest: (city, km) => `Kota terdekat: ${city}, sekitar ${km} km. Posisimu nggak disimpan atau dikirim.`,
  errorHeadline: 'Datanya belum bisa diambil.',
  errorText: 'Coba lagi sebentar. Sementara itu, cek ISPU resmi.',
  expiredHeadline: 'Datanya sudah terlalu lama.',
  expiredText: 'Data terakhir lebih dari 12 jam lalu, jadi kami nggak kasih vonis. Cek ISPU resmi dulu ya.',
  stale: when => `Data lama: terakhir diperbarui ${when}. Cek ISPU resmi juga.`,
  stamp: (pm, when) => `PM2.5 rata-rata 24 jam ${pm} µg/m³ · perkiraan model · ${when}`,
  official: 'Cek ISPU resmi KLH ↗',
  faskes: 'Cari faskes terdekat',
  faskesShort: 'Cari faskes',
  faskesQuery: 'rumah sakit dan puskesmas terdekat',
  call: number => `Telepon ${number}`,
  outlookTitle: 'Besok gimana?',
  outlookSub: 'Perkiraan model, tap tiap hari',
  dayDetail: (pm, rain) => `PM2.5 ${pm} µg/m³ · hujan ${rain} mm`,
  reasonsTitle: 'Kenapa begini?',
  hotspots: km => `Titik panas ≤${km} km, 24 jam`,
  wind: 'Angin datang dari',
  rain: days => `Hujan ${days} hari ke depan`,
  source: (firms, when) => `Titik panas: ${firms}, ${when}. Angin dan hujan: perkiraan Open-Meteo.`,
  share: 'Lempar ke grup',
  shared: 'Link disalin, tinggal tempel di grup.',
  shareText: (city, level, headline) => `${city}: Level ${level} · ${LEVELS[level].name}. ${headline}`,
  feedbackEmpty: 'Tulis dulu dong, masa kosong.',
  feedbackThanks: 'Makasih! (Beta: masukan belum benar-benar terkirim ke server.)'
};

export const TWISTS = [
  'Karhutla itu kayak mantan: kebanyakan mulainya dari manusia, dan selalu bikin sesak.',
  'Asapnya gak butuh paspor. Bisa nyebrang sampai Sarawak dan bikin udara di sana ikut gak sehat.',
  'Lahan gambut bisa terbakar diam-diam di bawah tanah. Api yang kelihatan padam belum tentu beneran selesai.',
  'El Niño itu kayak DJ kemarau: volumenya dinaikin, semua jadi lebih panas dan lebih kering.',
  'Musim hujan di banyak wilayah datang lebih telat dari biasanya. Jadi sabar itu ada batasnya.',
  'Titik panas itu bukan cuma angka di layar. Itu sinyal yang harusnya bikin orang cepat bertindak.',
  'Api di lahan gambut bisa jalan berhari-hari, mirip sinetron yang gak kelar-kelar ceritanya.'
];

export const POLLS = [
  { label: 'Lega, kayak abis tidur siang', reply: 'Mantap. Jaga terus, jangan lupa minum.' },
  { label: 'Agak sesak, tapi masih hidup', reply: 'Oke, kurangi aktivitas di luar hari ini.' },
  { label: 'Kayak ngobrol sama asap', reply: 'Asapnya emang suka ngajak ngobrol. Tutup jendela aja.' },
  { label: 'Gak tau, hidung mati rasa', reply: 'Itu tandanya udara lagi drama. Cek ISPU kotamu.' }
];
