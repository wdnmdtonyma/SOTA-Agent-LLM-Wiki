---
id: subsys.mcp.server
title: MCP server
kind: subsystem
tier: T2
source: [codex-rs/mcp-server/src/message_processor.rs, codex-rs/mcp-server/src/codex_tool_config.rs, codex-rs/mcp-server/src/codex_tool_runner.rs]
symbols: [MessageProcessor, CodexToolCallParam, CodexToolCallReplyParam, create_tool_for_codex_tool_call_param, create_tool_for_codex_tool_call_reply_param, run_codex_tool_session, run_codex_tool_session_reply]
related: [subsys.mcp.client, subsys.mcp.transports, subsys.core.session-lifecycle, subsys.core.tool-router]
evidence: explicit
status: verified
updated: db887d03e1
---

> `codex-rs/mcp-server` is the reverse direction from `subsys.mcp.client`: it lets external MCP clients call Codex itself through two tools, `codex` for starting a session and `codex-reply` for continuing an existing thread.[E: codex-rs/mcp-server/src/message_processor.rs:41][E: codex-rs/mcp-server/src/message_processor.rs:313][E: codex-rs/mcp-server/src/message_processor.rs:331][E: codex-rs/mcp-server/src/codex_tool_config.rs:105][E: codex-rs/mcp-server/src/codex_tool_config.rs:224]

## 能回答的问题

- Codex MCP server 初始化时声明哪些 capabilities？
- `codex` 和 `codex-reply` 的输入 schema、输出 shape 和语义是什么？
- 外部 MCP client 调用 `codex` 后怎样启动 Codex thread？
- Codex events 怎样作为 MCP notifications 回传？
- cancellation notification 怎样映射到 Codex `Op::Interrupt`？

## 职责边界

`MessageProcessor` owns MCP JSON-RPC request/notification dispatch and tool routing; `codex_tool_config.rs` owns tool schemas and config conversion; `codex_tool_runner.rs` owns ThreadManager interaction, event streaming, approvals, and final `CallToolResult` response.[E: codex-rs/mcp-server/src/message_processor.rs:92][E: codex-rs/mcp-server/src/message_processor.rs:201][E: codex-rs/mcp-server/src/message_processor.rs:313][E: codex-rs/mcp-server/src/message_processor.rs:331][E: codex-rs/mcp-server/src/codex_tool_config.rs:21][E: codex-rs/mcp-server/src/codex_tool_runner.rs:57]

This crate does not connect to external MCP servers or qualify external tool names; that direction is covered by `subsys.mcp.client` and `subsys.mcp.name-qualification`.[I]

## 关键文件

- `codex-rs/mcp-server/src/message_processor.rs`: server-side request dispatch, initialize, tool list/call, reply handling, cancellation handling.[E: codex-rs/mcp-server/src/message_processor.rs:41][E: codex-rs/mcp-server/src/message_processor.rs:92][E: codex-rs/mcp-server/src/message_processor.rs:201][E: codex-rs/mcp-server/src/message_processor.rs:313][E: codex-rs/mcp-server/src/message_processor.rs:331][E: codex-rs/mcp-server/src/message_processor.rs:516]
- `codex-rs/mcp-server/src/codex_tool_config.rs`: `codex` and `codex-reply` input structs, enum mappings, schema builders, config conversion.[E: codex-rs/mcp-server/src/codex_tool_config.rs:21][E: codex-rs/mcp-server/src/codex_tool_config.rs:65][E: codex-rs/mcp-server/src/codex_tool_config.rs:85][E: codex-rs/mcp-server/src/codex_tool_config.rs:105][E: codex-rs/mcp-server/src/codex_tool_config.rs:141][E: codex-rs/mcp-server/src/codex_tool_config.rs:191][E: codex-rs/mcp-server/src/codex_tool_config.rs:224]
- `codex-rs/mcp-server/src/codex_tool_runner.rs`: Codex thread start/reply, event notifications, approval forwarding, structured tool result assembly.[E: codex-rs/mcp-server/src/codex_tool_runner.rs:36][E: codex-rs/mcp-server/src/codex_tool_runner.rs:57][E: codex-rs/mcp-server/src/codex_tool_runner.rs:80][E: codex-rs/mcp-server/src/codex_tool_runner.rs:194]

