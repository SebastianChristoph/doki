import React from 'react';
import { Link } from 'react-router-dom';

export default function Impressum() {
  return (
    <div className="impressum-page">
      <div className="impressum-card">
        <div className="impressum-nav">
          <Link to="/" className="btn-back-link">← Zurück zur Karte</Link>
        </div>
        <h1>Impressum</h1>
        <section>
          <h2>Angaben gemäß § 5 TMG</h2>
          <p>Sebastian Christoph</p>
          <p>Am Stadion 17</p>
          <p>36433 Bad Salzungen</p>
        </section>
        <section>
          <h2>Kontakt</h2>
          <p>
            E-Mail:{' '}
            <a href="mailto:hallo@sebastianchristoph.de">hallo@sebastianchristoph.de</a>
          </p>
        </section>
        <section>
          <h2>Haftungsausschluss</h2>
          <p>
            Die auf dieser Plattform hochgeladenen Fotos wurden von Nutzern eingereicht.
            Alle Uploads werden vor der Veröffentlichung geprüft. Für die Inhalte der
            hochgeladenen Fotos sind die jeweiligen Einsteller verantwortlich. Der
            Betreiber übernimmt keine Haftung für die Richtigkeit, Vollständigkeit
            oder Aktualität der eingestellten Inhalte.
          </p>
        </section>
        <section>
          <h2>Urheberrecht</h2>
          <p>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf dieser
            Seite unterliegen dem deutschen Urheberrecht. Nutzer, die Fotos einreichen,
            versichern, das Recht zur Veröffentlichung zu besitzen.
          </p>
        </section>
        <section>
          <h2>Kartendaten</h2>
          <p>
            Kartendaten © <a href="https://openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>-Mitwirkende,
            verfügbar unter der <a href="https://opendatacommons.org/licenses/odbl/" target="_blank" rel="noopener noreferrer">ODbL</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
