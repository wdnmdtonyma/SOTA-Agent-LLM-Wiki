---
id: subsys.core.code-mode-runtime
title: Code Mode runtime 与 remote host
kind: subsystem
tier: T2
source: [codex-rs/app-server/src/code_mode_host.rs, codex-rs/app-server/src/lib.rs, codex-rs/code-mode/src/remote_session.rs, codex-rs/code-mode/src/remote_session/connection.rs, codex-rs/code-mode/src/remote_session/connection/transport.rs, codex-rs/code-mode-host/src/transport.rs, codex-rs/code-mode-protocol/src/host/mod.rs]
symbols: [AppServerCodeModeHostArgs, CodeModeHostTransport, WebSocketCodeModeSessionProvider, OwnedCodeModeHost, ProcessOwnedCodeModeSession, Connection, run_transport]
related: [tool.code-mode-exec, tool.code-mode-wait, subsys.app-server.transport, subsys.providers.http-client, ref.feature-flags]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Code Mode 的 session provider 可以拥有本地 `codex-code-mode-host` 进程，也可以由 app-server 通过 WebSocket 连接远端 host。两种 transport 共享同一套 framed host protocol 与逻辑 session 状态机。

## 选择 host

app-server 新增进程级 `--code-mode-host WS_URL`。未指定时 `CodeModeHostTransport::Local` 是默认值；指定后 URL 必须是带 host 的 `ws://` 或 `wss://`，且不能含 fragment。[E: codex-rs/app-server/src/code_mode_host.rs:5][E: codex-rs/app-server/src/code_mode_host.rs:23][E: codex-rs/app-server/src/code_mode_host.rs:26][E: codex-rs/app-server/src/code_mode_host.rs:43]

app-server 只有在 `Feature::CodeModeHost` 启用时才接受 WebSocket transport，并把当前配置的 `HttpClientFactory` 交给 remote provider；local 模式仍不注入 provider。[E: codex-rs/app-server/src/lib.rs:545][E: codex-rs/app-server/src/lib.rs:563]

## 连接与 session

`WebSocketCodeModeSessionProvider` 为整个 app-server 共享一个 `OwnedCodeModeHost`。host 用 semaphore 串行化建连、缓存仍存活的 connection，并给逻辑 session 分配递增 id；断线后下一次访问会建立新 connection。[E: codex-rs/code-mode/src/remote_session.rs:118][E: codex-rs/code-mode/src/remote_session.rs:145][E: codex-rs/code-mode/src/remote_session.rs:166][E: codex-rs/code-mode/src/remote_session.rs:170][E: codex-rs/code-mode/src/remote_session.rs:195][E: codex-rs/code-mode/src/remote_session.rs:234]

每个 `ProcessOwnedCodeModeSession` 维护 `New → Opening → Open → Closing/Closed` 状态；`execute`、`wait`、`terminate` 都先取得当前 binding，再在同一 remote session 上发送请求。已打开但 connection 死亡时，状态回到 `New` 并用新 generation 重建逻辑 session。[E: codex-rs/code-mode/src/remote_session.rs:239][E: codex-rs/code-mode/src/remote_session.rs:268][E: codex-rs/code-mode/src/remote_session.rs:314][E: codex-rs/code-mode/src/remote_session.rs:318][E: codex-rs/code-mode/src/remote_session.rs:350]

## WebSocket host transport

独立 host 默认 transport 仍是 stdio；`--listen ws://IP:PORT` 启动 listener，并暴露 `/readyz`。listener 只接受 `ws://` 的 socket address，而 app-server client 可配置 `ws://` 或 `wss://`，因此 TLS 终止需要位于 host 之外或由上层部署提供。[E: codex-rs/code-mode-host/src/transport.rs:43][E: codex-rs/code-mode-host/src/transport.rs:43][E: codex-rs/code-mode-host/src/transport.rs:133][E: codex-rs/code-mode-host/src/transport.rs:155][E: codex-rs/code-mode-host/src/transport.rs:175][E: codex-rs/code-mode-host/src/transport.rs:189][I]

WebSocket 只接受二进制 framed message；text frame 被视为无效数据。所有带 `Origin` header 的请求会被 403 拒绝，frame/message size 也被限制到 host frame 上限加长度前缀；这些是 transport hardening，不构成完整的远端身份认证。[E: codex-rs/code-mode-host/src/transport.rs:45][E: codex-rs/code-mode-host/src/transport.rs:79][E: codex-rs/code-mode-host/src/transport.rs:97][E: codex-rs/code-mode-host/src/transport.rs:192][E: codex-rs/code-mode-host/src/transport.rs:204][E: codex-rs/code-mode-host/src/transport.rs:213][E: codex-rs/code-mode-host/src/transport.rs:215][I]

## 边界与不确定性

- `--code-mode-host` 是 app-server 进程参数，不是 thread RPC 字段；同一进程创建的 Code Mode sessions 共享 endpoint 与底层连接。[E: codex-rs/app-server/src/code_mode_host.rs:5][E: codex-rs/code-mode/src/remote_session.rs:118][I]
- `Origin` 拒绝和 frame-size 限制只证明 transport hardening；源码没有在该 listener 上声明 bearer/token handshake。[U]
- listener 端仅解析 `ws://IP:PORT`，client 端接受 `wss://host`，部署时的 TLS/网络边界由外部组件决定。[U]

## Sources

- `codex-rs/app-server/src/code_mode_host.rs`
- `codex-rs/app-server/src/lib.rs`
- `codex-rs/code-mode/src/remote_session.rs`
- `codex-rs/code-mode/src/remote_session/connection.rs`
- `codex-rs/code-mode/src/remote_session/connection/transport.rs`
- `codex-rs/code-mode-host/src/transport.rs`
- `codex-rs/code-mode-protocol/src/host/mod.rs`

## 相关

- [exec code-mode 工具](../../surface/tools/code-mode-exec.md)
- [wait code-mode 工具](../../surface/tools/code-mode-wait.md)
- [app-server transport](../app-server/transport.md)
- [Provider HTTP client](../providers/http-client.md)
