const express = require('express');
const { db } = require('../db/init');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { slugify, normalizeArticle, stringifyTags } = require('../utils/helpers');
const { triggerBuild } = require('../services/builder');

const router = express.Router();

router.use(authenticateToken);

router.get('/', (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '10', 10), 1), 100);
  const offset = (page - 1) * pageSize;
  const filters = [];
  const params = [];

  if (req.query.status) {
    filters.push('status = ?');
    params.push(req.query.status);
  }

  if (req.query.lang) {
    filters.push('lang = ?');
    params.push(req.query.lang);
  }

  if (req.query.search) {
    filters.push('(title LIKE ? OR summary LIKE ? OR content LIKE ?)');
    const keyword = `%${req.query.search}%`;
    params.push(keyword, keyword, keyword);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) as count FROM articles ${whereClause}`).get(...params).count;
  const rows = db.prepare(`
    SELECT *
    FROM articles
    ${whereClause}
    ORDER BY datetime(updated_at) DESC
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset).map(normalizeArticle);

  return res.json({
    items: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  });
});

router.get('/:id', (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) {
    return res.status(404).json({ error: '文章不存在' });
  }
  return res.json({ item: normalizeArticle(article) });
});

router.post('/', requireRole(['admin', 'editor']), (req, res) => {
  const payload = req.body || {};
  if (!payload.title || !payload.content) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }

  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.title);
  const exists = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
  if (exists) {
    return res.status(409).json({ error: 'Slug 已存在' });
  }

  const stmt = db.prepare(`
    INSERT INTO articles (
      title, slug, content, summary, category, tags, status, lang, cover_image,
      author, seo_title, seo_description, seo_keywords, publish_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    payload.title,
    slug,
    payload.content,
    payload.summary || '',
    payload.category || '',
    stringifyTags(payload.tags),
    payload.status || 'draft',
    payload.lang || 'zh',
    payload.cover_image || '',
    payload.author || req.user.username,
    payload.seo_title || payload.title,
    payload.seo_description || payload.summary || '',
    payload.seo_keywords || '',
    payload.publish_at || null
  );

  if ((payload.status || 'draft') === 'published') {
    triggerBuild('article-created').catch(() => null);
  }

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ item: normalizeArticle(article) });
});

router.put('/:id', requireRole(['admin', 'editor']), (req, res) => {
  const current = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!current) {
    return res.status(404).json({ error: '文章不存在' });
  }

  const payload = req.body || {};
  const slug = payload.slug ? slugify(payload.slug) : slugify(payload.title || current.title);
  const duplicate = db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(slug, req.params.id);
  if (duplicate) {
    return res.status(409).json({ error: 'Slug 已存在' });
  }

  db.prepare(`
    UPDATE articles
    SET title = ?, slug = ?, content = ?, summary = ?, category = ?, tags = ?,
        status = ?, lang = ?, cover_image = ?, author = ?, seo_title = ?,
        seo_description = ?, seo_keywords = ?, publish_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    payload.title || current.title,
    slug,
    payload.content ?? current.content,
    payload.summary ?? current.summary,
    payload.category ?? current.category,
    stringifyTags(payload.tags ?? current.tags),
    payload.status || current.status,
    payload.lang || current.lang,
    payload.cover_image ?? current.cover_image,
    payload.author || current.author,
    payload.seo_title ?? current.seo_title,
    payload.seo_description ?? current.seo_description,
    payload.seo_keywords ?? current.seo_keywords,
    payload.publish_at ?? current.publish_at,
    req.params.id
  );

  const nextStatus = payload.status || current.status;
  if (nextStatus === 'published') {
    triggerBuild('article-updated').catch(() => null);
  }

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  return res.json({ item: normalizeArticle(article) });
});

router.delete('/:id', requireRole(['admin']), (req, res) => {
  const current = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!current) {
    return res.status(404).json({ error: '文章不存在' });
  }

  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  if (current.status === 'published') {
    triggerBuild('article-deleted').catch(() => null);
  }
  return res.json({ success: true });
});

module.exports = router;
