import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { getPhotoLocations } from '../api';
import UploadModal from './UploadModal';
import PhotoGalleryModal from './PhotoGalleryModal';

const DOBERLUG = [51.6233, 13.5658];

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
  const markerClicked = useRef(false);

  const loadLocations = useCallback(async () => {
    try {
      const data = await getPhotoLocations();
      setLocations(data);
    } catch {}
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  const handleMapClick = (latlng) => {
    if (markerClicked.current) { markerClicked.current = false; return; }
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
      </header>

      <div className="map-wrapper">
        <MapContainer center={DOBERLUG} zoom={15} className="map">
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
              eventHandlers={{
                click: () => handleMarkerClick(loc),
              }}
            />
          ))}
        </MapContainer>
        <div className="map-hint">
          Klicke auf einen Ort, um ein Foto hochzuladen · Klicke auf eine Markierung, um Fotos anzusehen
        </div>
      </div>

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
