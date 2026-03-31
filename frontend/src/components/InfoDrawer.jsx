import React from 'react';

export default function InfoDrawer({ isOpen, onClose }) {
  return (
    <>
      {isOpen && <div className="drawer-overlay" onClick={onClose} />}
      <aside className={`drawer ${isOpen ? 'drawer-open' : ''}`} aria-hidden={!isOpen}>
        <div className="drawer-header">
          <h2>Über Doki</h2>
          <button className="drawer-close" onClick={onClose} aria-label="Schließen">×</button>
        </div>
        <div className="drawer-body">
          <section className="drawer-section">
            <h3>Was ist Doki?</h3>
            <p>
              Doki ist ein gemeinschaftliches Foto-Archiv für Doberlug-Kirchhain.
              Bürger und Heimatforscher können historische Aufnahmen direkt auf der
              Karte hinterlegen – und so gemeinsam an einem lebendigen Stadtgedächtnis mitwirken.
            </p>
          </section>
          <section className="drawer-section">
            <h3>📍 Foto hinzufügen</h3>
            <p>
              Klicke auf einen beliebigen Ort auf der Karte innerhalb von
              Doberlug-Kirchhain. Es öffnet sich ein Formular, in dem du dein
              historisches Foto hochladen und optional Metadaten angeben kannst.
            </p>
          </section>
          <section className="drawer-section">
            <h3>🔍 Fotos ansehen</h3>
            <p>
              Klicke auf eine goldene Markierung, um alle Fotos an diesem Ort
              zu sehen. Zeigt die Markierung eine Zahl, liegen dort mehrere Fotos.
              Jedes Foto hat eine eigene Detailseite, die du teilen kannst.
            </p>
          </section>
          <section className="drawer-section">
            <h3>✅ Freigabe-Prozess</h3>
            <p>
              Alle eingereichten Fotos werden vor der Veröffentlichung von einem
              Administrator geprüft, um Qualität und Rechtmäßigkeit sicherzustellen.
            </p>
          </section>
          <section className="drawer-section">
            <h3>⚖️ Was ist erlaubt?</h3>
            <p>
              Nur Fotos, für die du das Recht zur Veröffentlichung besitzt.
              Keine urheberrechtlich geschützten Bilder ohne ausdrückliche Erlaubnis
              des Rechteinhabers. Keine anstößigen oder illegalen Inhalte.
            </p>
          </section>
          <section className="drawer-section">
            <h3>📏 Bildgröße</h3>
            <p>
              Maximale Dateigröße: <strong>10 MB</strong>.
              Optimal sind Dateien zwischen 500 KB und 5 MB.
              Sehr kleine Dateien unter 5 KB werden abgelehnt.
            </p>
          </section>
        </div>
      </aside>
    </>
  );
}
