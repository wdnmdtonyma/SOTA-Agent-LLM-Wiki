---
id: config.mcp-tools
title: MCP 与工具设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/mcp_types.rs, codex-rs/protocol/src/config_types.rs, codex-rs/core/src/config/mod.rs, codex-rs/features/src/lib.rs]
symbols: [McpServerConfig, McpServerAuth, OAuthCredentialsStoreMode, AppToolApproval, ToolsToml, ToolSuggestConfig]
related: [tool.mcp-namespace-tools, tool.web-search, config.skills-plugins-features, subsys.mcp.client]
evidence: explicit
status: verified
updated: 7750465934
---

> MCP 与工具设置 catalog 覆盖 ConfigToml 中 MCP server definitions、MCP OAuth callback/storage、Apps MCP product SKU、tool output/background terminal limits、web search mode、nested tools config、tool suggestions 和 unified exec compatibility flag。

## 能回答的问题

- MCP server map、OAuth credential backend、callback port/url 的 schema 字段是什么？
- tool output token limit 与 background terminal timeout 在哪里声明？
- web_search、tools、tool_suggest 分别是什么层级？
- experimental_use_unified_exec_tool 是否仍是 ConfigToml 字段？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 11 个字段。[E: codex-rs/config/src/config_toml.rs:150][E: codex-rs/config/src/config_toml.rs:510]

`ToolsToml` is the nested `[tools]` section and currently contains `web_search` plus `experimental_request_user_input`.[E: codex-rs/config/src/config_toml.rs:632][E: codex-rs/config/src/config_toml.rs:637][E: codex-rs/config/src/config_toml.rs:638]

`AppToolApproval` adds `writes` between prompt and approve, allowing app-tool policy to distinguish write-like calls from the fully approved mode。[E: codex-rs/config/src/mcp_types.rs:24][E: codex-rs/config/src/mcp_types.rs:27][E: codex-rs/config/src/mcp_types.rs:28][E: codex-rs/config/src/mcp_types.rs:29]

每个 `McpServerConfig` 还保存 transport、auth mode、effective `environment_id`、enabled/required、parallel opt-in、startup/tool timeout、server/tool approval、allow/deny lists、OAuth scopes/client/resource 和 per-tool overrides；`oauth_credential_name` 对非本地环境编码 environment+server，隔离 executor-owned credentials。[E: codex-rs/config/src/mcp_types.rs:162][E: codex-rs/config/src/mcp_types.rs:166][E: codex-rs/config/src/mcp_types.rs:169][E: codex-rs/config/src/mcp_types.rs:173][E: codex-rs/config/src/mcp_types.rs:177][E: codex-rs/config/src/mcp_types.rs:181][E: codex-rs/config/src/mcp_types.rs:193][E: codex-rs/config/src/mcp_types.rs:197][E: codex-rs/config/src/mcp_types.rs:201][E: codex-rs/config/src/mcp_types.rs:205][E: codex-rs/config/src/mcp_types.rs:209][E: codex-rs/config/src/mcp_types.rs:213][E: codex-rs/config/src/mcp_types.rs:217][E: codex-rs/config/src/mcp_types.rs:221][E: codex-rs/config/src/mcp_types.rs:225][E: codex-rs/config/src/mcp_types.rs:234][E: codex-rs/config/src/mcp_types.rs:242][E: codex-rs/config/src/mcp_types.rs:244]

2026 protocol support is not a server-table field：`[features].mcp_2026_07_28`（under development，default false）maps to global `McpProtocolMode::V20260728`; otherwise config builds `Legacy`。[E: codex-rs/features/src/lib.rs:1127][E: codex-rs/features/src/lib.rs:1130][E: codex-rs/core/src/config/mod.rs:1758][E: codex-rs/core/src/config/mod.rs:1762]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `mcp_servers` | `HashMap<String, McpServerConfig>` | `#[serde(default)]`<br>`#[schemars(schema_with = "crate::schema::mcp_servers_schema")]` | MCP server definition map for tool calls. | [E: codex-rs/config/src/config_toml.rs:257][E: codex-rs/config/src/config_toml.rs:259][E: codex-rs/config/src/config_toml.rs:260] |
| `mcp_oauth_credentials_store` | `Option<OAuthCredentialsStoreMode>` | `#[serde(default)]` | MCP OAuth credentials storage backend. | [E: codex-rs/config/src/config_toml.rs:267][E: codex-rs/config/src/config_toml.rs:268] |
| `mcp_oauth_callback_port` | `Option<u16>` | none | Optional fixed local OAuth callback port. | [E: codex-rs/config/src/config_toml.rs:272] |
| `mcp_oauth_callback_url` | `Option<String>` | none | Optional OAuth redirect URI override. | [E: codex-rs/config/src/config_toml.rs:278] |
| `apps_mcp_product_sku` | `Option<String>` | none | Product SKU forwarded on host-owned Codex Apps MCP requests. | [E: codex-rs/config/src/config_toml.rs:368] |
| `tool_output_token_limit` | `Option<usize>` | none | Tool/function output token budget. | [E: codex-rs/config/src/config_toml.rs:294] |
| `background_terminal_max_timeout` | `Option<u64>` | none | Background terminal output poll timeout. | [E: codex-rs/config/src/config_toml.rs:298] |
| `web_search` | `Option<WebSearchMode>` | none | Controls the web search tool mode: disabled, cached, indexed, or live. | [E: codex-rs/config/src/config_toml.rs:423] |
| `tools` | `Option<ToolsToml>` | none | Nested tools section for feature toggles. | [E: codex-rs/config/src/config_toml.rs:426] |
| `tool_suggest` | `Option<ToolSuggestConfig>` | none | Discoverable tool suggestion config. | [E: codex-rs/config/src/config_toml.rs:429] |
| `experimental_use_unified_exec_tool` | `Option<bool>` | none | Unified exec compatibility flag. | [E: codex-rs/config/src/config_toml.rs:508] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/mcp_types.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- `tool.mcp-namespace-tools`
- `tool.web-search`
- `config.skills-plugins-features`
- `subsys.mcp.client`
