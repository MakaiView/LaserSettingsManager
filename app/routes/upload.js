const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../db/schema');

const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `material_${req.params.id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp'].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(null, ok);
  }
});

router.post('/:id', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file or invalid file type (JPG/PNG/WebP, max 5MB)' });

  const db = getDb();
  const imagePath = `/uploads/${req.file.filename}`;

  try {
    const cur = db.prepare('SELECT image_path FROM settings WHERE material_id = ?').get(req.params.id);
    if (cur?.image_path) {
      const old = path.join(uploadPath, path.basename(cur.image_path));
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }

    db.prepare('UPDATE settings SET image_path = ?, updated_at = CURRENT_TIMESTAMP WHERE material_id = ?')
      .run(imagePath, req.params.id);

    res.json({ image_path: imagePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    const cur = db.prepare('SELECT image_path FROM settings WHERE material_id = ?').get(req.params.id);
    if (cur?.image_path) {
      const file = path.join(uploadPath, path.basename(cur.image_path));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    db.prepare('UPDATE settings SET image_path = NULL WHERE material_id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
