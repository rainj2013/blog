---
date: 2025-08-02
tag: AI工程
---

# 纸上谈兵聊聊 Context Engineering

# 纸上谈兵聊聊 Context Engineering
> 本文前面部分由Claude根据我的零散笔记和代码生成，后面部分为本人手写总结。

## 什么是上下文工程(Context Engineering)

上下文工程是从传统的提示词工程(Prompt Engineering)演进而来的一种全新AI系统设计范式。它代表了AI开发从"静态指令"向"动态情境理解"的根本转变。

**核心定义**：
上下文工程是构建AI系统能力，使其能够动态收集、组织、维护和利用多层次上下文信息，以实现精准意图理解、智能工具选择和自适应行为调整的系统化方法。

### 上下文工程的四大支柱

**1. 情境感知(Context Awareness)**
- 实时识别用户所处的具体情境
- 动态调整系统行为和响应策略
- 整合多源信息构建完整背景

**2. 记忆管理(Memory Management)**
- 短期记忆：当前对话轮次的即时上下文
- 长期记忆：用户偏好、历史交互模式
- 语义记忆：领域知识和最佳实践

**3. 工具编排(Tool Orchestration)**
- 基于上下文选择最合适的工具
- 动态组合多个工具完成复杂任务
- 工具间上下文的无缝传递

**4. 反馈学习(Feedback Learning)**
- 从每次交互中学习用户偏好
- 持续优化上下文理解准确性
- 实现系统的自我进化能力

## 为什么需要上下文工程

### 1. 解决规模化AI部署的核心挑战

现代基于LLM的AI系统面临三个根本性挑战：

**API调用成本激增**：随着AI应用规模扩大，传统prompt engineering方法导致API调用次数和token消耗呈指数级增长。上下文工程通过智能缓存和上下文压缩技术，可将API调用成本降低37-65%。

**响应延迟问题**：传统的静态提示词方法无法适应复杂场景，导致每次请求都需要完整的上下文重建。上下文工程通过分层缓存和增量更新机制，显著减少响应延迟。

**用户体验不一致**：缺乏上下文感知的AI系统在不同场景下表现差异巨大，用户体验缺乏连贯性。

### 2. 从Prompt Engineering到Context Engineering的范式转换

**传统方法的局限性**：
- Prompt Engineering依赖人工设计的静态模板
- 无法适应动态变化的用户需求
- 缺乏长期学习和进化能力
- 在多工具环境中表现不佳

**Context Engineering的优势**：
- **动态适应性**：系统能够根据实时上下文调整行为
- **累积学习**：从每次交互中学习，持续优化性能
- **工具智能编排**：基于上下文自动选择和组合工具
- **跨会话记忆**：维护长期用户偏好和历史上下文


## 本项目(mermaid_mcp)中的上下文设计分析

### 1. 多层上下文架构

本项目采用了分层上下文设计模式，构建了从基础设施到业务逻辑的完整上下文链：

#### 1.1 基础设施上下文层
```python
# 系统级上下文配置 (mermaid_mcp_server.py:19-26)
SYSTEM_MERMAID_CLI = "mmdc.cmd" if os.name == "nt" else "mmdc"
MERMAID_CLI_PATH = os.environ.get("MERMAID_CLI_PATH", SYSTEM_MERMAID_CLI)
project_root = os.path.dirname(os.path.dirname(__file__))
OUTPUT_DIR = os.environ.get("MERMAID_OUTPUT_DIR", os.path.join(project_root, "output"))
```

**设计亮点**：
- 环境感知：自动检测操作系统类型
- 配置灵活：支持环境变量覆盖默认配置
- 路径安全：使用绝对路径避免相对路径问题

#### 1.2 工具能力上下文层
```python
# 工具定义上下文 (mermaid_mcp_server.py:56-71)
@mcp.tool(
    name="render_mermaid",
    description="""
    渲染Mermaid脚本为图片，返回图片的本地路径。
    
    参数：
        script: Mermaid脚本内容
        format: 输出格式，支持png、svg、pdf（默认png）
        width: 图片宽度（默认1920）
        height: 图片高度（默认1080）
        background: 背景颜色（默认transparent）
    
    返回：
        dict: 包含success、image_path、file_id的字典
    """
)
```

