import React, { useState, useEffect } from 'react';
import { adminLogin, getPendingPhotos, getApprovedPhotos, updatePhotoStatus, deletePhoto,
  getChangeRequests, approveChangeRequest, rejectChangeRequest, getVisitStats } from '../api';

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
  const [changeRequests, setChangeRequests] = useState([]);
  const [stats, setStats] = useState(null);
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

  const loadChangeRequests = async (t) => {
    setLoading(true);
    try { setChangeRequests(await getChangeRequests(t)); }
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
    if (t === 'changes') loadChangeRequests(token);
    if (t === 'stats') loadStats(token);
  };

  const loadStats = async (t) => {
    setLoading(true);
    try { setStats(await getVisitStats(t)); }
    catch (err) { handleAuthError(err); }
    finally { setLoading(false); }
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

  const handleApproveChange = async (id) => {
    try {
      await approveChangeRequest(id, token);
      setChangeRequests((prev) => prev.filter((c) => c.id !== id));
    } catch (err) { setError(err.message); }
  };

  const handleRejectChange = async (id) => {
    try {
      await rejectChangeRequest(id, token);
      setChangeRequests((prev) => prev.filter((c) => c.id !== id));
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

  const currentPhotos = tab === 'pending' ? pending : tab === 'approved' ? approved : [];

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
        <button
          className={`admin-tab ${tab === 'changes' ? 'active' : ''}`}
          onClick={() => switchTab('changes')}
        >
          Änderungsanträge {changeRequests.length > 0 && <span className="tab-badge">{changeRequests.length}</span>}
        </button>
        <button
          className={`admin-tab ${tab === 'stats' ? 'active' : ''}`}
          onClick={() => switchTab('stats')}
        >
          Statistik
        </button>
      </div>

      {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div className="loading">Lade…</div>
      ) : tab === 'stats' ? (
        !stats ? null : (
          <div className="stats-panel">
            <div className="stats-summary">
              <div className="stats-card"><div className="stats-num">{stats.summary.today}</div><div className="stats-label">Heute</div></div>
              <div className="stats-card"><div className="stats-num">{stats.summary.week}</div><div className="stats-label">7 Tage</div></div>
              <div className="stats-card"><div className="stats-num">{stats.summary.month}</div><div className="stats-label">30 Tage</div></div>
              <div className="stats-card"><div className="stats-num">{stats.summary.total}</div><div className="stats-label">Gesamt</div></div>
            </div>
            <h3 style={{ margin: '1.5rem 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Letzte 30 Tage</h3>
            <div className="stats-chart">
              {stats.daily.map((row) => {
                const max = Math.max(...stats.daily.map((r) => parseInt(r.visits)), 1);
                const pct = Math.max(4, (parseInt(row.visits) / max) * 100);
                return (
                  <div key={row.day} className="stats-bar-col" title={`${row.day}: ${row.visits}`}>
                    <div className="stats-bar" style={{ height: `${pct}%` }} />
                    <div className="stats-bar-label">{row.day.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : tab === 'changes' ? (
        changeRequests.length === 0 ? (
          <div className="empty-state"><p>Keine offenen Änderungsanträge.</p></div>
        ) : (
          <div className="admin-grid">
            {changeRequests.map((cr) => (
              <div key={cr.id} className="admin-card">
                <img src={`/uploads/${cr.filename}`} alt={cr.current_title || 'Foto'} className="admin-photo" />
                <div className="admin-card-info">
                  <div className="admin-card-meta">
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Foto #{cr.photo_id} · Antrag vom {fmtDate(cr.created_at)}
                      {cr.requester_note && <span> · <em>{cr.requester_note}</em></span>}
                    </div>
                    {[
                      ['Titel', 'current_title', 'title'],
                      ['Aufnahmedatum', 'current_date_taken', 'date_taken'],
                      ['Fotograf', 'current_photographer_name', 'photographer_name'],
                      ['Eingereicht von', 'current_uploader_name', 'uploader_name'],
                      ['Beschreibung', 'current_description', 'description'],
                      ['Quelle', 'current_source', 'source'],
                    ].map(([label, curKey, newKey]) => {
                      const cur = cr[curKey] ? fmtDate(cr[curKey]) === fmtDate(cr[curKey]) && curKey.includes('date') ? fmtDate(cr[curKey]) : cr[curKey] : '–';
                      const neu = cr[newKey] ? curKey.includes('date') ? fmtDate(cr[newKey]) : cr[newKey] : '–';
                      const changed = (cr[curKey] || '') !== (cr[newKey] || '');
                      return (
                        <div key={label} className={`cr-field${changed ? ' cr-field-changed' : ''}`}>
                          <strong>{label}:</strong>
                          {changed ? (
                            <span>
                              <span className="cr-old">{cur}</span>
                              {' → '}
                              <span className="cr-new">{neu}</span>
                            </span>
                          ) : (
                            <span>{cur}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="admin-card-actions">
                    <button className="btn-approve" onClick={() => handleApproveChange(cr.id)}>✓ Übernehmen</button>
                    <button className="btn-reject" onClick={() => handleRejectChange(cr.id)}>✗ Ablehnen</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
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
