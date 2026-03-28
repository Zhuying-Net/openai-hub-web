const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const chokidar = require('chokidar');
const { marked } = require('marked');

const rootDir = path.resolve(__dirname, '..');
const templatesDir = path.join(rootDir, 'templates');
const i18nDir = path.join(rootDir, 'i18n');
const assetsDir = path.join(rootDir, 'assets');
const publicDir = path.join(rootDir, 'public');
const siteUrl = process.env.SITE_URL || 'https://www.openai-hub.com';

nunjucks.configure(templatesDir, { autoescape: true, noCache: true });

const staticPages = [
  { lang: 'zh', template: 'index.njk', output: 'index.html', pagePath: '' },
  { lang: 'en', template: 'index.njk', output: path.join('en', 'index.html'), pagePath: 'en/' },
  { lang: 'zh', template: 'blog.njk', output: path.join('blog', 'index.html'), pagePath: 'blog/' },
  { lang: 'en', template: 'blog.njk', output: path.join('en', 'blog', 'index.html'), pagePath: 'en/blog/' },
  { lang: 'zh', template: 'search.njk', output: path.join('search', 'index.html'), pagePath: 'search/' },
  { lang: 'en', template: 'search.njk', output: path.join('en', 'search', 'index.html'), pagePath: 'en/search/' },
];

function ensureDir(dirPath) { fs.mkdirSync(dirPath, { recursive: true }); }
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

/* ---------- Article helpers ---------- */

function getArticles() {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(rootDir, 'server', 'data', 'cms.db');
    if (!fs.existsSync(dbPath)) return [];
    const db = Database(dbPath, { readonly: true });
    const rows = db.prepare("SELECT * FROM articles WHERE status = 'published' ORDER BY datetime(COALESCE(publish_at, created_at)) DESC").all();
    db.close();
    return rows.map(r => ({ ...r, tags: r.tags ? r.tags.split(',').map(t => t.trim()) : [] }));
  } catch { return []; }
}

function extractToc(html) {
  const toc = [];
  const re = /<h([2-3])\s+id="([^"]+)"[^>]*>(.*?)<\/h[2-3]>/gi;
  let m;
  while ((m = re.exec(html))) toc.push({ level: Number(m[1]), id: m[2], text: m[3].replace(/<[^>]*>/g, '') });
  return toc;
}

function addHeadingIds(html) {
  let counter = 0;
  return html.replace(/<(h[2-3])>(.*?)<\/\1>/gi, (_, tag, text) => {
    const id = 'section-' + (++counter);
    return `<${tag} id="${id}">${text}</${tag}>`;
  });
}

function estimateReadingTime(text) { return Math.max(1, Math.round(text.length / 500)); }

function generateTldr(summary, content) {
  if (summary) return summary;
  const plain = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return plain.slice(0, 200) + (plain.length > 200 ? '...' : '');
}

/* ---------- Search index ---------- */