## Initialize and tools

- `MessageProcessor::new` creates a `ThreadManager` with `SessionSource::Mcp`, shared auth/config/environment state, thread store, and installation id.[E: codex-rs/mcp-server/src/message_processor.rs:52][E: codex-rs/mcp-server/src/message_processor.rs:69][E: codex-rs/mcp-server/src/message_processor.rs:72][E: codex-rs/mcp-server/src/message_processor.rs:77][E: codex-rs/mcp-server/src/message_processor.rs:79]
- `process_request` dispatches `InitializeRequest`, `ListToolsRequest`, `CallToolRequest`, and other MCP requests to handler methods; unsupported/custom paths are logged or handled separately.[E: codex-rs/mcp-server/src/message_processor.rs:92][E: codex-rs/mcp-server/src/message_processor.rs:97][E: codex-rs/mcp-server/src/message_processor.rs:124][E: codex-rs/mcp-server/src/message_processor.rs:127]
- `handle_initialize` rejects double initialize, records client info into the Codex user-agent suffix, returns server info for `codex-mcp-server`, enables tools and tool-list-changed capabilities, and preserves the non-spec `serverInfo.user_agent` field.[E: codex-rs/mcp-server/src/message_processor.rs:201][E: codex-rs/mcp-server/src/message_processor.rs:208][E: codex-rs/mcp-server/src/message_processor.rs:218][E: codex-rs/mcp-server/src/message_processor.rs:226][E: codex-rs/mcp-server/src/message_processor.rs:229][E: codex-rs/mcp-server/src/message_processor.rs:249][E: codex-rs/mcp-server/src/message_processor.rs:276]
- `handle_list_tools` returns exactly two tools: `codex` and `codex-reply`.[E: codex-rs/mcp-server/src/message_processor.rs:313][E: codex-rs/mcp-server/src/message_processor.rs:319][E: codex-rs/mcp-server/src/message_processor.rs:322][E: codex-rs/mcp-server/src/message_processor.rs:323]

## Tool schemas

- `CodexToolCallParam` requires `prompt` and accepts optional model, cwd, approval policy, sandbox mode, config overrides, base instructions, developer instructions, and compact prompt.[E: codex-rs/mcp-server/src/codex_tool_config.rs:21][E: codex-rs/mcp-server/src/codex_tool_config.rs:25][E: codex-rs/mcp-server/src/codex_tool_config.rs:27][E: codex-rs/mcp-server/src/codex_tool_config.rs:31][E: codex-rs/mcp-server/src/codex_tool_config.rs:36][E: codex-rs/mcp-server/src/codex_tool_config.rs:41][E: codex-rs/mcp-server/src/codex_tool_config.rs:45][E: codex-rs/mcp-server/src/codex_tool_config.rs:50][E: codex-rs/mcp-server/src/codex_tool_config.rs:54][E: codex-rs/mcp-server/src/codex_tool_config.rs:58][E: codex-rs/mcp-server/src/codex_tool_config.rs:62]
- Approval and sandbox enum wrappers map to core `AskForApproval` and `SandboxMode` values.[E: codex-rs/mcp-server/src/codex_tool_config.rs:65][E: codex-rs/mcp-server/src/codex_tool_config.rs:75][E: codex-rs/mcp-server/src/codex_tool_config.rs:85][E: codex-rs/mcp-server/src/codex_tool_config.rs:95]
- `create_tool_for_codex_tool_call_param` builds the `codex` tool with title `Codex` and raw output schema containing `threadId` and `content`.[E: codex-rs/mcp-server/src/codex_tool_config.rs:105][E: codex-rs/mcp-server/src/codex_tool_config.rs:119][E: codex-rs/mcp-server/src/codex_tool_config.rs:122][E: codex-rs/mcp-server/src/codex_tool_config.rs:126]
- `CodexToolCallReplyParam` accepts `threadId` and deprecated `conversationId`, and `get_thread_id` accepts either field; `create_tool_for_codex_tool_call_reply_param` builds the `codex-reply` tool with the same output schema.[E: codex-rs/mcp-server/src/codex_tool_config.rs:191][E: codex-rs/mcp-server/src/codex_tool_config.rs:196][E: codex-rs/mcp-server/src/codex_tool_config.rs:202][E: codex-rs/mcp-server/src/codex_tool_config.rs:208][E: codex-rs/mcp-server/src/codex_tool_config.rs:224][E: codex-rs/mcp-server/src/codex_tool_config.rs:238]

