---
title: "Ward 更新日志：黄金监控、盘前盘后、Agent 接入"
date: 2026-04-21
tag: AI工程
---

离[上一篇文章](/posts/ward-agent-美股市场数据分析AI工具/)过去了 10 天，Ward 陆续补上了几个之前规划的功能，做个更新记录。

## 黄金行情监控

新增了对黄金（GC=F）的实时监控，数据直接集成在市场总览里，不需要单独开页面。

```
GET /api/market-overview
```

返回的 `indices` 数组里现在包含五项：Nasdaq Composite、Nasdaq 100、Dow Jones、S&P 500、Gold。黄金的分析走独立的 AI prompt，专门针对大宗商品市场设计，包含美元走势影响、通胀预期、避险情绪等黄金特有维度。

## 盘前 / 盘中 / 盘后行情

之前文章里规划过这个功能，现在上线了。新的 UI 模块展示三个时段的价格：

- **Pre-Market（盘前）**：04:00 - 09:30 ET，数据来源 QQQ/SPY/DIA ETF
- **Regular（盘中）**：09:30 - 16:00 ET
- **After-Hours（盘后）**：16:00 后

对应的 API 是 `GET /api/stock/{symbol}/extended`，返回 `{pre, regular, after, previous_close}`，pre 和 after 可能为空（特定时段无数据时）。指数的盘前盘后数据取决于 yfinance 是否收录。

## 数据源切换：yfinance 优先

之前版本主要用 AKShare Sina 获取美股指数，但 Sina 数据更新频率偏低（可能落后 2-3 天）。现在改为 yfinance 优先：

- 指数实时行情：直接用 `^IXIC`/`^DJI`/`^GSPC` 查询
- 个股数据：用 `t.info['currentPrice']` 和 `t.info['previousClose']`，不用 `fast_info.price`（后者盘后可能返回 `None`）

AKShare 降级为 fallback，当 yfinance 不可用时代替。

## K 线图例颜色修复

之前 K 线图的图例颜色和实际均线颜色不一致，图例固定显示成第一个系列的颜色。修复后图例颜色跟随各条均线的实际颜色（MA5 黄色、MA20 紫色、MA60 蓝色）。

## 盘前盘后数据接入智能问答上下文

盘前/盘中/盘后数据现在会自动带入智能问答的上下文。当用户生成过指数 AI 分析报告后切换到问答页，AI 能感知盘前盘后数据做出更准确的判断。

## 夏令时判断修复

之前用系统时区 offset 差值判断美国 DST，但服务器是北京时间，永远无 DST。修复为直接用美国 DST 规则计算：3 月第二个周日 ~ 11 月第一个周日为夏令时，对应北京时间的开市窗口分别 21:30-04:00（夏令时）和 22:30-05:00（冬令时）。

## 缓存策略优化

AI 分析报告的缓存 TTL 改为 5 分钟，且 get 时检查是否过期，过期返回 None；set 时先清理过期记录再写入。这样保证 SQLite 文件不会随时间无限增长。

## ward-skill：接入 AI Agent

这是这周新增的最重要的功能。Ward 现在可以接入任意 AI Agent（Hermes、OpenClaw、Claude Code 等），用户在微信/飞书/Telegram 发消息问美股，Agent 自动调 Ward API 回复，无需暴露 Ward 到公网。

安装方式：

```bash
# Hermes
cp -r ward ~/.hermes/skills/ && hermes gateway run --replace

# OpenClaw
cp -r ward ~/.openclaw/skills/
```

详情见 [ward-skill](https://github.com/rainj2013/ward-skill)。

---

项目地址：[https://github.com/rainj2013/ward-agent](https://github.com/rainj2013/ward-agent)
