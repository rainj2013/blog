---
title: "vibe 个工具系列 01｜SSH 客户端 Luna Remote"
date: 2026-08-06
tag: AI工程
---

最近宝宝出生了，生活一下忙了不少。这次先简单分享一个自己制作的，每天都在用的软件。

我用过一些连接服务器的工具，有的需要付费，有的必须登录后才能使用，还有的 UI 界面我不太喜欢。开源工具里也有像 Electerm 这样完成度很高的选择，功能做得很全，只是有些功能我用不上，整个软件对我来说也有些重。

我想要一个能在 macOS 和 Windows 上使用的轻量 SSH 客户端，只需要基础的终端、SFTP 文件管理和端口转发功能。另外，还需要嵌入 AI 帮我写复杂的命令。不用注册账号，连接资料保存在本地，界面也能按自己的习惯调整。

所以我用 AI 做了开源的 [Luna Remote](https://github.com/rainj2013/luna-remote)。它支持 macOS（Intel 和 Apple Silicon）以及 Windows，可以直接从 [GitHub Releases 页面](https://github.com/rainj2013/luna-remote/releases/latest) 下载安装包。

## 基础功能

连接列表可以分组、排序和折叠，也能导入 SSH Config。密码、私钥、SSH Agent、Host Key 校验和一级跳板机这些常用能力都在，同一台机器可以开多个独立标签，终端字体、配色和背景也能调整。

![Luna Remote 终端界面](/static/2026-08-06/terminal.png)

SFTP 采用本地与远程双栏布局，文件和目录可以拖放，传输任务有队列，失败后可以重试，同名文件也能选择覆盖、跳过或自动改名。还有个很方便的目录部署功能，它会先比较两边内容，只上传有变化的文件，更新几张图片时不用重传整个目录。

![Luna Remote SFTP 文件传输界面](/static/2026-08-06/sftp.png)

端口转发支持本地、远程和 SOCKS5 三种方式，临时访问只监听内网的服务时很方便。规则跟随连接保存，下次直接启用，省得再找一遍主机和端口。

## AI 命令

记不起命令参数时，可以让 AI 助手生成 Linux Shell、PowerShell、CMD 或 macOS 命令，并附上用途、执行前提和风险提示。结果可以复制，也可以直接填入当前终端，确认无误后再执行。

![Luna Remote AI 命令助手](/static/2026-08-06/ai-command.png)

需要时，它可以将最近的终端输出内容附带到 AI 对话上下文中，发送前会对常见的密码、token、个人信息等敏感数据进行脱敏，接口兼容 OpenAI 风格的服务，密钥存入系统凭据管理器，没有配置 AI 时其他功能也可以照常使用。

## 技术选型

Luna Remote 基于 [Tauri](https://v2.tauri.app/concept/process-model/) 构建，底层使用 Rust，UI 由系统 WebView 渲染。连接配置等基本数据保存在本地 SQLite，密码等敏感信息则由 macOS Keychain 或 Windows Credential Manager 管理。如需跨设备同步，可以手动导出和导入配置。

## 重做自己常用的软件

在 AI Coding Agent 的帮助下，我可以不受自己原来熟悉的技术栈限制，把自己常用的工具重新造一遍轮子，精细化定制，更适配自己的需求。Luna Remote 是这个系列的第一期，后面我还会继续更新自己做的其他工具。

Luna Remote 的源码、文档和安装包都在 [GitHub](https://github.com/rainj2013/luna-remote)。
