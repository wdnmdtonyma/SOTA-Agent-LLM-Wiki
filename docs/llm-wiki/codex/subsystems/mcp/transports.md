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
updated: db887d03e1
---

> MCP transports are owned by `rmcp-client`: stdio can run as a local child process or through the executor process API, while streamable HTTP uses default headers, optional bearer/runtime auth, optional stored OAuth, session-expiry recovery, and active-time timeouts around RMCP service operations.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:238][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:468][E: codex-rs/rmcp-client/src/executor_process_transport.rs:94][E: codex-rs/rmcp-client/src/rmcp_client.rs:321]

## 能回答的问题

- local stdio MCP server 和 executor stdio MCP server 的边界是什么？
- `make_rmcp_client` 怎样从 config transport 选择 stdio 或 streamable HTTP？
- remote executor transport 怎样把 stdout/stderr event stream 还原成 MCP JSON-RPC？
- Streamable HTTP 如何组合 bearer token、default headers、stored OAuth 和 runtime auth provider？
- operation timeout、`tools/list` transient retry、session-expired 404 recovery 在哪里处理？

## 职责边界

`rmcp-client` owns transport construction and RMCP service calls; `codex-mcp/src/rmcp_client.rs::make_rmcp_client` owns config/environment selection and passes the chosen launcher or HTTP client into `RmcpClient`.[E: codex-rs/rmcp-client/src/rmcp_client.rs:331][E: codex-rs/rmcp-client/src/rmcp_client.rs:351][E: codex-rs/rmcp-client/src/rmcp_client.rs:386][E: codex-rs/codex-mcp/src/rmcp_client.rs:920]

OAuth behavior is covered in `subsys.mcp.oauth`; this node only covers how OAuth-bearing transports are plugged into RMCP service operations.[E: codex-rs/rmcp-client/src/rmcp_client.rs:811][E: codex-rs/rmcp-client/src/rmcp_client.rs:900]

## 关键文件

- `codex-rs/rmcp-client/src/rmcp_client.rs`: transport recipes, client constructors, initialize, RMCP operations, pending transport creation, retry/recovery logic.[E: codex-rs/rmcp-client/src/rmcp_client.rs:321][E: codex-rs/rmcp-client/src/rmcp_client.rs:331][E: codex-rs/rmcp-client/src/rmcp_client.rs:351][E: codex-rs/rmcp-client/src/rmcp_client.rs:386][E: codex-rs/rmcp-client/src/rmcp_client.rs:424][E: codex-rs/rmcp-client/src/rmcp_client.rs:764][E: codex-rs/rmcp-client/src/rmcp_client.rs:939]
- `codex-rs/rmcp-client/src/stdio_server_launcher.rs`: stdio launch abstraction, local child process launcher, executor process launcher, remote env policy.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:72][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:95][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:238][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:442][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:468][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:560]
- `codex-rs/rmcp-client/src/executor_process_transport.rs`: executor process stdin/stdout/stderr adapter for rmcp `Transport`.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:94][E: codex-rs/rmcp-client/src/executor_process_transport.rs:99][E: codex-rs/rmcp-client/src/executor_process_transport.rs:106][E: codex-rs/rmcp-client/src/executor_process_transport.rs:109][E: codex-rs/rmcp-client/src/executor_process_transport.rs:113][E: codex-rs/rmcp-client/src/executor_process_transport.rs:116][E: codex-rs/rmcp-client/src/executor_process_transport.rs:162][E: codex-rs/rmcp-client/src/executor_process_transport.rs:204]
- `codex-rs/rmcp-client/src/utils.rs`: local vs remote env construction and HTTP default-header construction.[E: codex-rs/rmcp-client/src/utils.rs:12][E: codex-rs/rmcp-client/src/utils.rs:27][E: codex-rs/rmcp-client/src/utils.rs:42][E: codex-rs/rmcp-client/src/utils.rs:60]

## Config selection

- `make_rmcp_client` resolves server environment first, then branches on `McpServerTransportConfig::Stdio` or `StreamableHttp`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:931][E: codex-rs/codex-mcp/src/rmcp_client.rs:937][E: codex-rs/codex-mcp/src/rmcp_client.rs:975]
- Stdio uses `LocalStdioServerLauncher` for local environments and `ExecutorStdioServerLauncher` for non-local environments, then constructs `RmcpClient::new_stdio_client`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:952][E: codex-rs/codex-mcp/src/rmcp_client.rs:960][E: codex-rs/codex-mcp/src/rmcp_client.rs:965][E: codex-rs/codex-mcp/src/rmcp_client.rs:971]
- Streamable HTTP chooses a plain reqwest-backed HTTP client or the resolved environment's HTTP client, resolves any bearer token env var, then calls `RmcpClient::new_streamable_http_client`.[E: codex-rs/codex-mcp/src/rmcp_client.rs:981][E: codex-rs/codex-mcp/src/rmcp_client.rs:985][E: codex-rs/codex-mcp/src/rmcp_client.rs:990]

