---
id: subsys.lsp
path: subsystems/lsp.md
title: LSP 集成
kind: subsystem
tier: T2
status: verified
source: [services/lsp/]
symbols: [getAllLspServers, initializeLspServerManager, createLSPServerManager, createLSPServerInstance, createLSPClient, registerLSPNotificationHandlers, registerPendingLSPDiagnostic, checkForLSPDiagnostics]
related: [tool.lsp]
updated: 2026-06-14
evidence: explicit
---

LSP 集成只从 enabled plugins 加载 language server 配置, 启动时创建一个进程内 manager, 按文件扩展 lazy-start 对应 server, 并把 publishDiagnostics 异步转换为 Claude attachment diagnostics。[E: services/lsp/config.ts:15][E: services/lsp/manager.ts:145][E: services/lsp/LSPServerManager.ts:215][E: services/lsp/passiveFeedback.ts:125]

## 能回答的问题

- LSP server 配置从哪里来, 如何作用到文件扩展?
- manager、server instance、JSON-RPC client 三层分别负责什么?
- didOpen/didChange/didSave/didClose 如何同步文件?
- passive diagnostics 如何进入附件系统?

## 职责边界

LSP 子系统负责 plugin LSP 配置、server process、JSON-RPC 通信和 diagnostics delivery; 当前运行时入口从 enabled plugins 加载 LSP config, server process 由 config.command/args spawn, 因此没有插件配置就没有可启动的 LSP server。[E: services/lsp/config.ts:22][E: services/lsp/config.ts:27][E: services/lsp/LSPClient.ts:98][I] Plugin manifest 到 LSP config 的解析在 `utils/plugins/lspPluginIntegration.ts`, 但运行时 manager 位于 `services/lsp/`。[E: utils/plugins/lspPluginIntegration.ts:57][E: services/lsp/LSPServerManager.ts:59]

## 关键文件

- `services/lsp/config.ts`: 从 `loadAllPluginsCacheOnly` 取 enabled plugins, 并行获取 plugin LSP servers, 合并 scoped configs。[E: services/lsp/config.ts:22][E: services/lsp/config.ts:27][E: services/lsp/config.ts:45]
- `services/lsp/manager.ts`: 管理 singleton instance、初始化状态、reinitialize 和 shutdown。[E: services/lsp/manager.ts:63][E: services/lsp/manager.ts:145][E: services/lsp/manager.ts:226][E: services/lsp/manager.ts:267]
- `services/lsp/LSPServerManager.ts`: 维护 server map、extension map、opened files, 并对外提供 request/notification/file sync API。[E: services/lsp/LSPServerManager.ts:59][E: services/lsp/LSPServerManager.ts:89][E: services/lsp/LSPServerManager.ts:244][E: services/lsp/LSPServerManager.ts:270]
- `services/lsp/LSPServerInstance.ts`: 管理单个 server 的 start/stop/restart/health/request/notification。[E: services/lsp/LSPServerInstance.ts:33][E: services/lsp/LSPServerInstance.ts:135][E: services/lsp/LSPServerInstance.ts:274][E: services/lsp/LSPServerInstance.ts:355]
- `services/lsp/LSPClient.ts`: spawn stdio server process, 建立 JSON-RPC connection, initialize, send request/notification, queue handler, stop cleanup。[E: services/lsp/LSPClient.ts:88][E: services/lsp/LSPClient.ts:181][E: services/lsp/LSPClient.ts:256][E: services/lsp/LSPClient.ts:373]
- `services/lsp/passiveFeedback.ts` 与 `LSPDiagnosticRegistry.ts`: 注册 diagnostics notification handler, 存储、去重、排序、截断并交付 diagnostics。[E: services/lsp/passiveFeedback.ts:161][E: services/lsp/LSPDiagnosticRegistry.ts:65][E: services/lsp/LSPDiagnosticRegistry.ts:193]

## 数据模型 / 状态

`LSPServerManager` 接口暴露 initialize/shutdown、按文件取 server、ensure start、send request、file open/change/save/close 和 open 状态检查。[E: services/lsp/LSPServerManager.ts:16] manager 的闭包状态包含 `servers`、`extensionMap` 和 `openedFiles`; extension map 由每个 server config 的 `extensionToLanguage` 派生。[E: services/lsp/LSPServerManager.ts:59][E: services/lsp/LSPServerManager.ts:107]

`LSPServerInstance` 跟踪 name、config、state、startTime、lastError、restartCount, 并在 client crash callback 中把 state 改成 `error`、记录 lastError、递增 crashRecoveryCount。[E: services/lsp/LSPServerInstance.ts:33][E: services/lsp/LSPServerInstance.ts:113][E: services/lsp/LSPServerInstance.ts:121] start 时构造 InitializeParams, 声明 diagnostics、hover、definition、references、documentSymbol、callHierarchy 等能力, 并在初始化成功后把 state 设为 running。[E: services/lsp/LSPServerInstance.ts:167][E: services/lsp/LSPServerInstance.ts:198][E: services/lsp/LSPServerInstance.ts:250]

## 控制流

