---
title: "vibe 个工具系列 02｜终端工作台 Luna Mux"
date: 2026-08-20
tag: AI工程
excerpt: "系列第二期。终端复用器管窗口，Luna Mux 想管的是项目里多个终端和多个 Agent 的协作。"
---

[系列第一期](/?post=vibe个工具系列01-ssh客户端luna-remote)写了 SSH 客户端 [Luna Remote](https://github.com/rainj2013/luna-remote)，它管的是连接服务器。这一期写 [Luna Mux](https://github.com/rainj2013/luna-mux)，它管的是在项目里用 Coding Agent 写代码时的终端。

Luna Remote 按连接来组织，一台服务器一个标签。用 Agent 写代码时，组织方式会反过来：一个项目要同时开好几个终端，有跑本地服务的、看日志的、连测试环境的，其中几个里面还跑着 Codex 或 Claude Code。这些终端属于同一个项目，我希望它们待在一个地方，也希望跑在里面的 Agent 能看见彼此在做什么。

Luna Mux 就是按这个想法做的。它以项目目录为单位维护 Session，一个 Session 里放多个终端窗格。它和普通终端复用器最大的区别，不是多开几个窗口，而是把 Agent 当成应用里的一等公民。

## 先把终端体验拉平

一个 Session 对应一个项目目录，保存项目根目录和窗格布局。在设计上，我没有把本地终端、WSL 和 SSH 分成三种东西，而是把它们都当成“一个 Pane 里的一个 Runtime”：只是到达方式不同，进来之后应该是一个手感。

![Luna Mux 终端工作区](/static/2026-08-20/terminal.png)

- 本地终端、WSL、SSH 共用同一套 xterm.js 界面，搜索、复制粘贴、主题、字体、背景和输出流控都保持一致。
- 窗格之间预留了互相读写的接口，Agent 可以读取另一个窗格的有界输出，也可以向它写入输入。多个 Agent 各自负责一个窗格时，不需要复制粘贴，也不用互相猜。
- 应用重启后恢复 Session 和布局，但不会擅自重连服务器，也不会重启任何进程。

重启以后只恢复定义，不恢复进程。写代码时不少终端里跑着长任务，自动重连和自动重启可能把正在跑的东西打断。

## Agent 是一等公民

这是 Luna Mux 和普通终端复用器最大的差别。以前的终端复用器主要服务人：切窗、看输出、发命令。Luna Mux 同时服务人和 Agent：在任意一个窗格里启动受支持的 Agent，目前是 Codex 和 Claude Code，Luna Mux 会自动发现它，并注入 Hook 和 MCP。

Hook 负责状态监控、生命周期管理和消息通知。Agent 在忙、在等输入、在等权限、完成了还是出错了，这些状态会反馈到 Luna Mux；需要关注的窗格会在侧边栏、窗格边框和桌面通知里标记出来，点一下通知就回到对应位置，Agent 的生命周期也跟着应用走。

Luna Mux MCP 是另一件事：让 Agent 反过来控制 Luna Mux。我觉得 AI 原生应用的标配，是应用自身的能力也能被 Agent 调用，而不是只给 Agent 一个黑盒终端。通过 Luna Mux MCP，Agent 可以发现 Session、窗格和终端，可以创建窗格、修改布局、读取有界终端输出、写入终端输入，也可以查询其他 Agent 的状态、投递任务、发送中断。Agent 要展开 subagent 时，可以自己开一个窗格，再读取同一个 Session 里其他窗格的信息。

当然，能力开放要有边界。关闭终端、启动传输或隧道这类重要副作用，需要先在桌面端确认；凭据、私钥和 API Key 不会通过 MCP 暴露给 Agent。

## 浏览器自动化，但不做成窗格

Agent 还需要操作网页。Luna Mux 给每个 Session 准备了一个隔离的受管 Chrome，通过 agent-browser MCP 驱动，可以打开页面、点击、填表、读取快照、截图，也能看控制台和网络请求。

这里我做了两个取舍。一个是不打包浏览器：Luna Mux 保持精简，用户自己安装 Chrome，按需启动、之后复用同一个实例。另一个是不把浏览器做成嵌在分割树里的 Pane。嵌入看起来更像一体，但浏览器不总是全自动操作，登录验证、页面 UI 检查经常要人接管，缩在终端小窗格里的浏览器体验并不好。所以受管 Chrome 以独立窗口运行，Agent 操作时，用户可以随时接管。

## 远程 Agent 和本地 Agent 一个待遇

SSH 和 SFTP 这部分从 Luna Remote 移植过来：密码、私钥、SSH Agent、Host Key 校验、保活、一级跳板机，以及 SFTP 和本地/远程/SOCKS5 转发，能力基本对齐。

这里真正的增量是远程 Agent。SSH 机器可以选开远程 Agent 控制，默认关闭；开启后，Luna Mux 会通过 SFTP 自动部署一个轻量 helper。之后在这个终端里启动的 Agent，和本地 Agent 一样拥有浏览器控制、Luna Mux 操作、状态监控和通知，而原始 CDP 调试端口不会直接暴露到远端。

## AI 命令助手：给不用 Agent 的时候

AI 命令助手和 Codex、Claude Code 这些 Agent 相互独立，使用用户自己配置的 OpenAI 兼容服务，为当前终端生成 Linux Shell、PowerShell、CMD 或 macOS 命令。

它是给不用 Agent 的场景准备的：无论在本地还是 SSH 远程终端，都可以让 AI 帮着写命令。结果带说明、前提、警告和风险等级，可以复制、只填入终端，或经风险确认后执行；附带终端上下文时，发送前会先做常见个人信息的脱敏。不配置 AI 服务也不影响其他功能。

## 技术选型

和 Luna Remote 一样基于 [Tauri](https://v2.tauri.app/concept/process-model/) 构建，底层 Rust，UI 由系统 WebView 渲染，终端用 xterm.js。Session、布局和连接存在本地 SQLite，密码等敏感信息交给 macOS Keychain 或 Windows Credential Manager。

## 先把主路径跑顺

Luna Mux 目前还在早期，版本 0.1.0。项目 Session、本地加远程的统一终端、Agent 的 Hook 和 MCP 注入、浏览器自动化、SSH 和 SFTP，这些主路径已经跑通。后面要打磨的是更顺手的布局操作、更完整的诊断和修复，以及远程 Agent 在更复杂环境里的健壮性。

源码、文档和构建说明都在 [GitHub](https://github.com/rainj2013/luna-mux)。这个系列后面还会继续写其他工具。
