const express = require('express');
const { db } = require('../db/init');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateArticle } = require('../services/ai-generator');
const { slugify, stringifyTags, normalizeArticle } = require('../utils/helpers');

const router = express.Router();
router.use(authenticateToken, requireRole(['admin', 'editor']));

router.post('/generate', async (req, res) => {
  try {
    const { topic, requirements, lang = 'zh', style = 'professional', author } = req.body || {};
    if (!topic) {
      return res.status(400).json({ error: '主题不能为空' });
    }

    const generated = await generateArticle({ topic, requirements, lang, style });
    let slug = slugify(generated.title || topic);
    let suffix = 1;
    while (db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug)) {
      slug = `${slugify(generated.title || topic)}-${suffix++}`;
    }

    const result = db.prepare(`
      INSERT INTO articles (
        title, slug, content, summary, category, tags, status, lang, cover_image,
        author, seo_title, seo_description, seo_keywords, publish_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      generated.title,
      slug,
      generated.content,
      generated.summary,
      req.body?.category || '',
      stringifyTags(generated.tags),
      'review',
      lang,
      req.body?.cover_image || '',
      author || req.user.username,
      generated.seo_title,
      generated.seo_description,
      generated.seo_keywords,
      null
    );

    const item = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ item: normalizeArticle(item) });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'AI 生成失败' });
  }
});

module.exports = router;
