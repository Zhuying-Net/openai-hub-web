const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const { initializeDatabase } = require('./db/init');
const { startScheduler } = require('./services/scheduler');

const authRoutes = require('./routes/auth');
const articleRoutes = require('./routes/articles');
const categoryRoutes = require('./routes/categories');
const uploadRoutes = require('./routes/upload');
const settingsRoutes = require('./routes/settings');
const aiRoutes = require('./routes/ai');
const sitemapRoutes = require('./routes/sitemap');

initializeDatabase();

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, 'public');
const adminDir = path.resolve(__dirname, '..', 'admin');

fs.mkdirSync(publicDir, { recursive: true });

app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(publicDir, 'uploads')));
app.use('/admin/assets', express.static(path.join(adminDir, 'assets')));
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/sitemap.xml', sitemapRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(adminDir, 'index.html'));
});

app.use(express.static(publicDir));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`CMS server listening on http://localhost:${port}`);
});

startScheduler();

module.exports = app;
