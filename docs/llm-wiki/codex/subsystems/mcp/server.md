---
id: subsys.mcp.server
title: MCP server
kind: subsystem
tier: T2
source: [codex-rs/mcp-server/src/message_processor.rs, codex-rs/mcp-server/src/codex_tool_config.rs, codex-rs/mcp-server/src/codex_tool_runner.rs]
symbols: [MessageProcessor, CodexToolCallParam, CodexToolCallReplyParam, create_tool_for_codex_tool_call_param, create_tool_for_codex_tool_call_reply_param, run_codex_tool_session, run_codex_tool_session_reply]
related: [subsys.mcp.client, subsys.mcp.transports, subsys.core.session-lifecycle, subsys.core.tool-system]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> `codex-rs/mcp-server` 是 Codex 自己作为 MCP server 暴露给外部 MCP client 的实现；它通过 `MessageProcessor` 处理 MCP requests，并暴露 `codex` 与 `codex-reply` 两个 tools。[E: codex-rs/mcp-server/src/message_processor.rs:41][E: codex-rs/mcp-server/src/message_processor.rs:314][E: codex-rs/mcp-server/src/codex_tool_config.rs:122][E: codex-rs/mcp-server/src/codex_tool_config.rs:247]

## 能回答的问题

- Codex MCP server 初始化时声明哪些 capabilities？
- `codex` 和 `codex-reply` 两个 tools 的输入、输出和语义是什么？
- 外部 MCP client 调用 `codex` 后，Codex session 怎样启动、事件怎样回传？
- cancellation notification 怎样映射到 Codex thread interrupt？
- 为什么 `codex-reply` 支持 `conversationId` 和 `threadId` 两个字段？

## 职责边界

`MessageProcessor` 负责 MCP JSON-RPC request/notification/response dispatch、初始化握手、tool list、tool call、cancellation；Codex turn 执行由 `codex_tool_runner.rs` 通过 `ThreadManager` 和 Codex thread 完成。[E: codex-rs/mcp-server/src/message_processor.rs:41][E: codex-rs/mcp-server/src/message_processor.rs:89][E: codex-rs/mcp-server/src/message_processor.rs:116][E: codex-rs/mcp-server/src/message_processor.rs:119][E: codex-rs/mcp-server/src/message_processor.rs:160][E: codex-rs/mcp-server/src/message_processor.rs:166][E: codex-rs/mcp-server/src/codex_tool_runner.rs:67]

`codex-rs/mcp-server` 不负责连接外部 MCP servers，也不负责 name qualification；外部 server 连接与 tool aggregation 在 `subsys.mcp.client`。[I]

## 关键 crate/文件

- `codex-rs/mcp-server/src/message_processor.rs`: MCP request/notification dispatcher、initialize/list tools/call tools/cancel handlers。[E: codex-rs/mcp-server/src/message_processor.rs:41][E: codex-rs/mcp-server/src/message_processor.rs:84][E: codex-rs/mcp-server/src/message_processor.rs:166][E: codex-rs/mcp-server/src/message_processor.rs:171][E: codex-rs/mcp-server/src/message_processor.rs:314][E: codex-rs/mcp-server/src/message_processor.rs:337][E: codex-rs/mcp-server/src/message_processor.rs:550]
- `codex-rs/mcp-server/src/codex_tool_config.rs`: `codex` 和 `codex-reply` tool schema、input structs、config override conversion。[E: codex-rs/mcp-server/src/codex_tool_config.rs:20][E: codex-rs/mcp-server/src/codex_tool_config.rs:122][E: codex-rs/mcp-server/src/codex_tool_config.rs:152][E: codex-rs/mcp-server/src/codex_tool_config.rs:173][E: codex-rs/mcp-server/src/codex_tool_config.rs:188][E: codex-rs/mcp-server/src/codex_tool_config.rs:194][E: codex-rs/mcp-server/src/codex_tool_config.rs:201][E: codex-rs/mcp-server/src/codex_tool_config.rs:247]
- `codex-rs/mcp-server/src/codex_tool_runner.rs`: Codex thread start/reply、event notification streaming、CallToolResult 组装。[E: codex-rs/mcp-server/src/codex_tool_runner.rs:36][E: codex-rs/mcp-server/src/codex_tool_runner.rs:67][E: codex-rs/mcp-server/src/codex_tool_runner.rs:154][E: codex-rs/mcp-server/src/codex_tool_runner.rs:207]

