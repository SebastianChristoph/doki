# DoKi – Implementierungsplan: Entdecken-Features

---

## Feature 1: Ähnliche Fotos (Detailseite)

**Ziel:** Auf `/photo/:id` unterhalb der Kartenvorschau einen Abschnitt „Weitere Fotos in der Nähe" anzeigen – andere genehmigte Fotos im Umkreis von ~200m.

### Backend
- Neuer Endpunkt: `GET /api/photos/:id/nearby`
- Lädt lat/lng des aktuellen Fotos aus der DB
- Gibt alle anderen approved Fotos zurück, deren Koordinaten innerhalb von ~200m liegen
- Distanzberechnung direkt in PostgreSQL mit der Haversine-Näherung:
  ```sql
  WHERE status = 'approved'
    AND id != $1
    AND (
      6371000 * acos(
        cos(radians($lat)) * cos(radians(lat)) *
        cos(radians(lng) - radians($lng)) +
        sin(radians($lat)) * sin(radians(lat))
      )
    ) <= 200
  ORDER BY created_at DESC
  LIMIT 12
  ```
- Gibt zurück: `id, filename, title, date_taken, date_year_only, lat, lng`

### Frontend
- `api.js`: `getNearbyPhotos(id)`
- `PhotoDetailPage.jsx`: neuer Abschnitt unter der Karte
  - Nur rendern wenn `nearbyPhotos.length > 0`
  - Kleines Thumbnail-Grid (3–4 Spalten), klickbar → navigiert zu `/photo/:id`
  - Überschrift: „Weitere Fotos in der Nähe"
- CSS: `.nearby-grid`, `.nearby-thumb` – ähnlich wie `.photo-masonry` aber kleinere feste Größe

---

## Feature 2: Zeitleiste / Jahrzehnt-Filter

**Ziel:** Auf der Karte eine horizontale Filterleiste mit Jahrzehnten (z. B. „Alle · 1900er · 1910er · … · 1990er"). Nur Fotos des gewählten Jahrzehnts werden als Marker angezeigt.

### Backend
- `GET /api/photos` bekommt optionalen Query-Parameter: `?decade=1920`
- Wenn `decade` gesetzt: `WHERE EXTRACT(DECADE FROM date_taken) * 10 = $decade`
- Fotos ohne `date_taken` erscheinen nur bei „Alle"
- Alternativ: kein Backend-Änderung nötig – alle Locations laden und clientseitig filtern (einfacher, aber schlechter bei sehr vielen Fotos). **Empfehlung: clientseitig**, da Datenvolumen überschaubar.

### Frontend
- `GET /api/photos` gibt bereits `date_taken` mit (prüfen, ggf. ergänzen)
- `MapView.jsx`:
  - State `activDecade` (null = alle)
  - `availableDecades` aus den geladenen Locations ableiten (welche Jahrzehnte kommen vor?)
  - Gefilterte Marker nur für passende Locations anzeigen
- UI: horizontale scrollbare Leiste direkt unter dem Header
  - Buttons: „Alle", „1900er", „1910er", … nur Jahrzehnte die tatsächlich Fotos haben
  - Aktives Jahrzehnt hervorgehoben (amber)
- CSS: `.decade-bar`, `.decade-btn`, `.decade-btn.active`

### Datenanpassung
- `GET /api/photos` muss pro Location auch `date_taken` der enthaltenen Fotos mitliefern (mind. das früheste/späteste oder alle Jahre als Array)
- Einfachste Lösung: `array_agg(date_taken)` im GROUP BY Query ergänzen

---

## Feature 3: Zufälliges Foto („Überrasch mich")

**Ziel:** Button auf der Hauptseite, der zufällig ein genehmigtes Foto auswählt und dessen Detailseite öffnet.

### Backend
- Neuer Endpunkt: `GET /api/photos/random`
- `SELECT id FROM photos WHERE status = 'approved' ORDER BY RANDOM() LIMIT 1`
- Gibt `{ id }` zurück
- Achtung: Route muss **vor** `/:id` registriert werden, damit „random" nicht als ID interpretiert wird

### Frontend
- `api.js`: `getRandomPhoto()`
- `MapView.jsx`: „Überrasch mich"-Button im Header (neben dem ℹ-Button)
  - Klick → `getRandomPhoto()` → `navigate('/photo/' + id)`
  - Kurzer Ladezustand (Button disabled + kleiner Spinner-Text)
- CSS: `.btn-surprise` – auffälliger als die anderen Buttons, z. B. amber-Hintergrund

---

## Reihenfolge

1. ~~**Feature 3**~~ ✅ implementiert
2. ~~**Feature 1**~~ ✅ implementiert
3. ~~**Feature 2**~~ ✅ implementiert
