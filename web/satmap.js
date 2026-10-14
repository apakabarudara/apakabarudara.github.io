// Lazy chunk: loaded only when the satellite sheet opens. Leaflet and its CSS never reach the first visit.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { gibsTileUrl, mapBounds } from './logic.js';
import { NB, RING_CAP, cleanPoints, labelDegrees, nearbyLines, upwindSector } from './nearby.js';

const LAYER = 'VIIRS_NOAA20_CorrectedReflectance_TrueColor';
// GIBS serves hotspots as vector tiles only; its WMS renders the same layer as transparent PNG, so Leaflet can overlay it.
const HOTSPOTS = 'VIIRS_NOAA20_Thermal_Anomalies_375m_All';
// Transparent WMTS coastline tiles (no time dimension). GIBS's raster place-label layers come back blank, so the pin name is the only label.
const COASTLINES = 'Coastlines_15m';
const GIBS_WMTS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const MIN_ZOOM = 5;
const AREA_KM = 40; // the air model grid is about 40 km
const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi';

/** Mounts the map in `el`; calls `onTile` on the first tile and `onFail` when none could be loaded, and `onInteract` on the first gesture. With hotspots.json data, taps call `onResult(lines)`. Returns { destroy, areaNote }; areaNote is empty without usable hotspots. */
export function createSatMap(el, { lat, lon, name, date, credit, onFail, onTile = () => {}, onInteract, hotspots: data = null, windDir = '', onResult = () => {} }) {
  const map = L.map(el, { center: [lat, lon], zoom: 7, minZoom: MIN_ZOOM, maxZoom: 9, maxBounds: mapBounds(lat, lon), attributionControl: false, preferCanvas: true });
  L.control.attribution({ prefix: false }).addAttribution(credit).addTo(map);
  let loaded = false;
  const tiles = L.tileLayer(gibsTileUrl(LAYER, date), { maxNativeZoom: 9, maxZoom: 9, tileSize: 256, minZoom: MIN_ZOOM });
  tiles.on('tileload', () => { if (!loaded) onTile(); loaded = true; });
  tiles.on('load', () => { if (!loaded) onFail(); });
  tiles.addTo(map);
  L.tileLayer(`${GIBS_WMTS}/${COASTLINES}/default/GoogleMapsCompatible_Level13/{z}/{y}/{x}.png`, { maxNativeZoom: 9, maxZoom: 9, minZoom: MIN_ZOOM, tileSize: 256, className: 'map-coast' }).addTo(map);
  L.tileLayer.wms(GIBS_WMS, { layers: HOTSPOTS, format: 'image/png', transparent: true, version: '1.1.1', time: date, maxZoom: 9, minZoom: MIN_ZOOM }).addTo(map);
  map.once('movestart zoomstart', onInteract);
  el.addEventListener('pointerdown', onInteract, { once: true });
  L.marker([lat, lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'map-pin', iconSize: [22, 22] }) })
    .bindTooltip(name, { permanent: true, direction: 'right', offset: [8, 0], className: 'map-name' }).addTo(map);
  const hotspots = cleanPoints(data);
  if (!hotspots) return { destroy: () => map.remove(), areaNote: '' };
  const from = labelDegrees(windDir);
  L.circle([lat, lon], { radius: AREA_KM * 1000, color: '#fff', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(map);
  if (from !== null) {
    const arrow = `<svg viewBox="0 0 24 24" width="26" height="26" style="transform:rotate(${(from + 180) % 360}deg)" aria-hidden="true"><path d="M12 2l6 9h-4v11h-4V11H6z" fill="#fff" stroke="rgba(0,0,0,.6)" stroke-width="1.5" stroke-linejoin="round"/></svg><span>${NB.wind}</span>`;
    L.marker([lat, lon], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'map-wind', html: arrow, iconSize: [44, 44], iconAnchor: [56, 40] }) }).addTo(map);
  }
  const rings = L.layerGroup().addTo(map);
  const drawRings = (la, lo) => {
    rings.clearLayers();
    for (const p of upwindSector(hotspots, la, lo, from).slice(0, RING_CAP)) L.circleMarker(p, { radius: 6, color: '#ff8a00', weight: 2, fill: false, interactive: false }).addTo(rings);
  };
  drawRings(lat, lon);
  let you = null;
  const place = (la, lo) => {
    if (you) you.setLatLng([la, lo]);
    else you = L.marker([la, lo], { interactive: false, keyboard: false, icon: L.divIcon({ className: 'map-you', iconSize: [18, 18] }) }).bindTooltip(NB.you, { permanent: true, direction: 'left', offset: [-8, 0], className: 'map-name' }).addTo(map);
    drawRings(la, lo);
    onResult(nearbyLines(hotspots, la, lo, windDir), { lat: la, lon: lo });
  };
  map.on('click', e => place(e.latlng.lat, e.latlng.lng));
  // On-device only: the position goes nowhere.
  const locate = () => navigator.geolocation.getCurrentPosition(
    pos => { place(pos.coords.latitude, pos.coords.longitude); map.panTo([pos.coords.latitude, pos.coords.longitude]); },
    () => onResult([NB.denied]),
    { enableHighAccuracy: false, maximumAge: 600000, timeout: 10000 }
  );
  if ('geolocation' in navigator) {
    const Locate = L.Control.extend({
      onAdd() {
        const bar = L.DomUtil.create('div', 'leaflet-bar');
        const a = L.DomUtil.create('a', 'map-locate', bar);
        a.href = '#';
        a.setAttribute('role', 'button');
        a.setAttribute('aria-label', NB.locate);
        a.title = NB.locate;
        a.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>';
        L.DomEvent.disableClickPropagation(bar);
        L.DomEvent.on(a, 'click', e => { L.DomEvent.preventDefault(e); locate(); });
        return bar;
      }
    });
    new Locate({ position: 'topleft' }).addTo(map);
  }
  return { destroy: () => map.remove(), areaNote: NB.area };
}
