// Lazy chunk: loaded only when someone taps "Jelajahi peta". Leaflet and its CSS never reach the first visit.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { gibsTileUrl, mapBounds } from './logic.js';

const LAYER = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor';

/** Mounts the map in `el`; calls `onFail` when no tile could be loaded. Returns { destroy }. */
export function createSatMap(el, { lat, lon, date, credit, onFail }) {
  const map = L.map(el, { center: [lat, lon], zoom: 7, minZoom: 4, maxZoom: 9, maxBounds: mapBounds(lat, lon), attributionControl: false });
  L.control.attribution({ prefix: false }).addAttribution(credit).addTo(map);
  let loaded = false;
  const tiles = L.tileLayer(gibsTileUrl(LAYER, date), { maxNativeZoom: 9, maxZoom: 9, minZoom: 4, tileSize: 256 });
  tiles.on('tileload', () => { loaded = true; });
  tiles.on('load', () => { if (!loaded) onFail(); });
  tiles.addTo(map);
  L.marker([lat, lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'map-pin', iconSize: [22, 22] }) }).addTo(map);
  return { destroy: () => map.remove() };
}