## 数据模型

- `MessageProcessor` 保存 outgoing sender、initialized flag、arg0 paths、`ThreadManager`、以及 request id 到 `ThreadId` 的 `running_requests` map。[E: codex-rs/mcp-server/src/message_processor.rs:41][E: codex-rs/mcp-server/src/message_processor.rs:42][E: codex-rs/mcp-server/src/message_processor.rs:43][E: codex-rs/mcp-server/src/message_processor.rs:44][E: codex-rs/mcp-server/src/message_processor.rs:46]
- `CodexToolCallParam` 的 `prompt` 是 required 字段，`model`、`profile`、`cwd`、`approval_policy`、`sandbox`、`config`、instructions 等是 optional overrides。[E: codex-rs/mcp-server/src/codex_tool_config.rs:25][E: codex-rs/mcp-server/src/codex_tool_config.rs:29][E: codex-rs/mcp-server/src/codex_tool_config.rs:33][E: codex-rs/mcp-server/src/codex_tool_config.rs:38][E: codex-rs/mcp-server/src/codex_tool_config.rs:43][E: codex-rs/mcp-server/src/codex_tool_config.rs:47][E: codex-rs/mcp-server/src/codex_tool_config.rs:52][E: codex-rs/mcp-server/src/codex_tool_config.rs:56][E: codex-rs/mcp-server/src/codex_tool_config.rs:60][E: codex-rs/mcp-server/src/codex_tool_config.rs:64]
- `ApprovalPolicy` enum 把 MCP input 中的 `untrusted`、`on-failure`、`on-request`、`never` 映射到 core approval policy。[E: codex-rs/mcp-server/src/codex_tool_config.rs:71][E: codex-rs/mcp-server/src/codex_tool_config.rs:72][E: codex-rs/mcp-server/src/codex_tool_config.rs:73][E: codex-rs/mcp-server/src/codex_tool_config.rs:74][E: codex-rs/mcp-server/src/codex_tool_config.rs:75][E: codex-rs/mcp-server/src/codex_tool_config.rs:81][E: codex-rs/mcp-server/src/codex_tool_config.rs:82][E: codex-rs/mcp-server/src/codex_tool_config.rs:83][E: codex-rs/mcp-server/src/codex_tool_config.rs:84]
- `SandboxMode` enum 把 `read-only`、`workspace-write`、`danger-full-access` 映射到 core `SandboxMode`。[E: codex-rs/mcp-server/src/codex_tool_config.rs:92][E: codex-rs/mcp-server/src/codex_tool_config.rs:94][E: codex-rs/mcp-server/src/codex_tool_config.rs:95][E: codex-rs/mcp-server/src/codex_tool_config.rs:96][E: codex-rs/mcp-server/src/codex_tool_config.rs:102][E: codex-rs/mcp-server/src/codex_tool_config.rs:103][E: codex-rs/mcp-server/src/codex_tool_config.rs:104]
- `CodexToolCallReplyParam` 同时接受 deprecated `conversationId` 和 preferred `threadId`，`get_thread_id` 优先使用 `threadId`，再回退到 `conversationId`。[E: codex-rs/mcp-server/src/codex_tool_config.rs:204][E: codex-rs/mcp-server/src/codex_tool_config.rs:206][E: codex-rs/mcp-server/src/codex_tool_config.rs:211][E: codex-rs/mcp-server/src/codex_tool_config.rs:212][E: codex-rs/mcp-server/src/codex_tool_config.rs:220][E: codex-rs/mcp-server/src/codex_tool_config.rs:223][E: codex-rs/mcp-server/src/codex_tool_config.rs:224]

## 控制流

