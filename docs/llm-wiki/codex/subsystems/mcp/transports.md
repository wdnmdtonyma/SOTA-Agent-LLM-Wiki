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
updated: 7750465934
---

> MCP transports are owned by `rmcp-client`: stdio can run as a local child process or through the executor process API, while streamable HTTP uses default headers, optional bearer/runtime auth, optional stored OAuth, session-expiry recovery, and active-time timeouts around RMCP service operations.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:254][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:505][E: codex-rs/rmcp-client/src/executor_process_transport.rs:160][E: codex-rs/rmcp-client/src/rmcp_client.rs:334]

## 能回答的问题

- local stdio MCP server 和 executor stdio MCP server 的边界是什么？
- `make_rmcp_client` 怎样从 config transport 选择 stdio 或 streamable HTTP？
- remote executor transport 怎样把 stdout/stderr event stream 还原成 MCP JSON-RPC？
- Streamable HTTP 如何组合 bearer token、default headers、stored OAuth 和 runtime auth provider？
- operation timeout、`tools/list` transient retry、session-expired 404 recovery 在哪里处理？

## 职责边界

`rmcp-client` owns transport construction and RMCP service calls; `codex-mcp/src/rmcp_client.rs::make_rmcp_client` owns config/environment selection and passes the chosen launcher or HTTP client into `RmcpClient`.[E: codex-rs/rmcp-client/src/rmcp_client.rs:350][E: codex-rs/rmcp-client/src/rmcp_client.rs:371][E: codex-rs/rmcp-client/src/rmcp_client.rs:444][E: codex-rs/codex-mcp/src/rmcp_client.rs:989]

OAuth behavior is covered in `subsys.mcp.oauth`; this node only covers how OAuth-bearing transports are plugged into RMCP service operations.[E: codex-rs/rmcp-client/src/rmcp_client.rs:1067]

## 关键文件

- `codex-rs/rmcp-client/src/rmcp_client.rs`: transport recipes, client constructors, initialize, RMCP operations, pending transport creation, retry/recovery logic.[E: codex-rs/rmcp-client/src/rmcp_client.rs:334][E: codex-rs/rmcp-client/src/rmcp_client.rs:350][E: codex-rs/rmcp-client/src/rmcp_client.rs:371][E: codex-rs/rmcp-client/src/rmcp_client.rs:444][E: codex-rs/rmcp-client/src/rmcp_client.rs:513][E: codex-rs/rmcp-client/src/rmcp_client.rs:892][E: codex-rs/rmcp-client/src/rmcp_client.rs:1115]
- `codex-rs/rmcp-client/src/stdio_server_launcher.rs`: stdio launch abstraction, local child process launcher, executor process launcher, remote env policy.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:74][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:98][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:254][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:479][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:505][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:599]
- `codex-rs/rmcp-client/src/executor_process_transport.rs`: executor process stdin/stdout/stderr adapter for rmcp `Transport`.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:160][E: codex-rs/rmcp-client/src/executor_process_transport.rs:165][E: codex-rs/rmcp-client/src/executor_process_transport.rs:176][E: codex-rs/rmcp-client/src/executor_process_transport.rs:179][E: codex-rs/rmcp-client/src/executor_process_transport.rs:183][E: codex-rs/rmcp-client/src/executor_process_transport.rs:186][E: codex-rs/rmcp-client/src/executor_process_transport.rs:233][E: codex-rs/rmcp-client/src/executor_process_transport.rs:280]
- `codex-rs/rmcp-client/src/utils.rs`: local vs remote env construction and HTTP default-header construction.[E: codex-rs/rmcp-client/src/utils.rs:14][E: codex-rs/rmcp-client/src/utils.rs:29][E: codex-rs/rmcp-client/src/utils.rs:44][E: codex-rs/rmcp-client/src/utils.rs:62]
- `codex-rs/codex-mcp/src/runtime.rs`: configured environment resolution and ambient local route-aware HTTP capability.[E: codex-rs/codex-mcp/src/runtime.rs:400][E: codex-rs/codex-mcp/src/runtime.rs:406][E: codex-rs/codex-mcp/src/runtime.rs:437]
- `codex-rs/exec-server/src/environment.rs`: environment-owned exec/filesystem/HTTP capabilities for local and remote execution backends.[E: codex-rs/exec-server/src/environment.rs:648][E: codex-rs/exec-server/src/environment.rs:653][E: codex-rs/exec-server/src/environment.rs:655]

## Config selection

