const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const chokidar = require('chokidar');

const rootDir = path.resolve(__dirname, '..');
const templatesDir = path.join(rootDir, 'templates');
const i18nDir = path.join(rootDir, 'i18n');
const assetsDir = path.join(rootDir, 'assets');
const publicDir = path.join(rootDir, 'public');

nunjucks.configure(templatesDir, {
  autoescape: true,
  noCache: true
});

const pages = [
  { lang: 'zh', template: 'index.njk', output: 'index.html', pagePath: '' },
  { lang: 'en', template: 'index.njk', output: path.join('en', 'index.html'), pagePath: 'en/' }
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build() {
  ensureDir(publicDir);
  const locales = {
    zh: readJson(path.join(i18nDir, 'zh.json')),
    en: readJson(path.join(i18nDir, 'en.json'))
  };

  for (const page of pages) {
    const locale = locales[page.lang];
    const html = nunjucks.render(page.template, {
      lang: page.lang,
      locale,
      pagePath: page.pagePath,
      baseUrl: page.lang === 'zh' ? '/' : '/en/',
      altPath: page.lang === 'zh' ? 'en/' : '',
      altHref: page.lang === 'zh' ? '/en/' : '/',
      currentYear: new Date().getFullYear()
    });

    const outPath = path.join(publicDir, page.output);
    ensureDir(path.dirname(outPath));
    fs.writeFileSync(outPath, html, 'utf8');
  }

  copyDir(assetsDir, path.join(publicDir, 'assets'));
  console.log(`[build] Completed at ${new Date().toLocaleString()}`);
}

function watch() {
  build();
  const watcher = chokidar.watch([templatesDir, i18nDir, assetsDir], {
    ignoreInitial: true
  });

  watcher.on('all', (eventName, filePath) => {
    console.log(`[watch] ${eventName}: ${path.relative(rootDir, filePath)}`);
    try {
      build();
    } catch (error) {
      console.error('[watch] Build failed:', error);
    }
  });

  console.log('[watch] Watching templates, i18n, and assets...');
}

if (process.argv.includes('--watch')) {
  watch();
} else {
  build();
}
