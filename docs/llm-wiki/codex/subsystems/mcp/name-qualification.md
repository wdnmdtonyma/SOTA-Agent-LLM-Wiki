---
id: subsys.mcp.name-qualification
title: MCP name qualification
kind: subsystem
tier: T2
source: [codex-rs/codex-mcp/src/tools.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/codex-mcp/src/mcp/mod.rs]
symbols: [normalize_tools_for_model_with_prefix, CallableToolCandidate, unique_callable_parts, fit_callable_parts_with_hash, append_hash_suffix, append_namespace_hash_suffix, sanitize_responses_api_tool_name]
related: [subsys.mcp.client, subsys.mcp.connectors, tool.mcp-namespace-tools, spine.trace-mcp-call]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> MCP name qualification now lives in `codex-mcp/src/tools.rs`: raw MCP server/tool identities remain available for protocol routing, while `callable_namespace` and `callable_name` are sanitized, deduplicated, optionally legacy-prefixed, and bounded to the Responses API 64-byte model-visible name limit.[E: codex-rs/codex-mcp/src/tools.rs:1][E: codex-rs/codex-mcp/src/tools.rs:25][E: codex-rs/codex-mcp/src/tools.rs:105]

## 能回答的问题

- 旧的 `mcp__` prefix 现在何时出现？
- raw server/tool name 与 model-visible namespace/name 怎样分离？
- sanitized namespace 冲突、tool name 冲突、最终 64-byte 限制分别怎样处理？
- duplicate raw tool identity 会怎样处理？
- Codex Apps connector metadata 怎样影响 callable seed？

## 职责边界

本节点只覆盖 MCP tool names 从 raw identity 到 model-visible `ToolName(namespace, name)` 的转换；tool 是否启用由 `ToolFilter` 处理，tool 执行由 `McpConnectionManager::call_tool` 调用 raw server/tool name，Responses API tool router 由 core tool spec 层负责。[E: codex-rs/codex-mcp/src/tools.rs:67][E: codex-rs/codex-mcp/src/tools.rs:98][E: codex-rs/codex-mcp/src/connection_manager.rs:837][I]

已删除的旧文件 `codex-rs/codex-mcp/src/mcp_tool_names.rs` 不再是 source；当前 canonical implementation 是 `codex-rs/codex-mcp/src/tools.rs`。[E: codex-rs/codex-mcp/src/tools.rs:1]

## 关键文件

- `codex-rs/codex-mcp/src/tools.rs`: `ToolInfo`、legacy prefix、name normalization、collision hashing、64-byte fitting；file-schema shaping no longer belongs to this name-only module。[E: codex-rs/codex-mcp/src/tools.rs:1][E: codex-rs/codex-mcp/src/tools.rs:25][E: codex-rs/codex-mcp/src/tools.rs:224][E: codex-rs/codex-mcp/src/tools.rs:225]
- `codex-rs/codex-mcp/src/rmcp_client.rs`: uncached listing creates initial `callable_name` and `callable_namespace` seeds before global normalization.[E: codex-rs/codex-mcp/src/rmcp_client.rs:625][E: codex-rs/codex-mcp/src/rmcp_client.rs:758][E: codex-rs/codex-mcp/src/rmcp_client.rs:763][E: codex-rs/codex-mcp/src/rmcp_client.rs:806][E: codex-rs/codex-mcp/src/rmcp_client.rs:807]
- `codex-rs/codex-mcp/src/mcp/mod.rs`: defines `sanitize_responses_api_tool_name`; `tools.rs` imports and uses it before collision handling.[E: codex-rs/codex-mcp/src/mcp/mod.rs:439][E: codex-rs/codex-mcp/src/tools.rs:20][E: codex-rs/codex-mcp/src/tools.rs:138][E: codex-rs/codex-mcp/src/tools.rs:145]

## 数据模型

