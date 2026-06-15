---
id: subsys.mcp.transports
title: MCP transports
kind: subsystem
tier: T2
source: [codex-rs/rmcp-client/src/stdio_server_launcher.rs, codex-rs/rmcp-client/src/executor_process_transport.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/rmcp-client/src/utils.rs, codex-rs/rmcp-client/src/elicitation_client_service.rs, codex-rs/codex-mcp/src/mcp_connection_manager.rs]
symbols: [StdioServerLauncher, LocalStdioServerLauncher, ExecutorStdioServerLauncher, ExecutorProcessTransport, RmcpClient, StreamableHttpResponseClient, ElicitationClientService]
related: [subsys.mcp.client, subsys.mcp.oauth, subsys.mcp.server]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> MCP transports 把 Codex MCP client 的两类连接落地：stdio server 可以在本地进程或 executor process API 中启动，streamable HTTP server 使用 HTTP/SSE response、session id、bearer/OAuth 和 session-expiry reinitialize。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:60][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:84][E: codex-rs/rmcp-client/src/rmcp_client.rs:131][E: codex-rs/rmcp-client/src/rmcp_client.rs:144][E: codex-rs/rmcp-client/src/rmcp_client.rs:184][E: codex-rs/rmcp-client/src/rmcp_client.rs:902][E: codex-rs/rmcp-client/src/rmcp_client.rs:1015]

## 能回答的问题

- 本地 stdio MCP server 和 remote executor stdio MCP server 的差异是什么？
- Streamable HTTP MCP client 怎样处理 Accept、session id、Authorization、OAuth？
- executor transport 如何把 stdout lines 还原成 JSON-RPC messages？
- elicitation request 为什么会暂停 active-time timeout？
- session expired 404 怎样触发 reinitialize？

## 职责边界

`rmcp-client` 是 transport/service adapter：负责 child process、executor process、HTTP/SSE、OAuth runtime、elicitation callback 和 `rmcp::service` 调用；server config 的选择逻辑由 `codex-mcp` 的 `make_rmcp_client` 决定。[E: codex-rs/rmcp-client/src/rmcp_client.rs:493][E: codex-rs/rmcp-client/src/rmcp_client.rs:504][E: codex-rs/rmcp-client/src/rmcp_client.rs:532][E: codex-rs/rmcp-client/src/rmcp_client.rs:568][E: codex-rs/rmcp-client/src/rmcp_client.rs:984][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1528][I]

## 关键 crate/文件

- `codex-rs/rmcp-client/src/stdio_server_launcher.rs`: stdio server launch abstraction、本地 child process、remote executor process launcher 和 env policy。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:60][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:159][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:300][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:421]
- `codex-rs/rmcp-client/src/executor_process_transport.rs`: executor stdout/stderr event stream 到 MCP JSON-RPC transport 的 adapter。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:51][E: codex-rs/rmcp-client/src/executor_process_transport.rs:128][E: codex-rs/rmcp-client/src/executor_process_transport.rs:167]
- `codex-rs/rmcp-client/src/rmcp_client.rs`: stdio/streamable HTTP client construction、initialize、service operations、session-expiry recovery、OAuth transport。[E: codex-rs/rmcp-client/src/rmcp_client.rs:493][E: codex-rs/rmcp-client/src/rmcp_client.rs:504][E: codex-rs/rmcp-client/src/rmcp_client.rs:532][E: codex-rs/rmcp-client/src/rmcp_client.rs:1015]
- `codex-rs/rmcp-client/src/utils.rs`: local/remote MCP environment construction 和 default HTTP headers。[E: codex-rs/rmcp-client/src/utils.rs:12][E: codex-rs/rmcp-client/src/utils.rs:27][E: codex-rs/rmcp-client/src/utils.rs:60]

## 数据模型