function buildSearchIndex(articles) {
  const docs = articles.map(a => ({
    id: String(a.id),
    title: a.title || '',
    summary: a.summary || a.seo_description || '',
    content: (a.content || '').replace(/[#*`>_\-\[\]()]/g, '').slice(0, 500),
    category: a.category || '',
    tags: Array.isArray(a.tags) ? a.tags.join(' ') : '',
    lang: a.lang || 'zh',
    url: (a.lang === 'en' ? '/en/blog/' : '/blog/') + a.slug + '/',
  }));

  // Build a simple inverted index (lunr will be loaded client-side)
  // We export docs + a pre-built lunr index
  try {
    const lunr = require('lunr');
    const idx = lunr(function () {
      this.ref('id');
      this.field('title', { boost: 10 });
      this.field('summary', { boost: 5 });
      this.field('content');
      this.field('category', { boost: 3 });
      this.field('tags', { boost: 3 });
      docs.forEach(doc => this.add(doc));
    });
    return { index: idx.toJSON(), docs };
  } catch {
    return { index: null, docs };
  }
}

/* ---------- Sitemap ---------- */

function buildSitemap(articles) {
  const urls = [
    { loc: siteUrl + '/', changefreq: 'daily', priority: '1.0' },
    { loc: siteUrl + '/en/', changefreq: 'daily', priority: '0.9' },
    { loc: siteUrl + '/blog/', changefreq: 'daily', priority: '0.8' },
    { loc: siteUrl + '/en/blog/', changefreq: 'daily', priority: '0.8' },
    { loc: siteUrl + '/search/', changefreq: 'weekly', priority: '0.5' },
  ];
  articles.forEach(a => {
    const prefix = a.lang === 'en' ? '/en/blog/' : '/blog/';
    const lastmod = a.updated_at || a.publish_at || a.created_at || new Date().toISOString();
    urls.push({ loc: siteUrl + prefix + a.slug + '/', changefreq: 'weekly', priority: '0.7', lastmod });
  });
  const entries = urls.map(u => {
    let xml = `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>`;
    if (u.lastmod) xml += `\n    <lastmod>${new Date(u.lastmod).toISOString().split('T')[0]}</lastmod>`;
    xml += '\n  </url>';
    return xml;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

/* ---------- RSS Feed ---------- */

function buildRssFeed(articles) {
  const items = articles.slice(0, 20).map(a => {
    const link = siteUrl + (a.lang === 'en' ? '/en/blog/' : '/blog/') + a.slug + '/';
    const pubDate = new Date(a.publish_at || a.created_at || Date.now()).toUTCString();
    const desc = (a.summary || a.seo_description || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const title = (a.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return `    <item>\n      <title>${title}</title>\n      <link>${link}</link>\n      <description>${desc}</description>\n      <pubDate>${pubDate}</pubDate>\n      <guid>${link}</guid>\n    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OpenAI-Hub Blog</title>
    <link>${siteUrl}</link>
    <description>OpenAI-Hub - AI API 聚合平台</description>
    <language>zh-CN</language>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
${items.join('\n')}
  </channel>
</rss>`;
}

/* ---------- Main build ---------- */

function build() {
  ensureDir(publicDir);
  const locales = {
    zh: readJson(path.join(i18nDir, 'zh.json')),
    en: readJson(path.join(i18nDir, 'en.json')),
  };

  const allArticles = getArticles();
  const zhArticles = allArticles.filter(a => a.lang === 'zh');
  const enArticles = allArticles.filter(a => a.lang === 'en');

  // Static pages
  for (const page of staticPages) {
    const locale = locales[page.lang];
    const articles = page.lang === 'zh' ? zhArticles : enArticles;
    const hreflangs = [
      { lang: 'zh', href: siteUrl + '/' + page.pagePath.replace(/^en\//, '') },
      { lang: 'en', href: siteUrl + '/en/' + page.pagePath.replace(/^en\//, '') },
    ];

    // JSON-LD for index pages
    const jsonLd = [];
    if (page.template === 'index.njk') {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'OpenAI-Hub',
        url: siteUrl,
        description: locale.site.description,
        logo: siteUrl + '/assets/images/logo.png',
      });
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: locale.site.name,
        url: siteUrl,
        potentialAction: { '@type': 'SearchAction', target: siteUrl + '/search/?q={search_term_string}', 'query-input': 'required name=search_term_string' },
      });
      if (locale.faq && locale.faq.items) {
        jsonLd.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: locale.faq.items.map(q => ({
            '@type': 'Question',
            name: q.question,
            acceptedAnswer: { '@type': 'Answer', text: q.answer },
          })),
        });
      }
    }

    const html = nunjucks.render(page.template, {
      lang: page.lang,
      locale,
      articles,
      pagePath: page.pagePath,
      siteUrl,
      canonicalUrl: siteUrl + '/' + page.pagePath,
      hreflangs,
      jsonLd: jsonLd.length ? jsonLd : null,
      currentYear: new Date().getFullYear(),
    });

    const outPath = path.join(publicDir, page.output);
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, html, 'utf8');
  }

  // Article detail pages
  for (const article of allArticles) {
    const locale = locales[article.lang] || locales['zh'];
    const prefix = article.lang === 'en' ? path.join('en', 'blog') : 'blog';
    let articleHtml = marked(article.content || '');
    articleHtml = addHeadingIds(articleHtml);
    const toc = extractToc(articleHtml);
    const tldr = generateTldr(article.summary, articleHtml);
    const readingTime = estimateReadingTime(article.content || '');
    const canonicalUrl = siteUrl + (article.lang === 'en' ? '/en/blog/' : '/blog/') + article.slug + '/';

    const relatedArticles = allArticles
      .filter(a => a.id !== article.id && a.lang === article.lang)
      .slice(0, 5);

    const jsonLd = [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.seo_description || tldr,
      author: { '@type': 'Person', name: article.author || 'OpenAI-Hub' },
      datePublished: article.publish_at || article.created_at,
      dateModified: article.updated_at || article.publish_at || article.created_at,
      publisher: { '@type': 'Organization', name: 'OpenAI-Hub', url: siteUrl },
      mainEntityOfPage: canonicalUrl,
    }, {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: locale.nav?.home || '首页', item: siteUrl + (article.lang === 'en' ? '/en/' : '/') },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: siteUrl + (article.lang === 'en' ? '/en/blog/' : '/blog/') },
        { '@type': 'ListItem', position: 3, name: article.title, item: canonicalUrl },
      ],
    }];

    const html = nunjucks.render('article.njk', {
      lang: article.lang,
      locale,
      article,
      articleHtml,
      toc,
      tldr,
      readingTime,
      relatedArticles,
      siteUrl,
      canonicalUrl,
      pageTitle: article.seo_title || article.title,
      pageDescription: article.seo_description || tldr,
      ogType: 'article',
      hreflangs: null,
      jsonLd,
      currentYear: new Date().getFullYear(),
    });

    const outDir = path.join(publicDir, prefix, article.slug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
  }

  // Copy assets
  copyDir(assetsDir, path.join(publicDir, 'assets'));

  // Search index
  const searchData = buildSearchIndex(allArticles);
  fs.writeFileSync(path.join(publicDir, 'search-index.json'), JSON.stringify(searchData), 'utf8');

  // Sitemap
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), buildSitemap(allArticles), 'utf8');

  // RSS Feed
  fs.writeFileSync(path.join(publicDir, 'feed.xml'), buildRssFeed(allArticles), 'utf8');

  // Robots.txt
  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf8');

  console.log(`[build] Completed at ${new Date().toLocaleString()} — ${allArticles.length} articles`);
}

function watch() {
  build();
  const watcher = chokidar.watch([templatesDir, i18nDir, assetsDir], { ignoreInitial: true });
  watcher.on('all', (eventName, filePath) => {
    console.log(`[watch] ${eventName}: ${path.relative(rootDir, filePath)}`);
    try { build(); } catch (error) { console.error('[watch] Build failed:', error); }
  });
  console.log('[watch] Watching templates, i18n, and assets...');
}

if (process.argv.includes('--watch')) watch();
else build();