- `ToolInfo.tool.name` is the raw MCP tool name sent back to the MCP server; `ToolInfo.callable_namespace` and `ToolInfo.callable_name` are the model-visible values after qualification.[E: codex-rs/codex-mcp/src/tools.rs:34][E: codex-rs/codex-mcp/src/tools.rs:37][E: codex-rs/codex-mcp/src/tools.rs:44]
- `canonical_tool_name` creates a namespaced protocol `ToolName` from `callable_namespace` and `callable_name`, not from the raw MCP `tool.name`.[E: codex-rs/codex-mcp/src/tools.rs:57]
- `LEGACY_MCP_TOOL_NAME_PREFIX` is the literal `mcp__`; when `prefix_mcp_tool_names` is true, it is added to the namespace unless the namespace already starts with that prefix.[E: codex-rs/codex-mcp/src/tools.rs:22][E: codex-rs/codex-mcp/src/tools.rs:111][E: codex-rs/codex-mcp/src/tools.rs:227]
- The final model-visible concatenation is constrained by `MCP_TOOL_NAME_DELIMITER` (`__`) and `MAX_TOOL_NAME_LENGTH` (`64`); hash suffixes use 12 hex chars plus a leading underscore.[E: codex-rs/codex-mcp/src/tools.rs:224][E: codex-rs/codex-mcp/src/tools.rs:225][E: codex-rs/codex-mcp/src/tools.rs:226][E: codex-rs/codex-mcp/src/tools.rs:242]

## Normalization pipeline

1. `normalize_tools_for_model_with_prefix` builds a raw namespace identity from server name, callable namespace seed, and connector id; it builds a raw tool identity by adding callable name seed and raw MCP tool name.[E: codex-rs/codex-mcp/src/tools.rs:113][E: codex-rs/codex-mcp/src/tools.rs:123][E: codex-rs/codex-mcp/src/tools.rs:129]
2. Exact duplicate raw tool identities are skipped with a warning before collision handling.[E: codex-rs/codex-mcp/src/tools.rs:133]
3. Namespace and tool seed strings are sanitized with `sanitize_responses_api_tool_name`, and optional legacy prefixing is applied to namespace seeds.[E: codex-rs/codex-mcp/src/tools.rs:138][E: codex-rs/codex-mcp/src/tools.rs:145][E: codex-rs/codex-mcp/src/tools.rs:227]
4. If multiple raw namespace identities collapse to the same model namespace, the namespace gets a hash suffix based on raw namespace identity.[E: codex-rs/codex-mcp/src/tools.rs:152][E: codex-rs/codex-mcp/src/tools.rs:159][E: codex-rs/codex-mcp/src/tools.rs:163][E: codex-rs/codex-mcp/src/tools.rs:251]
5. If multiple raw tool identities collapse to the same `(namespace, tool)` pair, the callable tool name gets a hash suffix based on raw tool identity.[E: codex-rs/codex-mcp/src/tools.rs:172][E: codex-rs/codex-mcp/src/tools.rs:182][E: codex-rs/codex-mcp/src/tools.rs:186][E: codex-rs/codex-mcp/src/tools.rs:247]
6. Candidates are sorted by raw identity, then `unique_callable_parts` enforces final uniqueness and the 64-byte budget, retrying with attempt-numbered hash input if a fitted result is still taken.[E: codex-rs/codex-mcp/src/tools.rs:196][E: codex-rs/codex-mcp/src/tools.rs:201][E: codex-rs/codex-mcp/src/tools.rs:288][E: codex-rs/codex-mcp/src/tools.rs:300]

## Codex Apps seeds

- `list_tools_for_client_uncached` asks the underlying RMCP client for tools plus optional connector metadata, then dispatches to Codex Apps or regular MCP conversion before global normalization.[E: codex-rs/codex-mcp/src/rmcp_client.rs:634][E: codex-rs/codex-mcp/src/rmcp_client.rs:641][E: codex-rs/codex-mcp/src/rmcp_client.rs:734][E: codex-rs/codex-mcp/src/rmcp_client.rs:740][E: codex-rs/codex-mcp/src/rmcp_client.rs:743]
- Non-Codex-Apps servers cannot smuggle connector metadata into model-visible qualification: the regular MCP conversion strips untrusted connector meta and sets connector id/name to `None`, while preserving raw tool names and server-name namespaces.[E: codex-rs/codex-mcp/src/rmcp_client.rs:795][E: codex-rs/codex-mcp/src/rmcp_client.rs:801][E: codex-rs/codex-mcp/src/rmcp_client.rs:806][E: codex-rs/codex-mcp/src/rmcp_client.rs:807][E: codex-rs/codex-mcp/src/rmcp_client.rs:811][E: codex-rs/codex-mcp/src/rmcp_client.rs:812]

## Sources

- codex-rs/codex-mcp/src/tools.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
- codex-rs/codex-mcp/src/mcp/mod.rs
