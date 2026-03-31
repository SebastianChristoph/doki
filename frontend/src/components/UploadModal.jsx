import React, { useState } from 'react';
import { uploadPhoto } from '../api';

export default function UploadModal({ location, onClose, onSuccess }) {
  const [mode, setMode] = useState('file'); // 'file' | 'url'
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [form, setForm] = useState({
    title: '',
    date_taken: '',
    photographer_name: '',
    uploader_name: '',
    description: '',
    source: '',
  });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'file' && !file) { setError('Bitte wähle ein Foto aus.'); return; }
    if (mode === 'url' && !imageUrl.trim()) { setError('Bitte gib eine Bild-URL ein.'); return; }
    if (!agreed) { setError('Bitte bestätige die Nutzungsbedingungen.'); return; }

    const fd = new FormData();
    if (mode === 'file') {
      fd.append('photo', file);
    } else {
      fd.append('image_url', imageUrl.trim());
    }
    fd.append('lat', location.lat);
    fd.append('lng', location.lng);
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });

    setLoading(true);
    setError('');
    try {
      await uploadPhoto(fd);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => { setMode(m); setError(''); setFile(null); setImageUrl(''); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Foto hinzufügen</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>📬</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Foto eingereicht!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 340 }}>
                Vielen Dank. Dein Foto wurde erfolgreich übermittelt und wird von einem Admin geprüft,
                bevor es auf der Karte erscheint.
              </p>
              <button className="btn-primary" style={{ marginTop: '0.5rem' }} onClick={onSuccess}>
                Schließen
              </button>
            </div>
          ) : (
            <>
              <div className="disclaimer">
                <strong>Wichtiger Hinweis:</strong> Lade nur Fotos hoch, für die du das Recht zur
                Veröffentlichung besitzt. Keine urheberrechtlich geschützten Materialien ohne
                ausdrückliche Erlaubnis. Alle Uploads werden vor Veröffentlichung geprüft.
              </div>

              <div className="upload-mode-toggle">
                <button
                  type="button"
                  className={`upload-mode-btn ${mode === 'file' ? 'active' : ''}`}
                  onClick={() => switchMode('file')}
                >
                  📁 Datei hochladen
                </button>
                <button
                  type="button"
                  className={`upload-mode-btn ${mode === 'url' ? 'active' : ''}`}
                  onClick={() => switchMode('url')}
                >
                  🔗 Bild-URL eingeben
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {mode === 'file' ? (
                  <div className="form-group">
                    <label>Foto auswählen *</label>
                    <input type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={(e) => setFile(e.target.files[0])} />
                    <small>Max. 10 MB · JPG, PNG, GIF, WebP · Bilder über 2400 px werden automatisch verkleinert</small>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Bild-URL *</label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://beispiel.de/altes-foto.jpg"
                    />
                    <small>Die App lädt das Bild vom angegebenen Link herunter · Max. 10 MB · JPG, PNG, GIF, WebP</small>
                  </div>
                )}

                <div className="form-group">
                  <label>Titel (optional)</label>
                  <input type="text" maxLength={255} value={form.title} onChange={set('title')}
                    placeholder="z. B. Rathaus um 1920" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Aufnahmedatum (optional)</label>
                    <input type="date" value={form.date_taken} onChange={set('date_taken')} />
                  </div>
                  <div className="form-group">
                    <label>Fotograf (optional)</label>
                    <input type="text" maxLength={255} value={form.photographer_name}
                      onChange={set('photographer_name')} placeholder="Name des Fotografen" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ihr Name / Nickname (optional)</label>
                  <input type="text" maxLength={255} value={form.uploader_name}
                    onChange={set('uploader_name')} placeholder="Ihr Name" />
                </div>
                <div className="form-group">
                  <label>Beschreibung (optional)</label>
                  <textarea maxLength={1000} rows={3} value={form.description}
                    onChange={set('description')} placeholder="Was ist auf dem Foto zu sehen?" />
                </div>
                <div className="form-group">
                  <label>Quelle (optional)</label>
                  <input type="text" maxLength={500} value={form.source} onChange={set('source')}
                    placeholder="z. B. Stadtarchiv Doberlug-Kirchhain, Privatsammlung Max Mustermann" />
                </div>
                <div className="form-group checkbox-group">
                  <input type="checkbox" id="agree" checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)} />
                  <label htmlFor="agree">
                    Ich bestätige, dass ich das Recht zur Veröffentlichung dieses Fotos besitze
                    und keine Urheberrechte verletze.
                  </label>
                </div>
                {error && <div className="error-msg">{error}</div>}
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? (mode === 'url' ? 'Wird geladen…' : 'Wird hochgeladen…') : 'Foto einreichen'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