## Execution flow

- `handle_call_tool` routes raw tool name `codex` to session start and `codex-reply` to existing-session reply; unknown tools return an MCP error `CallToolResult`.[E: codex-rs/mcp-server/src/message_processor.rs:331][E: codex-rs/mcp-server/src/message_processor.rs:337][E: codex-rs/mcp-server/src/message_processor.rs:338][E: codex-rs/mcp-server/src/message_processor.rs:339][E: codex-rs/mcp-server/src/message_processor.rs:343]
- `codex` parses `CodexToolCallParam`, converts it into a Codex `Config`, then spawns `run_codex_tool_session` so the message-processing loop is not blocked.[E: codex-rs/mcp-server/src/message_processor.rs:352][E: codex-rs/mcp-server/src/message_processor.rs:358][E: codex-rs/mcp-server/src/message_processor.rs:392][E: codex-rs/mcp-server/src/message_processor.rs:396]
- `run_codex_tool_session` starts a thread through `ThreadManager`, emits a `SessionConfigured` notification with request/thread metadata, records the MCP request id to thread id mapping, and submits initial `Op::UserInput`.[E: codex-rs/mcp-server/src/codex_tool_runner.rs:57][E: codex-rs/mcp-server/src/codex_tool_runner.rs:65][E: codex-rs/mcp-server/src/codex_tool_runner.rs:80][E: codex-rs/mcp-server/src/codex_tool_runner.rs:85][E: codex-rs/mcp-server/src/codex_tool_runner.rs:99][E: codex-rs/mcp-server/src/codex_tool_runner.rs:103]
- `codex-reply` parses thread id/prompt, looks up the existing thread, and spawns `run_codex_tool_session_reply`; missing threads return a structured result with `is_error=true`.[E: codex-rs/mcp-server/src/message_processor.rs:408][E: codex-rs/mcp-server/src/message_processor.rs:417][E: codex-rs/mcp-server/src/message_processor.rs:441][E: codex-rs/mcp-server/src/message_processor.rs:457][E: codex-rs/mcp-server/src/message_processor.rs:461][E: codex-rs/mcp-server/src/message_processor.rs:471]
- The runner streams each Codex event as an MCP notification, handles approval request events specially, returns error events as `CallToolResult` with `is_error=true`, and on `TurnComplete` returns the last agent message plus `threadId`/`content` structured content.[E: codex-rs/mcp-server/src/codex_tool_runner.rs:203][E: codex-rs/mcp-server/src/codex_tool_runner.rs:206][E: codex-rs/mcp-server/src/codex_tool_runner.rs:208][E: codex-rs/mcp-server/src/codex_tool_runner.rs:219][E: codex-rs/mcp-server/src/codex_tool_runner.rs:256][E: codex-rs/mcp-server/src/codex_tool_runner.rs:303][E: codex-rs/mcp-server/src/codex_tool_runner.rs:310]

## Cancellation

`notifications/cancelled` looks up the thread id by request id, fetches the Codex thread, submits `Op::Interrupt` with the original MCP request id string, and removes the request-id mapping.[E: codex-rs/mcp-server/src/message_processor.rs:516][E: codex-rs/mcp-server/src/message_processor.rs:522][E: codex-rs/mcp-server/src/message_processor.rs:534][E: codex-rs/mcp-server/src/message_processor.rs:543][E: codex-rs/mcp-server/src/message_processor.rs:545][E: codex-rs/mcp-server/src/message_processor.rs:557]

## Sources

- codex-rs/mcp-server/src/message_processor.rs
- codex-rs/mcp-server/src/codex_tool_config.rs
- codex-rs/mcp-server/src/codex_tool_runner.rs
