---
date: 2026-02-12
tag: OpenClaw
---

# OpenClaw 与 Claude 的上下文管理机制对比：一场记忆持久化的探索

> 本文基于 OpenClaw 官方文档（v2026.1.10）和 Anthropic 官方文档整理，所有技术细节均来自各自官方渠道。

## 引言

在使用 AI 助手的过程中，"记忆"是一个经常被忽视但至关重要的话题。作为用户，我希望 AI 能够记住我的偏好、项目配置和历史操作，而不是每次对话都从零开始。本文将深入探讨 OpenClaw 的记忆管理机制，并与 Claude 的上下文管理进行对比。

---

## 一、OpenClaw 的记忆架构

### 1.1 核心设计哲学

根据 [OpenClaw 官方文档](https://docs.openclaw.ai/concepts/memory)，OpenClaw 的记忆遵循一个简单原则：

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

## 二、Claude Code CLI 的上下文管理机制

### 2.1 会话（Session）模型

Claude Code CLI 是一个终端 AI 编程助手，其上下文管理遵循**会话隔离**原则：

- **每个会话独立**：启动 `claude` 命令后，所有对话在一个会话中进行
- **上下文窗口限制**：受底层 Claude 模型限制（200K tokens）
- **无自动持久化**：会话结束后，上下文不会自动保存到磁盘
- **`/new` 命令**：创建全新会话，之前的上下文完全丢失

### 2.2 上下文压缩（Auto-compact & /compact）

Claude Code CLI 支持**自动压缩**和**手动压缩**两种模式。

**自动压缩（Auto-compact）：**
- 当上下文使用超过 **80%** 阈值时，自动触发压缩
- 显示 `"Context left until auto-compact"` 警告提示用户
- 早期对话历史被自动总结为摘要

**手动压缩（`/compact` 命令）：**
- 用户可以随时运行 `/compact` 手动触发压缩
- 压缩后保留摘要和近期消息

**本地持久化与会话恢复：**
- Claude Code CLI **会**将会话保存到本地磁盘
- 退出时显示提示：`"Use /resume to continue this conversation later"`
- 使用 `/resume` 命令可以恢复之前的会话
- 使用 `--resume` 启动参数自动恢复上一次的会话

**与 OpenClaw 的核心差异：**

| 特性 | Claude Code CLI Auto-compact | OpenClaw Pre-compaction Flush |
|------|---------------------------|------------------------------|
| **触发时机** | 超过 80% 阈值自动触发或手动 `/compact` | 软阈值（默认 4000 tokens）自动静默触发 |
| **摘要保存位置** | 本地会话文件（可恢复） | 磁盘文件（`memory/YYYY-MM-DD.md`） |
| **跨会话继承** | ⚠️ 需手动 `/resume` 恢复，不自动加载 | ✅ 自动加载记忆文件 |
| **用户感知** | 明显（警告提示 + 命令） | 无感知（静默执行） |
| **持久化粒度** | 整个会话（/resume 恢复全部） | 结构化记忆（可按主题检索） |

**Claude Code CLI 工作流程：**

```
1. 对话进行，token 累积
   ↓
2. 超过 80% 阈值 → 显示 "Context left until auto-compact"
   ↓
3. 自动压缩或用户运行 /compact
   ↓
4. 生成摘要，丢弃早期历史
   ↓
5. 继续对话
   ↓
6. 退出时 → 会话保存到本地
   ↓
7. 下次启动 → 使用 /resume 恢复（需手动）
```

**局限性：**
- `/resume` 需要**手动执行**，不会自动恢复
- 只能恢复**整个会话**，不能像 OpenClaw 那样按主题检索记忆
- 无法查看或编辑压缩摘要的内容
- 没有语义搜索能力

### 2.3 上下文构建方式

Claude Code CLI 通过以下方式构建和管理上下文：

| 方式 | 命令 | 说明 |
|-----|------|------|
| **自动加载** | 启动时自动 | 加载当前目录下的 `.claude/CLAUDE.md`（如果存在） |
| **手动添加文件** | `/add <file>` | 将文件内容加入当前会话上下文 |
| **添加目录** | `/add <dir>` | 递归添加目录下文件 |
| **查看上下文** | `/context` | 显示当前加载的文件和 token 使用情况 |
| **压缩上下文** | `/compact` | 手动压缩对话历史，保留摘要 |
| **清除上下文** | `/clear` | 清空当前会话的所有上下文 |
| **新建会话** | `/new` | 创建全新会话，丢弃所有上下文 |

### 2.3 与 OpenClaw 的核心差异

| 特性 | OpenClaw | Claude Code CLI |
|-----|---------|-----------------|
| **存储位置** | 磁盘文件（`memory/` 目录） | 本地会话文件 |
| **持久化** | ✅ 自动持久化，跨会话继承 | ✅ 自动保存，但需手动恢复 |
| **跨会话记忆** | ✅ 自动加载记忆文件 | ⚠️ 需手动 `/resume` 恢复 |
| **用户可控性** | ✅ 可查看、编辑、删除记忆文件 | ⚠️ 通过 `/add` 管理，无法编辑摘要 |
| **上下文管理** | 预压缩记忆刷新 + 自动保存 | Auto-compact + 手动 `/compact` |
| **记忆触发** | 自动（接近压缩阈值时） | 自动（80% 阈值）或手动 |
| **语义搜索** | ✅ 支持 | ❌ 不支持 |

### 2.4 Claude Code CLI 的局限性

1. **恢复需手动**
   - 每次启动 `claude` 不会自动恢复之前会话
   - 需要手动运行 `/resume` 选择要恢复的会话

2. **记忆粒度粗**
   - 只能恢复**整个会话**，不能像 OpenClaw 那样按主题检索
   - 无法只恢复特定的配置或偏好

3. **上下文黑盒**
   - 无法查看压缩摘要的具体内容
   - 无法审计模型"记得"什么

4. **无语义搜索**
   - 不能像 OpenClaw 的 `memory_search` 那样搜索历史记忆
   - 无法在多个历史会话中检索相关信息

### 2.5 Claude Code CLI 的工作流程示例

```bash
# 进入项目目录
cd my-project

# 启动 Claude Code（不自动恢复）
claude

# 或使用 --resume 恢复上一次会话
claude --resume

# 手动添加关键文件到上下文
/add README.md
/add src/main.py
/add .claude/CLAUDE.md  # 项目级提示词文件

# 开始对话...
# 上下文累积中...

# 超过 80% 阈值时显示警告，自动压缩或手动运行 /compact
/compact

# 继续对话...

# 退出（会话自动保存到本地）
exit
# 提示: "Use /resume to continue this conversation later"

# 下次启动
claude
# 需要手动运行 /resume 选择之前的会话
/resume
```

### 2.6 OpenClaw vs Claude Code CLI：关键差异总结

| 场景 | OpenClaw | Claude Code CLI |
|-----|---------|-----------------|
| **第 1 天配置** | 自动保存到 memory/YYYY-MM-DD.md | 会话保存，但下次需手动 /resume |
| **第 3 天继续** | 自动加载记忆文件 | 需要手动 /resume，或重新 /add 文件 |
| **第 7 天询问** | 自动搜索记忆，返回答案 | 如果未恢复会话，无法回答 |
| **跨项目记忆** | ✅ 全局 MEMORY.md 共享 | ❌ 项目隔离，不共享 |
| **记忆检索** | ✅ semantic search | ❌ 无搜索功能 |

**场景对比：维护一个长期项目**

**使用 OpenClaw：**
```
第 1 天：配置 GitHub SSH 密钥 → 自动保存到 memory/2026-02-10.md
第 3 天：修改博客 CSS → 自动保存技术细节
第 7 天：问 "我的 GitHub 邮箱是什么？" → 自动从记忆文件检索
```

**使用 Claude Code CLI：**
```
第 1 天：配置 GitHub SSH 密钥 → 仅在当前会话有效
第 3 天：修改博客 CSS → 需要重新 /add 文件和说明背景
第 7 天：问 "我的 GitHub 邮箱是什么？" → "抱歉，我不知道..."
```

**关键差异：**
- Claude Code CLI 支持 `/resume` 恢复会话，但需要**手动执行**
- OpenClaw **自动加载**记忆文件，无需手动操作
- Claude Code CLI 的 `.claude/CLAUDE.md` 类似于 OpenClaw 的 `MEMORY.md`，但需要**手动维护**
- Claude Code CLI 压缩后会话仍可恢复，但无法像 OpenClaw 那样按主题检索

---

## 三、实战对比：同一个场景的不同体验

### 场景：维护一个长期项目

**使用 OpenClaw：**

1. 第 1 天：配置 GitHub SSH 密钥，记录到 `memory/2026-02-10.md`
2. 第 3 天：修改博客 CSS，记录技术细节到 `memory/2026-02-12.md`
3. 第 7 天：询问 "我的 GitHub 邮箱是什么？"
   - OpenClaw 自动搜索记忆文件，返回：`****@gmail.com`

**使用 Claude Code CLI：**

1. 第 1 天：配置 GitHub SSH 密钥，会话自动保存到本地
2. 第 3 天：启动 `claude`，**需要手动运行 `/resume`** 恢复会话
3. 第 7 天：询问 "我的 GitHub 邮箱是什么？"
   - 如果已 `/resume`：可以回答（上下文已恢复）
   - 如果未 `/resume`："抱歉，我无法访问之前的对话记录"
   - 或需要在项目根目录创建 `.claude/CLAUDE.md` 手动记录关键信息

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

### Claude Code CLI 参考

6. [Claude Code Overview - Anthropic Documentation](https://docs.anthropic.com/en/docs/claude-code)
7. [Claude Code CLI Reference](https://docs.anthropic.com/docs/en/cli-reference)

---