**设计亮点**：
- 结构化文档：为每个工具提供详细的输入输出规范
- 多语言支持：中英文混合描述，提升国际用户可用性
- 类型安全：明确的参数类型和返回值结构

#### 1.3 用户交互上下文层
```python
# 交互式上下文管理 (mermaid_mcp_client.py:308-325)
async def interactive_mode():
    logger.info("Starting interactive mode")
    print("🎮 Mermaid MCP Client Interactive Mode")
    print("=" * 50)
    print("💡 Ensure the Mermaid MCP Server is running on http://127.0.0.1:8000")
```

**设计亮点**：
- 会话状态管理：维护用户会话的完整上下文
- 实时反馈：提供即时的系统状态信息
- 错误引导：当出现问题时提供具体的解决建议

### 2. 智能上下文解析机制

#### 2.1 意图理解上下文
```python
# LLM驱动的意图分析 (llm_client.py:134-210)
async def analyze_tool_intent(
    self, 
    user_input: str, 
    available_tools: List[Dict[str, Any]], 
    available_resources: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
```

**上下文处理流程**：
1. **输入标准化**：将用户自然语言输入转换为结构化查询
2. **工具匹配**：基于上下文信息选择最适合的工具
3. **参数推断**：从用户输入中提取工具所需的参数
4. **置信度评估**：为工具选择提供可靠性指标

#### 2.2 错误恢复上下文
```python
# 智能错误处理 (llm_client.py:310-335)
# 更智能的后备处理
if any(keyword in user_input.lower() for keyword in ['图', 'chart', 'diagram', '流程', '时序']):
    if available_tools:
        render_tools = [t for t in available_tools if 'render' in t.get('name', '').lower()]
        if render_tools and 'script' in str(render_tools[0].get('input_schema', {})):
            basic_script = "graph TD\n    A[开始] --> B[处理中] --> C[结束]"
            fallback_response.update({...})
```

**设计亮点**：
- 关键词触发：基于语义关键词进行上下文恢复
- 渐进式降级：从精确匹配到模糊匹配的降级策略
- 用户引导：提供具体的下一步操作建议

### 3. 动态上下文构建

#### 3.1 会话上下文管理
```python
# 会话状态维护 (mcp_host.py:157-235)
async def process_user_input(self, user_input: str, mcp_capabilities: Dict[str, Any]) -> Dict[str, Any]:
    # 1. 分析用户意图和工具选择
    logger.info("分析用户意图和工具选择...")
    intent_result = await llm_client.analyze_tool_intent(...)
```

**上下文生命周期**：
- **初始化阶段**：建立MCP服务器连接，获取可用工具列表
- **交互阶段**：维护用户会话状态，累积对话历史
- **清理阶段**：释放资源，保存会话摘要

#### 3.2 跨组件上下文传递
```python
# 上下文包装器模式 (mcp_client_wrapper.py:14-38)
class MCPClientWrapper:
    def __init__(self, server_url: str, client_class):
        self.server_url = server_url
        self.client_class = client_class
        self.client = None
```

**设计优势**：
- 解耦设计：客户端与服务器的具体实现解耦
- 上下文一致性：确保跨组件的上下文信息保持一致
- 扩展性：支持新的客户端类型而无需修改核心逻辑

## 可优化的上下文工程点

### 1. 上下文缓存优化

**当前问题**：每次用户请求都重新分析MCP服务器能力，造成不必要的延迟。

**优化方案**：
```python
# 建议实现上下文缓存机制
class ContextCache:
    def __init__(self, ttl: int = 300):  # 5分钟TTL
        self.cache = {}
        self.timestamps = {}
        self.ttl = ttl
    
    async def get_cached_capabilities(self, server_url: str) -> Dict[str, Any]:
        if server_url in self.cache:
            if time.time() - self.timestamps[server_url] < self.ttl:
                return self.cache[server_url]
        
        # 重新获取并缓存
        capabilities = await self.refresh_capabilities(server_url)
        self.cache[server_url] = capabilities
        self.timestamps[server_url] = time.time()
        return capabilities
```

**预期收益**：
- 减少50%以上的MCP服务器查询延迟
- 提高系统响应速度
- 降低服务器负载

