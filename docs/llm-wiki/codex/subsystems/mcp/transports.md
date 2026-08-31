---
id: subsys.mcp.transports
title: MCP transports
kind: subsystem
tier: T2
source: [codex-rs/rmcp-client/src/protocol_mode.rs, codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/rmcp-client/src/http_client_adapter.rs, codex-rs/rmcp-client/src/stdio_server_launcher.rs, codex-rs/rmcp-client/src/executor_process_transport.rs, codex-rs/rmcp-client/src/utils.rs, codex-rs/codex-mcp/src/runtime.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/exec-server/src/environment.rs]
symbols: [McpProtocolMode, RmcpClient, TransportRecipe, StdioServerLauncher, LocalStdioServerLauncher, ExecutorStdioServerLauncher, ExecutorProcessTransport, create_pending_transport, run_service_operation]
related: [subsys.mcp.client, subsys.mcp.oauth, subsys.mcp.server]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> MCP transports are owned by `rmcp-client`: stdio can run as a local child process or through the executor process API, while streamable HTTP uses default headers, optional bearer/runtime auth, optional stored OAuth, session-expiry recovery, and active-time timeouts around RMCP service operations.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:189][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:544][E: codex-rs/rmcp-client/src/executor_process_transport.rs:158][E: codex-rs/rmcp-client/src/rmcp_client.rs:379]

## 能回答的问题

- local stdio MCP server 和 executor stdio MCP server 的边界是什么？
- `make_rmcp_client` 怎样从 config transport 选择 stdio 或 streamable HTTP？
- remote executor transport 怎样把 stdout/stderr event stream 还原成 MCP JSON-RPC？
- Streamable HTTP 如何组合 bearer token、default headers、stored OAuth 和 runtime auth provider？
- operation timeout、`tools/list` transient retry、session-expired 404 recovery 在哪里处理？

## 职责边界

`rmcp-client` owns transport construction and RMCP service calls; `codex-mcp/src/rmcp_client.rs::make_rmcp_client` owns config/environment selection and passes the chosen launcher or HTTP client into `RmcpClient`。[E: codex-rs/rmcp-client/src/rmcp_client.rs:379][E: codex-rs/rmcp-client/src/rmcp_client.rs:438][E: codex-rs/codex-mcp/src/rmcp_client.rs:1070]

OAuth behavior is covered in `subsys.mcp.oauth`; this node only covers how OAuth-bearing transports are plugged into RMCP service operations.[E: codex-rs/rmcp-client/src/rmcp_client.rs:1091]

## 关键文件

- `codex-rs/rmcp-client/src/rmcp_client.rs`: transport recipes, client constructors, initialize, RMCP operations, pending transport creation, retry/recovery logic.[E: codex-rs/rmcp-client/src/rmcp_client.rs:355][E: codex-rs/rmcp-client/src/rmcp_client.rs:379][E: codex-rs/rmcp-client/src/rmcp_client.rs:392][E: codex-rs/rmcp-client/src/rmcp_client.rs:465][E: codex-rs/rmcp-client/src/rmcp_client.rs:535][E: codex-rs/rmcp-client/src/rmcp_client.rs:914][E: codex-rs/rmcp-client/src/rmcp_client.rs:1135]
- `codex-rs/rmcp-client/src/stdio_server_launcher.rs`: stdio launch abstraction, local child process launcher, executor process launcher, remote env policy。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:80][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:189][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:544]
- `codex-rs/rmcp-client/src/executor_process_transport.rs`: executor process stdin/stdout/stderr adapter for rmcp `Transport`.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:158][E: codex-rs/rmcp-client/src/executor_process_transport.rs:163][E: codex-rs/rmcp-client/src/executor_process_transport.rs:174][E: codex-rs/rmcp-client/src/executor_process_transport.rs:177][E: codex-rs/rmcp-client/src/executor_process_transport.rs:181][E: codex-rs/rmcp-client/src/executor_process_transport.rs:184][E: codex-rs/rmcp-client/src/executor_process_transport.rs:231][E: codex-rs/rmcp-client/src/executor_process_transport.rs:278]
- `codex-rs/rmcp-client/src/utils.rs`: local vs remote env construction and HTTP default-header construction.[E: codex-rs/rmcp-client/src/utils.rs:14][E: codex-rs/rmcp-client/src/utils.rs:29][E: codex-rs/rmcp-client/src/utils.rs:44][E: codex-rs/rmcp-client/src/utils.rs:62]
- `codex-rs/codex-mcp/src/runtime.rs`: configured environment resolution and ambient local route-aware HTTP capability.[E: codex-rs/codex-mcp/src/runtime.rs:679][E: codex-rs/codex-mcp/src/runtime.rs:704][E: codex-rs/codex-mcp/src/runtime.rs:650]
- `codex-rs/exec-server/src/environment.rs`: environment-owned exec/filesystem/HTTP capabilities for local and remote execution backends.[E: codex-rs/exec-server/src/environment.rs:658]

