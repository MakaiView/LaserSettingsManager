require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDb } = require('./db/schema');
const { seedDb } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../data/uploads');
app.use('/uploads', express.static(uploadPath));

initDb();
seedDb();

app.use('/api/materials', require('./routes/materials'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api', require('./routes/system'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Laser Tracker running on port ${PORT}`);
});
