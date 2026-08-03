---
id: subsys.core.code-mode-runtime
title: Code Mode runtime 与 remote host
kind: subsystem
tier: T2
source: [codex-rs/app-server/src/lib.rs, codex-rs/app-server/src/message_processor.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/tools/code_mode/execute_handler.rs, codex-rs/core/src/tools/code_mode/wait_handler.rs, codex-rs/code-mode/src/lib.rs, codex-rs/code-mode/src/remote_session.rs, codex-rs/code-mode-runtime/src/lib.rs, codex-rs/code-mode-runtime/src/service.rs, codex-rs/code-mode-host/src/lib.rs, codex-rs/code-mode-host/src/transport.rs, codex-rs/analytics/src/facts.rs, codex-rs/analytics/src/reducer.rs]
symbols: [CodeModeSessionProvider, DisabledCodeModeSessionProvider, ProcessOwnedCodeModeSessionProvider, WebSocketCodeModeSessionProvider, InProcessCodeModeSession]
related: [tool.code-mode-exec, tool.code-mode-wait, subsys.app-server.transport, subsys.platform.analytics, ref.feature-flags]
evidence: explicit
status: verified
updated: 7750465934
---

> 本地 V8 runtime 已从 `code-mode` 拆到独立 `code-mode-runtime` crate；`code-mode` 现在只公开 protocol 与 disabled/process-owned/WebSocket session providers。core 本身不会回退到同进程 V8：启用 host 路径时用 process-owned provider，否则使用 disabled provider。[E: codex-rs/code-mode/src/lib.rs:1][E: codex-rs/code-mode/src/lib.rs:7][E: codex-rs/code-mode-runtime/src/lib.rs:1][E: codex-rs/code-mode-runtime/src/lib.rs:10][E: codex-rs/core/src/thread_manager.rs:379][E: codex-rs/core/src/thread_manager.rs:385]

## Crate 边界

| crate | 当前职责 |
|---|---|
| `code-mode-protocol` | cell/session/host wire types 与 runtime contract。 |
| `code-mode-runtime` | `cell_actor`、session runtime、V8 初始化与 `InProcessCodeModeSession`。[E: codex-rs/code-mode-runtime/src/lib.rs:1][E: codex-rs/code-mode-runtime/src/lib.rs:12] |
| `code-mode-host` | 把 in-process runtime 封装为独立 stdio/WebSocket host，并施加请求与 active-cell 上限。[E: codex-rs/code-mode-host/src/lib.rs:25][E: codex-rs/code-mode-host/src/lib.rs:44][E: codex-rs/code-mode-host/src/lib.rs:58][E: codex-rs/code-mode-host/src/lib.rs:65] |
| `code-mode` | 远程 session/provider、连接复用与 host process ownership；不再包含 V8 service implementation。[E: codex-rs/code-mode/src/lib.rs:1][E: codex-rs/code-mode/src/lib.rs:4] |
| core handlers | 构造 execute/wait/terminate request、关联 rollout/analytics，并把 runtime response 转为模型输出。 |

## Provider 选择

默认 `ThreadManager` 仅在 `Feature::CodeModeHost` 启用或 legacy `disable_in_process_fallback` 为 true 时选择 `ProcessOwnedCodeModeSessionProvider`；否则显式安装 `DisabledCodeModeSessionProvider`。变量名保留兼容语义，但当前分支没有 core 内的 in-process fallback。[E: codex-rs/core/src/thread_manager.rs:379][E: codex-rs/core/src/thread_manager.rs:381][E: codex-rs/core/src/thread_manager.rs:383][E: codex-rs/core/src/thread_manager.rs:385]

app-server 在 WebSocket transport 下构造 `WebSocketCodeModeSessionProvider`，并把该进程级 provider 注入 `ThreadManager`。process-owned 与 WebSocket provider 都复用 `OwnedCodeModeHost` 的连接管理和逻辑 session state；失效连接会在下一次访问时重建。[E: codex-rs/app-server/src/lib.rs:546][E: codex-rs/app-server/src/lib.rs:549][E: codex-rs/app-server/src/lib.rs:556][E: codex-rs/app-server/src/lib.rs:557][E: codex-rs/app-server/src/message_processor.rs:301][E: codex-rs/app-server/src/message_processor.rs:302][E: codex-rs/code-mode/src/remote_session.rs:37][E: codex-rs/code-mode/src/remote_session.rs:47][E: codex-rs/code-mode/src/remote_session.rs:153][E: codex-rs/code-mode/src/remote_session.rs:205]

