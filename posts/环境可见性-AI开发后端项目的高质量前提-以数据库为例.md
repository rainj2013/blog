---
title: "环境可见性：AI开发后端项目的高质量前提——以数据库为例"
date: 2026-05-22
tag: AI工程
excerpt: "后端项目里，AI 写 SQL 的主要难点在于缺少真实数据库的索引、规模和运行约束。"
---

当我们用 Claude Code、Codex 这类工具写前端或 CLI 时交付质量经常很高，但写后端微服务时更容易出现性能和安全层面的隐性质量问题。模型的代码能力没有突然消失，问题出在它失去了对真实运行环境的感知。Harness 里有一条很重要的原则：先给 Agent 一个能感知环境、读取状态、执行动作并获得反馈的工作场，不要只靠 Prompt 让它“更聪明”。前端项目天然有浏览器、dev server、测试和控制台，AI 能看到结果；后端微服务的很多真实环境信息，却藏在数据库、配置中心、注册中心和各种中间件里。

前端项目通常很直接：改代码、跑 dev server、看页面、跑测试，Agent 自己就能闭环。可后端微服务不一样，它背后挂着数据库、Redis、RPC、MQ、配置中心、文件服务，很多东西本地连不上，也不该随便连。数据库就是最典型的一类。AI 在改后端代码时，经常需要写 SQL、改 Mapper、调 Repository、补 migration。以 Java 后端常见的 MyBatis 为例，AI 当然不是完全没有信息。它可以从 Mapper XML、实体类、已有 SQL、migration 文件里推断出不少东西，比如表名、字段名，甚至一部分字段类型和查询模式。

但这些代码里的信息通常还不够。真正影响 SQL 质量的，往往是代码里不完整、不同步，或者只靠读代码很难判断的东西：

- 表有多大？
- 联合索引顺序是什么？
- 当前索引和代码里的理解是否一致？
- 字段基数大概是什么量级？
- `tenant_id`、`deleted` 这类字段在当前查询路径里是不是强制过滤条件？
- 现有 Mapper 里的写法是不是已经和真实库索引脱节？
- 当前分页会不会变成深分页？
- 这个 `order by` 能不能走索引？

人类工程师写 SQL 时，脑子里多少有这些上下文。老项目做久了，知道哪些表是大表，哪些字段不能乱查，哪些索引是后来 DBA 专门加的，哪些 XML 里的 SQL 其实已经和线上表结构有点脱节。AI 可以读代码，但它缺少这部分来自真实数据库运行环境的校准。

