---
date: 2025-07-12
tag: MCP
---

# 困惑到实践：MCP的几个细节探究

### 关于MCP协议的疑问

Anthropic在2024年11月发布了MCP协议，到现在已经大半年了。在这半年相关的工具、开发框架、社区已经逐渐成熟，我对MCP协议也已经有了大致的了解，但还存在一些细节上的疑问：

1. 有些MCP工具可以操作本地文件和UI，有些又可以提供公共的互联网产品服务（例如高德地图），这些都是MCP Server的能力吗？MCP Server之间有什么区别？
2. MCP Host是如何判断是否需要调用外部的MCP Server、有哪些MCP Server可用、应该调用哪个MCP Server的哪个tool的，如果有多个功能类似的MCP Server怎么办？
3. MCP Client是如何组装参数以保证满足MCP-Server的需要的？
4. 在连接使用自己实现的MCP Server时，Cursor、Claude Desktop或者Cherry Studio都是现成的MCP Host，并且内置了MCP Client，什么时候需要自己实现MCP Host、MCP Client？

带着这些疑问，我试用了几个公开的MCP Server（高德地图、MiniMax），也用FastMCP框架写了几个MCP Server，并接入Cursor和Cherry Studio，在实践过程中结合自己的猜测得出了一些结论，不一定准确，仅供参考。

### MCP Server

#### mermaid绘图服务

第一个MCP Server是用于将Mermaid-cli将符合mermaid语法的脚本绘制成png格式的图片，在MCP协议发布之前，我曾写过一个Agent实现这个功能，这次基于MCP协议再实现一次。

##### 代码

```python
@mcp.tool(
    name="mermaid tools",
    description="""
    渲染Mermaid脚本为图片，返回图片URL。
    参数：
        code: Mermaid脚本内容
    返回：
        {"success": True, "image_url": url, "file_id": id}
    """)
def render_mermaid(script: str) -> dict:
    # 篇幅原因省略实现细节
```

##### 使用效果

在Cursor中连接这个MCP Server，输入prompt用mermaid画图时，Cursor本身内置的工具足够强大，生成的mermaid脚本默认直接用内置的工具渲染出来了。
在prompt中显式地要求使用MCP Server中的mermaid_tools工具来绘图后，Cursor还是调用了自定义的MCP Server并返回了图片的url。最后模型还对MCP Server返回的内容做了个转换，从json中取出url，转成一个html超链接，可以直接跳转浏览器查看。

#### 用户信息查询

这是一个resource类型的MCP Server。

##### 代码

```python
from fastmcp import FastMCP

# FastMCP服务实例
mcp = FastMCP("User Message", port=5001)

@mcp.resource("users://{user_id}/profile")
def get_user_profile(user_id: str) -> str:
    """获取用户信息"""
    return f"用户 {user_id} 的个人资料"
```

##### 使用效果

在Cursor中，只支持tools类型的MCP Server，直接扫描不到。

而Cherry Studio中声称可以支持tools、resource、prompt三种类型的MCP Server。遗憾的是，基于FastMCP框架实现的resoruce/prompt类型的Server在Cherry Studio中都扫描不到。或许目前只有Anthropic自家的Claude-Desktop对MCP协议的支持最完整。

#### 高德地图、MinMax

这两个是企业发布的remote的MCP Server，参考网上的课程：
1. 通过Cursor作为MCP Host接入这两个MCP Server后，用高德查询了广州市的一些著名景点，生成markdown文件保存到本地。
2. 再用MiniMax的TTS功能，将markdown中介绍各个景点的文本内容转换成音频文件，并将音频文件url更新到本地的markdown文档中。
3. 最后再通过prompt提供一些CSS和字体资源，将markdown转成一个带文字和语音的html网页。

这是一个结合多个MCP Server和Cursor内置的能力（文件读写、Web搜索），完成一个完整的应用开发的案例。

### 结论与猜测

结合最初的几个疑问和以上的实践，得出几个结论和猜测：

1. **MCP Server不是传统意义BS或者CS软件架构上的Server概念**，它是对工具、资源、提示词、采样等等的封装。如果最终为了解决本地的问题（如操作本地UI、读写本地文件），就可以部署在本地。如果是公共的互联网产品服务（如高德地图），则可能部署在远端的服务器。相应的交互协议也支持两大类：仅用于本地的stdio标准输入输出，和可用于本地/远端的SSE、Streamable HTTP、WebSocket等。

2. **MCP Server需要声明自己的能力**、接收的参数、返回的内容格式等信息。而MCP Host连接MCP Server时，会拉取所有的这些声明信息。类似微服务架构中的服务注册/服务发现机制。MCP Host会结合各个MCP Server声明的能力，加上内置的系统级的prompt（这些prompt理论上可以通过抓包拿到），让大模型在响应用户输入时，决定是否从中选取合适的tool。如果有多个功能类似的tool，或者Host本身就内置了相关能力，模型会结合历史上下文、系统prompt里的优先级提示等选择一个最终的工具。也可以直接用用户级的prompt去干预模型选择什么tool。这也意味着MCP Host里面同时连接的MCP Server越多，上下文会越长，所以最好还是按需连接MCP Server。

3. **MCP Client会根据MCP Server声明的接收参数格式要求**，结合内置系统级的prompt来调用大模型组装请求参数。所以写好MCP Server中的这些Schema声明很重要。

4. **目前常用现成的MCP Host**，像Cursor、Cherry Studio等对MCP协议的兼容并不完整，如果你需要自己开发一个应用接入多个MCP Server，或者有更多的客户端系统级prompt定制、自定义的鉴权之类的需求，就需要自己去实现MCP Host、MCP Client。如果是常见的需求，Cursor已经非常强大。
