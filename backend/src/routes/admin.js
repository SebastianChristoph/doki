const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { pool } = require('../db');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Nicht autorisiert' });
  try {
    req.admin = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token ungültig oder abgelaufen' });
  }
}

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort fehlt' });

  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH);
  if (!valid) return res.status(401).json({ error: 'Falsches Passwort' });

  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

// GET /api/admin/photos — pending
router.get('/photos', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM photos WHERE status = 'pending' ORDER BY created_at ASC`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/admin/photos/approved — approved photos
router.get('/photos/approved', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM photos WHERE status = 'approved' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// PATCH /api/admin/photos/:id — approve or reject
router.patch('/photos/:id', auth, async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }
  try {
    const result = await pool.query(
      `UPDATE photos SET status = $1 WHERE id = $2 RETURNING id`,
      [status, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ message: 'Aktualisiert' });
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// DELETE /api/admin/photos/:id — delete photo and file
router.delete('/photos/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM photos WHERE id = $1 RETURNING filename`,
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Nicht gefunden' });
    fs.unlink(`/app/uploads/${result.rows[0].filename}`, () => {});
    res.json({ message: 'Gelöscht' });
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/admin/stats — visit counts
router.get('/stats', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE visited_at >= NOW() - INTERVAL '1 day')   AS today,
        COUNT(*) FILTER (WHERE visited_at >= NOW() - INTERVAL '7 days')  AS week,
        COUNT(*) FILTER (WHERE visited_at >= NOW() - INTERVAL '30 days') AS month,
        COUNT(*) AS total
      FROM page_visits
    `);
    const daily = await pool.query(`
      SELECT DATE(visited_at AT TIME ZONE 'Europe/Berlin') AS day, COUNT(*) AS visits
      FROM page_visits
      WHERE visited_at >= NOW() - INTERVAL '30 days'
      GROUP BY day ORDER BY day ASC
    `);
    res.json({ summary: result.rows[0], daily: daily.rows });
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// GET /api/admin/change-requests — pending change requests
router.get('/change-requests', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cr.*,
             p.title AS current_title, p.date_taken AS current_date_taken,
             p.photographer_name AS current_photographer_name, p.uploader_name AS current_uploader_name,
             p.description AS current_description, p.source AS current_source,
             p.filename, p.lat, p.lng
      FROM photo_change_requests cr
      JOIN photos p ON p.id = cr.photo_id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at ASC
    `);
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// POST /api/admin/change-requests/:id/approve — apply changes to photo
router.post('/change-requests/:id/approve', auth, async (req, res) => {
  try {
    const crRes = await pool.query(
      `SELECT * FROM photo_change_requests WHERE id = $1 AND status = 'pending'`,
      [req.params.id]
    );
    if (!crRes.rows.length) return res.status(404).json({ error: 'Nicht gefunden' });
    const cr = crRes.rows[0];

    await pool.query(
      `UPDATE photos SET title=$1, date_taken=$2, date_year_only=$3, photographer_name=$4,
          uploader_name=$5, description=$6, source=$7 WHERE id=$8`,
      [cr.title, cr.date_taken, cr.date_year_only, cr.photographer_name, cr.uploader_name, cr.description, cr.source, cr.photo_id]
    );
    await pool.query(
      `UPDATE photo_change_requests SET status='approved' WHERE id=$1`,
      [req.params.id]
    );
    res.json({ message: 'Änderung freigegeben' });
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

// DELETE /api/admin/change-requests/:id — reject
router.delete('/change-requests/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE photo_change_requests SET status='rejected' WHERE id=$1 AND status='pending' RETURNING id`,
      [req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json({ message: 'Abgelehnt' });
  } catch {
    res.status(500).json({ error: 'Datenbankfehler' });
  }
});

module.exports = router;
