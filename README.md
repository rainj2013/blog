# rainj2013 的博客

👋 你好，我是 rainj2013。

这是我的个人博客，主要分享技术文章、学习笔记和个人思考。

## 关注我

- GitHub: [@rainj2013](https://github.com/rainj2013)
- 微信公众号: 搜索 **rainj2013**

## 联系方式

欢迎通过 GitHub 与我交流。

## 关于博客

博客地址: https://rainj2013.top

文章存放在 `posts/` 目录，使用 `posts.json` 作为索引。

## WebMCP（实验功能）

支持 `document.modelContext.registerTool` 的浏览器会在文章索引加载后注册四个工具：

- `search_posts({ query?, tag?, offset?, limit? })`：搜索标题、摘要和标签，按最新优先返回文章元数据。默认每页 10 篇，最多 50 篇；`nextOffset` 为下一页偏移，`null` 表示结束。
- `list_tags({})`：返回标签及文章数量。
- `read_post({ id })`：返回指定文章的元数据和 Markdown 正文，不改变页面。
- `open_post({ id })`：在当前页面打开文章并更新浏览历史。

结果为 JSON 字符串，文章 ID 从搜索结果获取。工具不需要后端或模型密钥；调用方需要支持 WebMCP 的 Agent。未支持该 API 的浏览器照常浏览，不加载 polyfill。注册失败不会阻断网站初始化。

本地运行 `python3 -m http.server 8000`，在支持的 Chrome 中按[官方文档](https://developer.chrome.com/docs/ai/webmcp)启用 `chrome://flags/#enable-webmcp-testing` 后访问 `http://localhost:8000`。在提供发现和执行接口的版本中，可通过控制台验证：

```js
const tools = await document.modelContext.getTools();
const search = tools.find(tool => tool.name === 'search_posts');
JSON.parse(await document.modelContext.executeTool(search, JSON.stringify({ query: 'MCP' })));
```

WebMCP 仍在演进，浏览器 API 版本可能不同。面向线上访客启用需按官方要求申请对应域名的 Origin Trial；仓库未包含试用 token。修改工具后运行 `node update-cache.js` 更新资源版本。
