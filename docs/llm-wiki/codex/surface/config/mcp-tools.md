---
id: config.mcp-tools
title: MCP 与工具设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/mcp_types.rs, codex-rs/protocol/src/config_types.rs]
symbols: [ConfigToml, McpServerConfig, OAuthCredentialsStoreMode, ToolsToml, ToolSuggestConfig, WebSearchMode]
related: [tool.mcp-namespace-tools, tool.web-search, config.skills-plugins-features, subsys.mcp.client]
evidence: explicit
status: verified
updated: db887d03e1
---

> MCP 与工具设置 catalog 覆盖 ConfigToml 中 MCP server definitions、MCP OAuth callback/storage、Apps MCP product SKU、tool output/background terminal limits、web search mode、nested tools config、tool suggestions 和 unified exec compatibility flag。

## 能回答的问题

- MCP server map、OAuth credential backend、callback port/url 的 schema 字段是什么？
- tool output token limit 与 background terminal timeout 在哪里声明？
- web_search、tools、tool_suggest 分别是什么层级？
- experimental_use_unified_exec_tool 是否仍是 ConfigToml 字段？

## Catalog 边界

当前 `ConfigToml` 有 97 个顶层 `pub` 字段；本节点覆盖其中 11 个字段。[E: codex-rs/config/src/config_toml.rs:154][E: codex-rs/config/src/config_toml.rs:518]

`ToolsToml` is the nested `[tools]` section and currently contains `web_search` plus `experimental_request_user_input`.[E: codex-rs/config/src/config_toml.rs:640][E: codex-rs/config/src/config_toml.rs:645][E: codex-rs/config/src/config_toml.rs:646]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `mcp_servers` | `HashMap<String, McpServerConfig>` | `#[serde(default)]`<br>`#[schemars(schema_with = "crate::schema::mcp_servers_schema")]` | MCP server definition map for tool calls. | [E: codex-rs/config/src/config_toml.rs:262][E: codex-rs/config/src/config_toml.rs:264][E: codex-rs/config/src/config_toml.rs:265] |
| `mcp_oauth_credentials_store` | `Option<OAuthCredentialsStoreMode>` | `#[serde(default)]` | MCP OAuth credentials storage backend. | [E: codex-rs/config/src/config_toml.rs:272][E: codex-rs/config/src/config_toml.rs:273] |
| `mcp_oauth_callback_port` | `Option<u16>` | none | Optional fixed local OAuth callback port. | [E: codex-rs/config/src/config_toml.rs:277] |
| `mcp_oauth_callback_url` | `Option<String>` | none | Optional OAuth redirect URI override. | [E: codex-rs/config/src/config_toml.rs:283] |
| `apps_mcp_product_sku` | `Option<String>` | none | Product SKU forwarded on host-owned Codex Apps MCP requests. | [E: codex-rs/config/src/config_toml.rs:376] |
| `tool_output_token_limit` | `Option<usize>` | none | Tool/function output token budget. | [E: codex-rs/config/src/config_toml.rs:299] |
| `background_terminal_max_timeout` | `Option<u64>` | none | Background terminal output poll timeout. | [E: codex-rs/config/src/config_toml.rs:303] |
| `web_search` | `Option<WebSearchMode>` | none | Controls the web search tool mode: disabled, cached, indexed, or live. | [E: codex-rs/config/src/config_toml.rs:431] |
| `tools` | `Option<ToolsToml>` | none | Nested tools section for feature toggles. | [E: codex-rs/config/src/config_toml.rs:434] |
| `tool_suggest` | `Option<ToolSuggestConfig>` | none | Discoverable tool suggestion config. | [E: codex-rs/config/src/config_toml.rs:437] |
| `experimental_use_unified_exec_tool` | `Option<bool>` | none | Unified exec compatibility flag. | [E: codex-rs/config/src/config_toml.rs:516] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/mcp_types.rs`
- `codex-rs/protocol/src/config_types.rs`

## 相关

- `tool.mcp-namespace-tools`
- `tool.web-search`
- `config.skills-plugins-features`
- `subsys.mcp.client`
