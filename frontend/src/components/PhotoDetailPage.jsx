import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPhotoById, getNearbyPhotos } from '../api';
import { Link as RouterLink } from 'react-router-dom';
import { copyToClipboard } from '../utils';
import EditRequestModal from './EditRequestModal';

const fmtDate = (d, yearOnly) =>
  d ? yearOnly
    ? String(new Date(d).getFullYear())
    : new Date(d).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
  : null;

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
  const [editOpen, setEditOpen] = useState(false);
  const [nearby, setNearby] = useState([]);

  useEffect(() => {
    getPhotoById(id)
      .then(p => { setPhoto(p); return getNearbyPhotos(id); })
      .then(setNearby)
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
    copyToClipboard(window.location.href).then(() => {
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
        <button className="btn-share" onClick={() => setEditOpen(true)}>+ Informationen ergänzen</button>
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
            {fmtDate(photo.date_taken, photo.date_year_only) && (
              <div><strong>Aufnahmedatum:</strong> {fmtDate(photo.date_taken, photo.date_year_only)}</div>
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
            {photo.source && (
              <div><strong>Quelle:</strong> {photo.source}</div>
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
      {nearby.length > 0 && (
        <div className="nearby-section">
          <h3 className="nearby-title">Weitere Fotos in der Nähe</h3>
          <div className="nearby-grid">
            {nearby.map(n => (
              <RouterLink key={n.id} to={`/photo/${n.id}`} className="nearby-thumb">
                <img src={`/uploads/${n.filename}`} alt={n.title || 'Foto'} />
                {(n.title || n.date_taken) && (
                  <div className="nearby-label">
                    {n.title}{n.title && n.date_taken && ' · '}{n.date_taken && n.date_taken.slice(0, 4)}
                  </div>
                )}
              </RouterLink>
            ))}
          </div>
        </div>
      )}
      {editOpen && <EditRequestModal photo={photo} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
