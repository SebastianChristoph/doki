require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const photosRouter = require('./routes/photos');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('/app/uploads'));
app.use('/api/photos', photosRouter);
app.use('/api/admin', adminRouter);

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Datei zu groß (max. 10 MB)' });
  res.status(400).json({ error: err.message });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
