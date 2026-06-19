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
updated: 5670360009
---

> MCP 与工具设置 catalog 覆盖 ConfigToml 中 MCP server definitions、MCP OAuth callback/storage、Apps MCP product SKU、tool output/background terminal limits、web search mode、nested tools config、tool suggestions 和 unified exec compatibility flag。

## 能回答的问题

- MCP server map、OAuth credential backend、callback port/url 的 schema 字段是什么？
- tool output token limit 与 background terminal timeout 在哪里声明？
- web_search、tools、tool_suggest 分别是什么层级？
- experimental_use_unified_exec_tool 是否仍是 ConfigToml 字段？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 11 个。8 个 surface/config catalog 节点合计覆盖全部 96 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:136][E: codex-rs/config/src/config_toml.rs:139]

`ToolsToml` is the nested `[tools]` section and currently contains `web_search` plus `experimental_request_user_input`.[E: codex-rs/config/src/config_toml.rs:625][E: codex-rs/config/src/config_toml.rs:630][E: codex-rs/config/src/config_toml.rs:631]

## 字段 catalog

| key | Rust type | serde/schema attrs | 源码注释摘要 | Evidence |
|---|---|---|---|---|
| `mcp_servers` | `HashMap<String, McpServerConfig>` | `#[serde(default)]`<br>`#[schemars(schema_with = "crate::schema::mcp_servers_schema")]` | Definition for MCP servers that Codex can reach out to for tool calls. | [E: codex-rs/config/src/config_toml.rs:246][E: codex-rs/config/src/config_toml.rs:247][E: codex-rs/config/src/config_toml.rs:250] |
| `mcp_oauth_credentials_store` | `Option<OAuthCredentialsStoreMode>` | `#[serde(default)]` | Preferred backend for storing MCP OAuth credentials. keyring: Use an OS-specific keyring service. https://github.com/openai/codex/blob/main/codex-rs/rmcp-client/src/oauth.rs#L2 ... | [E: codex-rs/config/src/config_toml.rs:252][E: codex-rs/config/src/config_toml.rs:257][E: codex-rs/config/src/config_toml.rs:258] |
| `mcp_oauth_callback_port` | `Option<u16>` | none | Optional fixed port for the local HTTP callback server used during MCP OAuth login. When unset, Codex will bind to an ephemeral port chosen by the OS. | [E: codex-rs/config/src/config_toml.rs:260][E: codex-rs/config/src/config_toml.rs:262] |
| `mcp_oauth_callback_url` | `Option<String>` | none | Optional redirect URI to use during MCP OAuth login. When set, this URI is used in the OAuth authorization request instead of the local listener address. The local callback list... | [E: codex-rs/config/src/config_toml.rs:264][E: codex-rs/config/src/config_toml.rs:268] |
| `apps_mcp_product_sku` | `Option<String>` | none | Optional product SKU forwarded on host-owned Codex Apps MCP requests. | [E: codex-rs/config/src/config_toml.rs:360][E: codex-rs/config/src/config_toml.rs:361] |
| `tool_output_token_limit` | `Option<usize>` | none | Token budget applied when storing tool/function outputs in the context manager. | [E: codex-rs/config/src/config_toml.rs:283][E: codex-rs/config/src/config_toml.rs:284] |
| `background_terminal_max_timeout` | `Option<u64>` | none | Maximum poll window for background terminal output (`write_stdin`), in milliseconds. Default: `300000` (5 minutes). | [E: codex-rs/config/src/config_toml.rs:286][E: codex-rs/config/src/config_toml.rs:288] |
| `web_search` | `Option<WebSearchMode>` | none | Controls the web search tool mode: disabled, cached, or live. | [E: codex-rs/config/src/config_toml.rs:412][E: codex-rs/config/src/config_toml.rs:413] |
| `tools` | `Option<ToolsToml>` | none | Nested tools section for feature toggles | [E: codex-rs/config/src/config_toml.rs:415][E: codex-rs/config/src/config_toml.rs:416] |
| `tool_suggest` | `Option<ToolSuggestConfig>` | none | Additional discoverable tools that can be suggested for installation. | [E: codex-rs/config/src/config_toml.rs:418][E: codex-rs/config/src/config_toml.rs:419] |
| `experimental_use_unified_exec_tool` | `Option<bool>` | none | ConfigToml schema field. | [E: codex-rs/config/src/config_toml.rs:498] |

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
