const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');

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
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    allowed.includes(file.mimetype)
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
              photographer_name, uploader_name, description, lat, lng, created_at
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

// POST /api/photos — submit new photo
router.post('/', uploadLimiter, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen' });

  // Resize if dimensions exceed 2400 px on either side (GIF skipped — animated frames)
  if (req.file.mimetype !== 'image/gif') {
    try {
      const meta = await sharp(req.file.path).metadata();
      if ((meta.width ?? 0) > 2400 || (meta.height ?? 0) > 2400) {
        const buf = await sharp(req.file.path)
          .resize(2400, 2400, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();
        fs.writeFileSync(req.file.path, buf);
      }
    } catch { /* proceed with original if sharp fails */ }
  }

  const { lat, lng, title, date_taken, photographer_name, uploader_name, description } = req.body;
  if (!lat || !lng) return res.status(400).json({ error: 'Koordinaten fehlen' });

  const roundedLat = parseFloat(lat).toFixed(7);
  const roundedLng = parseFloat(lng).toFixed(7);

  try {
    await pool.query(
      `INSERT INTO photos (lat, lng, filename, original_filename, title, date_taken, photographer_name, uploader_name, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        roundedLat,
        roundedLng,
        req.file.filename,
        sanitize(req.file.originalname),
        sanitize(title),
        date_taken || null,
        sanitize(photographer_name),
        sanitize(uploader_name),
        sanitize(description, 1000),
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
              photographer_name, uploader_name, description, created_at
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
