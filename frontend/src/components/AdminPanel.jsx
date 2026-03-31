import React, { useState, useEffect } from 'react';
import { adminLogin, getPendingPhotos, getApprovedPhotos, updatePhotoStatus, deletePhoto } from '../api';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('de-DE') : '–');

function MiniMapEmbed({ lat, lng }) {
  const latF = parseFloat(lat);
  const lngF = parseFloat(lng);
  const delta = 0.003;
  const bbox = `${lngF - delta},${latF - delta},${lngF + delta},${latF + delta}`;
  return (
    <iframe
      title="Kartenvorschau"
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latF},${lngF}`}
      className="admin-mini-map"
      loading="lazy"
    />
  );
}

export default function AdminPanel() {
  const [token, setToken] = useState(() => localStorage.getItem('dokiAdminToken') || '');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPending = async (t) => {
    setLoading(true);
    try { setPending(await getPendingPhotos(t)); }
    catch (err) { handleAuthError(err); }
    finally { setLoading(false); }
  };

  const loadApproved = async (t) => {
    setLoading(true);
    try { setApproved(await getApprovedPhotos(t)); }
    catch (err) { handleAuthError(err); }
    finally { setLoading(false); }
  };

  const handleAuthError = (err) => {
    if (err.message.includes('autorisiert') || err.message.includes('Token')) logout();
    setError(err.message);
  };

  useEffect(() => {
    if (!token) return;
    loadPending(token);
  }, [token]);

  const switchTab = (t) => {
    setTab(t);
    setError('');
    if (t === 'approved' && approved.length === 0) loadApproved(token);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { token: t } = await adminLogin(password);
      localStorage.setItem('dokiAdminToken', t);
      setToken(t);
    } catch (err) { setError(err.message); }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('dokiAdminToken');
  };

  const handleStatus = async (id, status) => {
    try {
      await updatePhotoStatus(id, status, token);
      setPending((prev) => prev.filter((p) => p.id !== id));
      if (status === 'approved') setApproved([]); // force reload next time
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Dieses Foto wirklich löschen?')) return;
    try {
      await deletePhoto(id, token);
      setApproved((prev) => prev.filter((p) => p.id !== id));
    } catch (err) { setError(err.message); }
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

  const currentPhotos = tab === 'pending' ? pending : approved;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Fotoarchiv-Verwaltung</h1>
        <div className="admin-actions">
          <a href="/" className="btn-secondary">← Zur Karte</a>
          <button className="btn-secondary" onClick={logout}>Abmelden</button>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => switchTab('pending')}
        >
          Ausstehend {pending.length > 0 && <span className="tab-badge">{pending.length}</span>}
        </button>
        <button
          className={`admin-tab ${tab === 'approved' ? 'active' : ''}`}
          onClick={() => switchTab('approved')}
        >
          Freigegeben {approved.length > 0 && <span className="tab-badge">{approved.length}</span>}
        </button>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="loading">Lade…</div>
      ) : currentPhotos.length === 0 ? (
        <div className="empty-state">
          <p>{tab === 'pending' ? 'Keine ausstehenden Uploads. Alles erledigt!' : 'Noch keine freigegebenen Fotos.'}</p>
        </div>
      ) : (
        <div className="admin-grid">
          {currentPhotos.map((photo) => (
            <div key={photo.id} className="admin-card">
              <img src={`/uploads/${photo.filename}`} alt={photo.title || 'Foto'} className="admin-photo" />
              <MiniMapEmbed lat={photo.lat} lng={photo.lng} />
              <div className="admin-card-info">
                <div className="admin-card-meta">
                  <div><strong>Titel:</strong> {photo.title || '–'}</div>
                  <div><strong>Aufnahmedatum:</strong> {fmtDate(photo.date_taken)}</div>
                  <div><strong>Fotograf:</strong> {photo.photographer_name || '–'}</div>
                  <div><strong>Eingereicht von:</strong> {photo.uploader_name || '–'}</div>
                  <div><strong>Koordinaten:</strong> {parseFloat(photo.lat).toFixed(5)}° N, {parseFloat(photo.lng).toFixed(5)}° E</div>
                  <div><strong>Eingereicht am:</strong> {fmtDate(photo.created_at)}</div>
                  {photo.description && <div><strong>Beschreibung:</strong> {photo.description}</div>}
                </div>
                <div className="admin-card-actions">
                  {tab === 'pending' ? (
                    <>
                      <button className="btn-approve" onClick={() => handleStatus(photo.id, 'approved')}>
                        ✓ Freigeben
                      </button>
                      <button className="btn-reject" onClick={() => handleStatus(photo.id, 'rejected')}>
                        ✗ Ablehnen
                      </button>
                    </>
                  ) : (
                    <button className="btn-reject" style={{ flex: 1 }} onClick={() => handleDelete(photo.id)}>
                      🗑 Löschen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
