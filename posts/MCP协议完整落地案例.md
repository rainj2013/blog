# MCP协议完整落地案例

> 本文由Kimi k2和本人合作编写。

## 前言

在上周的[《困惑到实践：MCP的几个细节探究》](https://mp.weixin.qq.com/s/Z9KpCHJoeXLHkF_msWWFmg)中，我通过实际使用和编写MCP Server，验证了对MCP协议的几个关键疑问：

1.  **MCP Server的本质**：不是传统BS/CS架构中的Server，而是对工具、资源、提示词的封装
2.  **MCP Host的选择机制**：类似微服务的服务注册/发现，通过声明式接口让模型自主选择
3.  **MCP Client的组装逻辑**：根据Server声明的Schema，结合系统prompt自动组装参数
4.  **自定义实现的必要性**：现有MCP Host支持不完整，复杂需求需要自建

本周，基于Claude CLI + Kimi K2模型，我实现了完整的Mermaid图表生成系统（包含MCP Server、Client、Host三层架构），不仅验证了上周的猜想，更在实践中发现了MCP协议在工程化层面的深层价值。

## 架构分层

### 三层架构设计

    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   MCP Server    │    │   MCP Client    │    │   MCP Host      │
    │   (服务层)       │── ─│   (连接层)       │────│   (智能层)       │
    │   图形渲染       │    │   协议通信       │    │   意图理解       │
    │   语法验证       │    │   错误处理       │    │   自动修复       │
    └─────────────────┘    └─────────────────┘    └─────────────────┘

### 核心组件特点分析

#### MCP Server：能力封装

**特点：**

*   **单一职责**：专注于Mermaid图表渲染和语法验证
*   **工具发现**：自动暴露`render_mermaid`、`validate_mermaid`等工具
*   **资源管理**：通过`config://`、`examples://`等URI模式提供配置和示例
*   **错误隔离**：独立的日志系统和错误处理机制

**核心代码：**

```python
@mcp.tool(name="render_mermaid")
async def render_mermaid(script: str, format: str = "png") -> Dict[str, Any]:
    """渲染机制：将Mermaid脚本转换为图片"""
    # 临时文件使用UTF-8编码处理中文
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8') as f:
        f.write(script)
        # subprocess调用确保编码一致性
```

#### MCP Client：协议抽象

**特点：**

*   **连接管理**：自动处理SSE连接、重连、超时
*   **协议封装**：隐藏MCP协议细节，提供Pythonic的API
*   **错误恢复**：网络异常时的重试机制
*   **交互界面**：命令行友好的交互模式

**核心代码：**

```python
class MermaidMCPClient:
    async def __aenter__(self):
        # 自动建立MCP连接
        self.session = await self._create_session()
        return self
    
    async def render_mermaid(self, script: str) -> Dict[str, Any]:
        # 直接调用，无需关心协议细节
        return await self.session.call_tool("render_mermaid", script)
```

#### MCP Host：意图理解

**特点：**

*   **自然语言处理**：将用户描述转换为Mermaid脚本
*   **意图识别**：自动判断用户是否需要图表
*   **错误修复**：LLM自动修复语法错误的脚本
*   **多轮对话**：支持聊天和图表生成的混合交互

**核心代码：**

```python
async def process_user_input(self, user_input: str):
    # 1. 检测用户意图
    intent = await llm.detect_intent(user_input)
    
    # 2. 生成Mermaid脚本
    script = await llm.generate_script(intent)
    
    # 3. 验证并修复
    if not validate(script):
        script = await llm.fix_script(script)
    
    # 4. 渲染图表
    return await mcp_client.render_mermaid(script)
```

## 技术洞察：MCP协议的深层价值

### 1. 上周猜想的工程验证

通过完整的系统实现，我验证了上周的所有猜想：

**猜想1验证：MCP Server的本质**

*   ✅ **确认**：MCP Server确实是对工具、资源、提示词的封装，而非传统意义上的网络服务器
*   ✅ **发现**：FastMCP框架完美体现了这一理念，通过装饰器将Python函数直接转化为MCP能力

**猜想2验证：MCP Host的选择机制**

*   ✅ **确认**：Cursor等Host确实通过声明式接口实现服务发现
*   ✅ **新发现**：在自建MCP Host中，可以通过LLM意图识别+工具匹配实现更智能的选择逻辑

**猜想3验证：MCP Client的组装逻辑**

*   ✅ **确认**：Client确实根据Schema声明自动组装参数
*   ✅ **优化**：通过LLM的自然语言理解，实现了从用户描述到结构化参数的优雅转换

**猜想4验证：自定义实现的必要性**

*   ✅ **确认**：Cursor对resource/prompt类型支持确实不完整
*   ✅ **突破**：自建MCP Host实现了更完整的协议支持和业务定制能力

### 2. 标准化接口的工程化演进

从上周的"工具发现"到本周的"智能编排"，MCP协议的价值实现了质的飞跃：

**上周层面**：验证MCP Server能做什么

*   工具注册与发现
*   参数Schema声明
*   基础服务调用

**本周层面**：实现MCP生态能做什么

*   **智能编排**：LLM理解用户意图，自动选择工具组合
*   **错误自愈**：脚本错误自动修复，无需人工干预
*   **体验升级**：从"调用工具"到"描述需求"的交互革命

### 3. 协议完整性的工程意义

上周观察到Cursor等工具对MCP协议支持不完整，本周实现让我深刻理解了完整协议支持的价值：

**Cursor的局限性**：

*   仅支持tools类型
*   资源发现能力有限
*   定制化程度低

**自建MCP Host的优势**：

*   完整支持tools/resources/prompts
*   深度定制业务逻辑
*   灵活的权限和鉴权机制

### 4. 资源抽象层的实用价值

MCP的`resources://`协议在实际应用中非常实用：

```python
# 通过URI访问配置信息
@mcp.resource("config://output_directory")
def get_output_directory() -> str:
    return OUTPUT_DIR

# 通过URI获取示例
@mcp.resource("examples://flowchart")
def get_flowchart_example() -> str:
    return flowchart_template
```

这种设计使得：

*   配置管理标准化
*   示例代码可发现
*   帮助信息可编程访问

## 工程实践：踩过的坑与解决方案

### 1. 编码问题的完整解决

**问题**：中文图表渲染出现乱码
**根因**：Python subprocess不继承系统locale
**解决**：

```python
env = os.environ.copy()
env.update({
    'PYTHONIOENCODING': 'utf-8',
    'LC_ALL': 'en_US.UTF-8',
    'LANG': 'en_US.UTF-8'
})
```

### 2. 日志系统的重新设计

**问题**：日志文件为空
**根因**：logging.basicConfig的冲突
**解决**：自定义logger，避免全局配置冲突

### 3. 文件路径的集中管理

**问题**：输出文件散落在各处
**解决**：统一使用项目根目录下的`output/`、`logs/`、`config/`目录

## 总结

通过这一周的完整实践，我不仅验证了上周的所有猜想，更深刻理解了MCP协议的真正价值：**它正在重新定义AI应用的开发范式**。
正如上周文章中所说："MCP Server不是传统意义的Server概念"，经过本周的实践，我发现它更像是一个**AI能力的标准化封装单元**。整个MCP生态正在形成类似"AI应用的操作系统"：

*   **MCP Server** = "驱动程序"（专注解决特定问题）
*   **MCP Host** = "内核"（智能调度各种能力）
*   **MCP Client** = "系统调用"（标准化接口抽象）

这种架构模式，将彻底改变AI应用的开发方式。就像当年Linux生态的繁荣一样，MCP生态正在推动AI应用从"定制开发"向"组装式开发"演进。

***

**项目地址**：<https://github.com/rainj2013/mermaid_mcp>

**相关阅读**：

*   [上周博客：MCP协议猜想验证](https://mp.weixin.qq.com/s/Z9KpCHJoeXLHkF_msWWFmg)
*   [claude-code](https://docs.anthropic.com/zh-CN/docs/claude-code/)

### 荒腔走调

> 我很喜欢的一个~~技术区~~生活区博主Why的博客末尾通常都有一段“荒腔走调”的内容，这是我最喜欢看的“说人话”环节，我也在这模仿他写一些自己的感受。

过去这一周恰逢月之暗面的K2模型发布，我充值了API服务尝了个鲜。上面mermaid\_mcp项目的所有代码和文档，都由Claude code的cli搭配Kimi K2的模型编写。
**爽编**，这是我体验一晚claude cli后跟贤哥说的第一句话，他比我早几天付费了正版的claude max套餐，跟我描述过使用感受，但我亲自使用时还是会被震撼到，即使我用的还只是个k2模型的平替版。
claude code就像一个高效且经验丰富的老程序员，我只需balabala地打一些并不精心设计的prompt来描述自己大致的需求，它便帮我完成了需求分析、模块设计、代码编写、单元测试、bug修复、文档编写等常规工作，在代码的异常场景兜底处理和文档编写这两块，经过几轮prompt交互调整后，最终的产出比我亲自写的好太多，当然也快太多，相比之下上周我自己写的那几个mcp server堪称拙劣。
当我想把代码推到github时，我还是手动创建了一个远端仓库，后续的本地git ssh公私钥配置、本地仓库初始化、关联远端仓库、commit message编写等等工作，全由claude code和cursor完成。cursor由于内置了github的agent，并且有图形化的界面，处理git操作体验比claude code更好。这些工具已经能闭环地完成整个工作流程，用现在流行的话来说，**这是一个“端到端”的体验**。

做完这些事情，我陷入了一种“**爽编代码后的索然无味的空虚**”情绪里面。计算机领域著名人士王垠最近发表了自己对AI编程的评价：“不懂计算机科学的人用好 AI 编程是妄想”。实际使用过程中，我也能感受到它们的一些边界，K2和cursor都还是会有幻觉，让我不得不出手去反复纠正它，甚至它还会把我自己改好的代码又改回去。但无论如何，它最终交付产出的速度和质量都已经让我重新掂量自己曾经积累的那些“经验”价值几何。

**至少用起来吧，动起来就没那么焦虑。**
