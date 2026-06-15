---
id: cmd.ui-output
path: surface/commands/ui-output.md
title: UI and output slash commands
kind: command
tier: T1
source: [commands.ts, commands/copy/index.ts, commands/copy/copy.tsx, commands/export/index.ts, commands/export/export.tsx, commands/files/index.ts, commands/files/files.ts, commands/context/index.ts, commands/context/context.tsx, commands/context/context-noninteractive.ts, commands/desktop/index.ts, commands/desktop/desktop.tsx, commands/mobile/index.ts, commands/mobile/mobile.tsx, commands/chrome/index.ts, commands/chrome/chrome.tsx]
symbols: [copy, exportCommand, files, context, contextNonInteractive, desktop, mobile, chrome]
related: [subsys.command-system]
evidence: explicit
status: verified
updated: 2026-06-14
---

> UI and output 命令 catalog 覆盖 `/copy`、`/export`、`/files`、`/context`、`/desktop`、`/mobile`、`/chrome`,即把会话内容、上下文状态或跨产品 UI 入口展示给用户的 slash commands。

## 能回答的问题

- `/copy` 与 `/export` 分别怎样输出会话内容?
- `/context` 在 interactive 与 non-interactive 下为什么有两个 command object?
- 哪些 UI/output 命令有 availability、alias 或 ant-only gate?
- `/desktop`、`/mobile`、`/chrome` 分别打开哪些跨端入口?

## 简介

`commands.ts` 在 built-in `COMMANDS` 数组中注册 `copy`、`desktop`、`context`、`contextNonInteractive`、`files`、`mobile` 和 `chrome`,并把 `copy` 也列入 remote mode safe set。[E: commands.ts:264][E: commands.ts:269][E: commands.ts:270][E: commands.ts:271][E: commands.ts:272][E: commands.ts:279][E: commands.ts:289][E: commands.ts:629] `exportCommand` 在数组后段注册,用于 conversation export 而不是 clipboard-only copy。[E: commands.ts:335][E: commands/export/index.ts:5][E: commands/export/index.ts:6]

## 命令清单

