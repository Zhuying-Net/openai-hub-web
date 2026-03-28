function slugify(input = '') {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function parseTags(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (error) {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function stringifyTags(value) {
  return JSON.stringify(parseTags(value));
}

function normalizeArticle(record) {
  if (!record) return null;
  return {
    ...record,
    tags: parseTags(record.tags)
  };
}

module.exports = {
  slugify,
  parseTags,
  stringifyTags,
  normalizeArticle
};
