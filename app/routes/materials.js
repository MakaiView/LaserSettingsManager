const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

const ENTRY_QUERY = `
  SELECT m.id, m.name, m.category, m.subcategory, m.notes,
         m.created_at, m.updated_at,
         s.id as settings_id, s.lens_mm, s.power_percent, s.speed_mms,
         s.frequency_khz, s.passes, s.line_interval_mm, s.overlap_mm,
         s.wobble_enabled, s.wobble_amplitude_mm, s.wobble_frequency_hz,
         s.fill_type, s.rotary_enabled, s.rotary_type,
         s.result_rating, s.result_notes, s.image_path, s.is_favorite
  FROM materials m
  LEFT JOIN settings s ON s.material_id = m.id
`;

// GET /api/materials
router.get('/', (req, res) => {
  const db = getDb();
  const { search, category, subcategory, lens, rating, favorite, rotary, sort } = req.query;

  let query = ENTRY_QUERY + ' WHERE 1=1';
  const params = [];

  if (search) {
    query += ` AND (m.name LIKE ? OR m.notes LIKE ? OR s.result_notes LIKE ?)`;
    const t = `%${search}%`;
    params.push(t, t, t);
  }
  if (category) { query += ` AND m.category = ?`; params.push(category); }
  if (subcategory) { query += ` AND m.subcategory = ?`; params.push(subcategory); }
  if (lens) { query += ` AND s.lens_mm = ?`; params.push(parseInt(lens)); }
  if (rating) { query += ` AND s.result_rating >= ?`; params.push(parseInt(rating)); }
  if (favorite === '1') { query += ` AND s.is_favorite = 1`; }
  if (rotary === '1') { query += ` AND s.rotary_enabled = 1`; }
  else if (rotary === '0') { query += ` AND s.rotary_enabled = 0`; }

  const sortMap = {
    rating: 's.result_rating DESC, m.name ASC',
    date: 'm.created_at DESC',
    name: 'm.name ASC'
  };
  query += ` ORDER BY ${sortMap[sort] || 'm.created_at DESC'}`;

  try {
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materials/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare(ENTRY_QUERY + ' WHERE m.id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

// POST /api/materials
router.post('/', (req, res) => {
  const db = getDb();
  const { name, category, subcategory, notes, ...s } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'name and category required' });

  try {
    const id = db.transaction(() => {
      const { lastInsertRowid: mid } = db.prepare(
        `INSERT INTO materials (name, category, subcategory, notes) VALUES (?, ?, ?, ?)`
      ).run(name, category, subcategory || null, notes || null);

      db.prepare(`
        INSERT INTO settings (material_id, lens_mm, power_percent, speed_mms, frequency_khz,
          passes, line_interval_mm, overlap_mm, wobble_enabled, wobble_amplitude_mm,
          wobble_frequency_hz, fill_type, rotary_enabled, rotary_type,
          result_rating, result_notes, is_favorite)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        mid,
        s.lens_mm || 150, nvl(s.power_percent), nvl(s.speed_mms), nvl(s.frequency_khz),
        s.passes || 1, s.line_interval_mm || 0.08, s.overlap_mm != null ? s.overlap_mm : 0.03,
        s.wobble_enabled ? 1 : 0, nvl(s.wobble_amplitude_mm), nvl(s.wobble_frequency_hz),
        s.fill_type || null,
        s.rotary_enabled ? 1 : 0, s.rotary_type || null,
        nvl(s.result_rating), s.result_notes || null, s.is_favorite ? 1 : 0
      );
      return mid;
    })();

    res.status(201).json(db.prepare(ENTRY_QUERY + ' WHERE m.id = ?').get(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/materials/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, category, subcategory, notes, ...s } = req.body;
  const { id } = req.params;

  try {
    db.transaction(() => {
      db.prepare(`
        UPDATE materials SET name=?, category=?, subcategory=?, notes=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
      `).run(name, category, subcategory || null, notes || null, id);

      db.prepare(`
        UPDATE settings SET lens_mm=?, power_percent=?, speed_mms=?, frequency_khz=?,
          passes=?, line_interval_mm=?, overlap_mm=?, wobble_enabled=?, wobble_amplitude_mm=?,
          wobble_frequency_hz=?, fill_type=?, rotary_enabled=?, rotary_type=?,
          result_rating=?, result_notes=?, is_favorite=?, updated_at=CURRENT_TIMESTAMP
        WHERE material_id=?
      `).run(
        s.lens_mm || 150, nvl(s.power_percent), nvl(s.speed_mms), nvl(s.frequency_khz),
        s.passes || 1, s.line_interval_mm || 0.08, s.overlap_mm != null ? s.overlap_mm : 0.03,
        s.wobble_enabled ? 1 : 0, nvl(s.wobble_amplitude_mm), nvl(s.wobble_frequency_hz),
        s.fill_type || null,
        s.rotary_enabled ? 1 : 0, s.rotary_type || null,
        nvl(s.result_rating), s.result_notes || null, s.is_favorite ? 1 : 0,
        id
      );
    })();

    res.json(db.prepare(ENTRY_QUERY + ' WHERE m.id = ?').get(id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/materials/:id
router.delete('/:id', (req, res) => {
  try {
    getDb().prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/materials/:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const orig = db.prepare(ENTRY_QUERY + ' WHERE m.id = ?').get(req.params.id);
  if (!orig) return res.status(404).json({ error: 'Not found' });

  try {
    const newId = db.transaction(() => {
      const { lastInsertRowid: mid } = db.prepare(
        `INSERT INTO materials (name, category, subcategory, notes) VALUES (?, ?, ?, ?)`
      ).run(orig.name + ' (Copy)', orig.category, orig.subcategory, orig.notes);

      db.prepare(`
        INSERT INTO settings (material_id, lens_mm, power_percent, speed_mms, frequency_khz,
          passes, line_interval_mm, overlap_mm, wobble_enabled, wobble_amplitude_mm,
          wobble_frequency_hz, fill_type, rotary_enabled, rotary_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        mid, orig.lens_mm, orig.power_percent, orig.speed_mms, orig.frequency_khz,
        orig.passes, orig.line_interval_mm, orig.overlap_mm, orig.wobble_enabled,
        orig.wobble_amplitude_mm, orig.wobble_frequency_hz, orig.fill_type,
        orig.rotary_enabled, orig.rotary_type
      );
      return mid;
    })();

    res.json({ id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/materials/:id/favorite
router.post('/:id/favorite', (req, res) => {
  const db = getDb();
  try {
    const cur = db.prepare('SELECT is_favorite FROM settings WHERE material_id = ?').get(req.params.id);
    const newVal = cur?.is_favorite ? 0 : 1;
    db.prepare('UPDATE settings SET is_favorite = ? WHERE material_id = ?').run(newVal, req.params.id);
    res.json({ is_favorite: newVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function nvl(v) {
  return (v === '' || v === undefined) ? null : v;
}

module.exports = router;
