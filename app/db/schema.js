const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/settings.db');
const nodeMajor = parseInt(process.version.slice(1));
let db;

function getDb() {
  if (db) return db;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (nodeMajor >= 22) {
    const { DatabaseSync } = require('node:sqlite');
    const raw = new DatabaseSync(dbPath);
    raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    db = wrapNodeSqlite(raw);
  } else {
    const BetterSqlite = require('better-sqlite3');
    const raw = new BetterSqlite(dbPath);
    raw.pragma('journal_mode = WAL');
    raw.pragma('foreign_keys = ON');
    db = raw;
  }
  return db;
}

function wrapNodeSqlite(raw) {
  return {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => (...args) => {
      raw.exec('BEGIN');
      try {
        const r = fn(...args);
        raw.exec('COMMIT');
        return r;
      } catch (err) {
        raw.exec('ROLLBACK');
        throw err;
      }
    }
  };
}

function initDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      burn_type TEXT NOT NULL DEFAULT 'Engraving',
      lens_mm INTEGER NOT NULL DEFAULT 150,
      -- Laser parameters
      speed_mms REAL,
      dwell_time_us REAL,
      frequency_khz REAL,
      pulse_width INTEGER,
      passes INTEGER DEFAULT 1,
      line_interval_mm REAL,
      -- Photo mode
      dpi INTEGER,
      image_mode TEXT,
      -- Special
      defocus_mm REAL,
      wobble_enabled BOOLEAN DEFAULT 0,
      wobble_amplitude_mm REAL,
      wobble_frequency_hz REAL,
      fill_type TEXT,
      rotary_enabled BOOLEAN DEFAULT 0,
      rotary_type TEXT,
      -- Meta
      is_commarker_reference BOOLEAN DEFAULT 0,
      result_rating INTEGER CHECK(result_rating BETWEEN 1 AND 5),
      result_notes TEXT,
      image_path TEXT,
      is_favorite BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      burn_type TEXT NOT NULL,
      lens_mm INTEGER NOT NULL,
      speed_mms REAL,
      dwell_time_us REAL,
      frequency_khz REAL,
      pulse_width INTEGER,
      passes INTEGER,
      line_interval_mm REAL,
      dpi INTEGER,
      worked INTEGER DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Run any pending migrations for existing DBs
  migrate(db);
}

function migrate(db) {
  const cols = db.prepare("PRAGMA table_info(settings)").all().map(c => c.name);
  const add = (col, def) => {
    if (!cols.includes(col)) db.exec(`ALTER TABLE settings ADD COLUMN ${col} ${def}`);
  };
  add('burn_type', "TEXT NOT NULL DEFAULT 'Engraving'");
  add('dwell_time_us', 'REAL');
  add('pulse_width', 'INTEGER');
  add('dpi', 'INTEGER');
  add('image_mode', 'TEXT');
  add('defocus_mm', 'REAL');
  add('is_commarker_reference', 'BOOLEAN DEFAULT 0');
}

module.exports = { getDb, initDb };
