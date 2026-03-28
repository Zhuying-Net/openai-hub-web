const express = require('express');
const { SitemapStream, streamToPromise } = require('sitemap');
const { db, initializeDatabase } = require('../db/init');

const router = express.Router();
const siteUrl = (process.env.SITE_URL || 'https://www.openai-hub.com').replace(/\/$/, '');

function articleUrl(article) {
  return article.lang === 'en' ? '/en/blog/' + article.slug + '/' : '/blog/' + article.slug + '/';
}

router.get('/', async (_req, res, next) => {
  try {
    initializeDatabase();
    const articles = db.prepare("SELECT * FROM articles WHERE status = 'published' ORDER BY datetime(COALESCE(publish_at, created_at)) DESC").all();
    const smStream = new SitemapStream({ hostname: siteUrl });
    [
      { url: '/', changefreq: 'daily', priority: 1.0 },
      { url: '/en/', changefreq: 'daily', priority: 0.9 },
      { url: '/blog/', changefreq: 'daily', priority: 0.8 },
      { url: '/en/blog/', changefreq: 'daily', priority: 0.8 },
      ...articles.map((article) => ({
        url: articleUrl(article),
        lastmodISO: new Date(article.updated_at || article.publish_at || article.created_at || Date.now()).toISOString(),
        changefreq: 'weekly',
        priority: 0.7
      }))
    ].forEach((entry) => smStream.write(entry));
    smStream.end();
    const xml = (await streamToPromise(smStream)).toString();
    res.type('application/xml').send(xml);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
