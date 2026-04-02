const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { notifyNewUpload, notifyNewChangeRequest } = require('../mailer');

const MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/webp': '.webp' };
const ALLOWED_MIME = Object.keys(MIME_EXT);

const storage = multer.diskStorage({
  destination: '/app/uploads',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    ALLOWED_MIME.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Nur Bilddateien erlaubt (JPG, PNG, GIF, WebP)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Zu viele Uploads. Bitte warte 15 Minuten.' },
});

const sanitize = (s, maxLen = 255) =>
  s ? String(s).trim().slice(0, maxLen) : null;

const parseDate = (raw) => {
  if (!raw) return { dateTaken: null, yearOnly: false };
  const s = String(raw).trim();
  if (/^\d{4}$/.test(s)) return { dateTaken: `${s}-01-01`, yearOnly: true };
  return { dateTaken: s, yearOnly: false };
};

const isPrivateHost = (hostname) =>
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(hostname);

// GET /api/photos/archive-info — total count + latest approved photo
router.get('/archive-info', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM photos WHERE status = 'approved') AS count,
        id, title
      FROM photos WHERE status = 'approved'
      ORDER BY created_at DESC LIMIT 1
    `);
    if (!result.rows.length) return res.json({ count: 0, latest: null });
    const { count, id, title } = result.rows[0];
    res.json({ count: parseInt(count), latest: { id, title } });
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/photos/random — random approved photo
router.get('/random', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id FROM photos WHERE status = 'approved' ORDER BY RANDOM() LIMIT 1`
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Keine Fotos vorhanden' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/photos — approved, grouped by location (with decade info)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lat, lng, COUNT(*) AS count,
             array_agg(id ORDER BY created_at DESC) AS ids,
             array_agg(EXTRACT(YEAR FROM date_taken)::int ORDER BY created_at DESC) FILTER (WHERE date_taken IS NOT NULL) AS years
      FROM photos
      WHERE status = 'approved'
      GROUP BY lat, lng
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/photos/location?lat=&lng= — all approved at a location
router.get('/location', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'lat und lng erforderlich' });
  try {
    const result = await pool.query(
      `SELECT id, filename, original_filename, title, date_taken,
              photographer_name, uploader_name, description, source, lat, lng, created_at
       FROM photos
       WHERE status = 'approved' AND lat = $1 AND lng = $2
       ORDER BY created_at DESC`,
      [parseFloat(lat).toFixed(7), parseFloat(lng).toFixed(7)]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// POST /api/photos — submit new photo (file upload or URL)
router.post('/', uploadLimiter, upload.single('photo'), async (req, res) => {
  let file = req.file;

  // URL mode: fetch image server-side
  if (!file) {
    const imageUrl = req.body.image_url?.trim();
    if (!imageUrl) return res.status(400).json({ error: 'Keine Datei und keine URL angegeben' });

    let parsedUrl;
    try { parsedUrl = new URL(imageUrl); }
    catch { return res.status(400).json({ error: 'Ungültige URL' }); }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Nur HTTP- und HTTPS-URLs sind erlaubt' });
    }
    if (isPrivateHost(parsedUrl.hostname)) {
      return res.status(400).json({ error: 'Diese URL ist nicht erlaubt' });
    }

    let response;
    try {
      response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'DoKi-HistoricalPhotos/1.0' },
      });
    } catch {
      return res.status(400).json({ error: 'Bild konnte nicht geladen werden (Timeout oder Verbindungsfehler)' });
    }

    if (!response.ok) {
      return res.status(400).json({ error: `Bild konnte nicht geladen werden (HTTP ${response.status})` });
    }

    // SSRF check after redirect
    try {
      if (isPrivateHost(new URL(response.url).hostname)) {
        return res.status(400).json({ error: 'Diese URL ist nicht erlaubt' });
      }
    } catch {}

    const contentType = response.headers.get('content-type') || '';
    const mime = ALLOWED_MIME.find((t) => contentType.includes(t));
    if (!mime) {
      return res.status(400).json({ error: 'URL enthält kein unterstütztes Bildformat (JPG, PNG, GIF, WebP)' });
    }

    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Bild über URL ist zu groß (max. 10 MB)' });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${MIME_EXT[mime]}`;
    const filePath = `/app/uploads/${filename}`;
    fs.writeFileSync(filePath, buf);

    file = { filename, path: filePath, mimetype: mime, size: buf.length, originalname: filename };
  }

  // Resize if dimensions exceed 2400 px (GIF skipped — animated frames)
  if (file.mimetype !== 'image/gif') {
    try {
      const meta = await sharp(file.path).metadata();
      if ((meta.width ?? 0) > 2400 || (meta.height ?? 0) > 2400) {
        const buf = await sharp(file.path)
          .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();
        fs.writeFileSync(file.path, buf);
      }
    } catch { /* proceed with original if sharp fails */ }
  }

  const { lat, lng, title, date_taken, photographer_name, uploader_name, description, source } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'Koordinaten fehlen' });

  const roundedLat = parseFloat(lat).toFixed(7);
  const roundedLng = parseFloat(lng).toFixed(7);
  const { dateTaken, yearOnly } = parseDate(date_taken);

  try {
    await pool.query(
      `INSERT INTO photos (lat, lng, filename, original_filename, title, date_taken, date_year_only, photographer_name, uploader_name, description, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        roundedLat,
        roundedLng,
        file.filename,
        sanitize(file.originalname),
        sanitize(title),
        dateTaken,
        yearOnly,
        sanitize(photographer_name),
        sanitize(uploader_name),
        sanitize(description, 1000),
        sanitize(source, 500),
      ]
    );
    notifyNewUpload({ title: sanitize(title), uploader_name: sanitize(uploader_name), lat: roundedLat, lng: roundedLng });
    res.status(201).json({ message: 'Foto eingereicht. Es wird vor Veröffentlichung geprüft.' });
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/photos/:id/nearby — approved photos within ~200m
router.get('/:id/nearby', async (req, res) => {
  try {
    const base = await pool.query(
      `SELECT lat, lng FROM photos WHERE id = $1 AND status = 'approved'`,
      [req.params.id]
    );
    if (!base.rows.length) return res.status(404).json({ error: 'Foto nicht gefunden' });
    const { lat, lng } = base.rows[0];
    const result = await pool.query(
      `SELECT id, filename, title, date_taken, date_year_only, lat, lng
       FROM photos
       WHERE status = 'approved' AND id != $1
         AND (6371000 * acos(LEAST(1, cos(radians($2)) * cos(radians(lat::float))
           * cos(radians(lng::float) - radians($3))
           + sin(radians($2)) * sin(radians(lat::float))))) <= 200
       ORDER BY created_at DESC LIMIT 12`,
      [req.params.id, parseFloat(lat), parseFloat(lng)]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// POST /api/photos/:id/change-request — submit metadata edit request
router.post('/:id/change-request', uploadLimiter, async (req, res) => {
  try {
    const check = await pool.query(
      `SELECT id FROM photos WHERE id = $1 AND status = 'approved'`,
      [req.params.id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Foto nicht gefunden' });

    const { title, date_taken, photographer_name, uploader_name, description, source, requester_note } = req.body;

    const { dateTaken: crDate, yearOnly: crYearOnly } = parseDate(req.body.date_taken);
    await pool.query(
      `INSERT INTO photo_change_requests
         (photo_id, title, date_taken, date_year_only, photographer_name, uploader_name, description, source, requester_note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        req.params.id,
        sanitize(req.body.title),
        crDate,
        crYearOnly,
        sanitize(req.body.photographer_name),
        sanitize(req.body.uploader_name),
        sanitize(req.body.description, 1000),
        sanitize(req.body.source, 500),
        sanitize(req.body.requester_note, 500),
      ]
    );
    notifyNewChangeRequest(req.params.id, sanitize(req.body.requester_note, 500));
    res.status(201).json({ message: 'Änderungsantrag eingereicht. Er wird von einem Admin geprüft.' });
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/photos/:id — single approved photo (for shareable detail page)
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, lat, lng, filename, original_filename, title, date_taken,
              photographer_name, uploader_name, description, source, created_at
       FROM photos WHERE id = $1 AND status = 'approved'`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Foto nicht gefunden' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

module.exports = router;