1. `MessageProcessor::new` 创建 `AuthManager`，禁用 API key env login，构造 `ThreadManager`，并把 `config.features.enabled(Feature::DefaultModeRequestUserInput)` 的结果传给 `CollaborationModesConfig`。[E: codex-rs/mcp-server/src/message_processor.rs:59][E: codex-rs/mcp-server/src/message_processor.rs:61][E: codex-rs/mcp-server/src/message_processor.rs:66][E: codex-rs/mcp-server/src/message_processor.rs:68][E: codex-rs/mcp-server/src/message_processor.rs:70]
2. `process_request` 根据 `ClientRequest` 分支处理 initialize、ping、list tools、call tool；prompts/resources/subscriptions/task 相关请求返回 method-not-found 或专用 handler。[E: codex-rs/mcp-server/src/message_processor.rs:84][E: codex-rs/mcp-server/src/message_processor.rs:89][E: codex-rs/mcp-server/src/message_processor.rs:92][E: codex-rs/mcp-server/src/message_processor.rs:116][E: codex-rs/mcp-server/src/message_processor.rs:119][E: codex-rs/mcp-server/src/message_processor.rs:128]
3. initialize 拒绝第二次初始化，把 client info 写入 `USER_AGENT_SUFFIX`，serverInfo 使用 `codex-mcp-server`、title `Codex`、version，并声明 `tools.listChanged = true`。[E: codex-rs/mcp-server/src/message_processor.rs:200][E: codex-rs/mcp-server/src/message_processor.rs:213][E: codex-rs/mcp-server/src/message_processor.rs:214][E: codex-rs/mcp-server/src/message_processor.rs:219][E: codex-rs/mcp-server/src/message_processor.rs:220][E: codex-rs/mcp-server/src/message_processor.rs:221][E: codex-rs/mcp-server/src/message_processor.rs:247][E: codex-rs/mcp-server/src/message_processor.rs:250]
4. `handle_list_tools` 返回两个 tools：`create_tool_for_codex_tool_call_param()` 和 `create_tool_for_codex_tool_call_reply_param()`，且 `next_cursor` 为 `None`。[E: codex-rs/mcp-server/src/message_processor.rs:314][E: codex-rs/mcp-server/src/message_processor.rs:320][E: codex-rs/mcp-server/src/message_processor.rs:323][E: codex-rs/mcp-server/src/message_processor.rs:324][E: codex-rs/mcp-server/src/message_processor.rs:326]
5. `handle_call_tool` 只分派 `"codex"` 与 `"codex-reply"`；未知 tool 返回 `is_error: Some(true)` 和 text `Unknown tool '<name>'`。[E: codex-rs/mcp-server/src/message_processor.rs:338][E: codex-rs/mcp-server/src/message_processor.rs:339][E: codex-rs/mcp-server/src/message_processor.rs:340][E: codex-rs/mcp-server/src/message_processor.rs:344][E: codex-rs/mcp-server/src/message_processor.rs:346][E: codex-rs/mcp-server/src/message_processor.rs:348]
6. `handle_tool_call_codex` 先反序列化 `CodexToolCallParam` 并转换 config；`arguments == None` 返回 missing arguments tool error，字段缺失等反序列化失败返回 parse-error tool result；成功后 spawn async task 调用 `run_codex_tool_session`，避免阻塞 message loop。[E: codex-rs/mcp-server/src/message_processor.rs:361][E: codex-rs/mcp-server/src/message_processor.rs:363][E: codex-rs/mcp-server/src/message_processor.rs:364][E: codex-rs/mcp-server/src/message_processor.rs:379][E: codex-rs/mcp-server/src/message_processor.rs:392][E: codex-rs/mcp-server/src/message_processor.rs:406][E: codex-rs/mcp-server/src/message_processor.rs:415]
7. `run_codex_tool_session` 启动 Codex thread，发送 `SessionConfigured` notification，把 request id 映射到 thread id，然后提交 `Op::UserInput`。[E: codex-rs/mcp-server/src/codex_tool_runner.rs:71][E: codex-rs/mcp-server/src/codex_tool_runner.rs:90][E: codex-rs/mcp-server/src/codex_tool_runner.rs:104][E: codex-rs/mcp-server/src/codex_tool_runner.rs:107][E: codex-rs/mcp-server/src/codex_tool_runner.rs:110]
8. `run_codex_tool_session_inner` 循环读取 Codex events，并把每个 event 作为 notification 发给 MCP client；`TurnComplete` 返回包含 `threadId` 和最后 assistant message 的 CallToolResult。[E: codex-rs/mcp-server/src/codex_tool_runner.rs:207][E: codex-rs/mcp-server/src/codex_tool_runner.rs:210][E: codex-rs/mcp-server/src/codex_tool_runner.rs:298][E: codex-rs/mcp-server/src/codex_tool_runner.rs:307]
9. `codex-reply` path 解析 `CodexToolCallReplyParam`、用 `get_thread_id` 定位 conversation、查找 thread，再 spawn `run_codex_tool_session_reply`。[E: codex-rs/mcp-server/src/message_processor.rs:435][E: codex-rs/mcp-server/src/message_processor.rs:470][E: codex-rs/mcp-server/src/message_processor.rs:491][E: codex-rs/mcp-server/src/message_processor.rs:505]
10. cancellation notification 通过 `running_requests` 找到 thread id，调用 `submit_with_id(... Op::Interrupt ...)`；只有 interrupt submit 成功后才移除 request mapping。[E: codex-rs/mcp-server/src/message_processor.rs:550][E: codex-rs/mcp-server/src/message_processor.rs:558][E: codex-rs/mcp-server/src/message_processor.rs:577][E: codex-rs/mcp-server/src/message_processor.rs:586][E: codex-rs/mcp-server/src/message_processor.rs:590]

