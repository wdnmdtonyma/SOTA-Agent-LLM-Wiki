---
id: subsys.mcp.transports
title: MCP transports
kind: subsystem
tier: T2
source: [codex-rs/rmcp-client/src/rmcp_client.rs, codex-rs/rmcp-client/src/stdio_server_launcher.rs, codex-rs/rmcp-client/src/executor_process_transport.rs, codex-rs/rmcp-client/src/utils.rs, codex-rs/codex-mcp/src/rmcp_client.rs]
symbols: [RmcpClient, TransportRecipe, StdioServerLauncher, LocalStdioServerLauncher, ExecutorStdioServerLauncher, ExecutorProcessTransport, create_pending_transport, run_service_operation]
related: [subsys.mcp.client, subsys.mcp.oauth, subsys.mcp.server]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> MCP transports are owned by `rmcp-client`: stdio can run as a local child process or through the executor process API, while streamable HTTP uses default headers, optional bearer/runtime auth, optional stored OAuth, session-expiry recovery, and active-time timeouts around RMCP service operations.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:245][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:475][E: codex-rs/rmcp-client/src/executor_process_transport.rs:159][E: codex-rs/rmcp-client/src/rmcp_client.rs:326]

## 能回答的问题

- local stdio MCP server 和 executor stdio MCP server 的边界是什么？
- `make_rmcp_client` 怎样从 config transport 选择 stdio 或 streamable HTTP？
- remote executor transport 怎样把 stdout/stderr event stream 还原成 MCP JSON-RPC？
- Streamable HTTP 如何组合 bearer token、default headers、stored OAuth 和 runtime auth provider？
- operation timeout、`tools/list` transient retry、session-expired 404 recovery 在哪里处理？

## 职责边界

`rmcp-client` owns transport construction and RMCP service calls; `codex-mcp/src/rmcp_client.rs::make_rmcp_client` owns config/environment selection and passes the chosen launcher or HTTP client into `RmcpClient`.[E: codex-rs/rmcp-client/src/rmcp_client.rs:336][E: codex-rs/rmcp-client/src/rmcp_client.rs:356][E: codex-rs/rmcp-client/src/rmcp_client.rs:391][E: codex-rs/codex-mcp/src/rmcp_client.rs:1016]

OAuth behavior is covered in `subsys.mcp.oauth`; this node only covers how OAuth-bearing transports are plugged into RMCP service operations.[E: codex-rs/rmcp-client/src/rmcp_client.rs:811][E: codex-rs/rmcp-client/src/rmcp_client.rs:937]

## 关键文件

- `codex-rs/rmcp-client/src/rmcp_client.rs`: transport recipes, client constructors, initialize, RMCP operations, pending transport creation, retry/recovery logic.[E: codex-rs/rmcp-client/src/rmcp_client.rs:326][E: codex-rs/rmcp-client/src/rmcp_client.rs:336][E: codex-rs/rmcp-client/src/rmcp_client.rs:356][E: codex-rs/rmcp-client/src/rmcp_client.rs:391][E: codex-rs/rmcp-client/src/rmcp_client.rs:430][E: codex-rs/rmcp-client/src/rmcp_client.rs:770][E: codex-rs/rmcp-client/src/rmcp_client.rs:976]
- `codex-rs/rmcp-client/src/stdio_server_launcher.rs`: stdio launch abstraction, local child process launcher, executor process launcher, remote env policy.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:72][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:95][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:245][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:449][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:475][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:568]
- `codex-rs/rmcp-client/src/executor_process_transport.rs`: executor process stdin/stdout/stderr adapter for rmcp `Transport`.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:159][E: codex-rs/rmcp-client/src/executor_process_transport.rs:164][E: codex-rs/rmcp-client/src/executor_process_transport.rs:175][E: codex-rs/rmcp-client/src/executor_process_transport.rs:178][E: codex-rs/rmcp-client/src/executor_process_transport.rs:182][E: codex-rs/rmcp-client/src/executor_process_transport.rs:185][E: codex-rs/rmcp-client/src/executor_process_transport.rs:232][E: codex-rs/rmcp-client/src/executor_process_transport.rs:279]
- `codex-rs/rmcp-client/src/utils.rs`: local vs remote env construction and HTTP default-header construction.[E: codex-rs/rmcp-client/src/utils.rs:12][E: codex-rs/rmcp-client/src/utils.rs:27][E: codex-rs/rmcp-client/src/utils.rs:42][E: codex-rs/rmcp-client/src/utils.rs:60]

## Config selection

- `make_rmcp_client` resolves server environment first, then branches on `McpServerTransportConfig::Stdio` or `StreamableHttp`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:931][E: codex-rs/codex-mcp/src/rmcp_client.rs:1033][E: codex-rs/codex-mcp/src/rmcp_client.rs:1071]
- Stdio uses `LocalStdioServerLauncher` for local environments and `ExecutorStdioServerLauncher` for non-local environments, then constructs `RmcpClient::new_stdio_client`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:1048][E: codex-rs/codex-mcp/src/rmcp_client.rs:1056][E: codex-rs/codex-mcp/src/rmcp_client.rs:1061][E: codex-rs/codex-mcp/src/rmcp_client.rs:1067]
- Streamable HTTP chooses a plain reqwest-backed HTTP client or the resolved environment's HTTP client, resolves any bearer token env var, then calls `RmcpClient::new_streamable_http_client`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:1077][E: codex-rs/codex-mcp/src/rmcp_client.rs:1082][E: codex-rs/codex-mcp/src/rmcp_client.rs:1087]

