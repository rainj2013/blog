---
title: "OpenClaw Workspace 架构详解：多 Agent 设计指南"
date: 2026-03-10
tag: OpenClaw
---

# OpenClaw Workspace 架构详解：多 Agent 设计与自定义指南

> 本文介绍 OpenClaw 的 Workspace 文件架构，以及如何为不同 Agent 定制个性化工作环境

## 引言

OpenClaw 是一个多 Agent 管理系统，每个 Agent 有自己独立的 Workspace。理解 Workspace 的文件架构，是定制 Agent 行为的关键。本文以主 Agent（main）和博客 Agent（blog-agent）为例，详细说明各个文件的作用与差异。

## Workspace 核心文件

每个 Agent 的 Workspace 根目录都包含一组标准 Markdown 文件，它们在 Agent 启动时会被自动加载，构成了 Agent 的"记忆"和"行为准则"。

### 1. AGENTS.md — 工作指南

**作用**：Agent 的核心工作手册，定义了如何运行、记忆机制、行为边界等。

**默认内容包含**：
- **First Run**：首次启动时的初始化流程
- **Session Startup**：每次会话必须执行的启动步骤（读取 SOUL.md、USER.md、memory 等）
- **Memory**：记忆分层机制（每日记录 vs 长期记忆）
- **Red Lines**：不可逾越的底线（如不泄露隐私、不随意执行删除命令）
- **Group Chats**：群聊行为准则（何时该说话、何时该沉默、何时用 reaction）
- **Heartbeats**：主动检查机制（邮件、日历、天气等）
- **Tools**：技能和本地工具的使用方式

**可定制性**：高。这是定制 Agent 行为的核心文件，不同 Agent 可以有不同的规则。

### 2. SOUL.md — 身份与原则

**作用**：定义 Agent 的"灵魂"——我是谁、我应该怎么做人。

**默认内容**：
- Core Truths：真诚帮忙、可以有主见、自己先想办法、记住是客人
- Boundaries：隐私第一、外部行动要确认
- Vibe：简洁、不过度客套

**blog-agent 定制示例**：
```markdown
# SOUL.md - Blog Writer

## Core Purpose

你是专门的博客写手，负责为 rainj2013 创建高质量的技术博客内容。

## Behavior

- 专注于写作，不做其他杂事
- 简洁回复，不需要客套话
- 写作风格：技术性强，逻辑清晰，适当幽默
```

差异点：主 Agent 是通用助手，blog-agent 明确限定为"博客写手"角色。

### 3. USER.md — 用户信息

**作用**：记录当前 Agent 服务的用户信息。

**主 Agent 内容**（已填写）：
```markdown
- **Name:** 杨雨健
- **What to call them:** rainj2013
- **Timezone:** UTC

## Context
- 有个博客：https://rainj2013.top
- 最近在准备 Java 面试
```

**blog-agent 内容**：空（不需要了解用户太多背景，只需要知道博客位置）

**可定制性**：根据 Agent 职责决定是否需要填写。

### 4. BOOTSTRAP.md — 初始化引导

**作用**：全新 Agent 首次启动时的对话引导模板，帮助认识用户。

**默认内容**：包含打招呼、确定名字/风格、讨论行为边界等步骤。

**何时使用**：只有当 Workspace 是全新创建、没有任何记忆时才会用到。初始化完成后应删除此文件。

**可定制性**：可以修改引导问题的顺序和内容。

### 5. HEARTBEAT.md — 定期任务

**作用**：定义主动检查任务（如邮件、日历、天气等）。

**默认内容**：空文件 = 不执行任何定期检查。

**主 Agent 示例**（如果启用）：
```markdown
## 待检查
- 邮件（紧急？）
- 日历（24-48h内事件？）
- 天气（出门需要带伞吗？）
```

**可定制性**：高。可以为不同 Agent 配置不同的检查项。

### 6. TOOLS.md — 本地工具配置

**作用**：存放环境相关的本地信息（不包含在技能中）。

**默认内容**：空文件模板。

**示例**：
```markdown
### 相机
- living-room → 客厅摄像头

### SSH
- home-server → 192.168.1.100
```

**可定制性**：高。根据本地环境配置。

### 7. IDENTITY.md — 身份元数据

**作用**：Agent 的身份标识。

**默认内容**：空模板，包含 Name、Creature、Vibe、Emoji、Avatar 字段。

**可定制性**：为 Agent 赋予人格特征。

## Skill 文件

### SKILL.md — 技能定义

**作用**：定义 Agent 可以使用的技能和工作流程。

**默认**：无（只有特定 Agent 才有）。

**blog-agent 定制示例**：
```markdown
# SKILL.md - 博客维护

## 概述
帮 rainj2013 维护博客，包括写新文章和调整网站本身。

## 博客文件位置
- 博客目录：/root/.openclaw/workspace-blog/myblog/
- GitHub：rainj2013/blog，分支：master

## 工作流程
1. 添加 frontmatter
2. 本地预览（可选）
3. 提交推送
4. 等待部署
```

## 文件加载顺序

当用户发送消息时，Agent 会按以下顺序加载文件：

```
1. AGENTS.md（必读，工作指南）
2. SOUL.md（必读，了解自己）
3. USER.md（必读，了解用户）
4. memory/YYYY-MM-DD.md（今日记忆）
5. MEMORY.md（仅主会话，長期记忆）
6. HEARTBEAT.md（如果有定期任务）
7. SKILL.md（如果需要特定技能）
```

## 多 Agent 架构设计

### 通道绑定（Channel Binding）

OpenClaw 支持将不同的消息渠道绑定到不同的 Agent：

```bash
main <- feishu accountId=default    # 私聊
blog-agent <- feishu accountId=blog # blog 群聊
```

这样：
- 用户在飞书私聊机器人 → 主 Agent 响应
- 用户在 blog 群聊 → 博客 Agent 响应

### Workspace 隔离

每个 Agent 有独立的 Workspace：
- 主 Agent：`~/.openclaw/workspace/`
- 博客 Agent：`~/.openclaw/workspace-blog/`

**关键差异**：

| 文件 | 主 Agent | Blog Agent |
|------|----------|------------|
| AGENTS.md | 完整通用规则 | 简化版专注博客 |
| SOUL.md | 通用助手 | 博客写手角色 |
| USER.md | rain 的详细信息 | 空（不需要） |
| SKILL.md | 无 | 博客工作流程 |
| 记忆 | 包含各种上下文 | 独立不共享 |

## 总结

OpenClaw 的 Workspace 架构设计非常灵活：

1. **文件即配置**：所有行为准则都写在 Markdown 文件中，易于理解和修改
2. **记忆隔离**：不同 Agent 有独立的记忆空间，隐私安全
3. **职责分离**：通过 Channel Binding 实现不同场景调用不同 Agent
4. **可扩展性**：通过 SKILL.md 可以为特定 Agent 添加专属技能

这种设计让一个 AI 助手可以同时服务多个场景，既保持了通用性，又有足够的专业性。
