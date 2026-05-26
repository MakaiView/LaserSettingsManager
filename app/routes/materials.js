const express = require('express');
const router = express.Router();
const { getDb } = require('../db/schema');

const SETTINGS_COLS = `
  s.id as sid, s.burn_type, s.lens_mm,
  s.speed_mms, s.dwell_time_us, s.frequency_khz, s.pulse_width,
  s.passes, s.line_interval_mm, s.dpi, s.image_mode,
  s.defocus_mm, s.wobble_enabled, s.wobble_amplitude_mm, s.wobble_frequency_hz,
  s.fill_type, s.rotary_enabled, s.rotary_type,
  s.is_commarker_reference, s.result_rating, s.result_notes,
  s.image_path, s.is_favorite, s.created_at as s_created_at, s.updated_at as s_updated_at
`;

function groupSettings(rows) {
  if (!rows.length) return null;
  const { id, name, category, notes, created_at, updated_at } = rows[0];
  const settings = rows
    .filter(r => r.sid != null)
    .map(r => ({
      id: r.sid, burn_type: r.burn_type, lens_mm: r.lens_mm,
      speed_mms: r.speed_mms, dwell_time_us: r.dwell_time_us,
      frequency_khz: r.frequency_khz, pulse_width: r.pulse_width,
      passes: r.passes, line_interval_mm: r.line_interval_mm,
      dpi: r.dpi, image_mode: r.image_mode, defocus_mm: r.defocus_mm,
      wobble_enabled: r.wobble_enabled, wobble_amplitude_mm: r.wobble_amplitude_mm,
      wobble_frequency_hz: r.wobble_frequency_hz, fill_type: r.fill_type,
      rotary_enabled: r.rotary_enabled, rotary_type: r.rotary_type,
      is_commarker_reference: r.is_commarker_reference,
      result_rating: r.result_rating, result_notes: r.result_notes,
      image_path: r.image_path, is_favorite: r.is_favorite,
      created_at: r.s_created_at, updated_at: r.s_updated_at,
    }));
  return { id, name, category, notes, created_at, updated_at, settings };
}

function getMaterial(db, id) {
  const rows = db.prepare(`
    SELECT m.id, m.name, m.category, m.notes, m.created_at, m.updated_at, ${SETTINGS_COLS}
    FROM materials m LEFT JOIN settings s ON s.material_id = m.id
    WHERE m.id = ?
    ORDER BY s.lens_mm, s.burn_type
  `).all(id);
  if (!rows.length) return null;
  return groupSettings(rows);
}

