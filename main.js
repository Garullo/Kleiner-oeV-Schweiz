import './style.css';
import { Map, View } from 'ol';
import proj4 from "proj4";
import { defaults as defaultControls, ScaleLine } from "ol/control";
import { register } from "ol/proj/proj4";
import { LV95, registerProj4 } from "@swissgeo/coordinates";
import LayerGroup from 'ol/layer/Group';
import TileLayer from 'ol/layer/Tile.js';
import { XYZ } from "ol/source";
import LayerSwitcher from 'ol-layerswitcher';
import { MapLibreLayer } from '@geoblocks/ol-maplibre-layer';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Circle, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import DragRotateAndZoom from 'ol/interaction/DragRotateAndZoom.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import GeoJSON from 'ol/format/GeoJSON';
import Icon from 'ol/style/Icon.js';
import Overlay from 'ol/Overlay';



// --- Projektionen ---
registerProj4(proj4);
register(proj4);



// --- Basemap Layers ---
// Orthofoto
const basemapImage = new TileLayer({
  title: 'SwissImage',
  type: 'base',
  source: new XYZ({
    url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg",
  }),
});

// swisstopo VectorBasemap mit MapLibre
const basemapVector = new MapLibreLayer({
  title: 'LightBasemap',
  type: 'base',
  mapLibreOptions: {
    style: "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.lightbasemap.vt/style.json"
  },
});
basemapVector.getAttributions = function () {
  return '© swisstopo';
};

basemapVector.setVisible(false);

// Layer Group für Basemaps
const basemapGroup = new LayerGroup({
  title: 'Basemaps',
  layers: [basemapImage, basemapVector],
  fold: 'close',
});



// --- Layers ---
// Styles für GeoJSON Features 
const oeV_PunktStyle = new Style({
  image: new Circle({
    radius: 6,
    fill: new Fill({
      color: '#ff6b6b'
    }),
    stroke: new Stroke({
      color: '#fff',
      width: 2
    })
  })
});
const oeV_LinieStyle = new Style({
  fill: new Fill({
    color: '#ff6b6b'
  }),
  stroke: new Stroke({
    color: '#1e90ff',
    width: 3,
  }),
});

// GeoJSON Layer - öV Punkte
const oeV_PunktSource = new VectorSource({
  url: './oeV_Punkt.geojson',
  format: new GeoJSON()
});

const oeV_PunktLayer = new VectorLayer({
  title: 'öV Punkte',
  source: oeV_PunktSource,
  style: oeV_PunktStyleFunktion,
  minZoom: 11.5,
});

// GeoJSON Layer - öV Linien
const oeV_LinieSource = new VectorSource({
  url: './oeV_Linie.geojson',
  format: new GeoJSON()
});

const oeV_LinieLayer = new VectorLayer({
  title: 'öV Linien',
  source: oeV_LinieSource,
  style: oeV_LinienStyleFunktion,
});

// Dynamischer Stil basierend auf den Feature-Attributen
function oeV_LinienStyleFunktion(feature, resolution) {
  // get zoom from resolution
  const zoom = Math.round(Math.log(156543.03392804097 * Math.cos(46.8182 * Math.PI / 180) / resolution) / Math.LN2);
  if (feature.get("OBJEKTART") == 0) {
    return new Style({
      stroke: new Stroke({
        color: '#f32501',
        width: feature.get("ANSCHLUSSGLEIS") == 1 ? 1.5 : 0.75,
      }),
    });
  } else {
    return new Style({
      stroke: new Stroke({
        color: zoom < 15 ? 'transparent' : '#ff8d12',
        width: 1,
      }),
    });
  }
};

function oeV_PunktStyleFunktion(feature, resolution) {
  // get zoom from resolution
  const zoom = Math.round(Math.log(156543.03392804097 * Math.cos(46.8182 * Math.PI / 180) / resolution) / Math.LN2);
  if (feature.get("OBJEKTART") == 2) {
    return new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: 'ship-solid-full.png',
        width: 15,
        opacity: zoom < 13.5 ? 0 : 1,
      })
    });
  } if (feature.get("OBJEKTART") == 1) {
    return new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: 'bus-solid-full.png',
        width: 15,
        opacity: zoom < 13.5 ? 0 : 1,
      })
    });
  } if (feature.get("OBJEKTART") == 4) {
    return new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: 'cable-car-solid-full.png',
        width: 15,
        opacity: zoom < 13.5 ? 0 : 1,
      })
    });
  } else {
    return new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        anchorXUnits: 'fraction',
        anchorYUnits: 'fraction',
        src: 'train-solid-full.png',
        width: 15,
      })
    });
  }
};

// Layer Group für Basemaps
const themenGroup = new LayerGroup({
  title: 'Themen',
  layers: [oeV_LinieLayer, oeV_PunktLayer],
  fold: 'close',
});



