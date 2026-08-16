---
id: subsys.core.code-mode-runtime
title: Code Mode runtime 与 remote host
kind: subsystem
tier: T2
source: [codex-rs/app-server/src/lib.rs, codex-rs/core/src/thread_manager.rs, codex-rs/core/src/tools/code_mode/execute_handler.rs, codex-rs/core/src/tools/code_mode/wait_handler.rs, codex-rs/code-mode/src/lib.rs, codex-rs/code-mode/src/remote_session.rs, codex-rs/code-mode-runtime/src/lib.rs, codex-rs/code-mode-runtime/src/service.rs, codex-rs/code-mode-host/src/lib.rs, codex-rs/code-mode-host/src/transport.rs, codex-rs/code-mode-host/src/grpc_transport.rs, codex-rs/code-mode-host/src/grpc/mod.rs, codex-rs/code-mode-host/src/grpc/session.rs, codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto, codex-rs/analytics/src/facts.rs, codex-rs/analytics/src/reducer.rs]
symbols: [CodeModeSessionProvider, DisabledCodeModeSessionProvider, ProcessOwnedCodeModeSessionProvider, WebSocketCodeModeSessionProvider, GrpcCodeModeSessionProvider, GrpcCodeModeHost, InProcessCodeModeSession]
related: [tool.code-mode-exec, tool.code-mode-wait, subsys.app-server.transport, subsys.platform.analytics, ref.feature-flags]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> 本地 V8 runtime 已从 `code-mode` 拆到独立 `code-mode-runtime` crate；`code-mode` 现在只公开 protocol 与 disabled/process-owned/WebSocket/gRPC session providers。core 本身不会回退到同进程 V8：启用 host 路径时用 process-owned provider，否则使用 disabled provider。[E: codex-rs/code-mode/src/lib.rs:1][E: codex-rs/code-mode/src/lib.rs:4][E: codex-rs/code-mode/src/lib.rs:5][E: codex-rs/code-mode-runtime/src/lib.rs:1][E: codex-rs/code-mode-runtime/src/lib.rs:10][E: codex-rs/core/src/thread_manager.rs:452][E: codex-rs/core/src/thread_manager.rs:458]

## Crate 边界

| crate | 当前职责 |
|---|---|
| `code-mode-protocol` | cell/session/host wire types、runtime contract，以及 `codex.code_mode.v1` gRPC proto。[E: codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto:3][E: codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto:8] |
| `code-mode-runtime` | `cell_actor`、session runtime、V8 初始化与 `InProcessCodeModeSession`。[E: codex-rs/code-mode-runtime/src/lib.rs:1][E: codex-rs/code-mode-runtime/src/lib.rs:10] |
| `code-mode-host` | 把 in-process runtime 封装为独立 stdio/WebSocket/gRPC host，并施加 in-flight request 与 active-cell 上限。[E: codex-rs/code-mode-host/src/lib.rs:57][E: codex-rs/code-mode-host/src/lib.rs:58][E: codex-rs/code-mode-host/src/lib.rs:94][E: codex-rs/code-mode-host/src/transport.rs:205] |
| `code-mode` | 远程 session/provider、连接复用与 host process ownership；不再包含 V8 service implementation。[E: codex-rs/code-mode/src/lib.rs:1][E: codex-rs/code-mode/src/lib.rs:4] |
| core handlers | 构造 execute/wait/terminate request、关联 rollout/analytics，并把 runtime response 转为模型输出。 |

## Provider 选择

默认 `ThreadManager` 仅在 `Feature::CodeModeHost` 启用或 legacy `disable_in_process_fallback` 为 true 时选择 `ProcessOwnedCodeModeSessionProvider`；否则显式安装 `DisabledCodeModeSessionProvider`。变量名保留兼容语义，但当前分支没有 core 内的 in-process fallback。[E: codex-rs/core/src/thread_manager.rs:452][E: codex-rs/core/src/thread_manager.rs:454][E: codex-rs/core/src/thread_manager.rs:456][E: codex-rs/core/src/thread_manager.rs:458]

app-server 按 `CodeModeHostTransport` 选择远程 provider：`WebSocket` 构造 `WebSocketCodeModeSessionProvider`，`Grpc` 构造 `GrpcCodeModeSessionProvider`。两种远程 transport 都要求 `Feature::CodeModeHost`。[E: codex-rs/app-server/src/lib.rs:547][E: codex-rs/app-server/src/lib.rs:550][E: codex-rs/app-server/src/lib.rs:558][E: codex-rs/app-server/src/lib.rs:564][E: codex-rs/app-server/src/lib.rs:572]

process-owned provider 会定位/启动 `codex-code-mode-host`；host 内部才创建 `InProcessCodeModeSession`。因此“本地 code mode”仍是独立 host process，而不是 core 进程内 V8。[E: codex-rs/code-mode/src/remote_session.rs:65][E: codex-rs/code-mode/src/remote_session.rs:74][E: codex-rs/code-mode-host/src/lib.rs:30]

## Cell 生命周期

`exec` handler 解析 JavaScript、收集 nested tool definitions，向 session provider 发送 `ExecuteRequest`。收到 cell id 后，它记录 `CellStarted` fact、注册 tool-call/cell 关系、开启 rollout trace，并在等待 initial response 前标记 cell ready for dispatch。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:42][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:69][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:83][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:97][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:106]

