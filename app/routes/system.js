const express = require('express');
const router = express.Router();
const { execSync, exec } = require('child_process');
const path = require('path');
const { getDb } = require('../db/schema');

const CATEGORIES = [
  'Glass/Ceramics', 'Metal', 'Tumblers', 'Acrylic', 'Plastic/Silicone',
  'Wood', 'Fabric', 'Electronics', 'Food', 'Sport Products',
  'Stone/Slate', 'Paper', 'Others'
];

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
      await run('systemctl restart laser-tracker');
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
  const matRows = db.prepare(`SELECT * FROM materials ORDER BY id`).all();
  const settRows = db.prepare(`SELECT * FROM settings ORDER BY material_id, lens_mm, burn_type`).all();
  const attRows = db.prepare(`SELECT * FROM attempts ORDER BY material_id, created_at`).all();

  const settMap = {};
  for (const s of settRows) {
    if (!settMap[s.material_id]) settMap[s.material_id] = [];
    settMap[s.material_id].push(s);
  }
  const attMap = {};
  for (const a of attRows) {
    if (!attMap[a.material_id]) attMap[a.material_id] = [];
    attMap[a.material_id].push(a);
  }

  const materials = matRows.map(m => ({
    ...m,
    settings: settMap[m.id] || [],
    attempts: attMap[m.id] || []
  }));

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition',
    `attachment; filename=laser-settings-backup-${new Date().toISOString().slice(0,10)}.json`);
  res.json({ version: '2.0', exported_at: new Date().toISOString(), materials });
});

router.get('/export/csv', (req, res) => {
  const db = getDb();
  const { search, category, rating, favorite, rotary } = req.query;

  let query = `
    SELECT m.name, m.category, s.burn_type, s.lens_mm, s.speed_mms, s.dwell_time_us,
           s.frequency_khz, s.pulse_width, s.passes, s.line_interval_mm,
           s.dpi, s.defocus_mm, s.wobble_enabled, s.fill_type,
           s.rotary_enabled, s.rotary_type, s.result_rating, m.notes, s.result_notes
    FROM materials m LEFT JOIN settings s ON s.material_id = m.id WHERE 1=1
  `;
  const params = [];
  if (search) { query += ` AND (m.name LIKE ? OR m.notes LIKE ?)`; const t = `%${search}%`; params.push(t, t); }
  if (category) { query += ` AND m.category = ?`; params.push(category); }
  if (rating)   { query += ` AND s.result_rating >= ?`; params.push(parseInt(rating)); }
  if (favorite === '1') query += ` AND s.is_favorite = 1`;
  if (rotary === '1')   query += ` AND s.rotary_enabled = 1`;

  const rows = db.prepare(query).all(...params);
  const headers = ['Name','Category','BurnType','Lens(mm)','Speed(mm/s)','DwellTime(us)',
    'Freq(kHz)','PulseWidth','Passes','LineInterval(mm)','DPI','Defocus(mm)',
    'Wobble','FillType','Rotary','RotaryType','Rating','Notes','ResultNotes'];

  const csv = [headers.join(','), ...rows.map(r =>
    [r.name, r.category, r.burn_type, r.lens_mm, r.speed_mms, r.dwell_time_us,
     r.frequency_khz, r.pulse_width, r.passes, r.line_interval_mm,
     r.dpi, r.defocus_mm, r.wobble_enabled ? 'Yes' : 'No', r.fill_type,
     r.rotary_enabled ? 'Yes' : 'No', r.rotary_type, r.result_rating, r.notes, r.result_notes]
    .map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`)
    .join(',')
  )].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=laser-settings-${new Date().toISOString().slice(0,10)}.csv`);
  res.send(csv);
});

router.post('/import', (req, res) => {
  const db = getDb();
  const { materials } = req.body;
  if (!materials || !Array.isArray(materials)) return res.status(400).json({ error: 'Invalid backup format — expected v2.0 with materials array' });

  try {
    const count = db.transaction(() => {
      let n = 0;
      for (const m of materials) {
        const { lastInsertRowid: mid } = db.prepare(
          `INSERT INTO materials (name, category, notes) VALUES (?, ?, ?)`
        ).run(m.name, m.category, m.notes || null);

        for (const s of (m.settings || [])) {
          db.prepare(`
            INSERT INTO settings (
              material_id, burn_type, lens_mm,
              speed_mms, dwell_time_us, frequency_khz, pulse_width,
              passes, line_interval_mm, dpi, image_mode, defocus_mm,
              wobble_enabled, wobble_amplitude_mm, wobble_frequency_hz,
              fill_type, rotary_enabled, rotary_type,
              result_rating, result_notes, is_favorite
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          `).run(
            mid, s.burn_type || 'Engraving', s.lens_mm || 150,
            s.speed_mms ?? null, s.dwell_time_us ?? null, s.frequency_khz ?? null, s.pulse_width ?? null,
            s.passes || 1, s.line_interval_mm ?? null, s.dpi ?? null, s.image_mode || null, s.defocus_mm ?? null,
            s.wobble_enabled ? 1 : 0, s.wobble_amplitude_mm ?? null, s.wobble_frequency_hz ?? null,
            s.fill_type || null, s.rotary_enabled ? 1 : 0, s.rotary_type || null,
            s.result_rating ?? null, s.result_notes || null, s.is_favorite ? 1 : 0
          );
        }
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
