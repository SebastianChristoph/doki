require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDb, pool } = require('./db');
const photosRouter = require('./routes/photos');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('/app/uploads'));
app.use('/api/photos', photosRouter);
app.use('/api/admin', adminRouter);

const visitLimiter = rateLimit({ windowMs: 30 * 60 * 1000, max: 3, standardHeaders: false, legacyHeaders: false });
app.post('/api/visits', visitLimiter, async (req, res) => {
  try {
    await pool.query(`INSERT INTO page_visits DEFAULT VALUES`);
    res.status(204).end();
  } catch {
    res.status(500).end();
  }
});

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Datei zu groß (max. 10 MB)' });
  res.status(400).json({ error: err.message });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