## Config selection

- `McpRuntimeContext::resolve_server_environment` resolves the configured environment before `make_rmcp_client` receives it as `Result<Option<Arc<Environment>>, String>`。A registered environment is returned for either transport；a missing local stdio environment is an error，missing local HTTP is the ambient-client exception，and an unknown non-local id is an error。`make_rmcp_client` only consumes this pre-resolved result before branching on `Stdio` or `StreamableHttp`。[E: codex-rs/codex-mcp/src/runtime.rs:679][E: codex-rs/codex-mcp/src/runtime.rs:699][E: codex-rs/codex-mcp/src/runtime.rs:701][E: codex-rs/codex-mcp/src/runtime.rs:704][E: codex-rs/codex-mcp/src/runtime.rs:708][E: codex-rs/codex-mcp/src/rmcp_client.rs:1070][E: codex-rs/codex-mcp/src/rmcp_client.rs:1089][E: codex-rs/codex-mcp/src/rmcp_client.rs:1095]
- Stdio uses `LocalStdioServerLauncher` for a local environment and `ExecutorStdioServerLauncher` backed by the resolved environment for a non-local environment，then constructs `RmcpClient::new_stdio_client_with_protocol_mode` with the session protocol mode。[E: codex-rs/codex-mcp/src/rmcp_client.rs:1110][E: codex-rs/codex-mcp/src/rmcp_client.rs:1114][E: codex-rs/codex-mcp/src/rmcp_client.rs:1123][E: codex-rs/codex-mcp/src/rmcp_client.rs:1129]
- Streamable HTTP uses the ambient `RouteAwareHttpClient` when the resolution exception returns `None`，otherwise it uses the selected environment HTTP client；local environments own a route-aware client，while remote environments expose the executor RPC client as their HTTP capability。After resolving a bearer token，the path calls `RmcpClient::new_streamable_http_client_with_protocol_mode`。[E: codex-rs/codex-mcp/src/runtime.rs:704][E: codex-rs/codex-mcp/src/runtime.rs:715][E: codex-rs/codex-mcp/src/rmcp_client.rs:1141][E: codex-rs/codex-mcp/src/rmcp_client.rs:1148]

## Stdio transports

- `StdioServerLauncher` is the boundary between MCP lifecycle and process placement: it launches the configured command and returns a `StdioServerTransport` for rmcp。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:80]
- Local launch moves synchronous program resolution/process creation into `spawn_blocking`, then constructs a cleaned child process with explicit env、cwd、pipes、stderr logging and Unix process-group setup without blocking the async startup deadline。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:189][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:207][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:261][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:275]
- Executor launch requires explicit cwd, builds a remote env overlay, rejects non-Unicode argv/env, starts executor with `tty=false` and `pipe_stdin=true`, and wraps the process in `ExecutorProcessTransport`.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:544][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:582][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:591][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:597][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:611][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:612]

## Executor byte adapter

- `ExecutorProcessTransport::send` serializes rmcp JSON-RPC plus newline and holds a single-slot semaphore across the executor stdin write, preventing concurrent send futures from overlapping bytes。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:163][E: codex-rs/rmcp-client/src/executor_process_transport.rs:239][E: codex-rs/rmcp-client/src/executor_process_transport.rs:244][E: codex-rs/rmcp-client/src/executor_process_transport.rs:247]
- `receive_message` drains buffered stdout lines, waits for executor process events, recovers lagged events via retained output, and treats stderr as diagnostics rather than protocol bytes.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:278][E: codex-rs/rmcp-client/src/executor_process_transport.rs:290][E: codex-rs/rmcp-client/src/executor_process_transport.rs:346][E: codex-rs/rmcp-client/src/executor_process_transport.rs:407]
- stdout/PTY chunks feed the MCP line buffer; stderr chunks are logged line-by-line and flushed on close.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:407][E: codex-rs/rmcp-client/src/executor_process_transport.rs:413][E: codex-rs/rmcp-client/src/executor_process_transport.rs:420][E: codex-rs/rmcp-client/src/executor_process_transport.rs:480]
- Remote line buffering caps a stdout protocol line at 8 MiB and a diagnostic stderr line at 1 MiB；overflow discards pending bytes, marks the transport closed, and lets Drop terminate the executor-managed process。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:51][E: codex-rs/rmcp-client/src/executor_process_transport.rs:53][E: codex-rs/rmcp-client/src/executor_process_transport.rs:438]

