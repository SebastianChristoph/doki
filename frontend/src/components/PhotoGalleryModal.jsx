import React, { useState, useEffect } from 'react';
import { getPhotosAtLocation } from '../api';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

export default function PhotoGalleryModal({ location, onClose, onUpload }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getPhotosAtLocation(location.lat, location.lng)
      .then((data) => { setPhotos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [location]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{selected ? selected.title || 'Foto' : `Fotos an diesem Ort (${photos.length})`}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading">Lade Fotos…</div>
          ) : selected ? (
            <div className="photo-detail">
              <button className="btn-back" onClick={() => setSelected(null)}>← Zurück zur Übersicht</button>
              <img src={`/uploads/${selected.filename}`} alt={selected.title || 'Foto'} className="photo-full" />
              <div className="photo-meta">
                {selected.title && <h3>{selected.title}</h3>}
                {fmtDate(selected.date_taken) && <p><strong>Aufnahmedatum:</strong> {fmtDate(selected.date_taken)}</p>}
                {selected.photographer_name && <p><strong>Fotograf:</strong> {selected.photographer_name}</p>}
                {selected.uploader_name && <p><strong>Eingereicht von:</strong> {selected.uploader_name}</p>}
                {selected.description && <p>{selected.description}</p>}
              </div>
            </div>
          ) : (
            <>
              {photos.length === 0 ? (
                <div className="loading">Keine Fotos gefunden.</div>
              ) : (
                <div className="photo-grid">
                  {photos.map((photo) => (
                    <div key={photo.id} className="photo-thumb" onClick={() => setSelected(photo)}>
                      <img src={`/uploads/${photo.filename}`} alt={photo.title || 'Foto'} />
                      {photo.title && <div className="photo-thumb-title">{photo.title}</div>}
                    </div>
                  ))}
                </div>
              )}
              <div className="gallery-footer">
                <button className="btn-primary"
                  onClick={() => onUpload({ lat: location.lat, lng: location.lng })}>
                  + Weiteres Foto hinzufügen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
