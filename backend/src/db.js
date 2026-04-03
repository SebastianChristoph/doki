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
  // Migration: page visits
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_visits (
      id SERIAL PRIMARY KEY,
      visited_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_visits_at ON page_visits(visited_at);
  `);
  // Migration: date_year_only flag
  await pool.query(`
    ALTER TABLE photos ADD COLUMN IF NOT EXISTS date_year_only BOOLEAN DEFAULT FALSE;
  `);
  await pool.query(`
    ALTER TABLE photo_change_requests ADD COLUMN IF NOT EXISTS date_year_only BOOLEAN DEFAULT FALSE;
  `);
  // Migration: change requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS photo_change_requests (
      id SERIAL PRIMARY KEY,
      photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      title VARCHAR(255),
      date_taken DATE,
      photographer_name VARCHAR(255),
      uploader_name VARCHAR(255),
      description TEXT,
      source VARCHAR(500),
      requester_note VARCHAR(500),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_cr_status ON photo_change_requests(status);
  `);
  // Migration: error logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS error_logs (
      id SERIAL PRIMARY KEY,
      route VARCHAR(150),
      message TEXT,
      stack TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_error_logs_at ON error_logs(created_at);
  `);
}

async function logError(route, err) {
  try {
    await pool.query(
      `INSERT INTO error_logs (route, message, stack) VALUES ($1, $2, $3)`,
      [route, err?.message ?? String(err), err?.stack ?? null]
    );
  } catch (e) {
    console.error('[logError] Failed to persist error:', e.message);
  }
}

module.exports = { pool, initDb, logError };