| 命令 | aliases | kind | 来源 / availability | 参数 | 行为一句话 |
| --- | --- | --- | --- | --- | --- |
| `/copy` | - | `local-jsx` | `COMMANDS` 直接包含 `copy`; command 元数据说明可复制最近 assistant response 或指定第 N 个最近 response。[E: commands.ts:269][E: commands/copy/index.ts:8][E: commands/copy/index.ts:9][E: commands/copy/index.ts:11] | 无 `argumentHint`;实现用 args 解析 lookback index。[E: commands/copy/copy.tsx:343][E: commands/copy/copy.tsx:345][E: commands/copy/copy.tsx:346][E: commands/copy/copy.tsx:354] | 从最近 assistant messages 收集文本,可复制完整回复或代码块;会尝试 OSC clipboard,并写入 temp file fallback。[E: commands/copy/copy.tsx:50][E: commands/copy/copy.tsx:57][E: commands/copy/copy.tsx:81][E: commands/copy/copy.tsx:82][E: commands/copy/copy.tsx:89] |
| `/export` | - | `local-jsx` | `COMMANDS` 直接包含 `exportCommand`; command description 是导出当前 conversation 到文件或 clipboard。[E: commands.ts:335][E: commands/export/index.ts:4][E: commands/export/index.ts:5][E: commands/export/index.ts:6] | `[filename]`;有 args 时直接写文件,无 args 时打开 export dialog。[E: commands/export/index.ts:7][E: commands/export/export.tsx:58][E: commands/export/export.tsx:87] | 用 `renderMessagesToPlainText()` 渲染 conversation,指定文件名时写入 cwd 下 `.txt`,否则生成默认文件名并交给 `ExportDialog`。[E: commands/export/export.tsx:51][E: commands/export/export.tsx:60][E: commands/export/export.tsx:61][E: commands/export/export.tsx:63][E: commands/export/export.tsx:76][E: commands/export/export.tsx:81] |
| `/files` | - | `local` | `COMMANDS` 直接包含 `files`; command 只在 `USER_TYPE === 'ant'` 时启用,支持 non-interactive。[E: commands.ts:279][E: commands/files/index.ts:4][E: commands/files/index.ts:5][E: commands/files/index.ts:7][E: commands/files/index.ts:8] | 无显式参数; `call()` 忽略 `_args`,读取 `context.readFileState`。[E: commands/files/files.ts:8][E: commands/files/files.ts:9][E: commands/files/files.ts:11] | 列出 `readFileState` cache keys 对应的相对文件路径;没有文件时返回 `No files in context`。[E: commands/files/files.ts:11][E: commands/files/files.ts:14][E: commands/files/files.ts:17][E: commands/files/files.ts:18] |
| `/context` | - | interactive: `local-jsx`; non-interactive: `local` | `COMMANDS` 同时包含 `context` 与 `contextNonInteractive`; interactive 版本只在非 non-interactive session 启用,non-interactive 版本反向启用且支持 non-interactive。[E: commands.ts:271][E: commands.ts:272][E: commands/context/index.ts:7][E: commands/context/index.ts:8][E: commands/context/index.ts:13][E: commands/context/index.ts:15][E: commands/context/index.ts:21] | 无显式参数; non-interactive `call(_args, context)` 忽略 args。[E: commands/context/context-noninteractive.ts:79][E: commands/context/context-noninteractive.ts:80] | interactive 版本渲染 colored grid; non-interactive 版本输出 markdown table,两者都先做 compact boundary、可选 context collapse 和 microcompact 再分析 token usage。[E: commands/context/context.tsx:39][E: commands/context/context.tsx:44][E: commands/context/context.tsx:52][E: commands/context/context.tsx:60][E: commands/context/context-noninteractive.ts:49][E: commands/context/context-noninteractive.ts:58][E: commands/context/context-noninteractive.ts:61][E: commands/context/context-noninteractive.ts:86] |
| `/desktop` | `app` | `local-jsx` | `COMMANDS` 直接包含 `desktop`; availability 是 `claude-ai`,仅 darwin 或 win32 x64 启用,不支持平台时 hidden。[E: commands.ts:270][E: commands/desktop/index.ts:4][E: commands/desktop/index.ts:7][E: commands/desktop/index.ts:10][E: commands/desktop/index.ts:14][E: commands/desktop/index.ts:16][E: commands/desktop/index.ts:18][E: commands/desktop/index.ts:19][E: commands/desktop/index.ts:21] | 无显式参数; `call()` 只接收 `onDone`。[E: commands/desktop/desktop.tsx:4] | 渲染 `DesktopHandoff` 组件,用于把当前 session 交给 Claude Desktop。[E: commands/desktop/desktop.tsx:7] |
| `/mobile` | `ios`, `android` | `local-jsx` | `COMMANDS` 直接包含 `mobile`; command object 声明 iOS/Android aliases。[E: commands.ts:289][E: commands/mobile/index.ts:4][E: commands/mobile/index.ts:5][E: commands/mobile/index.ts:6] | 无显式参数;用户在 UI 中 tab/left/right 切换平台。[E: commands/mobile/mobile.tsx:101][E: commands/mobile/mobile.tsx:103] | 为 App Store 与 Play Store URL 生成 terminal QR code,并在同一 pane 里展示当前平台 URL。[E: commands/mobile/mobile.tsx:18][E: commands/mobile/mobile.tsx:21][E: commands/mobile/mobile.tsx:50][E: commands/mobile/mobile.tsx:53][E: commands/mobile/mobile.tsx:227] |
| `/chrome` | - | `local-jsx` | `COMMANDS` 直接包含 `chrome`; availability 是 `claude-ai`,且非 non-interactive session 才启用。[E: commands.ts:264][E: commands/chrome/index.ts:5][E: commands/chrome/index.ts:7][E: commands/chrome/index.ts:8][E: commands/chrome/index.ts:9] | 无显式参数; UI 菜单提供 install/reconnect/manage-permissions/toggle-default actions。[E: commands/chrome/chrome.tsx:17][E: commands/chrome/chrome.tsx:73] | 检测 Chrome extension、claude.ai subscriber 与 WSL 状态,提供安装、重连、管理权限和默认启用切换入口。[E: commands/chrome/chrome.tsx:79][E: commands/chrome/chrome.tsx:91][E: commands/chrome/chrome.tsx:97][E: commands/chrome/chrome.tsx:103][E: commands/chrome/chrome.tsx:189][E: commands/chrome/chrome.tsx:279][E: commands/chrome/chrome.tsx:281][E: commands/chrome/chrome.tsx:282] |

