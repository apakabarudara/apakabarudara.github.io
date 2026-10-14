// Lazy chunk: loaded only when the satellite sheet opens. Leaflet and its CSS never reach the first visit.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { gibsTileUrl, mapBounds } from './logic.js';

const LAYER = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor';
// GIBS serves hotspots as vector tiles only; its WMS renders the same layer as transparent PNG, so Leaflet can overlay it.
const HOTSPOTS = 'VIIRS_NOAA20_Thermal_Anomalies_375m_All';
// Transparent WMTS coastline tiles (no time dimension). GIBS's raster place-label layers come back blank, so the pin name is the only label.
const COASTLINES = 'Coastlines_15m';
const GIBS_WMTS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const MIN_ZOOM = 5;
const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';

/** Mounts the map in `el`; calls `onFail` when no tile could be loaded and `onInteract` on the first gesture. Returns { destroy }. */
export function createSatMap(el, { lat, lon, name, date, credit, onFail, onInteract }) {
  const map = L.map(el, { center: [lat, lon], zoom: 7, minZoom: MIN_ZOOM, maxZoom: 9, maxBounds: mapBounds(lat, lon), attributionControl: false });
  L.control.attribution({ prefix: false }).addAttribution(credit).addTo(map);
  let loaded = false;
  const tiles = L.tileLayer(gibsTileUrl(LAYER, date), { maxNativeZoom: 9, maxZoom: 9, tileSize: 256, minZoom: MIN_ZOOM });
  tiles.on('tileload', () => { loaded = true; });
  tiles.on('load', () => { if (!loaded) onFail(); });
  tiles.addTo(map);
  L.tileLayer(`${GIBS_WMTS}/${COASTLINES}/default/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`, { maxNativeZoom: 9, maxZoom: 9, minZoom: MIN_ZOOM, tileSize: 256, className: 'map-coast' }).addTo(map);
  L.tileLayer.wms(GIBS_WMS, { layers: HOTSPOTS, format: 'image/png', transparent: true, version: '1.1.1', time: date, maxZoom: 9, minZoom: MIN_ZOOM }).addTo(map);
  map.once('movestart zoomstart', onInteract);
  el.addEventListener('pointerdown', onInteract, { once: true });
  L.marker([lat, lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'map-pin', iconSize: [22, 22] }) })
    .bindTooltip(name, { permanent: true, direction: 'right', offset: [8, 0], className: 'map-name' }).addTo(map);
  return { destroy: () => map.remove() };
}
