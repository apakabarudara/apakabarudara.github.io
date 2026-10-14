const POINTS = ['Utara', 'Timur laut', 'Timur', 'Tenggara', 'Selatan', 'Barat daya', 'Barat', 'Barat laut'] as const;

/** Meteorological wind direction in degrees (where the wind blows from) to an 8-point Indonesian compass label. */
export function compassLabel(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  return POINTS[Math.round(normalized / 45) % POINTS.length];
}
