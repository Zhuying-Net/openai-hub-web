const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'server', 'data', 'cms.db');
const db = Database(dbPath);

// Seed categories
const categories = [
  { name: '使用教程', slug: 'tutorials', description: 'API 使用教程和快速入门指南', sort_order: 1 },
  { name: '产品更新', slug: 'updates', description: '平台功能更新和版本发布', sort_order: 2 },
  { name: 'AI 资讯', slug: 'ai-news', description: 'AI 行业动态和前沿技术', sort_order: 3 },
  { name: '最佳实践', slug: 'best-practices', description: '开发者最佳实践和经验分享', sort_order: 4 },
];

const insertCat = db.prepare('INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)');
for (const cat of categories) {
  insertCat.run(cat.name, cat.slug, cat.description, cat.sort_order);
}

// Seed articles
const articles = [
  {
    title: '5 分钟快速接入 OpenAI-Hub API',
    slug: '5-min-quickstart',
    content: `# 5 分钟快速接入 OpenAI-Hub API

## 为什么选择 OpenAI-Hub？

OpenAI-Hub 是一个稳定、透明的 AI API 聚合平台，无需代理即可直接访问 OpenAI 等多种 AI 模型接口。

## 第一步：注册账号

访问 [api.openai-hub.com](https://api.openai-hub.com) 注册一个账号，获取你的 API Key。

## 第二步：配置 API Key

将你的 API Key 设置为环境变量：

\`\`\`bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.openai-hub.com/v1"
\`\`\`

## 第三步：发送第一个请求

\`\`\`python
from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.openai-hub.com/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
\`\`\`

## 第四步：查看消费明细

登录控制台，可以看到每一次 API 调用的详细消费记录，精确到小数点后四位。

## 常见问题

**Q: 支持哪些模型？**
A: 支持 GPT-4o、GPT-4、Claude、Gemini 等主流 AI 模型。

**Q: 计费方式是什么？**
A: 按实际 token 用量计费，与官方价格一致或更低，透明无隐藏费用。`,
    summary: '手把手教你在 5 分钟内完成 OpenAI-Hub API 的注册、配置和首次调用。',
    category: '使用教程',
    tags: 'API,快速入门,教程,OpenAI',
    status: 'published',
    lang: 'zh',
    author: 'OpenAI-Hub',
    seo_title: '5 分钟快速接入 OpenAI-Hub API - 完整教程',
    seo_description: '手把手教你在 5 分钟内完成 OpenAI-Hub API 的注册、配置和首次调用，支持 GPT-4o、Claude 等多模型。',
    seo_keywords: 'OpenAI API,API接入,快速开始,GPT-4o,AI API',
    publish_at: '2026-03-25 10:00:00',
  },
  {
    title: 'OpenAI-Hub 2026 年 3 月更新：新增 GPT-5 支持',
    slug: 'march-2026-update-gpt5',
    content: `# OpenAI-Hub 2026 年 3 月更新

## 🎉 新增 GPT-5 系列模型支持

我们已第一时间接入 OpenAI 最新发布的 GPT-5 系列模型，包括：

- **GPT-5** — 旗舰推理模型
- **GPT-5 Mini** — 轻量高效版本
- **GPT-5 Audio** — 支持语音输入输出

## 📊 计费透明度升级

- 新增实时用量仪表盘
- 支持按项目维度统计消费
- 导出 CSV 格式账单

## ⚡ 性能优化

- 全球节点响应时间降低 30%
- 新增东南亚区域加速节点
- WebSocket 长连接稳定性提升

## 🔒 安全更新

- 支持 IP 白名单访问控制
- 新增 API Key 权限分级
- 审计日志保留期延长至 90 天`,
    summary: 'OpenAI-Hub 2026 年 3 月重大更新：首批接入 GPT-5 系列模型，计费透明度升级，全球加速优化。',
    category: '产品更新',
    tags: '更新,GPT-5,新功能',
    status: 'published',
    lang: 'zh',
    author: 'OpenAI-Hub',
    seo_title: 'OpenAI-Hub 2026年3月更新 - GPT-5 支持上线',
    seo_description: 'OpenAI-Hub 2026 年 3 月重大更新：首批接入 GPT-5 系列模型，计费透明度升级，全球节点加速优化。',
    seo_keywords: 'GPT-5,OpenAI-Hub更新,AI API,模型更新',
    publish_at: '2026-03-20 09:00:00',
  },
  {
    title: '2026 年 AI API 网关选型指南：OpenAI-Hub vs 自建方案',
    slug: 'ai-api-gateway-comparison-2026',
    content: `# 2026 年 AI API 网关选型指南

## 为什么需要 AI API 网关？

随着 AI 应用的爆发式增长，开发者面临多模型接入、成本控制、稳定性保障等挑战。一个好的 API 网关能帮你解决这些问题。

## 自建方案的痛点

| 问题 | 影响 |
|------|------|
| 代理搭建和维护 | 持续运维成本 |
| 多模型适配 | 开发工作量大 |
| 负载均衡 | 需要自行实现 |
| 计费系统 | 难以精确追踪 |
| 安全防护 | 需要专业安全经验 |

## OpenAI-Hub 的优势

### 1. 零运维成本
无需自建代理服务器，注册即用。所有基础设施由平台维护。

### 2. 统一接口
一个 API Key 访问所有主流 AI 模型，无需分别管理多个密钥。

### 3. 内置负载均衡
账号池 + 智能调度，即使高峰期也能保持稳定的响应速度。

### 4. 精确计费
每笔调用精确到小数点后四位，支持按项目、按模型维度统计。

### 5. 企业级安全
不保留任何用户数据，支持 IP 白名单和 API Key 权限分级。

## 结论

对于大多数团队来说，使用成熟的 API 网关比自建方案更经济、更可靠。OpenAI-Hub 在透明度和易用性方面具有明显优势。`,
    summary: '对比 2026 年主流 AI API 接入方案，分析自建代理 vs OpenAI-Hub 在成本、稳定性、安全性方面的差异。',
    category: 'AI 资讯',
    tags: 'AI网关,选型指南,对比分析,API',
    status: 'published',
    lang: 'zh',
    author: 'OpenAI-Hub',
    seo_title: '2026年 AI API 网关选型指南 - OpenAI-Hub vs 自建',
    seo_description: '对比 2026 年主流 AI API 接入方案，从成本、稳定性、安全性等维度分析 OpenAI-Hub 与自建方案的差异。',
    seo_keywords: 'AI API网关,API选型,OpenAI代理,AI接入方案',
    publish_at: '2026-03-15 14:00:00',
  },
  {
    title: 'AI 应用开发中的 Token 成本优化最佳实践',
    slug: 'token-cost-optimization',
    content: `# Token 成本优化最佳实践

## 引言

在生产环境中，API 调用成本是一个重要考量。本文分享几个实用的 Token 优化策略。

## 1. 选择合适的模型

不是每个场景都需要 GPT-4o。对于简单任务，GPT-4o Mini 的成本仅为 GPT-4o 的 1/10。

| 场景 | 推荐模型 | 原因 |
|------|----------|------|
| 简单分类/提取 | GPT-4o Mini | 成本低，速度快 |
| 复杂推理 | GPT-4o / GPT-5 | 准确率高 |
| 代码生成 | Claude Sonnet | 代码质量好 |
| 长文档分析 | Gemini Pro | 上下文窗口大 |

## 2. 优化 Prompt

- 减少不必要的上下文
- 使用 System Prompt 替代重复的指令
- 设置合理的 max_tokens

## 3. 利用缓存

对于相同或相似的请求，实现响应缓存可以显著降低成本。

\`\`\`python
import hashlib
import json

def get_cache_key(messages, model):
    content = json.dumps({"messages": messages, "model": model})
    return hashlib.md5(content.encode()).hexdigest()
\`\`\`

## 4. 使用 OpenAI-Hub 的消费分析

通过 OpenAI-Hub 的精确计费功能，你可以：
- 按项目追踪成本
- 识别高消费的 API 调用
- 设置预算告警

## 总结

Token 成本优化是一个持续的过程。通过合理选择模型、优化 Prompt 和利用平台工具，可以在不影响效果的前提下大幅降低成本。`,
    summary: '分享 AI 应用开发中实用的 Token 成本优化策略，包括模型选择、Prompt 优化和缓存方案。',
    category: '最佳实践',
    tags: 'Token优化,成本控制,最佳实践,开发技巧',
    status: 'published',
    lang: 'zh',
    author: 'OpenAI-Hub',
    seo_title: 'AI Token 成本优化最佳实践 - 降低 API 调用费用',
    seo_description: '分享 AI 应用开发中实用的 Token 成本优化策略，从模型选择到 Prompt 优化，帮助降低 API 调用费用。',
    seo_keywords: 'Token优化,API成本,GPT成本,AI开发最佳实践',
    publish_at: '2026-03-10 11:00:00',
  },
  {
    title: 'Get Started with OpenAI-Hub API in 5 Minutes',
    slug: '5-min-quickstart-en',
    content: `# Get Started with OpenAI-Hub API in 5 Minutes

## Why OpenAI-Hub?

OpenAI-Hub is a stable, transparent AI API aggregation platform. Access OpenAI and multiple AI models without proxy servers.

## Step 1: Create an Account

Visit [api.openai-hub.com](https://api.openai-hub.com) to register and get your API Key.

## Step 2: Configure Your Environment

\`\`\`bash
export OPENAI_API_KEY="your-api-key"
export OPENAI_BASE_URL="https://api.openai-hub.com/v1"
\`\`\`

## Step 3: Make Your First Request

\`\`\`python
from openai import OpenAI

client = OpenAI(
    api_key="your-api-key",
    base_url="https://api.openai-hub.com/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
\`\`\`

## Step 4: Monitor Usage

Log in to the dashboard to see detailed billing for every API call, accurate to 4 decimal places.

## FAQ

**Q: Which models are supported?**
A: GPT-4o, GPT-4, GPT-5, Claude, Gemini, and more.

**Q: How does billing work?**
A: Pay-as-you-go based on actual token usage. Transparent pricing with no hidden fees.`,
    summary: 'A step-by-step guide to get started with OpenAI-Hub API in just 5 minutes.',
    category: 'Tutorials',
    tags: 'API,quickstart,tutorial,OpenAI',
    status: 'published',
    lang: 'en',
    author: 'OpenAI-Hub',
    seo_title: 'Get Started with OpenAI-Hub API in 5 Minutes - Complete Guide',
    seo_description: 'A step-by-step guide to get started with OpenAI-Hub API — register, configure, and make your first AI API call in 5 minutes.',
    seo_keywords: 'OpenAI API,API gateway,quickstart,GPT-4o,AI API',
    publish_at: '2026-03-25 10:00:00',
  },
  {
    title: 'AI API Gateway Comparison 2026: OpenAI-Hub vs Self-Hosted',
    slug: 'api-gateway-comparison-2026-en',
    content: `# AI API Gateway Comparison 2026

## Why Do You Need an AI API Gateway?

As AI adoption accelerates, developers face challenges with multi-model integration, cost management, and reliability.

## Challenges of Self-Hosted Solutions

- Proxy server setup and maintenance
- Multi-model API adaptation
- Load balancing implementation
- Billing and cost tracking
- Security and compliance

## OpenAI-Hub Advantages

### Zero Ops
No proxy servers to maintain. Sign up and start using immediately.

### Unified Interface
One API key for all major AI models. No need to manage multiple credentials.

### Built-in Load Balancing
Account pool and intelligent routing ensure stable performance even during peak traffic.

### Transparent Billing
Every API call tracked to 4 decimal places. Per-project and per-model analytics available.

### Enterprise Security
Zero data retention policy. IP whitelisting and API key permission tiers supported.

## Conclusion

For most teams, a managed API gateway is more cost-effective and reliable than self-hosting.`,
    summary: 'Compare AI API access solutions in 2026 — self-hosted proxy vs OpenAI-Hub across cost, reliability, and security.',
    category: 'AI News',
    tags: 'API gateway,comparison,AI infrastructure',
    status: 'published',
    lang: 'en',
    author: 'OpenAI-Hub',
    seo_title: 'AI API Gateway Comparison 2026 - OpenAI-Hub vs Self-Hosted',
    seo_description: 'Compare AI API gateway options in 2026. Analyze OpenAI-Hub vs self-hosted solutions across cost, reliability, and security.',
    seo_keywords: 'AI API gateway,API comparison,OpenAI proxy,AI infrastructure',
    publish_at: '2026-03-15 14:00:00',
  },
];

const insertArticle = db.prepare(`
  INSERT OR IGNORE INTO articles (title, slug, content, summary, category, tags, status, lang, author, seo_title, seo_description, seo_keywords, publish_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

for (const a of articles) {
  insertArticle.run(a.title, a.slug, a.content, a.summary, a.category, a.tags, a.status, a.lang, a.author, a.seo_title, a.seo_description, a.seo_keywords, a.publish_at);
}

console.log(`Seeded ${categories.length} categories and ${articles.length} articles`);
db.close();