首个 response 若不是 `Yielded`，handler 立即记录 terminal trace、finish dispatch 并发送 `CellClosed`；yielded cell 则由后续 `wait`/terminate 完成同一生命周期。[E: codex-rs/core/src/tools/code_mode/execute_handler.rs:117][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:122][E: codex-rs/core/src/tools/code_mode/execute_handler.rs:126]

nested tool dispatch 会拒绝 `exec` 自调用。[E: codex-rs/core/src/tools/code_mode/mod.rs:340][E: codex-rs/core/src/tools/code_mode/mod.rs:342]

## Host transport

host 现在有三种 listen URL：`stdio`/`stdio://`、`ws://IP:PORT`、`grpc://IP:PORT`。[E: codex-rs/code-mode-host/src/transport.rs:64][E: codex-rs/code-mode-host/src/transport.rs:67][E: codex-rs/code-mode-host/src/transport.rs:205][E: codex-rs/code-mode-host/src/transport.rs:214][E: codex-rs/code-mode-host/src/transport.rs:227][E: codex-rs/code-mode-host/src/transport.rs:237]

WebSocket listener 暴露 `/readyz`，只接受 binary framed messages，并限制 frame/message size。带 `Origin` header 的请求被拒绝；这些是 transport hardening，不等价于应用层身份认证。[E: codex-rs/code-mode-host/src/transport.rs:156][E: codex-rs/code-mode-host/src/transport.rs:161][E: codex-rs/code-mode-host/src/transport.rs:273][E: codex-rs/code-mode-host/src/transport.rs:274][E: codex-rs/code-mode-host/src/transport.rs:284]

gRPC listener 把 `CodeModeHost` proto service 挂到 tonic/axum router，并额外暴露 HTTP `/healthz`。除 `/healthz` 外，非 HTTP/2 请求会被拒绝。[E: codex-rs/code-mode-host/src/grpc_transport.rs:36][E: codex-rs/code-mode-host/src/grpc_transport.rs:41][E: codex-rs/code-mode-host/src/grpc_transport.rs:44][E: codex-rs/code-mode-host/src/grpc_transport.rs:45]

proto `CodeModeHost` 用独立 HTTP/2 stream 拆开 session event、tool subscription、execute 和 tool completion，避免大 payload 阻塞控制面。[E: codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto:8][E: codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto:11][E: codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto:17][E: codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto:22][E: codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto:29]

## Session / description 上限

framed host 的 `open_session` 只拒绝重复 session id、shutdown 中的 host 和已复用过的 session id；它不再按并发 open-session 数或 tool-description 大小拒绝请求。[E: codex-rs/code-mode-host/src/lib.rs:567][E: codex-rs/code-mode-host/src/lib.rs:573][E: codex-rs/code-mode-host/src/lib.rs:578][E: codex-rs/code-mode-host/src/lib.rs:587]

gRPC `open_session` 同样不设 open-session 数量上限：每次请求生成新 UUID 并插入 session map。仍保留的是 request/active-cell/control/delegate semaphore，而不是 session 或 description 配额。[E: codex-rs/code-mode-host/src/grpc/session.rs:105][E: codex-rs/code-mode-host/src/grpc/session.rs:109][E: codex-rs/code-mode-host/src/grpc/session.rs:128][E: codex-rs/code-mode-host/src/grpc/session.rs:100][E: codex-rs/code-mode-host/src/lib.rs:57][E: codex-rs/code-mode-host/src/lib.rs:58]

## Analytics 归并

analytics 接收 `CellStarted`、`ChildStarted`、`CellClosed`、`SamplingResponseCompleted` 和 terminal `Completed` facts。[E: codex-rs/analytics/src/facts.rs:65][E: codex-rs/analytics/src/facts.rs:72][E: codex-rs/analytics/src/facts.rs:78][E: codex-rs/analytics/src/facts.rs:83][E: codex-rs/analytics/src/facts.rs:89]

## Sources

- `codex-rs/app-server/src/lib.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/core/src/tools/code_mode/execute_handler.rs`
- `codex-rs/core/src/tools/code_mode/wait_handler.rs`
- `codex-rs/code-mode/src/lib.rs`
- `codex-rs/code-mode/src/remote_session.rs`
- `codex-rs/code-mode-runtime/src/lib.rs`
- `codex-rs/code-mode-runtime/src/service.rs`
- `codex-rs/code-mode-host/src/lib.rs`
- `codex-rs/code-mode-host/src/transport.rs`
- `codex-rs/code-mode-host/src/grpc_transport.rs`
- `codex-rs/code-mode-host/src/grpc/mod.rs`
- `codex-rs/code-mode-host/src/grpc/session.rs`
- `codex-rs/code-mode-protocol/src/grpc/codex.code_mode.v1.proto`
- `codex-rs/analytics/src/facts.rs`
- `codex-rs/analytics/src/reducer.rs`

## 相关

- [exec code-mode 工具](../../surface/tools/code-mode-exec.md)
- [wait code-mode 工具](../../surface/tools/code-mode-wait.md)
- [Analytics](../platform/analytics.md)
