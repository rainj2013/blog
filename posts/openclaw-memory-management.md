---
date: 2026-02-12
tag: OpenClaw
---

# OpenClaw 与 Claude 的上下文管理机制对比：一场记忆持久化的探索

> 本文基于 OpenClaw 官方文档（v2026.1.10）和实际使用经验整理，Claude 部分参考公开技术资料，建议读者查阅各自官方文档获取最新信息。

## 引言

在使用 AI 助手的过程中，"记忆"是一个经常被忽视但至关重要的话题。作为用户，我希望 AI 能够记住我的偏好、项目配置和历史操作，而不是每次对话都从零开始。本文将深入探讨 OpenClaw 的记忆管理机制，并与 Claude 的上下文管理进行对比。

---

## 一、OpenClaw 的记忆架构

### 1.1 核心设计哲学

根据 [OpenClaw 官方文档](https://docs.openclaw.ai/concepts/memory)，OpenClaw 的记忆遵循一个简单原则：**

> "OpenClaw memory is plain Markdown in the agent workspace. The files are the source of truth; the model only 'remembers' what gets written to disk."

这意味着：
- **持久化存储**：记忆以 Markdown 文件形式存储在磁盘上
- **透明可审计**：用户可以随时查看、编辑记忆文件
- **模型无关**：记忆不依赖于特定模型的上下文窗口

### 1.2 双层记忆结构

OpenClaw 使用两种记忆文件：

| 文件类型 | 路径格式 | 用途 | 加载时机 |
|---------|---------|------|---------|
| 每日日志 | `memory/YYYY-MM-DD.md` | 记录当天的操作、决策、对话 | 会话启动时读取今天+昨天 |
| 长期记忆 | `MEMORY.md` | 存储持久化偏好、配置、重要决策 | 仅在主会话（private session）加载 |

**安全提示**：根据官方文档，`MEMORY.md` **仅在主会话（direct chat）加载**，不会在群组会话中加载，以保护隐私。

### 1.3 自动记忆刷新机制（Pre-compaction Memory Flush）

这是 OpenClaw 最具特色的功能之一。根据 [Session Management & Compaction](https://docs.openclaw.ai/reference/session-management-compaction) 文档：

当会话接近自动压缩（auto-compaction）阈值时，OpenClaw 会触发一个**静默的智能体回合（silent agentic turn）**，提醒模型将重要信息写入磁盘。

**工作流程：**

```
1. 监控会话 token 使用量
   ↓
2. 达到软阈值（soft threshold）
   ↓
3. 触发静默记忆刷新
   ↓
4. 模型将关键信息写入 memory/YYYY-MM-DD.md
   ↓
5. 回复 NO_REPLY（用户无感知）
   ↓
6. 执行上下文压缩
```

**配置参数：**

```json5
{
  agents: {
    defaults: {
      compaction: {
        reserveTokensFloor: 20000,  // 保留 token 下限
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,  // 软阈值
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md",
        },
      },
    },
  },
}
```

### 1.4 向量记忆搜索（Vector Memory Search）

OpenClaw 支持对记忆文件进行语义搜索：

- **索引范围**：`MEMORY.md` + `memory/**/*.md`
- **分块策略**：~400 token/块，80 token 重叠
- **搜索算法**：混合搜索（BM25 + 向量相似度）
- **本地/远程**：支持本地 embedding（node-llama-cpp）或远程 API（OpenAI/Gemini）

**工具：**
- `memory_search`：语义搜索，返回片段 + 文件路径 + 行号
- `memory_get`：读取指定记忆文件的内容

---

## 二、Claude 的上下文管理（待补充官方信源）

> ⚠️ **注意**：以下 Claude 部分内容基于公开技术讨论，建议查阅 [Anthropic 官方文档](https://docs.anthropic.com/) 获取准确信息。

### 2.1 Context Window 架构

Claude 使用传统的上下文窗口（context window）机制：

- **固定窗口大小**：不同模型有不同限制（如 Claude 3.5 Sonnet 为 200K tokens）
- **滑动窗口**：超出限制时，最早的消息会被丢弃
- **无持久化**：对话结束后，上下文不会自动保存到磁盘

### 2.2 与 OpenClaw 的核心差异

| 特性 | OpenClaw | Claude |
|-----|---------|--------|
| **存储位置** | 磁盘文件（Markdown） | 内存（上下文窗口） |
| **持久化** | ✅ 自动持久化到磁盘 | ❌ 会话结束即丢失 |
| **跨会话记忆** | ✅ 通过 memory 文件继承 | ❌ 每次对话从零开始 |
| **用户可控性** | ✅ 可查看、编辑记忆文件 | ❌ 黑盒，用户无法干预 |
| **压缩策略** | 预压缩记忆刷新（pre-compaction flush） | 滑动窗口丢弃 |

### 2.3 Claude 的局限性（基于社区反馈）

根据用户普遍反馈，Claude 存在以下问题：

1. **长对话丢失早期内容**：当对话超过上下文窗口，早期消息被静默丢弃
2. **无自动记忆继承**：每次 `/new` 或新会话，需要手动重新提供背景信息
3. **Projects 功能有限**：虽然 Claude 推出了 Projects 功能，但知识库检索精度不如 OpenClaw 的语义搜索

---

## 三、实战对比：同一个场景的不同体验

### 场景：维护一个长期项目

**使用 OpenClaw：**

1. 第 1 天：配置 GitHub SSH 密钥，记录到 `memory/2026-02-10.md`
2. 第 3 天：修改博客 CSS，记录技术细节到 `memory/2026-02-12.md`
3. 第 7 天：询问 "我的 GitHub 邮箱是什么？"
   - OpenClaw 自动搜索记忆文件，返回：`yangyujian25@gmail.com`

**使用 Claude：**

1. 第 1 天：配置 GitHub SSH 密钥，在对话中说明
2. 第 3 天：开启新会话，需要重新说明项目背景
3. 第 7 天：询问 "我的 GitHub 邮箱是什么？"
   - Claude："抱歉，我无法访问之前的对话记录..."

---

## 四、OpenClaw 记忆机制的技术细节

### 4.1 会话状态的双层存储

根据官方文档，OpenClaw 使用两层存储：

1. **Session Store** (`sessions.json`)
   - 存储会话元数据（sessionId、token 计数、压缩次数等）
   - 可安全编辑，Gateway 会自动重建

2. **Transcript** (`<sessionId>.jsonl`)
   - 追加式的对话记录（JSONL 格式）
   - 包含消息、工具调用、压缩摘要

### 4.2 压缩（Compaction）vs 剪枝（Pruning）

| 机制 | 作用 | 持久化 | 触发时机 |
|-----|------|-------|---------|
| **Compaction** | 总结旧对话为摘要 | ✅ 写入 JSONL | 接近上下文限制时 |
| **Pruning** | 移除旧工具结果 | ❌ 仅内存 | 每次 LLM 调用前 |

**关键洞察**：Compaction 在压缩**前**会触发 memory flush，确保重要信息先写入磁盘。

### 4.3 `/new` 命令的真相

用户常问：`/new` 会清空记忆吗？

**答案**：不会。根据文档：

> "`/new` creates a new session id... The persistent memory files remain; they are reloaded in the new session."

`/new` 只清理**当前会话的临时上下文**（transcript），但**磁盘上的记忆文件**会被重新加载。

---

## 五、用户实践建议

### 5.1 何时写入记忆？

根据官方建议：

- ✅ 重要决策、用户偏好 → `MEMORY.md`
- ✅ 日常操作、项目进展 → `memory/YYYY-MM-DD.md`
- ✅ 当用户说 "remember this" → 立即写入

### 5.2 优化记忆搜索

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        query: {
          hybrid: {
            enabled: true,
            vectorWeight: 0.7,
            textWeight: 0.3,
          }
        }
      }
    }
  }
}
```

### 5.3 隐私保护

- 敏感信息只写入 `MEMORY.md`（不在群组加载）
- 定期检查记忆文件，删除过时信息
- 群组会话中避免提及私人配置

---

## 六、总结

OpenClaw 的记忆管理机制代表了 AI 助手架构的一个重要方向：**将记忆控制权交还给用户**。通过 Markdown 文件、自动预压缩刷新、向量搜索等技术，OpenClaw 实现了：

1. **透明性**：用户可以看到 AI "记得"什么
2. **持久性**：跨会话、跨设备的记忆继承
3. **可控性**：用户可以编辑、删除记忆

相比之下，传统的上下文窗口机制（如 Claude 当前的设计）虽然简单，但在长期协作场景中显得力不从心。

**未来展望**：希望 Claude 等主流 AI 助手也能引入类似的持久化记忆机制，或者至少提供更强大的知识库继承能力。

---

## 参考文档

### OpenClaw 官方文档（本文主要信源）

1. [Memory - OpenClaw Documentation](https://docs.openclaw.ai/concepts/memory)
2. [Session Management & Compaction](https://docs.openclaw.ai/reference/session-management-compaction)
3. [Context - OpenClaw Documentation](https://docs.openclaw.ai/concepts/context)
4. [Compaction - OpenClaw Documentation](https://docs.openclaw.ai/concepts/compaction)
5. [Session - OpenClaw Documentation](https://docs.openclaw.ai/concepts/session)

### Claude/Anthropic 文档（待补充）

- [Anthropic Documentation](https://docs.anthropic.com/)
- [Claude Context Window Guide](https://docs.anthropic.com/en/docs/build-with-claude/context-window) *(待验证)*

---

*本文最初由 OpenClaw 助手基于实际对话整理，记忆文件位于 `memory/2026-02-12.md`。*