- `McpRuntimeContext::resolve_server_environment` resolves the configured environment before `make_rmcp_client` receives it as `Result<Option<Arc<Environment>>, String>`。A registered environment is returned for either transport；a missing local stdio environment is an error，missing local HTTP is the ambient-client exception，and an unknown non-local id is an error。`make_rmcp_client` only consumes this pre-resolved result before branching on `Stdio` or `StreamableHttp`。[E: codex-rs/codex-mcp/src/runtime.rs:406][E: codex-rs/codex-mcp/src/runtime.rs:414][E: codex-rs/codex-mcp/src/runtime.rs:421][E: codex-rs/codex-mcp/src/runtime.rs:423][E: codex-rs/codex-mcp/src/runtime.rs:426][E: codex-rs/codex-mcp/src/runtime.rs:430][E: codex-rs/codex-mcp/src/rmcp_client.rs:989][E: codex-rs/codex-mcp/src/rmcp_client.rs:995][E: codex-rs/codex-mcp/src/rmcp_client.rs:1008][E: codex-rs/codex-mcp/src/rmcp_client.rs:1014]
- Stdio uses `LocalStdioServerLauncher` for a local environment and `ExecutorStdioServerLauncher` backed by the resolved environment for a non-local environment，then constructs `RmcpClient::new_stdio_client_with_protocol_mode` with the session protocol mode。[E: codex-rs/codex-mcp/src/rmcp_client.rs:1029][E: codex-rs/codex-mcp/src/rmcp_client.rs:1037][E: codex-rs/codex-mcp/src/rmcp_client.rs:1042][E: codex-rs/codex-mcp/src/rmcp_client.rs:1048][E: codex-rs/codex-mcp/src/rmcp_client.rs:1055]
- Streamable HTTP uses the ambient `RouteAwareHttpClient` when the resolution exception returns `None`，otherwise it uses `Environment::get_http_client()`；local environments own a route-aware client，while remote environments expose the executor RPC client as their HTTP capability。After resolving a bearer token，the path calls `RmcpClient::new_streamable_http_client_with_protocol_mode`。[E: codex-rs/codex-mcp/src/runtime.rs:400][E: codex-rs/codex-mcp/src/rmcp_client.rs:1066][E: codex-rs/codex-mcp/src/rmcp_client.rs:1068][E: codex-rs/codex-mcp/src/rmcp_client.rs:1071][E: codex-rs/codex-mcp/src/rmcp_client.rs:1076][E: codex-rs/exec-server/src/environment.rs:750][E: codex-rs/exec-server/src/environment.rs:760][E: codex-rs/exec-server/src/environment.rs:771][E: codex-rs/exec-server/src/environment.rs:915]

## Stdio transports

- `StdioServerLauncher` is the boundary between MCP lifecycle and process placement: it launches the configured command and returns a `StdioServerTransport` for rmcp.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:74][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:76][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:98]
- Local launch moves synchronous program resolution/process creation into `spawn_blocking`, then constructs a cleaned child process with explicit env、cwd、pipes、stderr logging and Unix process-group setup without blocking the async startup deadline。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:197][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:207][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:261][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:275]
- Executor launch requires explicit cwd, builds a remote env overlay, rejects non-Unicode argv/env, starts executor with `tty=false` and `pipe_stdin=true`, and wraps the process in `ExecutorProcessTransport`.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:505][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:517][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:526][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:532][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:538][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:545][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:558]

## Executor byte adapter

- `ExecutorProcessTransport::send` serializes rmcp JSON-RPC plus newline and holds a single-slot semaphore across the executor stdin write, preventing concurrent send futures from overlapping bytes。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:165][E: codex-rs/rmcp-client/src/executor_process_transport.rs:241][E: codex-rs/rmcp-client/src/executor_process_transport.rs:246][E: codex-rs/rmcp-client/src/executor_process_transport.rs:249]
- `receive_message` drains buffered stdout lines, waits for executor process events, recovers lagged events via retained output, and treats stderr as diagnostics rather than protocol bytes.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:280][E: codex-rs/rmcp-client/src/executor_process_transport.rs:292][E: codex-rs/rmcp-client/src/executor_process_transport.rs:348][E: codex-rs/rmcp-client/src/executor_process_transport.rs:409]
- stdout/PTY chunks feed the MCP line buffer; stderr chunks are logged line-by-line and flushed on close.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:409][E: codex-rs/rmcp-client/src/executor_process_transport.rs:415][E: codex-rs/rmcp-client/src/executor_process_transport.rs:422][E: codex-rs/rmcp-client/src/executor_process_transport.rs:482]
- Remote line buffering caps a stdout protocol line at 8 MiB and a diagnostic stderr line at 1 MiB；overflow discards pending bytes, marks the transport closed, and lets Drop terminate the executor-managed process。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:45][E: codex-rs/rmcp-client/src/executor_process_transport.rs:50][E: codex-rs/rmcp-client/src/executor_process_transport.rs:410][E: codex-rs/rmcp-client/src/executor_process_transport.rs:440]

