import React, { useState } from 'react';
import { submitChangeRequest } from '../api';

export default function EditRequestModal({ photo, onClose }) {
  const [form, setForm] = useState({
    title: photo.title || '',
    date_taken: photo.date_year_only && photo.date_taken
      ? photo.date_taken.slice(0, 4)
      : photo.date_taken ? photo.date_taken.slice(0, 10) : '',
    photographer_name: photo.photographer_name || '',
    uploader_name: photo.uploader_name || '',
    description: photo.description || '',
    source: photo.source || '',
    requester_note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitChangeRequest(photo.id, form);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Foto bearbeiten</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {done ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '2.5rem' }}>📬</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Änderungsantrag eingereicht!</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 340 }}>
                Deine Änderungen wurden übermittelt und werden von einem Admin geprüft,
                bevor sie übernommen werden.
              </p>
              <button className="btn-primary" style={{ marginTop: '0.5rem' }} onClick={onClose}>
                Schließen
              </button>
            </div>
          ) : (
            <>
              <div className="disclaimer">
                Deine Änderungen werden als Antrag gespeichert und erst nach Admin-Prüfung übernommen.
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Titel</label>
                  <input type="text" maxLength={255} value={form.title} onChange={set('title')} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Aufnahmedatum</label>
                    <input type="text" value={form.date_taken} onChange={set('date_taken')}
                      placeholder="z. B. 1923 oder 1923-08-15" maxLength={10} />
                  </div>
                  <div className="form-group">
                    <label>Fotograf</label>
                    <input type="text" maxLength={255} value={form.photographer_name} onChange={set('photographer_name')} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ihr Name / Nickname</label>
                  <input type="text" maxLength={255} value={form.uploader_name} onChange={set('uploader_name')} />
                </div>
                <div className="form-group">
                  <label>Beschreibung</label>
                  <textarea maxLength={1000} rows={3} value={form.description} onChange={set('description')} />
                </div>
                <div className="form-group">
                  <label>Quelle</label>
                  <input type="text" maxLength={500} value={form.source} onChange={set('source')} />
                </div>
                <div className="form-group">
                  <label>Hinweis zur Änderung (optional)</label>
                  <input type="text" maxLength={500} value={form.requester_note}
                    onChange={set('requester_note')} placeholder="z. B. Quelle nachgetragen" />
                </div>
                {error && <div className="error-msg">{error}</div>}
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? 'Wird eingereicht…' : 'Änderung einreichen'}
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
