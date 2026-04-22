---
title: "Ward 更新日志：黄金监控、盘前盘后、Skill 接入"
date: 2026-04-21
tag: AI工程
---

离[上一篇文章](?post=ward-agent-美股市场数据分析ai工具)过去了 10 天，Ward 陆续补上了几个之前规划的功能，做个更新记录。

## 市场总览：四大指数 + 黄金

主页顶部展示四大美股指数（Nasdaq Composite、Nasdaq 100、Dow Jones、S&P 500）以及黄金的实时行情，包含涨跌幅、当前点位、开盘价、最高价、最低价、成交量。每个指数右侧有「🧠 AI分析」和「📊 K线图」两个按钮，可以一键生成 AI 报告或打开 K 线图模态框。

截图（市场总览）：

![市场总览](/static/2026-04-21/market-overview.png)

## 黄金行情监控

新增了对黄金（GC=F）的实时监控，数据直接集成在市场总览里，不需要单独开页面。黄金的分析走独立的 AI prompt，专门针对大宗商品市场设计，包含美元走势影响、通胀预期、避险情绪等黄金特有维度。

## 盘前 / 盘中 / 盘后行情

新的 UI 模块展示三个时段的价格：

- **Pre-Market（盘前）**：04:00 - 09:30 ET，数据来源 QQQ/SPY/DIA ETF
- **Regular（盘中）**：09:30 - 16:00 ET
- **After-Hours（盘后）**：16:00 后

指数的盘前盘后数据取决于 yfinance 是否收录。切换到「智能问答」页时，盘前盘后数据会自动带入上下文，让 AI 能感知非交易时段的市场状态。

## K 线图模态框

点击任意指数右侧的「📊 K线图」按钮，弹出模态框展示该指数的 K 线图，包含 MA5（黄色）、MA20（紫色）、MA60（蓝色）三条均线，点击模态框外部或右上角 ✕ 关闭。

## AI 市场分析报告

点击「生成报告」按钮，AI 基于当日所有指数数据、黄金数据、盘前盘后数据以及最新市场新闻，生成一份结构化分析报告，包含：

- 今日行情概述
- 主要指数表现表格（指数 / 涨跌幅 / 当前点位）
- 技术面分析（均线位置、短期趋势、支撑/压力位、成交量）
- 市场情绪评分（0-9 分）及情绪解读
- 重大新闻事件（带正面/中性/负面标签）
- 投资思考

报告结果会缓存在 SQLite 中，TTL 5 分钟，过期自动清理。

## ward-skill：接入 AI Agent

这是这周新增的最重要的功能。Ward 可以接入任意 AI Agent（Hermes、OpenClaw、Claude Code 等），用户在微信/飞书/Telegram 发消息问美股，Agent 自动调 Ward API 回复，无需暴露 Ward 到公网。

### 原理

Agent 收到消息后，识别出用户在问美股相关问题，调用 Ward 的 REST API 获取实时数据，再将数据连同系统 prompt 一并交给 LLM 生成回复。整个过程：

1. **微信/飞书/Telegram** → 消息到达 Agent
2. **Agent** → 识别为美股查询，调用 `GET /api/market-overview` 等
3. **Ward API** → 返回实时指数、黄金、盘前盘后数据
4. **Agent** → 将数据注入 prompt，LLM 生成自然语言回复
5. **用户** → 在微信/飞书/Telegram 收到回复

用户侧完全感知不到 API 的存在，就像在和一个懂股票的 AI 对话。

### 支持的 AI Agent

| Agent | 接入方式 |
|-------|---------|
| **Hermes**（当前对话的 Agent）| `cp -r ward ~/.hermes/skills/ && hermes gateway run --replace` |
| **OpenClaw** | `cp -r ward ~/.openclaw/skills/` |
| **Claude Code** | `cp -r ward ~/.claude/skills/` |
| **其他 Agent** | 任意支持调用 HTTP API 的 Agent 均可接入 |

### 典型对话场景

```
用户（微信）: 道琼斯今天涨了多少？
Agent:     道琼斯工业平均指数今日上涨 +0.47%，当前点位 49,658.32。
             盘前交易价为 496.65（+0.47%），盘中交易价为 496.45（+0.43%），
             暂无盘后数据。整体走势偏强，建议关注 49,850 附近的压力位。

用户（微信）: 苹果现在多少？
Agent:     Apple Inc.（AAPL）当前价格约 189.30 美元，日内涨跌 --（数据加载中）。
             相关新闻：苹果即将迎来 CEO 更替，John Ternus 接任后面临 7 大挑战，
             市场对此持中性偏谨慎态度。

用户（微信）: 黄金最近怎么样？
Agent:     黄金（GC=F）当前报价 4,790.9 美元/盎司，今日下跌 -0.33%。
             开盘价 4,842.4，最高 4,854.8，最低 4,777.3。
             金价下跌反映市场风险偏好回升，可能与美伊谈判进展有关。
```

### 安全说明

Ward 默认只绑定 `127.0.0.1:8000`，外部无法直接访问。接入 Agent 后，所有请求都由 Agent 在服务端发起，Ward 不需要暴露到公网，也不需要额外配置防火墙规则。公网暴露需设置 `WARD_PUBLIC_MODE=1`。

### 安装方式

```bash
# Hermes（本 Agent）
cp -r ward ~/.hermes/skills/ && hermes gateway run --replace

# OpenClaw
cp -r ward ~/.openclaw/skills/

# Claude Code
cp -r ward ~/.claude/skills/
```

详情及持续更新见 [ward-skill](https://github.com/rainj2013/ward-skill)。

## 其他优化

- **数据源切换**：改为 yfinance 优先，AKShare 降级为 fallback
- **K 线图例颜色**：图例颜色现在和实际均线颜色对应（MA5 黄、MA20 紫、MA60 蓝）
- **夏令时判断**：改为直接用美国 DST 规则计算，不再依赖系统时区
- **缓存策略**：AI 报告缓存 TTL 改为 5 分钟，写入前先清理过期记录

---

项目地址：[https://github.com/rainj2013/ward-agent](https://github.com/rainj2013/ward-agent)
