import type { Band } from './types.ts';

// PM2.5 upper bounds (µg/m³, 24-hour average) for ISPU 50, 100, 200 and 300.
// Permen LHK P.14/MENLHK/SETJEN/KUM.1/7/2020, Lampiran I: https://peraturan.go.id/files/bn774-2020.pdf
const PM25_UPPER_BOUNDS: readonly (readonly [number, Band])[] = [
  [15.5, 1],
  [55.4, 2],
  [150.4, 3],
  [250.4, 4]
];

/** ISPU band for a PM2.5 concentration. The breakpoints are defined for 24-hour averages. */
export function bandForPm25(ugm3: number): Band {
  for (const [upper, band] of PM25_UPPER_BOUNDS) {
    if (ugm3 <= upper) return band;
  }
  return 5;
}