## Streamable HTTP and service operations

- `McpProtocolMode::Legacy` proposes 2025-06-18 with the initialize lifecycle；`V20260728` prefers 2026-07-28 through auto discovery and retains 2025-06-18 as legacy fallback。stdio does not become modern from the feature alone：only the explicit inline `env` map passed to `new_stdio_client_with_protocol_mode` is inspected for `CODEX_MCP_PROTOCOL_VERSION=2026-07-28`；the separate `env_vars` allow-list is not consulted for negotiation。In modern global mode the marker is removed from that inline map before `StdioServerCommand` is built，so it is a host-side selector rather than child-process environment。[E: codex-rs/rmcp-client/src/protocol_mode.rs:17][E: codex-rs/rmcp-client/src/protocol_mode.rs:26][E: codex-rs/rmcp-client/src/protocol_mode.rs:36][E: codex-rs/rmcp-client/src/protocol_mode.rs:40][E: codex-rs/rmcp-client/src/rmcp_client.rs:393][E: codex-rs/rmcp-client/src/rmcp_client.rs:396][E: codex-rs/rmcp-client/src/rmcp_client.rs:397][E: codex-rs/rmcp-client/src/rmcp_client.rs:402][E: codex-rs/rmcp-client/src/rmcp_client.rs:404][E: codex-rs/rmcp-client/src/rmcp_client.rs:406][E: codex-rs/rmcp-client/src/rmcp_client.rs:409][E: codex-rs/rmcp-client/src/rmcp_client.rs:413][E: codex-rs/rmcp-client/src/rmcp_client.rs:414]
- Modern HTTP discovery accepts JSON or SSE responses, caps discovery/2026 bodies to the stdio line limit, and stops redirects for discovery or established 2026 requests；legacy traffic follows redirects。The downgrade shim only recognizes constrained legacy rejection shapes, not arbitrary HTTP 400 errors。[E: codex-rs/rmcp-client/src/http_client_adapter.rs:144][E: codex-rs/rmcp-client/src/http_client_adapter.rs:150][E: codex-rs/rmcp-client/src/http_client_adapter.rs:268][E: codex-rs/rmcp-client/src/http_client_adapter.rs:303][E: codex-rs/rmcp-client/src/http_client_adapter.rs:650][E: codex-rs/rmcp-client/src/http_client_adapter.rs:664][E: codex-rs/rmcp-client/src/http_client_adapter.rs:690]
- `create_pending_transport` builds default headers, loads stored OAuth tokens only when no bearer/runtime auth/Authorization header is present, creates an OAuth transport when possible, otherwise constructs streamable HTTP with optional bearer token and runtime auth provider.[E: codex-rs/rmcp-client/src/rmcp_client.rs:892][E: codex-rs/rmcp-client/src/rmcp_client.rs:918][E: codex-rs/rmcp-client/src/rmcp_client.rs:918][E: codex-rs/rmcp-client/src/rmcp_client.rs:1017][E: codex-rs/rmcp-client/src/rmcp_client.rs:1024]
- `connect_pending_transport` passes every pending transport variant to `rmcp::service::serve_client`; only OAuth transport returns an `OAuthPersistor` to the ready state.[E: codex-rs/rmcp-client/src/rmcp_client.rs:1038][E: codex-rs/rmcp-client/src/rmcp_client.rs:1048][E: codex-rs/rmcp-client/src/rmcp_client.rs:1067][E: codex-rs/rmcp-client/src/rmcp_client.rs:1078]
- `run_service_operation` wraps operations with active-time timeout, retries retryable streamable HTTP `tools/list` send errors, and reinitializes the transport once on session-expired 404 before retrying.[E: codex-rs/rmcp-client/src/rmcp_client.rs:192][E: codex-rs/rmcp-client/src/rmcp_client.rs:1115][E: codex-rs/rmcp-client/src/rmcp_client.rs:1153][E: codex-rs/rmcp-client/src/rmcp_client.rs:1172][E: codex-rs/rmcp-client/src/rmcp_client.rs:1183][E: codex-rs/rmcp-client/src/rmcp_client.rs:1222][E: codex-rs/rmcp-client/src/rmcp_client.rs:1234][E: codex-rs/rmcp-client/src/rmcp_client.rs:1250][E: codex-rs/rmcp-client/src/rmcp_client.rs:1270]

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