## Stdio transports

- `StdioServerLauncher` is the boundary between MCP lifecycle and process placement: it launches the configured command and returns a `StdioServerTransport` for rmcp.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:72][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:74][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:95]
- Local launch moves synchronous program resolution/process creation into `spawn_blocking`, then constructs a cleaned child process with explicit env、cwd、pipes、stderr logging and Unix process-group setup without blocking the async startup deadline。[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:188][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:195][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:198][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:252][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:265]
- Executor launch requires explicit cwd, builds a remote env overlay, rejects non-Unicode argv/env, starts executor with `tty=false` and `pipe_stdin=true`, and wraps the process in `ExecutorProcessTransport`.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:475][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:486][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:495][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:501][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:507][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:514][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:527]

## Executor byte adapter

- `ExecutorProcessTransport::send` serializes rmcp JSON-RPC plus newline and holds a single-slot semaphore across the executor stdin write, preventing concurrent send futures from overlapping bytes。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:164][E: codex-rs/rmcp-client/src/executor_process_transport.rs:240][E: codex-rs/rmcp-client/src/executor_process_transport.rs:245][E: codex-rs/rmcp-client/src/executor_process_transport.rs:248]
- `receive_message` drains buffered stdout lines, waits for executor process events, recovers lagged events via retained output, and treats stderr as diagnostics rather than protocol bytes.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:279][E: codex-rs/rmcp-client/src/executor_process_transport.rs:291][E: codex-rs/rmcp-client/src/executor_process_transport.rs:347][E: codex-rs/rmcp-client/src/executor_process_transport.rs:383]
- stdout/PTY chunks feed the MCP line buffer; stderr chunks are logged line-by-line and flushed on close.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:383][E: codex-rs/rmcp-client/src/executor_process_transport.rs:389][E: codex-rs/rmcp-client/src/executor_process_transport.rs:396][E: codex-rs/rmcp-client/src/executor_process_transport.rs:456]
- Remote line buffering caps a stdout protocol line at 8 MiB and a diagnostic stderr line at 1 MiB；overflow discards pending bytes, marks the transport closed, and lets Drop terminate the executor-managed process。[E: codex-rs/rmcp-client/src/executor_process_transport.rs:46][E: codex-rs/rmcp-client/src/executor_process_transport.rs:49][E: codex-rs/rmcp-client/src/executor_process_transport.rs:69][E: codex-rs/rmcp-client/src/executor_process_transport.rs:95][E: codex-rs/rmcp-client/src/executor_process_transport.rs:384][E: codex-rs/rmcp-client/src/executor_process_transport.rs:414]

## Streamable HTTP and service operations

- `create_pending_transport` builds default headers, loads stored OAuth tokens only when no bearer/runtime auth/Authorization header is present, creates an OAuth transport when possible, otherwise constructs streamable HTTP with optional bearer token and runtime auth provider.[E: codex-rs/rmcp-client/src/rmcp_client.rs:770][E: codex-rs/rmcp-client/src/rmcp_client.rs:796][E: codex-rs/rmcp-client/src/rmcp_client.rs:796][E: codex-rs/rmcp-client/src/rmcp_client.rs:811][E: codex-rs/rmcp-client/src/rmcp_client.rs:895][E: codex-rs/rmcp-client/src/rmcp_client.rs:902]
- `connect_pending_transport` passes every pending transport variant to `rmcp::service::serve_client`; only OAuth transport returns an `OAuthPersistor` to the ready state.[E: codex-rs/rmcp-client/src/rmcp_client.rs:916][E: codex-rs/rmcp-client/src/rmcp_client.rs:924][E: codex-rs/rmcp-client/src/rmcp_client.rs:937][E: codex-rs/rmcp-client/src/rmcp_client.rs:946]
- `run_service_operation` wraps operations with active-time timeout, retries retryable streamable HTTP `tools/list` send errors, and reinitializes the transport once on session-expired 404 before retrying.[E: codex-rs/rmcp-client/src/rmcp_client.rs:186][E: codex-rs/rmcp-client/src/rmcp_client.rs:976][E: codex-rs/rmcp-client/src/rmcp_client.rs:1014][E: codex-rs/rmcp-client/src/rmcp_client.rs:1033][E: codex-rs/rmcp-client/src/rmcp_client.rs:1044][E: codex-rs/rmcp-client/src/rmcp_client.rs:1083][E: codex-rs/rmcp-client/src/rmcp_client.rs:1095][E: codex-rs/rmcp-client/src/rmcp_client.rs:1111][E: codex-rs/rmcp-client/src/rmcp_client.rs:1131]

## Sources

- codex-rs/rmcp-client/src/rmcp_client.rs
- codex-rs/rmcp-client/src/stdio_server_launcher.rs
- codex-rs/rmcp-client/src/executor_process_transport.rs
- codex-rs/rmcp-client/src/utils.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
