// "Lapor titik api": a ready-to-send message from the tapped point and the nearest hotspot. Pure; the app sends nothing anywhere.
import { FAR_KM, cleanPoints, compassName, nearestHotspot } from './nearby.js';

export const REPORT = {
  open: 'Lapor titik api',
  title: 'Lapor titik api',
  lead: 'Kalau kamu melihat api atau asap yang belum padam di titik ini, ini bahan yang bisa kamu kirim.',
  caution: 'Utamakan keselamatanmu dan jangan mendekati api.',
  textLabel: 'Pesan laporan, bisa kamu ubah sebelum dikirim',
  copy: 'Salin pesan',
  share: 'Bagikan',
  copied: 'Pesan disalin.',
  copyManual: 'Pesan belum bisa disalin otomatis. Pilih teksnya lalu salin dari menu.',
  contactsTitle: 'Nomor resmi nasional',
  contacts: [
    { tel: '112', name: 'Panggilan Darurat nasional', note: 'Darurat apa pun, termasuk kebakaran; diteruskan ke petugas yang sesuai.' },
    { tel: '113', name: 'Pemadam kebakaran', note: 'Untuk kebakaran.' },
    { tel: '117', name: 'Pusdalops BNPB', note: 'Untuk bencana.' }
  ],
  call: n => `Telepon ${n}`,
  local: 'Untuk nomor BPBD kabupaten/kota setempat, cari di situs resmi pemerintah daerahmu.',
  notSent: 'Apa Kabar Udara tidak mengirim laporan dan tidak bisa memastikan petugas datang. Kamu yang mengirimnya.',
  coordNote: 'Koordinat adalah titik yang kamu ketuk di peta atau lokasi GPS-mu, bukan lokasi api yang terukur.'
};

const coord = n => {
  const s = n.toFixed(5);
  return /^-0\.0+$/.test(s) ? s.slice(1) : s;
};

const stamp = (now, timeZone) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone }).format(now);

/** The report text. `hotspots` is the raw hotspots.json (or null); `timeZone` defaults to the device's. */
export function buildReport({ lat, lon, city, hotspots = null, now = new Date(), timeZone }) {
  const la = coord(lat);
  const lo = coord(lon);
  const lines = [
    'Halo, saya melihat api atau asap di sekitar titik ini.',
    `Koordinat: ${la}, ${lo}`,
    `Peta: https://www.google.com/maps?q=${la},${lo}`,
    `Kota terdekat: ${city}`,
    `Waktu: ${stamp(now, timeZone)}`
  ];
  const pts = cleanPoints(hotspots);
  const near = pts && nearestHotspot(pts, lat, lon);
  if (near && near.km <= FAR_KM) {
    const dist = near.km < 1 ? 'kurang dari 1 km' : `sekitar ${Math.round(near.km)} km`;
    lines.push(`Titik panas satelit NASA terdekat ${dist} ke ${compassName(near.bearing).toLowerCase()}, 24 jam terakhir.`);
  }
  lines.push('Mohon ditindaklanjuti. Laporan ini dikirim dari Apa Kabar Udara oleh warga.');
  return lines.join('\n');
}
