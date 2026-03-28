document.addEventListener('DOMContentLoaded', async () => {
  const input = document.querySelector('#site-search');
  const results = document.querySelector('#search-results');
  if (!input || !results) return;

  const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  const query = new URLSearchParams(window.location.search).get('q') || '';
  input.value = query;

  try {
    const response = await fetch('/search-index.json');
    const payload = await response.json();
    const idx = lunr.Index.load(payload.index);
    const docs = payload.docs;

    function render(items) {
      if (!items.length) {
        results.innerHTML = '<p>' + (lang === 'en' ? 'No results found.' : '未找到结果。') + '</p>';
        return;
      }
      results.innerHTML = items.map((doc) => '<article class="feature-card"><h2><a href="' + doc.url + '">' + doc.title + '</a></h2><p>' + doc.summary + '</p><p class="meta">' + (doc.category || '') + ' · ' + doc.lang.toUpperCase() + '</p></article>').join('');
    }

    function search(value) {
      const q = value.trim();
      if (!q) {
        render(docs.filter((doc) => doc.lang === lang).slice(0, 10));
        return;
      }
      const merged = idx.search(q + '* ' + q).map((item) => docs.find((doc) => doc.id === item.ref)).filter(Boolean);
      const exact = docs.filter((doc) => doc.lang === lang && (doc.title + ' ' + doc.summary + ' ' + doc.content + ' ' + doc.tags).toLowerCase().includes(q.toLowerCase()));
      const map = new Map();
      [...exact, ...merged].forEach((doc) => { if (doc && doc.lang === lang) map.set(doc.id, doc); });
      render(Array.from(map.values()));
    }

    input.addEventListener('input', (event) => search(event.target.value));
    search(query);
  } catch (error) {
    results.innerHTML = '<p>Search unavailable.</p>';
    console.error(error);
  }
});
