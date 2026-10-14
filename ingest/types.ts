/** The contract between the ingest job and the page: the shape of data/latest.json. */

/** ISPU band: 1 Baik, 2 Sedang, 3 Tidak Sehat, 4 Sangat Tidak Sehat, 5 Berbahaya. */
export type Band = 1 | 2 | 3 | 4 | 5;

export interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

/** Official ISPU. No permitted feed yet, so the page links out instead of showing a number. */
export interface IspuStatus {
  value: number | null;
  status: 'link_only';
  source_url: string;
}

/** Modelled PM2.5, never presented as a measurement. */
export interface Pm25Model {
  value: number;
  unit: 'ug/m3';
  band: Band;
  source: string;
  updated_at: string;
}

export interface Hotspots24h {
  count: number;
  radius_km: number;
  source: string;
  updated_at: string;
}

export interface OutlookDay {
  date: string;
  pm25_mean: number;
  band: Band;
  /** Forecast precipitation for the local day. */
  rain_mm: number;
}

export interface LocationReport {
  id: string;
  name: string;
  /** City centre, for the page's nearest-city picker. */
  lat: number;
  lon: number;
  ispu: IspuStatus;
  pm25_model: Pm25Model;
  hotspots_24h: Hotspots24h;
  /** Where the wind blows from, as an 8-point Indonesian compass label. */
  wind_dir: string;
  outlook: OutlookDay[];
  /** Modelled PM2.5 for each of the next 24 hours, from the current hour. Hourly values, so never banded. */
  next_hours: HourlyPm25[];
}

export interface HourlyPm25 {
  time: string;
  pm25: number;
}

export interface LatestReport {
  generated_at: string;
  locations: LocationReport[];
}

/** data/hotspots.json: where the fires counted in latest.json are, for the page's nearest-fire lookup. */
export interface HotspotsFile {
  generated_at: string;
  source: string;
  /** [lat, lon] at 3 decimals (about 110 m), unique, sorted. */
  points: [number, number][];
}
