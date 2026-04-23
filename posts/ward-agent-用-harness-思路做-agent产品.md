---
title: "用 Harness 思路做 Agent 产品：Ward 重构实录"
date: 2026-04-23
tag: AI工程
---

[Ward Agent](https://github.com/rainj2013/ward-agent) 近期做了一次较大的重构，从手写的 agent loop 迁移到了 Mini-Agent 框架。重构过程中，代码组织更清晰了，但真正让我有收获的，是用 **Harness** 的视角重新审视产品设计。

[《讲清楚 Harness》](/posts/讲清楚%20Harness：一套简单可落地的%20LLM%20Agent%20实践/)里总结了 OpenAI 和 Anthropic 的核心建议：环境优于 Prompt、结构化反馈、短循环、明确停止条件、外化记忆。这些不是纸上谈兵的理论——它们直接决定了用户用起来"顺不顺"。这篇文章结合 Ward 的具体场景，说清楚每个 Harness 原则是怎么转化成产品细节的。

---

## 1. 环境优于 Prompt：让 AI 感知"现在是什么状态"

用户用 Ward 的典型场景是这样的：行情页面已经显示了标普500的实时数据，用户在右侧智能问答里问"最近3天走势怎么样"。

如果不加干预，AI 收到这个问题时，上下文里已经包含了标普500的K线数据。理想情况是：AI 看到上下文有数据，直接分析回答，不需要再调工具。但如果没有数据，Ward 提供了一套工具（个股行情、指数K线、AI分析报告等），AI 按需调用来补全信息。

**Harness 的思路**：让 AI 清晰感知"上下文有什么"和"我能调什么"。有数据就直接答，没数据就调工具——而不是靠 prompt 猜测用户想问什么。

Ward 的做法是：每次对话开始，把页面当前数据以结构化文本注入 system prompt。AI 看到"上下文里有 spx 的60日K线"，需要分析走势就直接用，不需要用户说"我当前在看标普500"。

```python
# ward_agent.py
parts = ["[页面已有数据]"]
# 指数K线、个股行情、盘前盘后数据全部格式化拼接进去
# AI 自动判断：有数据就用，没数据才调工具
```

对用户来说，这个过程完全无感——不需要说"帮我分析我当前看的这只股票"，AI 自己知道。

![上下文复用示例1](/static/2026-04-22/上下文复用1.png)
![上下文复用示例2](/static/2026-04-22/上下文复用2.png)

**产品效果**：减少不必要的 API 调用，同时保证 AI 引用的数据始终和页面一致。

---

## 2. 工具描述即约束：什么时候不该用，比怎么用更重要

早期 Ward 有个 bug：问"标普500最近怎么样"，AI 调了 `get_stock_kline(symbol="SPX")`，然后报错，因为 SPX 不是股票代码。

问题出在工具描述。原来只写了"获取个股K线数据"，没写**不适用于指数**。AI 看到"标普500"和"K线"这两个关键词就调了，不会主动判断 SPX 是不是股票代码。

**Harness 的思路**：约束随机性，最直接的方式就是工具描述本身。

修改后的描述：

```python
description = "获取个股K线数据。此工具仅适用于个股（如 AAPL、TSLA），不适用于指数。"
```

同时在 system prompt 里加了规则：

```
个股用 stock 工具（symbol 如 AAPL），指数用 index 工具（prefix 如 spx、ixic）
get_stock_kline 不能用于指数，get_index_kline 不能用于个股
```

模型看不见代码和文档，只能根据 description 做决策。**把适用边界写清楚，比只写功能有效得多。** 这也是 Mini-Agent 框架的 `Tool` 基类要求每个工具必须提供 description 和 JSON Schema 的原因——description 的质量直接决定模型会不会用错工具。

**产品效果**：用户问任何关于指数的问题，不会触发股票工具；问个股，不会触发指数工具。减少无效调用，减少报错。

---

## 3. 短反馈循环：把"执行中"的感知提前

SSE 流式输出时，如果等到所有步骤完成才给用户一个完整结果，用户会觉得系统"卡"了。

Ward 的工具中，`get_stock_analyze` 和 `get_index_analyze` 是深度工具，要调 LLM 生成分析报告，平均耗时 30 秒。如果页面上只显示一个 spinner 挂 30 秒，用户大概率会怀疑系统坏了。

**Harness 的思路**：反馈循环要短，每个步骤完成后立即给用户可见的进展。

Ward 的实现是把工具执行状态拆成独立事件，前端分步处理：

```javascript
// 工具开始执行 → 显示 loading
if (data.tool_call) {
    const toolDiv = document.createElement('div');
    toolDiv.textContent = '🔧 正在查询 ' + toolName + '...';
    _toolInvokeMap.set(callId, toolDiv);
}

// 工具执行完成 → 更新状态
if (data.tool_result) {
    const toolDiv = _toolInvokeMap.get(resultId);
    toolDiv.textContent = ok
      ? '✅ ' + toolName + ' 查询成功'
      : '❌ ' + toolName + ' 查询失败';
}
```

工具结果返回时，即使 AI 还在"思考"（生成最终回答），用户已经看到"数据查到了，正在分析"。主观感受是"系统在跑"，而不是"系统在等"。

thinking 内容也是同样的思路。市场分析有信息量——AI 展示它的分析逻辑，用户能学到东西，同时感觉"这确实是 AI 在思考，不是模板回复"。展示过程是一种信任建立。

**产品效果**：30 秒的等待变成了"有进展的等待"，用户不会以为系统卡死了。

---

## 4. 明确停止条件：超过多少步就该停

Agent 循环如果没有终止条件，会一直跑下去直到 token 耗尽。Harness 强调要给 agent 设置**明确的停止条件**。

Ward 有两个停止条件：

- **步数上限**：`max_steps=20`。超过 20 步还没完成，返回"Task couldn't be completed after 20 steps"
- **Token 上限**：`token_limit=80000`。超过 8 万 token，触发自动摘要，把历史消息压缩

```python
# ward_agent.py
self._agent: MiniAgent = MiniAgent(
    max_steps=20,
    token_limit=80000,
)
```

**产品效果**：不会出现"AI 一直跑，停不下来"的情况。用户问一个模糊的问题，AI 试了 20 步还没结果，会主动停下来告诉用户。

---

## 5. 取消在安全点：随时能停，但不能破坏状态

用户可能在 AI 执行过程中改变主意。Ward 在工具执行区显示取消按钮。

**Harness 的思路**：取消要在自然断点执行，不能在 LLM 调用中途强行中断，否则消息历史会出现半截内容，下次对话会看到一堆不完整的中间状态。

Ward 基于 Mini-Agent 框架的 `asyncio.Event` 实现取消机制，在每个**自然断点**检查：

```python
# 每步开始
if self._check_cancelled(): return cancel_msg

# 工具执行前
if self._check_cancelled(): return cancel_msg

# 每个工具执行后
if self._check_cancelled(): return cancel_msg
```

取消后要**清理脏状态**：

```python
# 找到最后一个完整的 assistant 消息，回滚到那里
last_assistant_idx = max(i for i, msg in enumerate(self.messages) if msg.role == "assistant")
self.messages = self.messages[:last_assistant_idx + 1]
```

同时给用户明确反馈："Task cancelled by user"，而不是无声无息地停住。

**产品效果**：用户随时可以取消，取消后继续对话不受影响，不会留下一堆垃圾消息。

---

## 6. 记忆压缩：让长对话继续走下去

对话持续久了，历史消息会塞满上下文窗口。粗暴的方案是设一个固定上限，超过就拒绝对话——但这损伤了用户体验。

**Harness 的思路**：当上下文快满时，用 LLM 把历史压缩成摘要，保留意图丢弃过程，比直接截断要聪明得多。

Ward 的做法是**自动摘要**：当 token 数量超过阈值（8万），把历史压缩成一段可读的摘要，替换掉中间的执行过程。

### 触发条件

摘要触发检查两个指标，任一超标都触发：
- **本地估算**：对消息列表做字符统计，除以 2.5 得到 rough token 数
- **API 返回**：LLM 在 response 里报告的 `total_tokens`

```python
should_summarize = estimated_tokens > self.token_limit or self.api_total_tokens > self.token_limit
```

两个指标都要检查，因为本地估算和 API 实际计数可能有偏差。

### 压缩策略

原则：**用户意图不压缩，AI 执行过程压缩**。

消息结构从 `[system, user1, a1, t1, a2, t2, user2, a3, ...]` 变成：

```
[system] → [user1] → [summary of round1] → [user2] → [summary of round2] → ...
```

每次 user 消息之后，AI 做了什么（调了哪些工具、返回了什么中间结果）被压缩成一段话。如果最后一轮还在执行中（有 agent/tool 消息但没有下一个 user），也会被压缩。

### 实现细节

摘要内容由 LLM 生成，prompt 要求：
- 聚焦任务完成情况和调用的工具
- 保留关键执行结果和重要发现
- 控制在 1000 字以内
- 用英文输出

生成失败时降级为简单拼接（把原始消息文本直接拼接），不阻塞流程。

```python
summary_message = Message(
    role="user",
    content=f"[Assistant Execution Summary]\n\n{summary_text}",
)
```

压缩完成后跳过一次 token 检查，避免连续触发。

**产品效果**：长对话不会突然中断，对用户完全无感，AI 始终能正常回答。

---

## 7. 错误结构化：让 AI 知道发生了什么

工具调用会失败——网络超时、数据源挂了、参数不对。

**Harness 的思路**：错误信息是上下文的一部分，不是需要被隐藏的东西。

Ward 的工具失败后，错误信息原样返回给 AI：

```
Tool execution failed: ConnectionError: Failed to connect to data source
```

AI 可以根据具体错误判断：可能是数据源临时故障，换个数据源试试，或者告诉用户"建议稍后再试"。而不是每次失败都给用户返回一个通用的"操作失败"。

结构化的 `tool_result` 事件也支持这一点：

```python
yield _make_sse_event(conversation_id,
    tool_result={
        "id": tr.id,
        "name": tr.name,
        "ok": tr.success,    # AI 可以判断是否成功
        "result": parsed,
        "error": tr.error,   # 具体错误信息
    },
)
```

**产品效果**：工具失败时，AI 能做精准的二次尝试或给出有意义的反馈，而不是每次都报一个模糊错误。

---

## 8. 深度工具 vs 浅度工具：不同场景，不同等待成本

Ward 的工具响应速度差异极大：

| 类型 | 工具 | 响应时间 | 返回内容 |
|------|------|----------|----------|
| 浅层工具 | `get_stock_quote`、`get_index_kline` | 毫秒级 | 结构化数据 |
| 深度工具 | `get_stock_analyze`、`get_index_analyze` | 30秒+ | LLM 生成的分析报告 |

如果每次查询都要等 30 秒生成报告，用户想知道一个收盘价也得等半天。

**Harness 的思路**：不同任务配置不同的反馈深度。

Ward 的产品设计：浅层工具直接返回数据，前端渲染成表格或走势图；深度工具生成报告卡片，展示自然语言分析。用户根据需求选择，不为每一次查询付出等价的等待成本。

**产品效果**：简单问题秒级响应，复杂分析才花时间。用户有权选择他们需要的体验深度。

---

## 总结

回头看这些设计，最核心的一条原则始终是：

> **把复杂度留在系统内部，把简单留给用户。**

上下文注入、渐进输出、安全取消、自动摘要——这些用户都感知不到，但他们能感觉到"这个东西用起来很顺"。反过来说，如果没做好，用户感知到的是"这东西总是卡"、"换个问法就不行了"。

Harness 不是一套新技巧，它是把传统软件工程的成熟经验——**环境设计、反馈循环、状态管理、错误处理**——迁移到了 LLM agent 系统。理解了这些思路，很多产品设计决策其实是自然而然的。
