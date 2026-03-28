# OpenAI-Hub 官网

AI API 聚合平台官方网站 - https://www.openai-hub.com

## 技术栈

- **前端**: 纯 HTML/CSS/JS 静态页面（Nunjucks 模板预渲染）
- **后台**: Node.js + Express + SQLite (后续可迁移 MySQL)
- **AI 内容**: 集成 AI API 自动生成文章草稿，人工审核后发布
- **SEO/GEO**: 语义化 HTML、JSON-LD、Open Graph、AI 搜索引擎优化
- **多语言**: 中/英文支持

## 项目结构

```
openai-hub-web/
├── public/                 # 生成的静态 HTML 文件（部署用）
├── server/                 # 后台 CMS 服务
│   ├── app.js             # Express 入口
│   ├── routes/            # API 路由
│   ├── models/            # 数据模型
│   ├── services/          # 业务逻辑（AI生成、定时发布）
│   ├── middleware/         # 中间件
│   └── db/                # 数据库迁移和 seed
├── admin/                  # 后台管理前端
│   ├── index.html
│   └── assets/
├── templates/              # Nunjucks 页面模板
│   ├── base.njk
│   ├── index.njk
│   ├── article.njk
│   ├── docs.njk
│   └── partials/
├── assets/                 # 静态资源（CSS/JS/图片）
│   ├── css/
│   ├── js/
│   └── images/
├── scripts/                # 构建脚本
│   └── build.js           # 模板 → 静态 HTML
├── i18n/                   # 多语言文件
│   ├── zh.json
│   └── en.json
├── package.json
└── .gitignore
```

## 开发

```bash
npm install
npm run dev        # 启动开发服务器
npm run build      # 生成静态页面
npm run admin      # 启动后台管理
```

## 部署

静态文件部署到 CDN/Nginx，后台 CMS 部署为 Node.js 服务。
