const express = require('express');
const router = express.Router({ mergeParams: true });
const { getDb } = require('../db/schema');

// GET /api/materials/:id/attempts
router.get('/', (req, res) => {
  try {
    const rows = getDb().prepare(
      `SELECT * FROM attempts WHERE material_id=? ORDER BY created_at DESC`
    ).all(req.params.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/materials/:id/attempts
router.post('/', (req, res) => {
  const db = getDb();
  const mid = req.params.id;
  if (!db.prepare('SELECT id FROM materials WHERE id=?').get(mid)) {
    return res.status(404).json({ error: 'Material not found' });
  }
  const a = req.body;
  try {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO attempts (
        material_id, burn_type, lens_mm,
        speed_mms, dwell_time_us, frequency_khz, pulse_width,
        passes, line_interval_mm, dpi, worked, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      mid, a.burn_type || 'Engraving', a.lens_mm || 150,
      nvl(a.speed_mms), nvl(a.dwell_time_us), nvl(a.frequency_khz), nvl(a.pulse_width),
      a.passes || 1, nvl(a.line_interval_mm), nvl(a.dpi),
      a.worked ?? 0, a.notes || null
    );
    res.status(201).json(db.prepare('SELECT * FROM attempts WHERE id=?').get(lastInsertRowid));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/materials/:id/attempts/:aid
router.delete('/:aid', (req, res) => {
  try {
    getDb().prepare('DELETE FROM attempts WHERE id=? AND material_id=?')
      .run(req.params.aid, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function nvl(v) {
  return (v === '' || v === undefined) ? null : v;
}

module.exports = router;
