import { bandForPm25 } from './bands.ts';
import { countNearby, SOURCE_LABEL as FIRMS_LABEL, type Hotspot } from './firms.ts';
import { dailyMeanFrom, trailingDayMean, type AirQualityResponse, type ForecastResponse } from './open-meteo.ts';
import type { LatestReport, Location } from './types.ts';
import { compassLabel } from './wind.ts';

export const RADIUS_KM = 100;
const ISPU_URL = 'https://ispu.kemenlh.go.id/app/#/';
const MODEL_LABEL = 'CAMS global via Open-Meteo';

/** Source data in LOCATIONS order; Open-Meteo answers in request order. */
export interface Sources {
  airQuality: readonly AirQualityResponse[];
  forecast: readonly ForecastResponse[];
  hotspots: readonly Hotspot[];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Assembles latest.json. Throws on missing source data rather than publishing a guess. */
export function buildReport(locations: readonly Location[], sources: Sources, now: Date): LatestReport {
  const generatedAt = now.toISOString();
  return {
    generated_at: generatedAt,
    locations: locations.map((loc, i) => {
      const current = trailingDayMean(sources.airQuality[i], now);
      const pm25 = round1(current.value);
      const { current: weatherNow, daily } = sources.forecast[i];
      const windDeg = weatherNow.wind_direction_10m;
      if (windDeg === null) throw new Error(`${loc.id}: Open-Meteo has no current wind direction`);
      const rainOn = (date: string): number => {
        const mm = daily.precipitation_sum[daily.time.indexOf(date)];
        if (mm === null || mm === undefined) throw new Error(`${loc.id}: Open-Meteo has no rain forecast for ${date}`);
        return mm;
      };
      return {
        id: loc.id,
        name: loc.name,
        ispu: { value: null, status: 'link_only', source_url: ISPU_URL },
        pm25_model: { value: pm25, unit: 'ug/m3', band: bandForPm25(pm25), source: MODEL_LABEL, updated_at: current.hourUtc },
        hotspots_24h: { count: countNearby(sources.hotspots, loc, RADIUS_KM, now), radius_km: RADIUS_KM, source: FIRMS_LABEL, updated_at: generatedAt },
        wind_dir: compassLabel(windDeg),
        outlook: dailyMeanFrom(sources.airQuality[i], now).map(day => {
          const mean = round1(day.pm25_mean);
          return { date: day.date, pm25_mean: mean, band: bandForPm25(mean), rain_mm: rainOn(day.date) };
        })
      };
    })
  };
}
