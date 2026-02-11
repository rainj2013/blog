# 我的博客

一个简洁、现代化的静态博客，纯手工编写，支持直接放置 Markdown 文件，**全自动索引**。

## ✨ 特性

- 🎨 **现代化设计** - 简洁美观的界面
- 🌙 **暗色/亮色模式** - 一键切换主题
- 📱 **响应式布局** - 完美适配手机、平板、电脑
- 📝 **Markdown 支持** - 直接在 `posts/` 目录放 .md 文件
- 🤖 **全自动索引** - GitHub Actions 自动扫描生成文章列表
- ⚡ **极速加载** - 纯静态页面，无需后端
- 🎭 **动画效果** - 流畅的过渡动画

## 📁 文件结构

```
.
├── index.html              # 首页
├── style.css               # 样式表（支持暗色模式）
├── main.js                 # 交互逻辑
├── generate-posts.js       # 自动生成文章索引脚本
├── posts.json              # 文章索引（自动生成）
├── CNAME                   # 自定义域名配置
├── README.md               # 说明文档
├── posts/                  # 文章目录
│   ├── hello-world.md      # 示例文章
│   └── my-tech-stack.md    # 另一篇示例
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages 自动部署
```

## 📝 添加文章（超简单！）

### 只需两步：

1. **在 `posts/` 目录创建 `.md` 文件**

   ```bash
   touch posts/我的文章.md
   ```

2. **编写内容**（可选添加元数据）

   ```markdown
   ---
   date: 2026-02-11
tag: 随笔
   ---
   
   # 文章标题
   
   这里是文章内容，支持所有 Markdown 语法。
   
   ## 小标题
   
   - 列表项
   - **加粗** 和 *斜体*
   
   > 引用块
   
   ```javascript
   // 代码块
   console.log("Hello");
   ```
   ```

3. **Push 到 GitHub**

   ```bash
   git add posts/
   git commit -m "添加新文章"
   git push
   ```

   ✅ **搞定！** GitHub Actions 会自动：
   - 扫描 `posts/` 目录
   - 提取标题、摘要、日期、标签
   - 生成 `posts.json`
   - 部署到 GitHub Pages

### 元数据（可选）

在文章开头添加 YAML frontmatter：

```markdown
---
date: 2026-02-11
tag: 技术
---

# 文章标题
...
```

| 字段 | 说明 | 自动提取 |
|------|------|----------|
| `date` | 发布日期 | ✅ 可从文件名或文件时间提取 |
| `tag` | 标签分类 | ✅ 可从内容关键词自动判断 |

不写元数据也能正常工作！

## 🚀 部署到 GitHub Pages

### 1. 创建 GitHub 仓库

```bash
# 初始化 git
git init
git add .
git commit -m "Initial commit"
git branch -M main

# 创建仓库（替换 yourusername）
gh repo create yourusername.github.io --public
git remote add origin https://github.com/yourusername/yourusername.github.io.git
git push -u origin main
```

### 2. 启用 GitHub Pages

1. 进入仓库页面 → **Settings** → **Pages**
2. **Source** 选择 **GitHub Actions**
3. 等待自动部署完成（约 2-3 分钟）

### 3. 配置自定义域名（可选）

1. 修改 `CNAME` 文件，填入你的域名
2. 在你的域名 DNS 添加记录：

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | yourusername.github.io |

3. 在仓库 Settings → Pages 中填入自定义域名

## 🛠️ 本地预览

```bash
# 先生成索引（可选，本地预览时）
node generate-posts.js

# 启动本地服务器
python3 -m http.server 8000
# 或
npx serve .
```

然后访问 http://localhost:8000

## 📄 Markdown 支持

博客使用 [marked.js](https://marked.js.org/) 渲染 Markdown，支持：

- ✅ 标题（H1-H6）
- ✅ 段落和换行
- ✅ **加粗** 和 *斜体*
- ✅ [链接](https://example.com)
- ✅ 图片
- ✅ > 引用块
- ✅ 代码块（行内和块级）
- ✅ 列表（有序和无序）
- ✅ 分割线
- ✅ 表格

## 📝 自动生成脚本

`generate-posts.js` 会自动：

1. 扫描 `posts/` 目录下的所有 `.md` 文件
2. 提取文章信息：
   - **标题**：从第一个 H1 标题提取
   - **摘要**：从第一段非空文本提取
   - **日期**：从元数据、文件名或文件时间提取
   - **标签**：从元数据或内容关键词判断
3. 按时间排序（最新的在前）
4. 生成 `posts.json`

### 本地测试生成脚本

```bash
node generate-posts.js
```

## 📄 许可证

MIT License
