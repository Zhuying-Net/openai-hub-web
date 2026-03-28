const express = require('express');
const { db } = require('../db/init');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { slugify } = require('../utils/helpers');

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, id DESC').all();
  return res.json({ items });
});

router.post('/', requireRole(['admin', 'editor']), (req, res) => {
  const { name, slug, description = '', sort_order = 0 } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: '分类名称不能为空' });
  }

  const nextSlug = slugify(slug || name);
  const exists = db.prepare('SELECT id FROM categories WHERE slug = ?').get(nextSlug);
  if (exists) {
    return res.status(409).json({ error: '分类 slug 已存在' });
  }

  const result = db.prepare(
    'INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)'
  ).run(name, nextSlug, description, Number(sort_order) || 0);

  const item = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ item });
});

router.put('/:id', requireRole(['admin', 'editor']), (req, res) => {
  const current = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!current) {
    return res.status(404).json({ error: '分类不存在' });
  }

  const nextSlug = slugify((req.body && req.body.slug) || (req.body && req.body.name) || current.slug);
  const duplicate = db.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').get(nextSlug, req.params.id);
  if (duplicate) {
    return res.status(409).json({ error: '分类 slug 已存在' });
  }

  db.prepare(`
    UPDATE categories
    SET name = ?, slug = ?, description = ?, sort_order = ?
    WHERE id = ?
  `).run(
    req.body?.name || current.name,
    nextSlug,
    req.body?.description ?? current.description,
    Number(req.body?.sort_order ?? current.sort_order) || 0,
    req.params.id
  );

  const item = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  return res.json({ item });
});

router.delete('/:id', requireRole(['admin']), (req, res) => {
  const current = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!current) {
    return res.status(404).json({ error: '分类不存在' });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

module.exports = router;
