const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/settings.db');

// Use built-in node:sqlite on Node 22+, otherwise better-sqlite3 (Node 20 LXC)
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

// Thin wrapper so node:sqlite matches better-sqlite3's API surface
function wrapNodeSqlite(raw) {
  return {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => {
      return (...args) => {
        raw.exec('BEGIN');
        try {
          const result = fn(...args);
          raw.exec('COMMIT');
          return result;
        } catch (err) {
          raw.exec('ROLLBACK');
          throw err;
        }
      };
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
      subcategory TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      lens_mm INTEGER DEFAULT 150,
      power_percent REAL,
      speed_mms REAL,
      frequency_khz REAL,
      passes INTEGER DEFAULT 1,
      line_interval_mm REAL DEFAULT 0.08,
      overlap_mm REAL DEFAULT 0.03,
      wobble_enabled BOOLEAN DEFAULT 0,
      wobble_amplitude_mm REAL,
      wobble_frequency_hz REAL,
      fill_type TEXT,
      rotary_enabled BOOLEAN DEFAULT 0,
      rotary_type TEXT,
      result_rating INTEGER CHECK(result_rating BETWEEN 1 AND 5),
      result_notes TEXT,
      image_path TEXT,
      is_favorite BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (material_id) REFERENCES materials(id)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

module.exports = { getDb, initDb };
