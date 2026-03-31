const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');

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

const isPrivateHost = (hostname) =>
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/i.test(hostname);

// GET /api/photos — approved, grouped by location
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lat, lng, COUNT(*) AS count, array_agg(id ORDER BY created_at DESC) AS ids
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

  try {
    await pool.query(
      `INSERT INTO photos (lat, lng, filename, original_filename, title, date_taken, photographer_name, uploader_name, description, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        roundedLat,
        roundedLng,
        file.filename,
        sanitize(file.originalname),
        sanitize(title),
        date_taken || null,
        sanitize(photographer_name),
        sanitize(uploader_name),
        sanitize(description, 1000),
        sanitize(source, 500),
      ]
    );
    res.status(201).json({ message: 'Foto eingereicht. Es wird vor Veröffentlichung geprüft.' });
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
