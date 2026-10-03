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

## 本地预览与编辑

需要 Python 3.9+ 和 Node.js，无需安装额外依赖：

```bash
python3 dev/preview.py --port 8766
```

打开 `http://localhost:8766/`，进入文章后点击「编辑文章」。左侧编辑完整 Markdown（含标题、日期、摘要等文章信息），右侧即时预览；点击「保存到文件」或按 Ctrl/⌘+S，将修改保存回 `posts/`，并自动更新 `posts.json`、`sitemap.xml` 和当前页面。未保存关闭时会提醒；如文件被外部编辑器修改，保存会提示冲突并保留当前草稿。

该服务只监听本机。编辑入口与脚本由本地服务注入，普通静态服务器与线上页面都不会加载；GitHub Pages 部署仅上传静态站点文件，不包含 `dev/` 编辑器或写入接口。原来的 `python3 -m http.server` 仍可用于只读预览。

编辑器检查：`python3 -m unittest dev.test_preview`。