`initializeLspServerManager` 在 bare mode 直接返回, 已初始化或初始化中会跳过; 否则创建 manager、标记 pending, 后台调用 initialize, 成功后注册 passive diagnostics handlers, 失败则清空 instance。[E: services/lsp/manager.ts:145][E: services/lsp/manager.ts:154][E: services/lsp/manager.ts:168][E: services/lsp/manager.ts:180][E: services/lsp/manager.ts:189][E: services/lsp/manager.ts:197] `reinitializeLspServerManager` 只在已经启动过时工作, 会 best-effort shutdown 旧 instance, 重置状态, 再调用 initialize。[E: services/lsp/manager.ts:226][E: services/lsp/manager.ts:238][E: services/lsp/manager.ts:248][E: services/lsp/manager.ts:252]

Manager initialize 先调用 `getAllLspServers`, 对每个 config 校验 command 和 extensionToLanguage, 创建 server instance, 并注册 `workspace/configuration` request handler 返回 null config。[E: services/lsp/LSPServerManager.ts:75][E: services/lsp/LSPServerManager.ts:92][E: services/lsp/LSPServerManager.ts:98][E: services/lsp/LSPServerManager.ts:120][E: services/lsp/LSPServerManager.ts:125] `getServerForFile` 用文件扩展查 extensionMap 并返回第一个 server; `ensureServerStarted` 只在 stopped/error 时调用 start。[E: services/lsp/LSPServerManager.ts:192][E: services/lsp/LSPServerManager.ts:201][E: services/lsp/LSPServerManager.ts:215][E: services/lsp/LSPServerManager.ts:221]

File sync 中, `openFile` 会 lazy start server、计算 file URI 和 languageId, 发送 `textDocument/didOpen` 并记录 openedFiles; `changeFile` 在 server 未运行或文件未打开时退化为 open, 否则发送 `didChange`; save/close 分别发送 `didSave`/`didClose`。[E: services/lsp/LSPServerManager.ts:270][E: services/lsp/LSPServerManager.ts:274][E: services/lsp/LSPServerManager.ts:286][E: services/lsp/LSPServerManager.ts:289][E: services/lsp/LSPServerManager.ts:312][E: services/lsp/LSPServerManager.ts:349][E: services/lsp/LSPServerManager.ts:377]

`LSPClient.start` spawn server command/args, 用 process stdio 建立 `StreamMessageReader/Writer`, 创建 JSON-RPC connection, 注册 error/close handlers, listen, 再应用 queued notification/request handlers。[E: services/lsp/LSPClient.ts:98][E: services/lsp/LSPClient.ts:181][E: services/lsp/LSPClient.ts:187][E: services/lsp/LSPClient.ts:210][E: services/lsp/LSPClient.ts:229][E: services/lsp/LSPClient.ts:238] initialize 发送 `initialize`, 保存 capabilities, 再发 `initialized` notification。[E: services/lsp/LSPClient.ts:264][E: services/lsp/LSPClient.ts:269][E: services/lsp/LSPClient.ts:272]

Diagnostics handler 注册在所有 server 上的 `textDocument/publishDiagnostics`; handler 校验 params、转换 URI 和 severity、跳过空 diagnostics, 然后调用 registry。[E: services/lsp/passiveFeedback.ts:139][E: services/lsp/passiveFeedback.ts:161][E: services/lsp/passiveFeedback.ts:169][E: services/lsp/passiveFeedback.ts:191][E: services/lsp/passiveFeedback.ts:195][E: services/lsp/passiveFeedback.ts:210] Registry 会收集未发送 diagnostics、去重、标记并删除 pending、按 severity 排序、按 per-file 和 total cap 截断, 最后返回一个合并 result。[E: services/lsp/LSPDiagnosticRegistry.ts:202][E: services/lsp/LSPDiagnosticRegistry.ts:219][E: services/lsp/LSPDiagnosticRegistry.ts:232][E: services/lsp/LSPDiagnosticRegistry.ts:257][E: services/lsp/LSPDiagnosticRegistry.ts:332]

## 设计动机与权衡

- LSP 配置只从 enabled plugins 进入; 这把 core 与具体语言服务器解耦, 代价是没有插件配置就不会产生 LSP server config。[E: services/lsp/config.ts:22][E: services/lsp/config.ts:27][I]
- Manager 初始化是后台异步, 让启动路径不被 LSP server 加载阻塞; 失败会记录状态并让 `getLspServerManager` 返回 undefined。[E: services/lsp/manager.ts:180][E: services/lsp/manager.ts:197][E: services/lsp/manager.ts:63][I]
- Diagnostics 走 pending registry 而不是在 notification handler 里同步发附件, 这是为了把 LSP 的异步通知转换为 turn-level 可交付附件。[E: services/lsp/passiveFeedback.ts:210][E: services/lsp/LSPDiagnosticRegistry.ts:193][I]

## Gotchas

- `sendNotification` 在 `LSPClient` 层捕获错误后只记录并继续, 但 `LSPServerInstance.sendNotification` 会在自身 catch 中重新抛错; 调试 notification 失败时要看两层日志。[E: services/lsp/LSPClient.ts:316][E: services/lsp/LSPClient.ts:323][E: services/lsp/LSPServerInstance.ts:416][E: services/lsp/LSPServerInstance.ts:430]
- `getServerForFile` 多 server 同扩展时取第一个注册 server, 没有优先级机制。[E: services/lsp/LSPServerManager.ts:192][E: services/lsp/LSPServerManager.ts:201]
- Server crash 会把 instance 置为 error, 下一次 `ensureServerStarted` 才会尝试 restart; 它不是独立 watchdog 自动重启。[E: services/lsp/LSPServerInstance.ts:121][E: services/lsp/LSPServerManager.ts:221][I]

## Sources

- `services/lsp/`

## 相关

- `tool.lsp`
