const state = {
  token: localStorage.getItem('cms_token') || '',
  user: JSON.parse(localStorage.getItem('cms_user') || 'null'),
  articles: [],
  categories: [],
  currentArticle: null
};

const els = {
  loginView: document.getElementById('login-view'),
  dashboardView: document.getElementById('dashboard-view'),
  loginForm: document.getElementById('login-form'),
  loginError: document.getElementById('login-error'),
  userInfo: document.getElementById('user-info'),
  panelTitle: document.getElementById('panel-title'),
  navBtns: document.querySelectorAll('.nav-btn'),
  panels: document.querySelectorAll('.panel'),
  articlesTable: document.getElementById('articles-table'),
  articleForm: document.getElementById('article-form'),
  markdownInput: document.getElementById('markdown-input'),
  markdownPreview: document.getElementById('markdown-preview'),
  filterStatus: document.getElementById('filter-status'),
  searchArticles: document.getElementById('search-articles'),
  categoryForm: document.getElementById('category-form'),
  categoriesList: document.getElementById('categories-list'),
  aiForm: document.getElementById('ai-form'),
  aiResult: document.getElementById('ai-result'),
  settingsForm: document.getElementById('settings-form'),
  settingsResult: document.getElementById('settings-result')
};

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

function switchAuthView(loggedIn) {
  els.loginView.classList.toggle('hidden', loggedIn);
  els.dashboardView.classList.toggle('hidden', !loggedIn);
  if (loggedIn && state.user) {
    els.userInfo.textContent = `${state.user.username} (${state.user.role})`;
  }
}

function switchPanel(name) {
  els.navBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.panel === name));
  els.panels.forEach((panel) => panel.classList.toggle('hidden', panel.id !== `${name}-panel`));
  els.panelTitle.textContent = {
    articles: '文章管理',
    categories: '分类管理',
    ai: 'AI 生成',
    settings: '系统设置'
  }[name] || '后台管理';
}

function renderMarkdown() {
  const content = els.markdownInput.value || '';
  els.markdownPreview.innerHTML = window.marked ? marked.parse(content) : content;
}

function fillArticleForm(article = null) {
  state.currentArticle = article;
  els.articleForm.reset();
  if (!article) {
    renderMarkdown();
    return;
  }

  Object.entries(article).forEach(([key, value]) => {
    const field = els.articleForm.elements.namedItem(key);
    if (!field) return;
    if (key === 'tags') {
      field.value = (value || []).join(', ');
    } else if (key === 'publish_at' && value) {
      field.value = value.slice(0, 16);
    } else {
      field.value = value ?? '';
    }
  });
  renderMarkdown();
}

function renderArticles() {
  els.articlesTable.innerHTML = state.articles.map((item) => `
    <tr data-id="${item.id}">
      <td>${item.id}</td>
      <td>${item.title}</td>
      <td>${item.status}</td>
      <td>${item.lang}</td>
      <td>${item.updated_at || ''}</td>
    </tr>
  `).join('');

  els.articlesTable.querySelectorAll('tr').forEach((row) => {
    row.addEventListener('click', async () => {
      const data = await api(`/api/articles/${row.dataset.id}`);
      fillArticleForm(data.item);
    });
  });
}

function renderCategories() {
  els.categoriesList.innerHTML = state.categories.map((item) => `
    <li data-id="${item.id}">
      <strong>${item.name}</strong><br />
      <small>${item.slug}</small><br />
      <span>${item.description || ''}</span>
    </li>
  `).join('');

  els.categoriesList.querySelectorAll('li').forEach((item) => {
    item.addEventListener('click', () => {
      const category = state.categories.find((entry) => String(entry.id) === item.dataset.id);
      if (!category) return;
      Object.entries(category).forEach(([key, value]) => {
        const field = els.categoryForm.elements.namedItem(key);
        if (field) field.value = value ?? '';
      });
    });
  });
}

