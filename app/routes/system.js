const express = require('express');
const router = express.Router();
const { execSync, exec } = require('child_process');
const path = require('path');
const { getDb } = require('../db/schema');

const CATEGORIES = {
  'Glass':   ['Surface Etch', 'Subsurface 2D', 'Subsurface 3D Crystal', 'Bottle/Curved'],
  'Metal':   ['Stainless Steel', 'Aluminum', 'Brass', 'Copper', 'Coated/Powder Coat', 'Anodized'],
  'Stone':   ['Slate', 'River Rock', 'Jade', 'Marble'],
  'Plastic': ['Cast Acrylic', 'Extruded Acrylic', 'Other Plastic'],
  'Fabric':  ['Cotton', 'Denim', 'Canvas', 'Leather', 'Silicone'],
  'Wood':    ['Hardwood', 'Softwood', 'Plywood', 'Bamboo', 'MDF'],
  'Paper':   ['Cardstock', 'Kraft', 'Laser Paper'],
  'PCB':     ['FR4 Isolation', 'FR4 Full Process'],
  'Other':   ['Custom']
};

router.get('/categories', (req, res) => res.json(CATEGORIES));

router.get('/version', (req, res) => {
  try {
    const appDir = path.join(__dirname, '../../');
    const tag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo "v1.0.0"', { cwd: appDir }).toString().trim();
    const hash = execSync('git rev-parse --short HEAD 2>/dev/null || echo "unknown"', { cwd: appDir }).toString().trim();
    res.json({ version: tag, commit: hash });
  } catch {
    res.json({ version: 'v1.0.0', commit: 'unknown' });
  }
});

router.get('/update/check', async (req, res) => {
  try {
    const appDir = path.join(__dirname, '../../');
    const local = execSync('git describe --tags --abbrev=0 2>/dev/null || echo "v1.0.0"', { cwd: appDir }).toString().trim();
    const db = getDb();
    const setting = db.prepare("SELECT value FROM app_settings WHERE key='github_repo'").get();
    const repo = setting?.value || process.env.GITHUB_REPO || 'MakaiView/LaserSettingsManager';

    const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { 'User-Agent': 'laser-settings-tracker' }
    });
    const data = await r.json();
    const latest = data.tag_name || local;
    res.json({ current: local, latest, update_available: latest !== local });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/update/run', (req, res) => {
  if (req.headers['x-update-token'] !== process.env.UPDATE_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const appDir = path.join(__dirname, '../../');
  let log = '';

  const run = (cmd, cwd) => new Promise((resolve, reject) => {
    exec(cmd, { cwd: cwd || appDir }, (err, stdout, stderr) => {
      log += `$ ${cmd}\n${stdout}${stderr}\n`;
      err ? reject(err) : resolve();
    });
  });

  (async () => {
    try {
      await run('git pull origin master');
      await run('npm install --production', path.join(appDir, 'app'));
      await run('pm2 restart laser-tracker');
      log += 'Update complete!\n';
      res.json({ success: true, log });
    } catch (err) {
      log += `Error: ${err.message}\n`;
      res.status(500).json({ success: false, log });
    }
  })();
});

router.get('/export', (req, res) => {
  const db = getDb();
  const entries = db.prepare(`
    SELECT m.id, m.name, m.category, m.subcategory, m.notes, m.created_at,
           s.lens_mm, s.power_percent, s.speed_mms, s.frequency_khz,
           s.passes, s.line_interval_mm, s.overlap_mm,
           s.wobble_enabled, s.wobble_amplitude_mm, s.wobble_frequency_hz,
           s.fill_type, s.rotary_enabled, s.rotary_type,
           s.result_rating, s.result_notes, s.image_path, s.is_favorite
    FROM materials m LEFT JOIN settings s ON s.material_id = m.id
    ORDER BY m.id
  `).all();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition',
    `attachment; filename=laser-settings-backup-${new Date().toISOString().slice(0,10)}.json`);
  res.json({ version: '1.0', exported_at: new Date().toISOString(), entries });
});