### 2. 用户偏好上下文学习

**当前问题**：缺乏用户个性化偏好学习机制，每次交互都从零开始。

**优化方案**：
```python
# 建议实现用户偏好学习系统
class UserPreferenceContext:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.preferences = self.load_preferences()
    
    def learn_from_interaction(self, user_input: str, tool_choice: str, parameters: Dict):
        # 学习用户的图表偏好
        if "format" in parameters:
            self.preferences["preferred_format"] = parameters["format"]
        
        # 学习用户的复杂度偏好
        if "width" in parameters and "height" in parameters:
            self.preferences["preferred_size"] = {
                "width": parameters["width"],
                "height": parameters["height"]
            }
    
    def apply_preferences(self, parameters: Dict) -> Dict:
        # 应用学习到的新偏好
        if "preferred_format" in self.preferences:
            parameters.setdefault("format", self.preferences["preferred_format"])
        return parameters
```

**预期收益**：
- 提升用户体验，减少重复配置
- 个性化响应，提高用户满意度
- 长期学习，系统智能化程度持续提升

### 3. 多模态上下文融合

**当前问题**：当前系统主要处理文本输入，缺乏图像、语音等多模态上下文处理能力。

**优化方案**：
```python
# 建议实现多模态上下文处理器
class MultimodalContextProcessor:
    def __init__(self):
        self.text_processor = TextContextProcessor()
        self.image_processor = ImageContextProcessor()
        self.voice_processor = VoiceContextProcessor()
    
    async def process_multimodal_input(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        context = {}
        
        if "text" in inputs:
            context.update(await self.text_processor.extract_context(inputs["text"]))
        
        if "image" in inputs:
            context.update(await self.image_processor.extract_context(inputs["image"]))
        
        if "voice" in inputs:
            context.update(await self.voice_processor.extract_context(inputs["voice"]))
        
        return self.fuse_contexts(context)
```

**预期收益**：
- 支持更丰富的用户交互方式
- 提高意图理解的准确性
- 为未来AR/VR集成奠定基础

### 4. 实时上下文同步

**当前问题**：在多用户并发场景下，上下文信息可能不同步。

**优化方案**：
```python
# 建议实现上下文同步机制
class ContextSynchronizer:
    def __init__(self):
        self.subscribers = {}
        self.context_store = {}
    
    async def publish_context_update(self, context_id: str, update: Dict[str, Any]):
        self.context_store[context_id] = update
        
        # 通知所有订阅者
        if context_id in self.subscribers:
            for subscriber in self.subscribers[context_id]:
                await subscriber.on_context_update(update)
    
    def subscribe_to_context(self, context_id: str, subscriber):
        if context_id not in self.subscribers:
            self.subscribers[context_id] = []
        self.subscribers[context_id].append(subscriber)
```

**预期收益**：
- 支持协作式图表编辑
- 实现实时上下文共享
- 提高系统并发处理能力


### 5. 多智能体上下文协作系统

**基于Multi-Agent Systems的上下文协作架构**：

根据PDF中关于多智能体系统的论述，建议实现以下架构：