- `StdioServerCommand` 包含 program、args、env、env_vars、cwd；`StdioServerLauncher::launch` 只接收 `StdioServerCommand` 并返回 `StdioServerTransport` future。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:68][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:71][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:74][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:78]
- `StdioServerTransport` 有 `Local` 和 `Executor` 两个 variant，并在 `Transport` impl 中把 send/receive/close 委托给内部 transport。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:84][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:86][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:90][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:98][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:113][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:123][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:130]
- `ExecutorProcessTransport` 维护 executor process handle、event subscription、program name、stdout/stderr buffer、closed/terminated 状态和 last_seq。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:51][E: codex-rs/rmcp-client/src/executor_process_transport.rs:55][E: codex-rs/rmcp-client/src/executor_process_transport.rs:57][E: codex-rs/rmcp-client/src/executor_process_transport.rs:60][E: codex-rs/rmcp-client/src/executor_process_transport.rs:87][E: codex-rs/rmcp-client/src/executor_process_transport.rs:94]
- `RmcpClient` 的 state 在 `ClientState::Connecting` 和 `ClientState::Ready` 之间切换；`Ready` 保存 running service 和可选 OAuth persistor，initialize context 由 `RmcpClient.initialize_context` 单独保存。[E: codex-rs/rmcp-client/src/rmcp_client.rs:319][E: codex-rs/rmcp-client/src/rmcp_client.rs:322][E: codex-rs/rmcp-client/src/rmcp_client.rs:323][E: codex-rs/rmcp-client/src/rmcp_client.rs:325][E: codex-rs/rmcp-client/src/rmcp_client.rs:498][E: codex-rs/rmcp-client/src/rmcp_client.rs:594]
- `ElicitationPauseState` 用 active count 和 watch channel 记录 pending elicitation；`ElicitationClientService` 在发送 elicitation 前 enter pause state，`active_time_timeout` 订阅该 state 并在 elicitation pending 时暂停计时。[E: codex-rs/rmcp-client/src/rmcp_client.rs:351][E: codex-rs/rmcp-client/src/rmcp_client.rs:358][E: codex-rs/rmcp-client/src/elicitation_client_service.rs:57][E: codex-rs/rmcp-client/src/rmcp_client.rs:392][E: codex-rs/rmcp-client/src/rmcp_client.rs:1066]

## 控制流

1. 本地 stdio launcher 用 `create_env_for_mcp_server` 构建环境，解析 program，创建 kill-on-drop child process，stdin/stdout/stderr 均接管，Unix 下设置 process group。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:196][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:206][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:211][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:214][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:218][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:223]
2. Unix 下 `ProcessGroupGuard` drop 会先 terminate process group，等待 grace period，再 kill；非 Unix drop path 是 no-op。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:262][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:267][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:276][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:280][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:286]
3. executor stdio launcher 生成 env overlay、remote env var names、UTF-8 argv/env，创建 `ExecParams` 并使用 executor process API 启动进程。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:354][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:355][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:356][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:366]
4. remote env policy 在没有 remote vars 时使用 `inherit = Core`，有 remote vars 时使用 `inherit = All` 并把 default env vars 与 remote vars 放进 include_only。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:421][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:426][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:422][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:433][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:444]
5. executor transport 的 `send` 把 JSON-RPC message 序列化成 bytes 并追加 newline，然后调用 `process.write`；`receive` 从 stdout buffer 按 newline 取完整 message。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:128][E: codex-rs/rmcp-client/src/executor_process_transport.rs:136][E: codex-rs/rmcp-client/src/executor_process_transport.rs:138][E: codex-rs/rmcp-client/src/executor_process_transport.rs:167][E: codex-rs/rmcp-client/src/executor_process_transport.rs:291][E: codex-rs/rmcp-client/src/executor_process_transport.rs:303]
6. executor transport 遇到 lagged event 会调用 `process.read` 追赶；stdout/pty 会进入 stdout buffer，stderr 只作为 diagnostics log。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:203][E: codex-rs/rmcp-client/src/executor_process_transport.rs:208][E: codex-rs/rmcp-client/src/executor_process_transport.rs:235][E: codex-rs/rmcp-client/src/executor_process_transport.rs:274][E: codex-rs/rmcp-client/src/executor_process_transport.rs:280]
7. streamable HTTP `post_message` 设置 `Accept: text/event-stream, application/json`，添加 bearer/session headers，401 且带 `WWW-Authenticate` 会变成 `AuthRequired`，404 with session 会变成 `SessionExpired404`。[E: codex-rs/rmcp-client/src/rmcp_client.rs:128][E: codex-rs/rmcp-client/src/rmcp_client.rs:132][E: codex-rs/rmcp-client/src/rmcp_client.rs:144][E: codex-rs/rmcp-client/src/rmcp_client.rs:149]
8. `RmcpClient::initialize` 建立 `ElicitationClientService`，拿出 pending transport，调用 `serve_client`，保存 initialize context，进入 `ClientState::Ready`，并持久化 OAuth tokens。[E: codex-rs/rmcp-client/src/rmcp_client.rs:568][E: codex-rs/rmcp-client/src/rmcp_client.rs:576][E: codex-rs/rmcp-client/src/rmcp_client.rs:584][E: codex-rs/rmcp-client/src/rmcp_client.rs:594][E: codex-rs/rmcp-client/src/rmcp_client.rs:604][E: codex-rs/rmcp-client/src/rmcp_client.rs:610]
9. `call_tool` 要求 arguments 和 `_meta` 都是 JSON object，再构造 `CallToolRequestParams` 与 `PeerRequestOptions` 调用 service。[E: codex-rs/rmcp-client/src/rmcp_client.rs:728][E: codex-rs/rmcp-client/src/rmcp_client.rs:736][E: codex-rs/rmcp-client/src/rmcp_client.rs:752][E: codex-rs/rmcp-client/src/rmcp_client.rs:754][E: codex-rs/rmcp-client/src/rmcp_client.rs:773][E: codex-rs/rmcp-client/src/rmcp_client.rs:776]
10. `run_service_operation` 捕获 session-expired 404，调用 `reinitialize_after_session_expiry` 后重试一次同一 operation。[E: codex-rs/rmcp-client/src/rmcp_client.rs:1015][E: codex-rs/rmcp-client/src/rmcp_client.rs:1032][E: codex-rs/rmcp-client/src/rmcp_client.rs:1037][E: codex-rs/rmcp-client/src/rmcp_client.rs:1042]

