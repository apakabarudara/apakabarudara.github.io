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
  pm25_max: number;
  band: Band;
}

export interface LocationReport {
  id: string;
  name: string;
  ispu: IspuStatus;
  pm25_model: Pm25Model;
  hotspots_24h: Hotspots24h;
  /** Where the wind blows from, as an 8-point Indonesian compass label. */
  wind_dir: string;
  outlook: OutlookDay[];
}

export interface LatestReport {
  generated_at: string;
  locations: LocationReport[];
}