// --- Position / Location (1) ---
const positionSource = new VectorSource();
const positionLayer = new VectorLayer({
  source: positionSource,
  style: new Style({
    image: new Circle({
      radius: 5,
      fill: new Fill({
        color: '#BEBAFD'
      }),
      stroke: new Stroke({
        color: '#fff',
        width: 1.5
      })
    })
  })
});

// --- Popup für öV Punkte ---
const popup = document.getElementById('popup');
//document.body.appendChild(popup);

const overlay = new Overlay({
  element: popup,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});

// --- Map Inizialisierung ---
const map = new Map({
  // controls: defaultControls().extend([new functionXXX()]),
  interactions: defaultInteractions().extend([new DragRotateAndZoom()]),
  target: "map",
  overlays: [overlay],
  controls: defaultControls().extend([
    new ScaleLine({
      units: "metric",
    }),
  ]),
  layers: [basemapGroup, themenGroup, positionLayer],
  view: new View({
    center: proj4('EPSG:2056', 'EPSG:3857', [2660158, 1183640]),
    zoom: 8,
  }),
});



// --- Position / Location (2) ---
let positionFeature = null;
let accuracy = 0;

let latPos, lngPos;

function getPos() {
  navigator.geolocation.getCurrentPosition(telPos);
}

function telPos(position) {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  accuracy = position.coords.accuracy;

  const coord = fromLonLat([lng, lat]);

  if (positionFeature === null) {
    // Erster Aufruf → Feature erstellen
    positionFeature = new Feature(new Point(coord));
    positionSource.addFeature(positionFeature);
    map.getView().animate({ center: coord, zoom: 15, duration: 1000 });
  } else {
    // Später → nur verschieben
    positionFeature.getGeometry().setCoordinates(coord);
    // map.getView().animate({ center: coord, duration: 1000 });
  }
  latPos = lat;
  lngPos = lng;
}

getPos();
setInterval(getPos, 10000);



// --- Layer Switcher ---
const layerSwitcher = new LayerSwitcher({
  reverse: true,
  groupSelectStyle: 'group'
});
map.addControl(layerSwitcher);



// --- Popup ---
map.on('click', async (event) => {
  const result = map.forEachFeatureAtPixel(
    event.pixel,
    (feature, layer) => popupDarstellung(feature, layer, event.coordinate)
  );
  if (!result) {
    popup.style.display = 'none';
  }
});

// Popup Darstellung Funktion
async function popupDarstellung(feature, layer, coordinate) {
  if (layer === oeV_PunktLayer || layer === "nearest") {
    const name = feature.get('NAME');
    popup.innerHTML = `<strong>${name}</strong><div>lade Abfahrten…</div>`; // Ladeanzeige
    popup.style.display = 'block';
    overlay.setPosition(coordinate);
    popup.style.left = "5px";
    popup.style.top = "5px";

    try { // Abfahrten von API holen und darstellen
      const stationboardData = await fetchStationboard(name, 8);
      const board = stationboardData.stationboard || [];
      if (board.length === 0) {
        popup.innerHTML = `<strong>${name}</strong><div>Keine Abfahrten gefunden.</div>`;
        return;
      }
      const rows = board.map((item) => {
        const when = item.stop && item.stop.departure ? new Date(item.stop.departure) : null;
        const time = when ? when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
        const cat = item.category || '';
        const num = item.number || '';
        const to = item.to || '';
        return `<div style="margin-bottom:6px;">
                  <span style="font-weight:600">${time}</span>
                  &nbsp; <span style="color:#333">${cat} ${num}</span>
                  &nbsp;→&nbsp; <span>${to}</span>
                  </div>`;
      }).join('');
      popup.innerHTML = `<strong>${name}</strong><div style="margin-top:8px;">${rows}</div>`;
    } catch (err) {
      popup.innerHTML = `<strong>${name}</strong><div>Fehler beim Laden der Abfahrten.</div>`;
    }
  } else {
    popup.style.display = 'none';
  }
};

// Stationboard API Aufruf
async function fetchStationboard(stationName, limit = 6) {
  const url = `https://transport.opendata.ch/v1/stationboard?station=${encodeURIComponent(stationName)}&limit=${limit}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('API Fehler');
  return await resp.json();
}

// Näheste öV Haltestelle bei Start anzeigen
setTimeout(() => {
  if (latPos == null || lngPos == null) return;

  const pos3857 = fromLonLat([lngPos, latPos]);
  const nearestFeature = oeV_PunktSource.getClosestFeatureToCoordinate(pos3857);
  if (nearestFeature) {
    const coordinate = nearestFeature.getGeometry().getCoordinates();
    popupDarstellung(nearestFeature, "nearest", coordinate);
  }
}, 2000);