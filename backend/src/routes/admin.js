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

module.exports = router;
