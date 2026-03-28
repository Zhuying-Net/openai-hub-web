const express = require('express');
const { db } = require('../db/init');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings ORDER BY key ASC').all();
  const settings = rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
  return res.json({ items: settings });
});

router.put('/', requireRole(['admin']), (req, res) => {
  const payload = req.body || {};
  const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const transaction = db.transaction((entries) => {
    entries.forEach(([key, value]) => stmt.run(key, typeof value === 'string' ? value : JSON.stringify(value)));
  });
  transaction(Object.entries(payload));
  return res.json({ success: true });
});

module.exports = router;
