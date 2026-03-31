import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getPhotoLocations } from '../api';
import UploadModal from './UploadModal';
import PhotoGalleryModal from './PhotoGalleryModal';
import InfoDrawer from './InfoDrawer';

const DOBERLUG = [51.6233, 13.5658];
const MAX_RADIUS_KM = 10;
// Bounding box ~12 km around Doberlug-Kirchhain
const MAX_BOUNDS = [[51.51, 13.37], [51.74, 13.76]];

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function markerIcon(count) {
  const size = count > 1 ? 38 : 22;
  const html =
    count > 1
      ? `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#c47a1d;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:13px;font-family:system-ui,sans-serif">${count}</div>`
      : `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#c47a1d;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`;
  return L.divIcon({ className: '', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

export default function MapView() {
  const [locations, setLocations] = useState([]);
  const [galleryLocation, setGalleryLocation] = useState(null);
  const [uploadLocation, setUploadLocation] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const markerClicked = useRef(false);

  const loadLocations = useCallback(async () => {
    try {
      const data = await getPhotoLocations();
      setLocations(data);
    } catch {}
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleMapClick = (latlng) => {
    if (markerClicked.current) { markerClicked.current = false; return; }
    const dist = distanceKm(latlng.lat, latlng.lng, DOBERLUG[0], DOBERLUG[1]);
    if (dist > MAX_RADIUS_KM) {
      setToast('Bitte wähle einen Ort innerhalb von Doberlug-Kirchhain (max. 10 km Radius).');
      return;
    }
    setUploadLocation(latlng);
  };

  const handleMarkerClick = (loc) => {
    markerClicked.current = true;
    setGalleryLocation(loc);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <span className="header-title">Doberlug-Kirchhain</span>
          <span className="header-subtitle">Historische Fotos & Stadtansichten</span>
        </div>
        <button
          className="header-info-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Über diese Seite"
          title="Über Doki"
        >
          ℹ
        </button>
      </header>

      <div className="map-wrapper">
        <MapContainer
          center={DOBERLUG}
          zoom={15}
          minZoom={12}
          maxBounds={MAX_BOUNDS}
          maxBoundsViscosity={0.85}
          className="map"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <MapClickHandler onMapClick={handleMapClick} />
          {locations.map((loc, i) => (
            <Marker
              key={i}
              position={[parseFloat(loc.lat), parseFloat(loc.lng)]}
              icon={markerIcon(parseInt(loc.count))}
              eventHandlers={{ click: () => handleMarkerClick(loc) }}
            />
          ))}
        </MapContainer>

        {toast && <div className="map-toast">{toast}</div>}

        <div className="map-hint">
          Klicke auf einen Ort, um ein Foto hochzuladen · Klicke auf eine Markierung, um Fotos anzusehen
          &nbsp;·&nbsp;<a href="/impressum" className="map-hint-link">Impressum</a>
        </div>
      </div>

      <InfoDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {galleryLocation && (
        <PhotoGalleryModal
          location={galleryLocation}
          onClose={() => setGalleryLocation(null)}
          onUpload={(loc) => { setGalleryLocation(null); setUploadLocation(loc); }}
        />
      )}

      {uploadLocation && (
        <UploadModal
          location={uploadLocation}
          onClose={() => setUploadLocation(null)}
          onSuccess={() => { setUploadLocation(null); loadLocations(); }}
        />
      )}
    </div>
  );
}
