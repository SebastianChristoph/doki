import React, { useState, useEffect } from 'react';
import { getPhotosAtLocation } from '../api';
import { copyToClipboard } from '../utils';
import EditRequestModal from './EditRequestModal';

const fmtDate = (d, yearOnly) =>
  d ? yearOnly
    ? String(new Date(d).getFullYear())
    : new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
  : null;

export default function PhotoGalleryModal({ location, onClose, onUpload }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    getPhotosAtLocation(location.lat, location.lng)
      .then((data) => { setPhotos(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [location]);

  const handleShare = (photo) => {
    const url = `${window.location.origin}/photo/${photo.id}`;
    copyToClipboard(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

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
              <div className="photo-detail-nav">
                <button className="btn-back" onClick={() => { setSelected(null); setCopied(false); }}>
                  ← Zurück zur Übersicht
                </button>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    className={`btn-share-sm ${copied ? 'btn-share-copied' : ''}`}
                    onClick={() => handleShare(selected)}
                    title="Link zur Detailseite kopieren"
                  >
                    {copied ? '✓ Link kopiert!' : '🔗 Teilen'}
                  </button>
                  <a
                    href={`/photo/${selected.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-share-sm"
                  >
                    ↗ Detailseite
                  </a>
                  <button className="btn-share-sm" onClick={() => setEditOpen(true)}>
                    + Informationen ergänzen
                  </button>
                </div>
              </div>
              <img src={`/uploads/${selected.filename}`} alt={selected.title || 'Foto'} className="photo-full" />
              <div className="photo-meta">
                {selected.title && <h3>{selected.title}</h3>}
                {fmtDate(selected.date_taken, selected.date_year_only) && (
                  <p><strong>Aufnahmedatum:</strong> {fmtDate(selected.date_taken, selected.date_year_only)}</p>
                )}
                {selected.photographer_name && (
                  <p><strong>Fotograf:</strong> {selected.photographer_name}</p>
                )}
                {selected.uploader_name && (
                  <p><strong>Eingereicht von:</strong> {selected.uploader_name}</p>
                )}
                {selected.description && <p>{selected.description}</p>}
                {selected.source && <p><strong>Quelle:</strong> {selected.source}</p>}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                  📍 {parseFloat(selected.lat || location.lat).toFixed(5)}° N,{' '}
                  {parseFloat(selected.lng || location.lng).toFixed(5)}° E
                </p>
              </div>
            </div>
          ) : (
            <>
              {photos.length === 0 ? (
                <div className="loading">Keine Fotos gefunden.</div>
              ) : (
                <div className="photo-masonry">
                  {photos.map((photo) => (
                    <div key={photo.id} className="photo-thumb" onClick={() => setSelected(photo)}>
                      <img src={`/uploads/${photo.filename}`} alt={photo.title || 'Foto'} />
                      {(photo.title || photo.date_taken) && (
                        <div className="photo-thumb-title">
                          {photo.title}
                          {photo.title && photo.date_taken && ' · '}
                          {photo.date_taken && photo.date_taken.slice(0, 4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="gallery-footer">
                <button
                  className="btn-primary"
                  onClick={() => onUpload({ lat: location.lat, lng: location.lng })}
                >
                  + Weiteres Foto hinzufügen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {editOpen && selected && (
        <EditRequestModal photo={selected} onClose={() => setEditOpen(false)} />
      )}
    </div>
  );
}
