require('dotenv').config();

const DEFAULT_API_URL = process.env.AI_API_URL || 'https://api.openai-hub.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

async function generateArticle({ topic, requirements = '', lang = 'zh', style = 'professional' }) {
  if (!process.env.AI_API_KEY) {
    throw new Error('缺少 AI_API_KEY 环境变量');
  }

  const promptLanguage = lang === 'en' ? 'English' : '简体中文';
  const systemPrompt = `你是资深内容编辑，请输出结构清晰、可直接发布到 CMS 的 Markdown 文章。请仅输出 JSON，字段包括 title、summary、content、seo_title、seo_description、seo_keywords、tags。`;
  const userPrompt = `请用${promptLanguage}围绕主题“${topic}”生成一篇文章，风格为 ${style}。额外要求：${requirements || '无'}。content 字段使用 Markdown，summary 控制在 120 字以内，tags 为数组，seo_keywords 用逗号分隔字符串。`;

  const response = await fetch(DEFAULT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI 接口调用失败: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 未返回有效内容');
  }

  const parsed = JSON.parse(content);
  return {
    title: parsed.title || topic,
    summary: parsed.summary || '',
    content: parsed.content || '',
    seo_title: parsed.seo_title || parsed.title || topic,
    seo_description: parsed.seo_description || parsed.summary || '',
    seo_keywords: parsed.seo_keywords || '',
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    lang,
    status: 'review'
  };
}

module.exports = {
  generateArticle
};