async function loadArticles() {
  const params = new URLSearchParams();
  if (els.filterStatus.value) params.set('status', els.filterStatus.value);
  if (els.searchArticles.value) params.set('search', els.searchArticles.value);
  const data = await api(`/api/articles?${params.toString()}`);
  state.articles = data.items || [];
  renderArticles();
}

async function loadCategories() {
  const data = await api('/api/categories');
  state.categories = data.items || [];
  renderCategories();
}

async function loadSettings() {
  const data = await api('/api/settings');
  Object.entries(data.items || {}).forEach(([key, value]) => {
    const field = els.settingsForm.elements.namedItem(key);
    if (field) field.value = value ?? '';
  });
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const formData = new FormData(els.loginForm);
    const payload = Object.fromEntries(formData.entries());
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('cms_token', state.token);
    localStorage.setItem('cms_user', JSON.stringify(state.user));
    switchAuthView(true);
    await Promise.all([loadArticles(), loadCategories(), loadSettings()]);
  } catch (error) {
    els.loginError.textContent = error.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('cms_token');
  localStorage.removeItem('cms_user');
  state.token = '';
  state.user = null;
  switchAuthView(false);
});

document.getElementById('refresh-articles').addEventListener('click', loadArticles);
document.getElementById('create-article').addEventListener('click', () => fillArticleForm(null));
document.getElementById('delete-article').addEventListener('click', async () => {
  const id = els.articleForm.elements.namedItem('id').value;
  if (!id) return;
  if (!confirm('确认删除这篇文章？')) return;
  await api(`/api/articles/${id}`, { method: 'DELETE' });
  fillArticleForm(null);
  await loadArticles();
});
els.filterStatus.addEventListener('change', loadArticles);
els.searchArticles.addEventListener('input', () => {
  clearTimeout(window.__articleSearchTimer);
  window.__articleSearchTimer = setTimeout(loadArticles, 300);
});
els.markdownInput.addEventListener('input', renderMarkdown);

els.articleForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(els.articleForm);
  const payload = Object.fromEntries(formData.entries());
  payload.tags = payload.tags ? payload.tags.split(',').map((item) => item.trim()).filter(Boolean) : [];
  payload.publish_at = payload.publish_at || null;
  const id = payload.id;
  delete payload.id;
  if (id) {
    await api(`/api/articles/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    await api('/api/articles', { method: 'POST', body: JSON.stringify(payload) });
  }
  await loadArticles();
});

els.categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(els.categoryForm);
  const payload = Object.fromEntries(formData.entries());
  const id = payload.id;
  delete payload.id;
  if (id) {
    await api(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    await api('/api/categories', { method: 'POST', body: JSON.stringify(payload) });
  }
  els.categoryForm.reset();
  await loadCategories();
});

document.getElementById('reset-category').addEventListener('click', () => els.categoryForm.reset());

els.aiForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.aiResult.textContent = 'AI 正在生成文章，请稍候...';
  try {
    const formData = new FormData(els.aiForm);
    const payload = Object.fromEntries(formData.entries());
    const data = await api('/api/ai/generate', { method: 'POST', body: JSON.stringify(payload) });
    els.aiResult.textContent = `已生成待审核文章：${data.item.title}`;
    switchPanel('articles');
    await loadArticles();
    fillArticleForm(data.item);
  } catch (error) {
    els.aiResult.textContent = error.message;
  }
});

els.settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(els.settingsForm);
  const payload = Object.fromEntries(formData.entries());
  await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
  els.settingsResult.textContent = '设置已保存';
});

els.navBtns.forEach((btn) => btn.addEventListener('click', () => switchPanel(btn.dataset.panel)));

(async function init() {
  if (!state.token) {
    switchAuthView(false);
    return;
  }

  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    localStorage.setItem('cms_user', JSON.stringify(state.user));
    switchAuthView(true);
    await Promise.all([loadArticles(), loadCategories(), loadSettings()]);
    renderMarkdown();
  } catch (error) {
    localStorage.removeItem('cms_token');
    localStorage.removeItem('cms_user');
    switchAuthView(false);
  }
})();