```python
class MultiAgentContextOrchestrator:
    """多智能体上下文编排器 - 解决复杂上下文管理"""
    
    def __init__(self):
        self.agents = {
            "context_analyzer": ContextAnalysisAgent(),
            "memory_manager": MemoryManagementAgent(),
            "tool_orchestrator": ToolOrchestrationAgent(),
            "quality_optimizer": QualityOptimizationAgent()
        }
    
    async def process_context_pipeline(self, user_input: str) -> Dict[str, Any]:
        """多智能体协作处理完整上下文流水线"""
        
        # 1. 上下文分析智能体
        raw_context = await self.agents["context_analyzer"].analyze(user_input)
        
        # 2. 记忆管理智能体
        historical_context = await self.agents["memory_manager"].retrieve_relevant(
            raw_context["user_id"], 
            raw_context["intent_keywords"]
        )
        
        # 3. 工具编排智能体
        orchestrated_plan = await self.agents["tool_orchestrator"].create_plan(
            raw_context, historical_context
        )
        
        # 4. 质量优化智能体
        optimized_context = await self.agents["quality_optimizer"].optimize(
            orchestrated_plan
        )
        
        return optimized_context

class ContextAnalysisAgent:
    """上下文分析智能体"""
    
    async def analyze(self, user_input: str) -> Dict[str, Any]:
        """深度分析用户输入生成结构化上下文"""
        
        return {
            "intent_type": await self.classify_intent(user_input),
            "complexity_score": await self.assess_complexity(user_input),
            "required_capabilities": await self.identify_capabilities(user_input),
            "priority_indicators": await self.extract_priority(user_input),
            "emotion_context": await self.detect_emotion(user_input)
        }

class MemoryManagementAgent:
    """记忆管理智能体 - 实现长期记忆"""
    
    def __init__(self):
        self.vector_store = PineconeVectorStore()  # 或 Weaviate
        self.short_term_cache = RedisCache()
    
    async def retrieve_relevant(self, user_id: str, keywords: List[str]) -> Dict:
        """基于向量检索获取相关历史上下文"""
        
        # 构建查询向量
        query_vector = await self.create_embedding(" ".join(keywords))
        
        # 从长期记忆中检索
        relevant_memories = await self.vector_store.similarity_search(
            query_vector, 
            filter={"user_id": user_id},
            k=5
        )
        
        return {
            "user_preferences": self.extract_preferences(relevant_memories),
            "historical_patterns": self.extract_patterns(relevant_memories),
            "successful_strategies": self.extract_strategies(relevant_memories)
        }

class ToolOrchestrationAgent:
    """工具编排智能体 - 基于上下文选择最优工具组合"""
    
    async def create_plan(self, current_context: Dict, historical_context: Dict) -> Dict:
        """基于上下文创建工具执行计划"""
        
        # 分析工具需求
        required_tools = self.identify_required_tools(current_context)
        
        # 考虑历史偏好
        preferred_tools = historical_context.get("preferred_tools", [])
        
        # 创建执行计划
        execution_plan = {
            "primary_tool": self.select_primary_tool(required_tools, preferred_tools),
            "fallback_tools": self.select_fallback_tools(required_tools),
            "parallel_tools": self.identify_parallelizable_tools(required_tools),
            "context_pipeline": self.build_context_pipeline(required_tools)
        }
        
        return execution_plan
```

**多智能体协作的核心优势**：
- **专业化分工**：每个智能体专注特定领域，提高专业性和准确性
- **并行处理**：多个智能体可并行工作，提高系统响应速度
- **容错性**：单个智能体故障时，其他智能体可提供补偿
- **可扩展性**：易于添加新的专业智能体
- **可解释性**：每个决策步骤都有明确的责任智能体

## 说人话
以上都是claude基于我自己的一些零散想法笔记、网上的文章以及项目代码总结的内容。我本人也说说自己对上下文工程的理解。
目前国内外主流的LLM模型能力都很强，已经可以近似看作是一个全能型的人才。使用LLM去完成一个任务，就像让一个能力出众但不了解整件事背景的人去帮你做事。它唯一的缺点是不能一下子接收太多的信息（上下文窗口大小有限），接收的内容越整齐（结构化、分层级、要求清晰不前后矛盾），它完成的效果就越好。
从这个角度来说，管理上下文，确实是一个工程化的事情：分层级、结构化、动态适应、解耦合、可拓展等等，都是传统工程中一个架构师需要设计的东西。
从另一个角度来说，使用大模型，也像一个组织管理者在“使用”下属的人，需要清晰地描述任务背景（全局记忆）、提供必要的资源支持（RAG、MCP等），必要时给与指导意见（user prompt）。
无论是哪个角度，使用LLM都对使用者本身的能力有要求，最近在网上有位博主的一段话很热门，给我带来一些学习方向上的启发，分享给大家：
![image.png](https://note.youdao.com/yws/res/1479/WEBRESOURCE2219a4663e28dfaf0e9b18d341cc874c)

## 参考文章
- AI写代码的“上下文陷阱”：为什么AI总是写错？如何系统性解决？ 
https://mp.weixin.qq.com/s/dAknYxHhGd0xDNqn9cB73Q

- 上下文工程：AI开发的新范式与实践指南
 https://llmmultiagents.com/blogs/the-rise-of-context-engineering-building-the-foundation-for-next-generation-ai-agents