## 设计动机与权衡

- `create_env_for_mcp_server` 本地模式继承 default env vars、extra env vars 和 config env；remote overlay 只转发显式非 remote source env 与 extra env，避免把本地 remote-only control vars 混进远端执行环境。[E: codex-rs/rmcp-client/src/utils.rs:12][E: codex-rs/rmcp-client/src/utils.rs:17][E: codex-rs/rmcp-client/src/utils.rs:22][E: codex-rs/rmcp-client/src/utils.rs:27][E: codex-rs/rmcp-client/src/utils.rs:34][E: codex-rs/rmcp-client/src/utils.rs:38][E: codex-rs/rmcp-client/src/utils.rs:50]
- `build_default_headers` 同时支持 static headers 和 env headers，env value 为空或 header 无效会跳过而不是 panic。[E: codex-rs/rmcp-client/src/utils.rs:60][E: codex-rs/rmcp-client/src/utils.rs:68][E: codex-rs/rmcp-client/src/utils.rs:82][E: codex-rs/rmcp-client/src/utils.rs:86][E: codex-rs/rmcp-client/src/utils.rs:110]
- streamable HTTP OAuth 是按 transport recipe 延迟创建的：没有 bearer 且没有 Authorization default header 时，client 会加载 stored OAuth tokens 并尝试 `StreamableHttpWithOAuth`。[E: codex-rs/rmcp-client/src/rmcp_client.rs:903][E: codex-rs/rmcp-client/src/rmcp_client.rs:904][E: codex-rs/rmcp-client/src/rmcp_client.rs:915][E: codex-rs/rmcp-client/src/rmcp_client.rs:929]

## gotcha

- remote streamable HTTP 在 `make_rmcp_client` 中被显式拒绝为 not implemented；remote executor 目前只用于 stdio MCP server。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1564][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1574][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1592][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1603]
- streamable HTTP 的 `delete_session` 接受 method-not-allowed 作为 OK；这表示 server 不支持 DELETE session 不是 fatal cleanup failure。[E: codex-rs/rmcp-client/src/rmcp_client.rs:223][E: codex-rs/rmcp-client/src/rmcp_client.rs:239][E: codex-rs/rmcp-client/src/rmcp_client.rs:240]
- executor transport drop 在 process 未标记 terminated 且当前 Tokio runtime 可用时会异步 terminate process；没有 runtime 时只记录 warning 并返回。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:352][E: codex-rs/rmcp-client/src/executor_process_transport.rs:360][E: codex-rs/rmcp-client/src/executor_process_transport.rs:368][E: codex-rs/rmcp-client/src/executor_process_transport.rs:369]

## Sources

- codex-rs/rmcp-client/src/stdio_server_launcher.rs
- codex-rs/rmcp-client/src/executor_process_transport.rs
- codex-rs/rmcp-client/src/rmcp_client.rs
- codex-rs/rmcp-client/src/utils.rs
- codex-rs/rmcp-client/src/elicitation_client_service.rs
- codex-rs/codex-mcp/src/mcp_connection_manager.rs

## 相关

- `subsys.mcp.client`
- `subsys.mcp.oauth`
- `subsys.mcp.server`
