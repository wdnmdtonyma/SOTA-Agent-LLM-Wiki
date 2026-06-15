---
id: subsys.mcp.name-qualification
title: MCP name qualification
kind: subsystem
tier: T2
source: [codex-rs/codex-mcp/src/mcp_tool_names.rs, codex-rs/codex-mcp/src/mcp_connection_manager.rs]
symbols: [qualify_tools, CallableToolCandidate, unique_callable_parts, fit_callable_parts_with_hash, append_hash_suffix, append_namespace_hash_suffix, sanitize_responses_api_tool_name]
related: [subsys.mcp.client, subsys.mcp.connectors, tool.mcp-namespace-tools, spine.trace-mcp-call]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> MCP name qualification 把 server-local tool identity 变成 OpenAI Responses API 可接受且全局唯一的 `ToolName(namespace, name)`；普通 MCP server 与 Codex Apps connector 使用不同 namespace seed，但最终都经过同一 collision/hash/truncate 流程。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:106][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:118][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:188]

## 能回答的问题

- 模型看到的 MCP tool name 为什么是 `mcp__...__...`？
- 64 字符限制怎样处理长 namespace/tool name？
- 两个 raw server/connector 生成同一个 sanitized namespace 时怎样避免冲突？
- Codex Apps connector name/id 怎样影响 namespace 和 callable tool name？
- duplicate raw tool identity 会怎样处理？

## 职责边界

`mcp_tool_names.rs` 只负责 canonical naming，不负责 tool filtering、tool registry exposure、approval 或执行；`mcp_connection_manager.rs` 负责生成 `ToolInfo.callable_namespace` 和 `ToolInfo.callable_name` seed，再调用 `qualify_tools`。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:106][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1354][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1774][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1775][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:933]

## 关键 crate/文件

- `codex-rs/codex-mcp/src/mcp_tool_names.rs`: delimiter、max length、hash suffix、collision detection、final map assembly。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:13][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:14][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:15][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:106]
- `codex-rs/codex-mcp/src/mcp_connection_manager.rs`: Codex Apps connector title/name normalization、namespace seed 生成、tool list 转 `ToolInfo`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1293][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1319][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1354][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1751]

## 数据模型

- delimiter 是双下划线 `__`，max callable name length 是 64，hash digest 部分长度是 12 hex；实际 suffix 字符串还包含前导 `_`。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:13][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:14][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:15][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:24][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:26]
- `CallableToolCandidate` 记录 raw namespace identity、raw tool identity、sanitized namespace、sanitized name、server-local `ToolInfo`。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:97][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:99][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:100][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:101][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:102]
- raw namespace identity 由 server name、callable namespace、connector id 组成；raw tool identity 在 raw namespace identity 基础上加入 callable name 和 raw tool name。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:118][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:120][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:124][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:126]

## 控制流

1. `qualify_tools` 遍历 `ToolInfo` iterator，先构造 raw namespace/tool identities；重复 raw tool identity 会 warning 并跳过。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:111][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:113][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:118][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:124][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:128]
2. 初始 candidate 会对 namespace 和 name 调用 `sanitize_responses_api_tool_name`，保证之后进入 Responses tool name 约束空间。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:133][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:136][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:139]
3. namespace collision 检测按 sanitized namespace 分组，若同一 sanitized namespace 对应多个 raw namespace identity，就对 namespace append hash。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:142][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:148][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:153][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:158]
4. tool name collision 检测按 `(namespace, name)` 分组，若同一 pair 对应多个 raw tool identity，就对 tool name append hash。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:162][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:169][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:176][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:181]
5. candidates 按 raw tool identity 排序后，`unique_callable_parts` 在 64 字符限制内生成唯一 namespace/name pair，并写回 `candidate.tool.callable_namespace` 和 `candidate.tool.callable_name`。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:186][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:188][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:197][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:198]
6. `unique_callable_parts` 如果原始 `namespace + tool_name` 长度不超过 64 且未使用，直接返回原 pair；否则循环 append hash 并记录 used full name。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:69][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:75][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:80][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:89]
7. `fit_callable_parts_with_hash` 在 namespace 留得下 suffix 时保留 namespace 并截断 tool 前缀；否则截断 namespace，callable name 只保留 hash suffix。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:50][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:56][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:58][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:60][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:66]
8. `list_all_tools` 的最终输出就是 `qualify_tools(tools)`，因此 core 后续看到的是 qualified map，而不是 raw MCP server tool list。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:925][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:933]

## 设计动机与权衡

- Hash 使用 SHA1 前 12 hex 作为稳定短 suffix；这不是安全用途，而是为 collision/length 管理提供稳定可读 name。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:17][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:22][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:29][I]
- 普通 MCP server namespace seed 是 `mcp__{server_name}__`；Codex Apps 如果有 connector name，则 namespace seed 是 `mcp__{server_name}__{sanitized connector name}`，其中 server name 来自调用方传入的 `server_name`。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1358][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1362][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1364][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1366][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1369]
- Codex Apps callable name 会去掉 sanitized connector_name 或 connector_id 前缀，避免最终 tool name 重复表达 connector。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1329][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1333][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1335][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1338][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1343][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1345][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1348]

## gotcha

- duplicate raw tool identity 会被跳过而非报错；如果 server 返回重复 tool，后一个 duplicate 不会进入 candidate list。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:128][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:130]
- namespace/name 的 64 字符限制是拼接后的 full callable name 限制，不是每个部分各 64 个字符。[E: codex-rs/codex-mcp/src/mcp_tool_names.rs:56][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:65][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:75][E: codex-rs/codex-mcp/src/mcp_tool_names.rs:76]
- Codex Apps connector title 会尝试移除 connector prefix；display title 与 callable tool name 不是同一个 normalization path。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1293][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1319]

## Sources

- codex-rs/codex-mcp/src/mcp_tool_names.rs
- codex-rs/codex-mcp/src/mcp_connection_manager.rs

## 相关

- `subsys.mcp.client`
- `subsys.mcp.connectors`
- `tool.mcp-namespace-tools`
- `spine.trace-mcp-call`