// GET /api/materials
router.get('/', (req, res) => {
  const db = getDb();
  const { search, category, lens, rating, favorite, rotary, sort } = req.query;

  let where = 'WHERE 1=1';
  const params = [];

  if (search) {
    where += ` AND (m.name LIKE ? OR m.notes LIKE ? OR s.result_notes LIKE ?)`;
    const t = `%${search}%`;
    params.push(t, t, t);
  }
  if (category) { where += ` AND m.category = ?`; params.push(category); }
  if (lens)     { where += ` AND s.lens_mm = ?`; params.push(parseInt(lens)); }
  if (rating)   { where += ` AND s.result_rating >= ?`; params.push(parseInt(rating)); }
  if (favorite === '1') { where += ` AND s.is_favorite = 1`; }
  if (rotary === '1')   { where += ` AND s.rotary_enabled = 1`; }
  else if (rotary === '0') { where += ` AND s.rotary_enabled = 0`; }

  const sortMap = {
    rating: 'm.name ASC',
    date:   'm.created_at DESC',
    name:   'm.name ASC'
  };
  const order = `ORDER BY ${sortMap[sort] || 'm.created_at DESC'}, s.lens_mm, s.burn_type`;

  try {
    const rows = db.prepare(`
      SELECT m.id, m.name, m.category, m.notes, m.created_at, m.updated_at, ${SETTINGS_COLS}
      FROM materials m LEFT JOIN settings s ON s.material_id = m.id
      ${where} ${order}
    `).all(...params);

    // Group by material id
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.id)) map.set(r.id, []);
      map.get(r.id).push(r);
    }
    const result = [];
    for (const [, matRows] of map) {
      result.push(groupSettings(matRows));
    }

    // Sort result by rating if requested
    if (sort === 'rating') {
      result.sort((a, b) => {
        const ra = Math.max(0, ...a.settings.map(s => s.result_rating || 0));
        const rb = Math.max(0, ...b.settings.map(s => s.result_rating || 0));
        return rb - ra;
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/materials/:id
router.get('/:id', (req, res) => {
  const mat = getMaterial(getDb(), req.params.id);
  if (!mat) return res.status(404).json({ error: 'Not found' });
  res.json(mat);
});

// POST /api/materials
router.post('/', (req, res) => {
  const db = getDb();
  const { name, category, notes } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'name and category required' });
  try {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO materials (name, category, notes) VALUES (?, ?, ?)`
    ).run(name, category, notes || null);
    res.status(201).json(getMaterial(db, lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/materials/:id
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, category, notes } = req.body;
  try {
    db.prepare(
      `UPDATE materials SET name=?, category=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).run(name, category, notes || null, req.params.id);
    res.json(getMaterial(db, req.params.id));
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

// POST /api/materials/:id/settings — add a settings row
router.post('/:id/settings', (req, res) => {
  const db = getDb();
  const mid = req.params.id;
  if (!db.prepare('SELECT id FROM materials WHERE id=?').get(mid)) {
    return res.status(404).json({ error: 'Material not found' });
  }
  const s = req.body;
  try {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO settings (
        material_id, burn_type, lens_mm,
        speed_mms, dwell_time_us, frequency_khz, pulse_width,
        passes, line_interval_mm, dpi, image_mode,
        defocus_mm, wobble_enabled, wobble_amplitude_mm, wobble_frequency_hz,
        fill_type, rotary_enabled, rotary_type,
        is_commarker_reference, result_rating, result_notes, is_favorite
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      mid, s.burn_type || 'Engraving', s.lens_mm || 150,
      nvl(s.speed_mms), nvl(s.dwell_time_us), nvl(s.frequency_khz), nvl(s.pulse_width),
      s.passes || 1, nvl(s.line_interval_mm), nvl(s.dpi), s.image_mode || null,
      nvl(s.defocus_mm), s.wobble_enabled ? 1 : 0, nvl(s.wobble_amplitude_mm), nvl(s.wobble_frequency_hz),
      s.fill_type || null, s.rotary_enabled ? 1 : 0, s.rotary_type || null,
      s.is_commarker_reference ? 1 : 0,
      nvl(s.result_rating), s.result_notes || null, s.is_favorite ? 1 : 0
    );
    res.status(201).json(getMaterial(db, mid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/materials/:id/settings/:sid
router.put('/:id/settings/:sid', (req, res) => {
  const db = getDb();
  const s = req.body;
  try {
    db.prepare(`
      UPDATE settings SET
        burn_type=?, lens_mm=?,
        speed_mms=?, dwell_time_us=?, frequency_khz=?, pulse_width=?,
        passes=?, line_interval_mm=?, dpi=?, image_mode=?,
        defocus_mm=?, wobble_enabled=?, wobble_amplitude_mm=?, wobble_frequency_hz=?,
        fill_type=?, rotary_enabled=?, rotary_type=?,
        result_rating=?, result_notes=?, is_favorite=?,
        updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND material_id=?
    `).run(
      s.burn_type || 'Engraving', s.lens_mm || 150,
      nvl(s.speed_mms), nvl(s.dwell_time_us), nvl(s.frequency_khz), nvl(s.pulse_width),
      s.passes || 1, nvl(s.line_interval_mm), nvl(s.dpi), s.image_mode || null,
      nvl(s.defocus_mm), s.wobble_enabled ? 1 : 0, nvl(s.wobble_amplitude_mm), nvl(s.wobble_frequency_hz),
      s.fill_type || null, s.rotary_enabled ? 1 : 0, s.rotary_type || null,
      nvl(s.result_rating), s.result_notes || null, s.is_favorite ? 1 : 0,
      req.params.sid, req.params.id
    );
    res.json(getMaterial(db, req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/materials/:id/settings/:sid
router.delete('/:id/settings/:sid', (req, res) => {
  try {
    getDb().prepare('DELETE FROM settings WHERE id=? AND material_id=?')
      .run(req.params.sid, req.params.id);
    res.json(getMaterial(getDb(), req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/materials/:id/settings/:sid/favorite
router.post('/:id/settings/:sid/favorite', (req, res) => {
  const db = getDb();
  try {
    const cur = db.prepare('SELECT is_favorite FROM settings WHERE id=? AND material_id=?')
      .get(req.params.sid, req.params.id);
    const newVal = cur?.is_favorite ? 0 : 1;
    db.prepare('UPDATE settings SET is_favorite=? WHERE id=? AND material_id=?')
      .run(newVal, req.params.sid, req.params.id);
    res.json({ is_favorite: newVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/materials/:id/favorite  (legacy — toggles any favorite on this material)
router.post('/:id/favorite', (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT id, is_favorite FROM settings WHERE material_id=?').all(req.params.id);
    if (!rows.length) return res.json({ is_favorite: 0 });
    const anyFav = rows.some(r => r.is_favorite);
    const newVal = anyFav ? 0 : 1;
    db.prepare('UPDATE settings SET is_favorite=? WHERE material_id=?').run(newVal, req.params.id);
    res.json({ is_favorite: newVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/materials/:id/duplicate
router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const orig = getMaterial(db, req.params.id);
  if (!orig) return res.status(404).json({ error: 'Not found' });

  try {
    const newId = db.transaction(() => {
      const { lastInsertRowid: mid } = db.prepare(
        `INSERT INTO materials (name, category, notes) VALUES (?, ?, ?)`
      ).run(orig.name + ' (Copy)', orig.category, orig.notes);

      for (const s of orig.settings) {
        db.prepare(`
          INSERT INTO settings (
            material_id, burn_type, lens_mm,
            speed_mms, dwell_time_us, frequency_khz, pulse_width,
            passes, line_interval_mm, dpi, image_mode, defocus_mm,
            wobble_enabled, wobble_amplitude_mm, wobble_frequency_hz,
            fill_type, rotary_enabled, rotary_type, is_commarker_reference
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
          mid, s.burn_type, s.lens_mm,
          s.speed_mms, s.dwell_time_us, s.frequency_khz, s.pulse_width,
          s.passes, s.line_interval_mm, s.dpi, s.image_mode, s.defocus_mm,
          s.wobble_enabled, s.wobble_amplitude_mm, s.wobble_frequency_hz,
          s.fill_type, s.rotary_enabled, s.rotary_type, 0
        );
      }
      return mid;
    })();

    res.json({ id: newId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function nvl(v) {
  return (v === '' || v === undefined) ? null : v;
}

module.exports = router;
