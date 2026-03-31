const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'db',
  port: 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS photos (
      id SERIAL PRIMARY KEY,
      lat DECIMAL(10, 7) NOT NULL,
      lng DECIMAL(10, 7) NOT NULL,
      filename VARCHAR(255) NOT NULL,
      original_filename VARCHAR(255),
      title VARCHAR(255),
      date_taken DATE,
      photographer_name VARCHAR(255),
      uploader_name VARCHAR(255),
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
    CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(lat, lng);
  `);
  // Migration: add source column if not yet present
  await pool.query(`
    ALTER TABLE photos ADD COLUMN IF NOT EXISTS source VARCHAR(500);
  `);
}

module.exports = { pool, initDb };
