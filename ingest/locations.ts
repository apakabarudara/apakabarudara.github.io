import type { Location } from './types.ts';

// Coordinates from the Open-Meteo geocoding API (GeoNames; geonameid in each comment), fetched 2026-10-14.
export const LOCATIONS: readonly Location[] = [
  { id: 'pekanbaru', name: 'Pekanbaru, Riau', lat: 0.51667, lon: 101.44167 }, // 1631761
  { id: 'dumai', name: 'Dumai, Riau', lat: 1.66711, lon: 101.44316 }, // 1645133
  { id: 'jambi', name: 'Jambi, Jambi', lat: -1.6, lon: 103.61667 }, // 1642858
  { id: 'palembang', name: 'Palembang, Sumatera Selatan', lat: -2.91673, lon: 104.7458 }, // 1633070
  { id: 'pontianak', name: 'Pontianak, Kalimantan Barat', lat: -0.03194, lon: 109.325 }, // 1630789
  { id: 'ketapang', name: 'Ketapang, Kalimantan Barat', lat: -1.83862, lon: 109.97728 }, // 1640135
  { id: 'palangkaraya', name: 'Palangkaraya, Kalimantan Tengah', lat: -2.20833, lon: 113.91667 }, // 1633118
  { id: 'sampit', name: 'Sampit, Kalimantan Tengah', lat: -2.5315, lon: 112.9496 }, // 1628884
  { id: 'banjarmasin', name: 'Banjarmasin, Kalimantan Selatan', lat: -3.31987, lon: 114.59075 }, // 1650213
  { id: 'banjarbaru', name: 'Banjarbaru, Kalimantan Selatan', lat: -3.4406, lon: 114.8365 }, // 1650217
  { id: 'samarinda', name: 'Samarinda, Kalimantan Timur', lat: -0.49167, lon: 117.14583 }, // 1629001
  { id: 'balikpapan', name: 'Balikpapan, Kalimantan Timur', lat: -1.26753, lon: 116.82887 } // 1650527
];
