// Lazy chunk: loaded only when the satellite sheet opens. Leaflet and its CSS never reach the first visit.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { gibsTileUrl, mapBounds } from './logic.js';

const LAYER = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor';
// GIBS serves hotspots as vector tiles only; its WMS renders the same layer as transparent PNG, so Leaflet can overlay it.
const HOTSPOTS = 'VIIRS_NOAA20_Thermal_Anomalies_375m_All';
const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';

/** Mounts the map in `el`; calls `onFail` when no tile could be loaded and `onInteract` on the first gesture. Returns { destroy }. */
export function createSatMap(el, { lat, lon, date, credit, onFail, onInteract }) {
  const map = L.map(el, { center: [lat, lon], zoom: 7, minZoom: 4, maxZoom: 9, maxBounds: mapBounds(lat, lon), attributionControl: false });
  L.control.attribution({ prefix: false }).addAttribution(credit).addTo(map);
  let loaded = false;
  const tiles = L.tileLayer(gibsTileUrl(LAYER, date), { maxNativeZoom: 9, maxZoom: 9, minZoom: 4, tileSize: 256 });
  tiles.on('tileload', () => { loaded = true; });
  tiles.on('load', () => { if (!loaded) onFail(); });
  tiles.addTo(map);
  L.tileLayer.wms(GIBS_WMS, { layers: HOTSPOTS, format: 'image/png', transparent: true, version: '1.1.1', time: date, maxZoom: 9, minZoom: 4 }).addTo(map);
  map.once('movestart zoomstart', onInteract);
  el.addEventListener('pointerdown', onInteract, { once: true });
  L.marker([lat, lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'map-pin', iconSize: [22, 22] }) }).addTo(map);
  return { destroy: () => map.remove() };
}
