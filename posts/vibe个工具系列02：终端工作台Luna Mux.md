---
title: "vibe 个工具系列 02｜终端工作台 Luna mux"
date: 2026-08-20
tag: AI工程
excerpt: "系列第二期。终端复用器管窗口，Luna mux 想管的是项目里多个终端和多个 Agent 的协作。"
---

[上一次](/?post=vibe个工具系列01-ssh客户端luna-remote)分享了 SSH 客户端 [Luna Remote](https://github.com/rainj2013/luna-remote)。这一期分享的是 [Luna mux](https://github.com/rainj2013/luna-mux)，一个跨平台的 Coding Agent 工作台。

我手头有多台设备，包含 Windows、Mac 机器、WSL、云 Linux 服务器等环境，这些环境上跑的终端、Agent 也各不相同。我需要一个跨平台的工作台，方便统一管理这些环境下的 Coding Agent，让他们可以一起工作、聚合消息通知、调用本地浏览器进行自动化调试等，所以就有了 Luna mux 这个软件。

在详细介绍 Luna mux 之前，先向 [Cmux](https://github.com/manaflow-ai/cmux) 致敬。Cmux 是一个非常强大的终端工作台软件，我参考了它不少功能，再结合自己的需求做出了 Luna mux。

## 会话和窗格

Luna mux 以项目目录为单位维护一个会话，一个会话里可以新建多个窗格。每个窗格里是一个终端，可以是本地终端（zsh, bash, Powershell, WSL），也可以是 SSH 连上的远程机器的终端。不管哪种终端，进来之后都用同一套界面，支持同样的搜索、复制粘贴、字体、背景等。

![Luna mux 终端工作区](/static/2026-08-20/terminal.png)

同一个项目会话里的窗格之间预留了互相读写的接口，Agent 可以通过 Luna mux 的 mcp 读取另一个窗格的输出，也可以向它写入输入。多个 Agent 各自负责一个窗格时，可以互相通信。

会话和窗格布局都会持久化保存，保留个人习惯的编排方式，例如我最常用的是一个 Coding Agnet + 一个 zsh 终端左右布局，外加一个浏览器。

## 在窗格里增强 Agent

在任意一个窗格里启动受支持的 Agent（目前是 Codex 和 Claude Code），Luna mux 会自动发现它，并注入 Hook 和 MCP，用来拓展 Agent 的功能。

Hook 主要负责工作状态监控、生命周期管理和消息通知。Agent 在等待输入、等待授权、完成工作或者是出错了等等状态变化都会通过hook发送消息给 Luna mux。有消息需要关注时，Luna mux 会通过窗格边框颜色、侧边栏图标、系统通知等方式提醒用户，点击通知后即可跳转到对应需要处理的窗格，在多 Agent 并行使用时非常方便。

默认注入的 MCP 有两个：
1. 第一个是 Luna mux 自身的 MCP 服务。AI 原生时代应用，一个标配的功能是需要支持通过 Agent 控制，MCP 也好 CLI也好，需要暴露可操作的接口。Luna mux 需要在 SSH 的机器上以及 WSL 等环境支持跟本地一样的控制体验，网络环境比较复杂，最终还是选择了 MCP 。它让 Agent 可以自主控制 Luna mux 这个软件：创建窗格、修改布局、读取终端输出、写入终端输入，也可以查询其他 Agent 的状态、投递任务、发送中断等待。Agent 要拓展子 Agent 时，也可以自己开一个窗格来跑。

2. 第二个是 agent-browser，它让 Agent 可以自由控制一个受 Luna mux 管理的 Chrome 浏览器。Chrome CDP 协议支持的操作都可以做，例如打开页面、点击、填表、截图，通过查看控制台和网络请求等等。
列举几个我自己常用的浏览器控制功能的使用场景：
- 让 Agent 自己去查询需要登陆的平台上的信息（中间需要人工接管浏览器完成登录操作），例如企业内网的一些文档平台。
- 让 Agent 在完成一个 WEB 功能开发后，自己去页面验收功能、调整实现效果。
- 让 Agent 查看浏览器控制台和网络请求来排查问题。
- 让 Agent 控制浏览器充当一个简易的爬虫，去收集一些信息，比纯粹通过curl等脚本去收集更不容易被网站安全策略拦截。

这里有两个设计上的取舍：一是Luna mux 的安装包没有把浏览器打包进来，我希望保持 Luna mux 精简，选择 Tauri 而不是 Electron 来构建应用就是不想包含一个浏览器，事实上大家电脑上应该都应该有Chrome(没有就装一个吧)。二是浏览器没有作为一个窗格嵌入到 Luna mux 里面。嵌入看起来集成度更高，但浏览器的操作往往不是全自动的，登录验证、页面 UI 检视这些都需要人工接管，塞在一个小窗格里体验并不好。所以浏览器以独立窗口运行，Agent 操作时用户也方便随时接手。

## SSH 和 SFTP

SSH 和 SFTP 这部分从我的另一个工具软件 Luna Remote 移植过来，密码、私钥、SSH Agent、Host Key 校验、保活、一级跳板机，以及 SFTP 和本地/远程/SOCKS5 转发，能力基本一致。

Luna mux 设置里面可以选择打开远程 Agent 控制功能，默认是关闭的；开启后，Luna mux 创建 SSH 连接时，会通过 SFTP 自动部署一个轻量 helper 到目标机器上，协助目标机器上的 Agent 与本地的 Luna mux 之间通信。之后在这个远程终端里启动的 Agent，使用浏览器控制、操作本地启动的 Luna mux 软件、状态监控和消息通知等功能，用起来跟本地 Agent 体验完全一样。

## AI 命令助手

AI 命令助手也是移植自 Luna Remote 软件，它和 Codex、Claude Code 这些 Agent 相互独立，使用用户自己配置的 OpenAI 兼容API，为当前终端生成 Linux Shell、PowerShell、CMD 或 macOS 命令。无论在本地还是 SSH 远程终端，都可以让 AI 帮忙写命令。结果带说明、前提、警告和风险等级，可以复制、只填入终端，或经风险确认后执行。不配置 AI 服务也不影响其他功能。

## 技术选型

和 Luna Remote 一样基于 Tauri 构建，底层是 Rust，UI 由系统 WebView 渲染，终端用 xterm.js。会话、布局和连接存在本地 SQLite，密码等敏感信息交给 macOS Keychain 或 Windows Credential Manager。

Luna mux 已经发布第一个 release 版本，我自己也已经每天都在使用。应用安装包可以在 github 的 release 页面下载，支持 Mac 和 Windows 操作系统。源码、文档和构建说明都在 [GitHub](https://github.com/rainj2013/luna-mux)。这个系列后面还会继续写其他工具。

## 碎碎念
虽然 Luna mux 只是个工具软件，但在制作时我却想到一些游戏设计的理念：当玩家从视觉或物理逻辑上认为某个元素可以操作时，游戏就应当给予对应的反馈。AI 原生时代的软件也应该是这样，当用户觉得一个功能应该可以与 AI 产生交互时，它就应该可以与 AI 产生交互。所以我把 Luna mux 大大小小的功能都暴露了 API 给 Agent，让用户可以很自然地通过 Agent 去控制 Luna mux 本身。
