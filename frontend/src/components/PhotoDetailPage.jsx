import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPhotoById } from '../api';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

function MiniMapEmbed({ lat, lng }) {
  const delta = 0.003;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  return (
    <iframe
      title="Standort auf der Karte"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`}
      className="mini-map-iframe"
      loading="lazy"
    />
  );
}

export default function PhotoDetailPage() {
  const { id } = useParams();
  const [photo, setPhoto] = useState(null);
  const [address, setAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPhotoById(id)
      .then(setPhoto)
      .catch(() => setError('Dieses Foto wurde nicht gefunden oder ist noch nicht freigegeben.'));
  }, [id]);

  useEffect(() => {
    if (!photo) return;
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${photo.lat}&lon=${photo.lng}&format=json`,
      { headers: { 'Accept-Language': 'de' } }
    )
      .then((r) => r.json())
      .then((d) => { if (d.display_name) setAddress(d.display_name); })
      .catch(() => {});
  }, [photo]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (error) {
    return (
      <div className="detail-page">
        <div className="detail-nav">
          <Link to="/" className="btn-back-link">← Zur Karte</Link>
        </div>
        <div className="loading" style={{ marginTop: '4rem' }}>{error}</div>
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="detail-page">
        <div className="loading" style={{ marginTop: '6rem' }}>Lade…</div>
      </div>
    );
  }

  const lat = parseFloat(photo.lat);
  const lng = parseFloat(photo.lng);

  return (
    <div className="detail-page">
      <div className="detail-nav">
        <Link to="/" className="btn-back-link">← Zurück zur Karte</Link>
        <button className={`btn-share ${copied ? 'btn-share-copied' : ''}`} onClick={handleShare}>
          {copied ? '✓ Link kopiert!' : '🔗 Teilen'}
        </button>
      </div>

      <div className="detail-content">
        <div className="detail-image-col">
          <img
            src={`/uploads/${photo.filename}`}
            alt={photo.title || 'Historisches Foto'}
            className="detail-photo"
          />
        </div>

        <div className="detail-info-col">
          {photo.title && <h1 className="detail-title">{photo.title}</h1>}

          <div className="detail-meta">
            {fmtDate(photo.date_taken) && (
              <div><strong>Aufnahmedatum:</strong> {fmtDate(photo.date_taken)}</div>
            )}
            {photo.photographer_name && (
              <div><strong>Fotograf:</strong> {photo.photographer_name}</div>
            )}
            {photo.uploader_name && (
              <div><strong>Eingereicht von:</strong> {photo.uploader_name}</div>
            )}
            {photo.description && (
              <p className="detail-description">{photo.description}</p>
            )}
          </div>

          <div className="detail-location">
            <h3>📍 Standort</h3>
            <div className="detail-coords">
              {lat.toFixed(5)}° N, {lng.toFixed(5)}° E
            </div>
            {address && <div className="detail-address">{address}</div>}
            <div style={{ marginTop: '0.75rem' }}>
              <MiniMapEmbed lat={lat} lng={lng} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