## Stdio transports

- `StdioServerLauncher` is the boundary between MCP lifecycle and process placement: it launches the configured command and returns a `StdioServerTransport` for rmcp.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:72][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:74][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:95]
- Local launch constructs a cleaned child process with explicit env, cwd, stdin/stdout pipes, stderr logging, and process-group setup on Unix.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:238][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:251][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:256][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:259][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:266][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:276]
- Executor launch requires explicit cwd, builds a remote env overlay, rejects non-Unicode argv/env, starts executor with `tty=false` and `pipe_stdin=true`, and wraps the process in `ExecutorProcessTransport`.[E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:468][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:479][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:488][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:494][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:500][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:507][E: codex-rs/rmcp-client/src/stdio_server_launcher.rs:519]

## Executor byte adapter

- `ExecutorProcessTransport::send` serializes an rmcp JSON-RPC message, appends a newline delimiter, and writes it to executor process stdin.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:162][E: codex-rs/rmcp-client/src/executor_process_transport.rs:173][E: codex-rs/rmcp-client/src/executor_process_transport.rs:174][E: codex-rs/rmcp-client/src/executor_process_transport.rs:175]
- `receive_message` drains buffered stdout lines, waits for executor process events, recovers lagged events via retained output, and treats stderr as diagnostics rather than protocol bytes.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:204][E: codex-rs/rmcp-client/src/executor_process_transport.rs:216][E: codex-rs/rmcp-client/src/executor_process_transport.rs:272][E: codex-rs/rmcp-client/src/executor_process_transport.rs:305]
- stdout/PTY chunks feed the MCP line buffer; stderr chunks are logged line-by-line and flushed on close.[E: codex-rs/rmcp-client/src/executor_process_transport.rs:305][E: codex-rs/rmcp-client/src/executor_process_transport.rs:311][E: codex-rs/rmcp-client/src/executor_process_transport.rs:316][E: codex-rs/rmcp-client/src/executor_process_transport.rs:346][E: codex-rs/rmcp-client/src/executor_process_transport.rs:360]

## Streamable HTTP and service operations

- `create_pending_transport` builds default headers, loads stored OAuth tokens only when no bearer/runtime auth/Authorization header is present, creates an OAuth transport when possible, otherwise constructs streamable HTTP with optional bearer token and runtime auth provider.[E: codex-rs/rmcp-client/src/rmcp_client.rs:764][E: codex-rs/rmcp-client/src/rmcp_client.rs:787][E: codex-rs/rmcp-client/src/rmcp_client.rs:796][E: codex-rs/rmcp-client/src/rmcp_client.rs:811][E: codex-rs/rmcp-client/src/rmcp_client.rs:858][E: codex-rs/rmcp-client/src/rmcp_client.rs:865]
- `connect_pending_transport` passes every pending transport variant to `rmcp::service::serve_client`; only OAuth transport returns an `OAuthPersistor` to the ready state.[E: codex-rs/rmcp-client/src/rmcp_client.rs:879][E: codex-rs/rmcp-client/src/rmcp_client.rs:887][E: codex-rs/rmcp-client/src/rmcp_client.rs:900][E: codex-rs/rmcp-client/src/rmcp_client.rs:909]
- `run_service_operation` wraps operations with active-time timeout, retries retryable streamable HTTP `tools/list` send errors, and reinitializes the transport once on session-expired 404 before retrying.[E: codex-rs/rmcp-client/src/rmcp_client.rs:181][E: codex-rs/rmcp-client/src/rmcp_client.rs:939][E: codex-rs/rmcp-client/src/rmcp_client.rs:977][E: codex-rs/rmcp-client/src/rmcp_client.rs:996][E: codex-rs/rmcp-client/src/rmcp_client.rs:1007][E: codex-rs/rmcp-client/src/rmcp_client.rs:1046][E: codex-rs/rmcp-client/src/rmcp_client.rs:1058][E: codex-rs/rmcp-client/src/rmcp_client.rs:1074][E: codex-rs/rmcp-client/src/rmcp_client.rs:1094]

## Sources

- codex-rs/rmcp-client/src/rmcp_client.rs
- codex-rs/rmcp-client/src/stdio_server_launcher.rs
- codex-rs/rmcp-client/src/executor_process_transport.rs
- codex-rs/rmcp-client/src/utils.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
