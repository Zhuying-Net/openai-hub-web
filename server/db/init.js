const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const projectRoot = path.resolve(__dirname, '..', '..');
const defaultDbPath = path.join(projectRoot, 'server', 'data', 'cms.db');
const dbPath = path.resolve(projectRoot, process.env.DB_PATH || defaultDbPath);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function migrateArticlesTable() {
  if (!hasColumn('articles', 'summary')) {
    db.prepare('ALTER TABLE articles ADD COLUMN summary TEXT DEFAULT \"\"').run();
  }
  if (!hasColumn('articles', 'category')) {
    db.prepare('ALTER TABLE articles ADD COLUMN category TEXT DEFAULT \"\"').run();
  }
  if (!hasColumn('articles', 'tags')) {
    db.prepare('ALTER TABLE articles ADD COLUMN tags TEXT DEFAULT \"[]\"').run();
  }
  if (!hasColumn('articles', 'status')) {
    db.prepare('ALTER TABLE articles ADD COLUMN status TEXT DEFAULT \"draft\"').run();
  }
  if (!hasColumn('articles', 'lang')) {
    db.prepare('ALTER TABLE articles ADD COLUMN lang TEXT DEFAULT \"zh\"').run();
  }
  if (!hasColumn('articles', 'cover_image')) {
    db.prepare('ALTER TABLE articles ADD COLUMN cover_image TEXT DEFAULT \"\"').run();
  }
  if (!hasColumn('articles', 'author')) {
    db.prepare('ALTER TABLE articles ADD COLUMN author TEXT DEFAULT \"\"').run();
  }
  if (!hasColumn('articles', 'seo_title')) {
    db.prepare('ALTER TABLE articles ADD COLUMN seo_title TEXT DEFAULT \"\"').run();
  }
  if (!hasColumn('articles', 'seo_description')) {
    db.prepare('ALTER TABLE articles ADD COLUMN seo_description TEXT DEFAULT \"\"').run();
  }
  if (!hasColumn('articles', 'seo_keywords')) {
    db.prepare('ALTER TABLE articles ADD COLUMN seo_keywords TEXT DEFAULT \"\"').run();
  }
  if (!hasColumn('articles', 'publish_at')) {
    db.prepare('ALTER TABLE articles ADD COLUMN publish_at TEXT').run();
  }
  if (!hasColumn('articles', 'created_at')) {
    db.prepare('ALTER TABLE articles ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP').run();
  }
  if (!hasColumn('articles', 'updated_at')) {
    db.prepare('ALTER TABLE articles ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP').run();
  }
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      summary TEXT DEFAULT '',
      category TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'review', 'scheduled', 'published')),
      lang TEXT NOT NULL DEFAULT 'zh' CHECK(lang IN ('zh', 'en')),
      cover_image TEXT DEFAULT '',
      author TEXT DEFAULT '',
      seo_title TEXT DEFAULT '',
      seo_description TEXT DEFAULT '',
      seo_keywords TEXT DEFAULT '',
      publish_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor' CHECK(role IN ('admin', 'editor')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
    CREATE INDEX IF NOT EXISTS idx_articles_lang ON articles(lang);
    CREATE INDEX IF NOT EXISTS idx_articles_publish_at ON articles(publish_at);
    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
  `);

  migrateArticlesTable();

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get(adminUsername);

  if (!adminUser) {
    const passwordHash = bcrypt.hashSync(adminPassword, 10);
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(adminUsername, passwordHash, 'admin');
  }

  const defaultSettings = {
    site_name: 'OpenAI-Hub 官网',
    site_description: 'OpenAI-Hub AI API 聚合平台',
    site_url: process.env.SITE_URL || 'http://localhost:3000',
    default_author: 'OpenAI-Hub',
    posts_per_page: '10'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  Object.entries(defaultSettings).forEach(([key, value]) => insertSetting.run(key, value));

  return db;
}

initializeDatabase();

module.exports = {
  db,
  initializeDatabase,
  dbPath
};