## 复杂命令深挖

### `/copy`

`/copy` 的 data path 先用 `collectRecentAssistantTexts()` 从尾部向前找 assistant text,跳过 API error 与 tool-only turn。[E: commands/copy/copy.tsx:47][E: commands/copy/copy.tsx:50][E: commands/copy/copy.tsx:52][E: commands/copy/copy.tsx:54][E: commands/copy/copy.tsx:57][E: commands/copy/copy.tsx:58] 如果 assistant text 有 code block,`CopyPicker` 可选择 full response、某个 code block 或保存“always copy full response”偏好;快捷键 `w` 会只写文件而不走 clipboard。[E: commands/copy/copy.tsx:155][E: commands/copy/copy.tsx:190][E: commands/copy/copy.tsx:192][E: commands/copy/copy.tsx:199][E: commands/copy/copy.tsx:232][E: commands/copy/copy.tsx:239][E: commands/copy/copy.tsx:240][E: commands/copy/copy.tsx:242]

### `/context`

`/context` 是同名双 command object:interactive object 渲染 `ContextVisualization`,non-interactive object 输出 markdown table。[E: commands/context/index.ts:4][E: commands/context/index.ts:12][E: commands/context/context.tsx:60][E: commands/context/context-noninteractive.ts:86] 两个实现都把 messages 先裁到 compact boundary,在 `CONTEXT_COLLAPSE` feature gate 下套 `projectView`,再执行 `microcompactMessages()` 和 `analyzeContextUsage()`。[E: commands/context/context.tsx:19][E: commands/context/context.tsx:20][E: commands/context/context.tsx:26][E: commands/context/context.tsx:44][E: commands/context/context.tsx:52][E: commands/context/context-noninteractive.ts:49][E: commands/context/context-noninteractive.ts:50][E: commands/context/context-noninteractive.ts:55][E: commands/context/context-noninteractive.ts:58][E: commands/context/context-noninteractive.ts:61]

### `/chrome`

`/chrome` 的 UI 不直接操作浏览器页面,而是管理 Claude in Chrome extension 的连接和配置入口。菜单 action 会打开 install、reconnect、permissions URL,或者写入 `claudeInChromeDefaultEnabled` 到 global config。[E: commands/chrome/chrome.tsx:79][E: commands/chrome/chrome.tsx:91][E: commands/chrome/chrome.tsx:97][E: commands/chrome/chrome.tsx:103][E: commands/chrome/chrome.tsx:105] `call()` 进入 UI 前先检查 extension installed、global config、subscriber 和 WSL 状态,这些 props 决定菜单是否 disabled 和展示哪些提示。[E: commands/chrome/chrome.tsx:279][E: commands/chrome/chrome.tsx:280][E: commands/chrome/chrome.tsx:281][E: commands/chrome/chrome.tsx:282][E: commands/chrome/chrome.tsx:283]

## Sources

- `commands.ts`
- `commands/copy/index.ts`
- `commands/copy/copy.tsx`
- `commands/export/index.ts`
- `commands/export/export.tsx`
- `commands/files/index.ts`
- `commands/files/files.ts`
- `commands/context/index.ts`
- `commands/context/context.tsx`
- `commands/context/context-noninteractive.ts`
- `commands/desktop/index.ts`
- `commands/desktop/desktop.tsx`
- `commands/mobile/index.ts`
- `commands/mobile/mobile.tsx`
- `commands/chrome/index.ts`
- `commands/chrome/chrome.tsx`

## 相关

- [命令系统机制](../../subsystems/command-system.md)