## 设计动机与权衡

- `codex` tool 的 output schema 要求 `threadId` 和 `content`，`create_call_tool_result_with_thread_id` 同时填充 text content 和 structured_content，方便 MCP clients 同时读自然语言和结构化 thread id。[E: codex-rs/mcp-server/src/codex_tool_config.rs:137][E: codex-rs/mcp-server/src/codex_tool_config.rs:141][E: codex-rs/mcp-server/src/codex_tool_runner.rs:36][E: codex-rs/mcp-server/src/codex_tool_runner.rs:45]
- `create_tool_input_schema` 只保留 `properties`、`required`、`type`、`$defs`、`definitions`，这是对 schemars 输出做 MCP tool schema 精简的实现。[E: codex-rs/mcp-server/src/codex_tool_config.rs:261][E: codex-rs/mcp-server/src/codex_tool_config.rs:267][E: codex-rs/mcp-server/src/codex_tool_config.rs:276]
- runner 对 approval request events 有专门处理分支，说明 MCP server mode 会把 Codex 内部交互继续桥接给外部 client，而不是只返回 final answer。[E: codex-rs/mcp-server/src/codex_tool_runner.rs:221][E: codex-rs/mcp-server/src/codex_tool_runner.rs:276][I]

## gotcha

- initialize response 还写入了非 spec 的 `serverInfo.user_agent` 字段；这是通过 `serde_json::to_value` 后手动插入完成的，不应把它误认为标准 MCP capability。[E: codex-rs/mcp-server/src/message_processor.rs:228][E: codex-rs/mcp-server/src/message_processor.rs:243][E: codex-rs/mcp-server/src/message_processor.rs:244][I]
- `codex-reply` 的 `conversationId` 是 deprecated 兼容字段；新集成应传 `threadId`，否则 `get_thread_id` 仍会接受旧字段。[E: codex-rs/mcp-server/src/codex_tool_config.rs:204][E: codex-rs/mcp-server/src/codex_tool_config.rs:211][E: codex-rs/mcp-server/src/codex_tool_config.rs:220][E: codex-rs/mcp-server/src/codex_tool_config.rs:223][E: codex-rs/mcp-server/src/codex_tool_config.rs:224]
- `handle_tool_call_codex` 在 `arguments` 整体缺失时返回 tool-level missing-arguments result；`prompt` 字段缺失属于反序列化失败路径，因为 `CodexToolCallParam::prompt` 不是 `Option` 且 `serde_json::from_value` 的 `Err` 分支返回 parse-error tool result。[E: codex-rs/mcp-server/src/codex_tool_config.rs:25][E: codex-rs/mcp-server/src/message_processor.rs:363][E: codex-rs/mcp-server/src/message_processor.rs:379][E: codex-rs/mcp-server/src/message_processor.rs:392][E: codex-rs/mcp-server/src/message_processor.rs:397]

## Sources

- codex-rs/mcp-server/src/message_processor.rs
- codex-rs/mcp-server/src/codex_tool_config.rs
- codex-rs/mcp-server/src/codex_tool_runner.rs

## 相关

- `subsys.mcp.client`
- `subsys.mcp.transports`
- `subsys.core.session-lifecycle`
- `subsys.core.tool-system`