## Streamable HTTP and service operations

- `McpProtocolMode::Legacy` proposes 2025-06-18 with the initialize lifecycle；`V20260728` prefers 2026-07-28 through auto discovery and retains 2025-06-18 as legacy fallback。stdio does not become modern from the feature alone：only the explicit inline `env` map passed to `new_stdio_client_with_protocol_mode` is inspected for `CODEX_MCP_PROTOCOL_VERSION=2026-07-28`；the separate `env_vars` allow-list is not consulted for negotiation。In modern global mode the marker is removed from that inline map before `StdioServerCommand` is built，so it is a host-side selector rather than child-process environment。[E: codex-rs/rmcp-client/src/protocol_mode.rs:19][E: codex-rs/rmcp-client/src/protocol_mode.rs:26][E: codex-rs/rmcp-client/src/protocol_mode.rs:36][E: codex-rs/rmcp-client/src/protocol_mode.rs:40][E: codex-rs/rmcp-client/src/rmcp_client.rs:438][E: codex-rs/rmcp-client/src/rmcp_client.rs:447][E: codex-rs/rmcp-client/src/rmcp_client.rs:451][E: codex-rs/rmcp-client/src/rmcp_client.rs:453]
- Modern HTTP discovery accepts JSON or SSE responses, caps discovery/2026 bodies to the stdio line limit, and stops redirects for discovery or established 2026 requests；legacy traffic follows redirects。The downgrade shim only recognizes constrained legacy rejection shapes, not arbitrary HTTP 400 errors。[E: codex-rs/rmcp-client/src/http_client_adapter.rs:140][E: codex-rs/rmcp-client/src/http_client_adapter.rs:147][E: codex-rs/rmcp-client/src/http_client_adapter.rs:265][E: codex-rs/rmcp-client/src/http_client_adapter.rs:299][E: codex-rs/rmcp-client/src/http_client_adapter.rs:638][E: codex-rs/rmcp-client/src/http_client_adapter.rs:653][E: codex-rs/rmcp-client/src/http_client_adapter.rs:677]
- `create_pending_transport` builds default headers, loads stored OAuth tokens only when no bearer/runtime auth/Authorization header is present, creates an OAuth transport when possible, otherwise constructs streamable HTTP with optional bearer token and runtime auth provider。[E: codex-rs/rmcp-client/src/rmcp_client.rs:1003][E: codex-rs/rmcp-client/src/rmcp_client.rs:1043]
- `connect_pending_transport` passes every pending transport variant to `rmcp::service::serve_client`; only OAuth transport returns an `OAuthPersistor` to the ready state。[E: codex-rs/rmcp-client/src/rmcp_client.rs:1176]
- `run_service_operation` wraps operations with active-time timeout, retries retryable streamable HTTP `tools/list` send errors, and reinitializes the transport once on session-expired 404 before retrying。[E: codex-rs/rmcp-client/src/rmcp_client.rs:1274][E: codex-rs/rmcp-client/src/rmcp_client.rs:1312]
- 本地 MCP HTTP client 由 `McpRuntimeContext` 构造 `RouteAwareHttpClient` 并打开 `with_tls_backend_fallback()`，让 delegated/local HTTP MCP 在 TLS 协议协商失败时按 origin+route 切 rustls。[E: codex-rs/codex-mcp/src/runtime.rs:650][E: codex-rs/codex-mcp/src/runtime.rs:652]

## Sources

- codex-rs/rmcp-client/src/rmcp_client.rs
- codex-rs/rmcp-client/src/protocol_mode.rs
- codex-rs/rmcp-client/src/http_client_adapter.rs
- codex-rs/rmcp-client/src/stdio_server_launcher.rs
- codex-rs/rmcp-client/src/executor_process_transport.rs
- codex-rs/rmcp-client/src/utils.rs
- codex-rs/codex-mcp/src/runtime.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
- codex-rs/exec-server/src/environment.rs

## 相关

- [MCP client runtime](client.md)
- [MCP OAuth](oauth.md)
- [MCP server](server.md)