所以我做了一个小工具，叫 [dbctx](https://github.com/rainj2013/dbctx)。它是一个给 AI Coding Agent 用的数据库上下文 Skill，负责把真实库的结构、索引和统计信息变成 Agent 可以查询、可以审查 SQL 的本地工具。

---

## 问题不在 SQL，在上下文

现在的模型当然懂数据库。SQL 语法、索引概念、分页风险，它都知道；MyBatis XML、Repository 代码、实体类里的业务语义，它也能读。写出来的 SQL 从语法上没问题，甚至看起来还挺合理。但代码层面的信息只能到这一步——项目里的真实约束不在文本里：这张表有多大，线上有哪些索引，这条查询路径必须带哪些条件。比如它可能写：

```sql
select id, user_id, status, amount, created_at
from orders
where user_id = 10001
order by created_at desc
limit 20
```

这条 SQL 看起来没什么问题：按用户查最近订单，字段也没有乱选，分页也很正常。可如果真实库里的 `orders` 是按租户隔离的大表，索引是 `(tenant_id, user_id, created_at)`，查询约定还要求过滤 `deleted = 0`，那它就少了两个关键信息：租户条件和软删除条件。代码里能看出 `user_id` 是字段，却不一定能看出这个查询路径必须先带 `tenant_id` 才能稳定命中索引。

传统开发里，人会去查真实表结构、看索引、问 DBA、跑 explain。AI Agent 理论上也应该这么做。但现实是，它没有一个标准动作去做这件事。它可能能从代码里看到一部分 SQL，但不会自动把这些 SQL 和真实库状态对齐：

```bash
show create table orders;
show index from orders;
explain select ...
```

更麻烦的是，很多开发环境不能直连生产库。你也不希望 AI 拿着账号去生产库乱跑。于是 AI 最后只能停留在“读代码推断数据库”的状态，缺少真实元数据对判断做校准。这就是 dbctx 想补的空缺。

---

## dbctx 的基本思路

dbctx 的设计很简单：把真实数据库的结构和统计信息导出来，变成一个本地快照，让 AI 可以随时查。推荐把环境拆成两类：

```text
生产/准生产只读库 -> 生成 snapshot
测试/开发只读库   -> 执行 explain
```

第一类负责提供真实世界的信息：表结构、索引、数据量级、字段类型。第二类负责验证 SQL 能不能在一个真实 MySQL 上被解析和规划。日常开发时，AI 大多数时候不需要连数据库，只读本地文件：

```text
.dbctx/snapshot.json
```

这个快照来自 MySQL 的 `information_schema`，里面有：

- tables
- columns
- indexes
- partitions
- row count 估算
- data size
- index size

这里没有真实业务数据行，也没有数据库密码。dbctx 给 AI 的是一份脱敏的结构化地图，不是生产库入口。

---

## 为什么做成 Skill + CLI

一开始我也想过要不要做 MCP Server。现在我的判断是，这类工具更适合 CLI-first。MCP 适合把远程系统包装成一组稳定工具，但对本地编码场景来说，很多时候 CLI 更顺手：安装简单，能被人、Agent、CI 同时使用；权限和环境变量都走本机已有机制；失败时可以直接看 stdout、stderr 和 exit code；`--help` 还能天然承担渐进式披露。Agent 不需要一开始把所有工具 schema 都塞进上下文里，它可以先跑：

```bash
dbctx --help
dbctx guide
```

再按需调用：

```bash
dbctx schema orders
dbctx indexes orders
dbctx stats orders
dbctx review --sql "select id, user_id, status from orders where user_id = 10001 order by created_at desc limit 20"
```

Skill 和 CLI 的分工是：

```text
dbctx Skill = 告诉 Agent 什么时候该用、该按什么流程用
dbctx CLI   = 提供确定性的数据库上下文能力
```

Skill 负责判断触发条件。比如任务涉及这些内容时，就该用 dbctx：

- SQL
- Mapper XML
- DAO / Repository
- ORM 查询构造器
- migration
- 分页、排序、过滤、JOIN
- 批量更新、删除
- 慢查询、死锁、超时

如果只是改 Controller 文案、DTO 字段名、前端页面，那就不用。工具不是越多越好，Agent 也不该每次改代码都无脑查数据库。应该在合适的任务里触发合适的工具。

---

## 一个典型流程

接入以后，流程大概是这样：先在项目里初始化 dbctx，配置生产/准生产只读库用于生成 snapshot，再配置一个测试库用于 explain。snapshot 刷新后，AI 在修改数据库相关代码时，会先查受影响表的 schema、indexes、stats，再对新增或修改的 SQL 做 review。如果测试库连接可用，再跑一次 explain。

这里有个边界要说清楚：测试库 explain 不等于生产性能结论。测试库数据量小、统计信息不一样，执行计划可能和生产不一致。所以 dbctx 的模型很明确：

```text
snapshot 判断生产风险
explain 验证 SQL 可运行和测试库计划
```

这两个信号都重要，混在一起容易误判。具体命令和配置细节放在 GitHub README 里，博客里就不展开了。

---

## Review 应该怎么做

dbctx review 提供的是事实和预检信号，LLM Agent 再结合业务语义做判断。它会输出这些信息：

- SQL 涉及哪些表
- 表大概多少行、数据和索引体积多大
- SQL 里出现了哪些谓词列、排序列、JOIN 列
- 表上有哪些索引，联合索引顺序是什么，索引 cardinality 大概是多少
- 一些确定性规则信号，比如 `update/delete` 无 `where`、明显深分页、`select *`、函数包裹索引列

这些信息给到 Agent 后，真正的 review 由 LLM 来完成。比如 `orders` 表有联合索引：

```text
idx_tenant_user_created(tenant_id, user_id, created_at)
```

AI 如果写：

```sql
select id
from orders
where user_id = 1
order by created_at desc
limit 20
```

看起来合理，但没带 `tenant_id`，也没命中最左前缀。dbctx 会把这个风险指出来。

再比如，代码里经常能看到这种“查最近订单”的写法：

```sql
select id, user_id, status, amount
from orders
where status = 1
order by created_at desc
limit 20
```

它没有明显的深分页，也没有 `select *`。如果真实索引是 `(tenant_id, user_id, created_at)`，而 `status` 的选择性又很低，这条 SQL 在大表上就可能退化。问题不在语法，而在真实数据分布和索引设计。

这类判断只靠固定规则不够。`status = 1` 到底有没有问题，要看业务语义、数据分布、表规模、索引设计和调用频率。dbctx 不应该假装自己是完整 SQL 优化器。它更像是把真实数据库事实摆到 Agent 面前，再让 Agent 基于这些事实做判断。

---

## 为什么选择 snapshot

这个问题我想了挺久。最直接的方案当然是让 Agent 拿一个只读账号，想查什么查什么。但这在企业里很难过安全关，也不稳定。网络、权限、审计、脱敏、误操作边界都会变成问题。所以第一版选择 snapshot。它有几个好处：

- AI 日常使用不需要连生产库
- 不包含真实业务数据
- 可以由 CI 或平台定期生成
- 可以被 review、归档、审计
- 所有人和 Agent 用的是同一份上下文

这相当于给 AI 发一份"数据库地图"，不用把它放进数据库机房。当然，snapshot 也有滞后性。索引刚改完、表刚迁移完，如果快照没更新，AI 看到的就是旧世界。所以 dbctx 里有 `doctor`，也建议团队把 `dbctx snapshot` 放进固定流程里。比如每天从准生产只读库生成一次，或者 migration 合并后刷新一次。

---

## 和 Harness 的关系

我最近几篇文章一直在聊 Harness。dbctx 其实也是这个思路的一个小切面。Harness 的重点不在让模型更聪明，它更关注给模型一个更好的工作环境。对后端数据库开发来说，这个环境至少应该包括：

- 表结构
- 索引
- 数据量
- 项目 SQL 规则
- 可执行的 review
- 可选的 explain

以前这些东西在人脑里、DBA 经验里、线上事故里、慢查询平台里。AI 看不到。dbctx 做的事情，就是把其中一部分变成 CLI，让 Agent 能自己查、自己验证、自己修正。这比继续写 Prompt 要更可靠一点。你当然可以在 Prompt 里说：

> 写 SQL 时要注意索引。

但如果 Agent 根本不知道有哪些索引，这句话帮助有限。更好的方式是：

```bash
dbctx indexes orders
dbctx review --sql "..."
```

让它真的看到索引，再根据确定性反馈改代码。

## 从数据库到中间件环境

dbctx 只做了数据库这一层。但后端微服务依赖的东西远不止数据库。

一个典型的后端服务，日常打交道的中间件用一双手数不过来：Redis、RPC、消息队列、配置中心、文件存储、注册中心、定时任务、链路追踪。每一层都有自己的状态和约束。Agent 改代码的时候，涉及哪一层，就需要感知那一层的真实环境。如果 Agent 只能读代码，它看到的是静态文本，不是运行时的真实状态。

以 MQ 为例。Agent 接手一个消息消费逻辑，需要知道当前 topic 的 partition 数量、消费组有多少消费者在跑、消息体结构是什么样的、有没有重试和死信机制、消费顺序有没有要求。这些都不在代码的消费接口里，在集群配置和运行拓扑里。只看代码写出来的消费逻辑，往往在部署后才暴露问题。

配置中心更隐蔽。代码里的配置项、本地配置文件、配置中心里的远端配置，每个来源都可能覆盖对方。Agent 改代码时如果不查当前生效的配置值，可能改完才发现某个行为是被远端配置开关控制的，改代码根本没生效。

这个思路可以推广到其他中间件——提取环境中的结构化信息，包装成 CLI 工具或本地可查的 snapshot，让 Agent 能在编码阶段感知运行态，而不是靠读代码推断全部。数据库有表结构和索引，Redis 有 key 模式和序列化配置，MQ 有 topic 拓扑和消费组状态，配置中心有当前生效的键值对。

这些信息在人类开发者的经验里，在运维文档里，在监控平台上。AI 看不到。信息本身是存在的，只是没有被组织成 Agent 可用的形态。dbctx 是针对数据库的一个尝试。如果每类中间件都有一份类似的"环境快照"，Agent 写后端代码时面对的不再是代码文本，而是更接近开发者脑中的那个真实世界。

---

## 总结

AI Coding Agent 在后端项目里的主要短板，是缺少对运行环境的感知。数据库尤其明显。SQL 是一门语言，但 SQL 的好坏很大程度取决于它面对的表、索引和数据量。没有这些上下文，AI 只能写出“语义上像那么回事”的代码。dbctx 想补的就是这层上下文：把真实数据库的结构和统计信息整理成一个本地 snapshot，再用 CLI 提供确定性反馈。AI 不需要直连生产库，模型也不用凭感觉优化 SQL。

从 Harness 的角度看，这是一件很朴素的事情：

> 少告诉 Agent “注意数据库性能”，多给它一套能自己查看、自己验证、自己修正的工具。

这也是我现在对 AI 工程越来越明确的一个判断：很多时候，提升 Agent 能力不靠更长的 Prompt，而靠更好的环境。dbctx 只是这个方向上的一个小工具。