router.get('/export/csv', (req, res) => {
  const db = getDb();
  const { search, category, subcategory, rating, favorite, rotary } = req.query;

  let query = `
    SELECT m.name, m.category, m.subcategory, s.lens_mm, s.power_percent, s.speed_mms,
           s.frequency_khz, s.passes, s.line_interval_mm, s.overlap_mm,
           s.wobble_enabled, s.fill_type, s.rotary_enabled, s.rotary_type,
           s.result_rating, m.notes, s.result_notes
    FROM materials m LEFT JOIN settings s ON s.material_id = m.id WHERE 1=1
  `;
  const params = [];
  if (search) { query += ` AND (m.name LIKE ? OR m.notes LIKE ?)`; const t = `%${search}%`; params.push(t, t); }
  if (category) { query += ` AND m.category = ?`; params.push(category); }
  if (subcategory) { query += ` AND m.subcategory = ?`; params.push(subcategory); }
  if (rating) { query += ` AND s.result_rating >= ?`; params.push(parseInt(rating)); }
  if (favorite === '1') query += ` AND s.is_favorite = 1`;
  if (rotary === '1') query += ` AND s.rotary_enabled = 1`;

  const rows = db.prepare(query).all(...params);
  const headers = ['Name','Category','Subcategory','Lens(mm)','Power(%)','Speed(mm/s)',
    'Freq(kHz)','Passes','LineInterval(mm)','Overlap(mm)','Wobble','FillType',
    'Rotary','RotaryType','Rating','Notes','ResultNotes'];

  const csv = [headers.join(','), ...rows.map(r =>
    [r.name, r.category, r.subcategory, r.lens_mm, r.power_percent, r.speed_mms,
     r.frequency_khz, r.passes, r.line_interval_mm, r.overlap_mm,
     r.wobble_enabled ? 'Yes' : 'No', r.fill_type, r.rotary_enabled ? 'Yes' : 'No',
     r.rotary_type, r.result_rating, r.notes, r.result_notes]
    .map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
    .join(',')
  )].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=laser-settings-${new Date().toISOString().slice(0,10)}.csv`);
  res.send(csv);
});

router.post('/import', (req, res) => {
  const db = getDb();
  const { entries } = req.body;
  if (!entries || !Array.isArray(entries)) return res.status(400).json({ error: 'Invalid backup format' });

  try {
    const count = db.transaction(() => {
      let n = 0;
      for (const e of entries) {
        const { lastInsertRowid: mid } = db.prepare(
          `INSERT INTO materials (name, category, subcategory, notes) VALUES (?, ?, ?, ?)`
        ).run(e.name, e.category, e.subcategory, e.notes);

        db.prepare(`
          INSERT INTO settings (material_id, lens_mm, power_percent, speed_mms, frequency_khz,
            passes, line_interval_mm, overlap_mm, wobble_enabled, wobble_amplitude_mm,
            wobble_frequency_hz, fill_type, rotary_enabled, rotary_type, result_rating, result_notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          mid, e.lens_mm, e.power_percent, e.speed_mms, e.frequency_khz,
          e.passes, e.line_interval_mm, e.overlap_mm, e.wobble_enabled,
          e.wobble_amplitude_mm, e.wobble_frequency_hz, e.fill_type,
          e.rotary_enabled, e.rotary_type, e.result_rating, e.result_notes
        );
        n++;
      }
      return n;
    })();
    res.json({ imported: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/settings', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM app_settings').all();
  const out = {};
  rows.forEach(r => out[r.key] = r.value);
  res.json({ github_repo: out.github_repo || process.env.GITHUB_REPO || '' });
});

router.put('/settings', (req, res) => {
  const db = getDb();
  const { github_repo } = req.body;
  db.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('github_repo', ?)`).run(github_repo);
  res.json({ success: true });
});

module.exports = router;
