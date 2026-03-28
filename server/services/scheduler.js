const cron = require('node-cron');
const { db } = require('../db/init');
const { triggerBuild } = require('./builder');

function publishScheduledArticles() {
  const articles = db.prepare(`
    SELECT id
    FROM articles
    WHERE status = 'scheduled'
      AND publish_at IS NOT NULL
      AND datetime(publish_at) <= datetime('now')
  `).all();

  if (!articles.length) {
    return { updated: 0 };
  }

  const update = db.prepare(`
    UPDATE articles
    SET status = 'published',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  const transaction = db.transaction((items) => {
    items.forEach((item) => update.run(item.id));
  });

  transaction(articles);
  triggerBuild('scheduled-publish').catch(() => null);

  return { updated: articles.length };
}

function startScheduler() {
  cron.schedule('* * * * *', () => {
    try {
      publishScheduledArticles();
    } catch (error) {
      console.error('[scheduler] failed to publish scheduled articles:', error.message);
    }
  });
}

module.exports = {
  startScheduler,
  publishScheduledArticles
};
