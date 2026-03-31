import React, { useState, useEffect } from 'react';
import { adminLogin, getPendingPhotos, updatePhotoStatus } from '../api';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('de-DE') : '–';

export default function AdminPanel() {
  const [token, setToken] = useState(() => localStorage.getItem('dokiAdminToken') || '');
  const [password, setPassword] = useState('');
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPhotos = async (t) => {
    setLoading(true);
    try {
      const data = await getPendingPhotos(t);
      setPhotos(data);
    } catch (err) {
      if (err.message.includes('autorisiert') || err.message.includes('Token')) {
        logout();
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) loadPhotos(token); }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { token: t } = await adminLogin(password);
      localStorage.setItem('dokiAdminToken', t);
      setToken(t);
    } catch (err) {
      setError(err.message);
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('dokiAdminToken');
  };

  const handleStatus = async (id, status) => {
    try {
      await updatePhotoStatus(id, status, token);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (!token) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <h1>Admin-Bereich</h1>
          <p>Historische Fotos Doberlug-Kirchhain</p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn-primary">Anmelden</button>
          </form>
          <a href="/" className="back-link">← Zur Karte</a>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Ausstehende Uploads {photos.length > 0 && `(${photos.length})`}</h1>
        <div className="admin-actions">
          <a href="/" className="btn-secondary">← Zur Karte</a>
          <button className="btn-secondary" onClick={logout}>Abmelden</button>
        </div>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="loading">Lade…</div>
      ) : photos.length === 0 ? (
        <div className="empty-state">
          <p>Keine ausstehenden Uploads. Alles erledigt!</p>
        </div>
      ) : (
        <div className="admin-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="admin-card">
              <img src={`/uploads/${photo.filename}`} alt={photo.title || 'Foto'} className="admin-photo" />
              <div className="admin-card-info">
                <div className="admin-card-meta">
                  <div><strong>Titel:</strong> {photo.title || '–'}</div>
                  <div><strong>Aufnahmedatum:</strong> {fmtDate(photo.date_taken)}</div>
                  <div><strong>Fotograf:</strong> {photo.photographer_name || '–'}</div>
                  <div><strong>Eingereicht von:</strong> {photo.uploader_name || '–'}</div>
                  <div><strong>Koordinaten:</strong> {photo.lat}, {photo.lng}</div>
                  <div><strong>Eingereicht am:</strong> {fmtDate(photo.created_at)}</div>
                  {photo.description && <div><strong>Beschreibung:</strong> {photo.description}</div>}
                </div>
                <div className="admin-card-actions">
                  <button className="btn-approve" onClick={() => handleStatus(photo.id, 'approved')}>
                    ✓ Freigeben
                  </button>
                  <button className="btn-reject" onClick={() => handleStatus(photo.id, 'rejected')}>
                    ✗ Ablehnen
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