process-owned provider 会定位/启动 `codex-code-mode-host`；host 内部才创建 `InProcessCodeModeSession`。因此“本地 code mode”仍是独立 host process，而不是 core 进程内 V8。[E: codex-rs/code-mode/src/remote_session.rs:62][E: codex-rs/code-mode/src/remote_session.rs:80][E: codex-rs/code-mode-host/src/lib.rs:25]

## Cell 生命周期

`exec` handler 解析 JavaScript、收集 nested tool definitions，向 session provider 发送 `ExecuteRequest`。收到 cell id 后，它记录 `CellStarted` fact、注册 tool-call/cell 关系、开启 rollout trace，并在等待 initial response 前标记 cell ready for dispatch。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:38][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:42][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:44][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:57][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:62][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:85][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:89]

首个 response 若不是 `Yielded`，handler 立即记录 terminal trace、finish dispatch 并发送 `CellClosed`；yielded cell 则由后续 `wait`/terminate 完成同一生命周期。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:96][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:101][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:105]

nested tool dispatch 会发 `ChildStarted`，使 analytics 能把 cell 内子调用与外层 code-mode call 关联。[E: codex-rs/core/src/tools/code_mode/mod.rs:341][E: codex-rs/core/src/tools/code_mode/mod.rs:350]

## Analytics 归并

analytics 接收 `CellStarted`、`ChildStarted`、`CellClosed`、`SamplingResponseCompleted` 和 terminal `Completed` facts；状态区分 completed、failed、interrupted。[E: codex-rs/analytics/src/facts.rs:49][E: codex-rs/analytics/src/facts.rs:73][E: codex-rs/analytics/src/facts.rs:85][E: codex-rs/analytics/src/facts.rs:89]

reducer 同时维护 tool-response state 与 code-mode cell state，用 cell/child/response mappings 把一次 cell 中跨多次 sampling 的工具调用归并为完成事件；缺少关联时会缓冲，后续 response 到达再 flush。[E: codex-rs/analytics/src/reducer.rs:162][E: codex-rs/analytics/src/reducer.rs:163][E: codex-rs/analytics/src/reducer.rs:636][E: codex-rs/analytics/src/reducer.rs:677][E: codex-rs/analytics/src/reducer.rs:708][E: codex-rs/analytics/src/reducer.rs:831][E: codex-rs/analytics/src/reducer.rs:870]

## Host transport

host 支持 stdio 与 WebSocket transport；WebSocket listener 暴露 `/readyz`，只接受 binary framed messages，并限制 frame/message size。带 `Origin` header 的请求被拒绝；这些是 transport hardening，不等价于应用层身份认证。[E: codex-rs/code-mode-host/src/transport.rs:133][E: codex-rs/code-mode-host/src/transport.rs:155][E: codex-rs/code-mode-host/src/transport.rs:189][E: codex-rs/code-mode-host/src/transport.rs:204][E: codex-rs/code-mode-host/src/transport.rs:213]

## Sources

- `codex-rs/app-server/src/lib.rs`
- `codex-rs/app-server/src/message_processor.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/core/src/tools/code_mode/execute_handler.rs`
- `codex-rs/code-mode/src/remote_session.rs`
- `codex-rs/code-mode-runtime/src/lib.rs`
- `codex-rs/code-mode-runtime/src/service.rs`
- `codex-rs/code-mode-host/src/lib.rs`
- `codex-rs/analytics/src/facts.rs`
- `codex-rs/analytics/src/reducer.rs`

## 相关

- [exec code-mode 工具](../../surface/tools/code-mode-exec.md)
- [wait code-mode 工具](../../surface/tools/code-mode-wait.md)
- [Analytics](../platform/analytics.md)
