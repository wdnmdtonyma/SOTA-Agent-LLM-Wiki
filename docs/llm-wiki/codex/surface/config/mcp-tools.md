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
updated: 121f91fd5d
---

> MCP 与工具设置 catalog 覆盖 ConfigToml 中 MCP server definitions、MCP OAuth callback/storage、Apps MCP product SKU、tool output/background terminal limits、web search mode、nested tools config、tool suggestions 和 unified exec compatibility flag。

## 能回答的问题

- MCP server map、OAuth credential backend、callback port/url 的 schema 字段是什么？
- tool output token limit 与 background terminal timeout 在哪里声明？
- web_search、tools、tool_suggest 分别是什么层级？
- experimental_use_unified_exec_tool 是否仍是 ConfigToml 字段？

## Catalog 边界

当前 `ConfigToml` 有 99 个顶层 `pub` 字段；本节点覆盖其中 12 个字段。[E: codex-rs/config/src/config_toml.rs:155][E: codex-rs/config/src/config_toml.rs:534]

`ToolsToml` is the nested `[tools]` section and currently contains `web_search`、`experimental_request_user_input` 和 `update_plan`。[E: codex-rs/config/src/config_toml.rs:624][E: codex-rs/config/src/config_toml.rs:629][E: codex-rs/config/src/config_toml.rs:630][E: codex-rs/config/src/config_toml.rs:631]

`AppToolApproval` adds `Writes` between `Prompt` and `Approve`, allowing app-tool policy to distinguish write-like calls from the fully approved mode。[E: codex-rs/config/src/mcp_types.rs:26][E: codex-rs/config/src/mcp_types.rs:29][E: codex-rs/config/src/mcp_types.rs:30][E: codex-rs/config/src/mcp_types.rs:31]

每个 `McpServerConfig` 还保存 transport、auth mode、effective `environment_id`、enabled/required、parallel opt-in、startup/tool timeout、server/tool approval、allow/deny lists、OAuth scopes/client/resource 和 per-tool overrides；`oauth_credential_name` 对非本地环境编码 environment+server，隔离 executor-owned credentials。[E: codex-rs/config/src/mcp_types.rs:197][E: codex-rs/config/src/mcp_types.rs:199][E: codex-rs/config/src/mcp_types.rs:203][E: codex-rs/config/src/mcp_types.rs:206][E: codex-rs/config/src/mcp_types.rs:210][E: codex-rs/config/src/mcp_types.rs:214][E: codex-rs/config/src/mcp_types.rs:218][E: codex-rs/config/src/mcp_types.rs:235][E: codex-rs/config/src/mcp_types.rs:239][E: codex-rs/config/src/mcp_types.rs:243][E: codex-rs/config/src/mcp_types.rs:247][E: codex-rs/config/src/mcp_types.rs:251][E: codex-rs/config/src/mcp_types.rs:255][E: codex-rs/config/src/mcp_types.rs:259][E: codex-rs/config/src/mcp_types.rs:263][E: codex-rs/config/src/mcp_types.rs:267][E: codex-rs/config/src/mcp_types.rs:276]

2026 protocol support is not a server-table field：`[features].mcp_2026_07_28`（under development，default false）maps to global `McpProtocolMode::V20260728`; otherwise config builds `Legacy`。[E: codex-rs/features/src/lib.rs:1302][E: codex-rs/features/src/lib.rs:1303][E: codex-rs/core/src/config/mod.rs:1809][E: codex-rs/core/src/config/mod.rs:1811]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `mcp_servers` | `HashMap<String, McpServerConfig>` | `#[serde(default)]`<br>`#[schemars(schema_with = "crate::schema::mcp_servers_schema")]` | MCP server definition map for tool calls. | [E: codex-rs/config/src/config_toml.rs:277] |
| `mcp_oauth_credentials_store` | `Option<OAuthCredentialsStoreMode>` | `#[serde(default)]` | MCP OAuth credentials storage backend. | [E: codex-rs/config/src/config_toml.rs:285] |
| `mcp_oauth_callback_port` | `Option<u16>` | none | Optional fixed local OAuth callback port. | [E: codex-rs/config/src/config_toml.rs:289] |
| `mcp_oauth_callback_url` | `Option<String>` | none | Optional OAuth redirect URI override. | [E: codex-rs/config/src/config_toml.rs:295] |
| `mcp_optional_startup_grace_ms` | `Option<u64>` | none | Milliseconds to wait for optional MCP servers while building the initial tool catalog.  Defaults to 1000. Set to 0 to disable the shared grace and wait for each server's configured `startup_timeout_sec` instead. | [E: codex-rs/config/src/config_toml.rs:301] |
| `apps_mcp_product_sku` | `Option<String>` | none | Product SKU forwarded on host-owned Codex Apps MCP requests. | [E: codex-rs/config/src/config_toml.rs:392] |
| `tool_output_token_limit` | `Option<usize>` | none | Tool/function output token budget. | [E: codex-rs/config/src/config_toml.rs:317] |
| `background_terminal_max_timeout` | `Option<u64>` | none | Background terminal output poll timeout. | [E: codex-rs/config/src/config_toml.rs:321] |
| `web_search` | `Option<WebSearchMode>` | none | Controls the web search tool mode: disabled, cached, indexed, or live. | [E: codex-rs/config/src/config_toml.rs:446] |
| `tools` | `Option<ToolsToml>` | none | Nested tools section for feature toggles. | [E: codex-rs/config/src/config_toml.rs:449] |
| `tool_suggest` | `Option<ToolSuggestConfig>` | none | Discoverable tool suggestion config. | [E: codex-rs/config/src/config_toml.rs:452] |
| `experimental_use_unified_exec_tool` | `Option<bool>` | none | Unified exec compatibility flag. | [E: codex-rs/config/src/config_toml.rs:532] |

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
