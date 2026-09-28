---
id: config.mcp-tools
title: MCP 与工具设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/mcp_types.rs, codex-rs/config/src/mcp_ema.rs, codex-rs/protocol/src/config_types.rs, codex-rs/core/src/config/mod.rs, codex-rs/features/src/lib.rs]
symbols: [McpServerConfig, McpServerAuth, OAuthCredentialsStoreMode, AppToolApproval, ToolsToml, ToolSuggestConfig, McpEnterpriseManagedAuthConfig]
related: [tool.mcp-namespace-tools, tool.web-search, config.skills-plugins-features, subsys.mcp.client]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> MCP 与工具设置 catalog 覆盖 ConfigToml 中 MCP server definitions、enterprise managed MCP auth（EMA）、MCP OAuth callback/storage、Apps MCP product SKU、tool output/background terminal limits、web search mode、nested tools config、tool suggestions 和 unified exec compatibility flag。

## 能回答的问题

- MCP server map、OAuth credential backend、callback port/url 的 schema 字段是什么？
- tool output token limit 与 background terminal timeout 在哪里声明？
- web_search、tools、tool_suggest 分别是什么层级？
- experimental_use_unified_exec_tool 是否仍是 ConfigToml 字段？

## Catalog 边界

当前 `ConfigToml` 有 **104** 个顶层 `pub` 字段（`pub struct ConfigToml` 到 `oss_provider`）；本节点覆盖其中 **13** 个字段。8 个 surface/config catalog 合计覆盖全部 104 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:165][E: codex-rs/config/src/config_toml.rs:297][E: codex-rs/config/src/config_toml.rs:557]

`ToolsToml` is the nested `[tools]` section and currently contains `web_search`、`experimental_request_user_input` 和 `update_plan`。[E: codex-rs/config/src/config_toml.rs:665][E: codex-rs/config/src/config_toml.rs:670][E: codex-rs/config/src/config_toml.rs:671][E: codex-rs/config/src/config_toml.rs:672]

`AppToolApproval` adds `Writes` between `Prompt` and `Approve`, allowing app-tool policy to distinguish write-like calls from the fully approved mode。[E: codex-rs/config/src/mcp_types.rs:28][E: codex-rs/config/src/mcp_types.rs:31][E: codex-rs/config/src/mcp_types.rs:32][E: codex-rs/config/src/mcp_types.rs:33]

每个 `McpServerConfig` 还保存 transport、auth mode、effective `environment_id`、enabled/required、parallel opt-in、startup/tool timeout、server/tool approval、allow/deny lists、OAuth scopes/client/resource 和 per-tool overrides；`oauth_credential_name` 对非本地环境编码 environment+server，隔离 executor-owned credentials。[E: codex-rs/config/src/mcp_types.rs:233][E: codex-rs/config/src/mcp_types.rs:235][E: codex-rs/config/src/mcp_types.rs:239][E: codex-rs/config/src/mcp_types.rs:242][E: codex-rs/config/src/mcp_types.rs:246][E: codex-rs/config/src/mcp_types.rs:252][E: codex-rs/config/src/mcp_types.rs:260][E: codex-rs/config/src/mcp_types.rs:282][E: codex-rs/config/src/mcp_types.rs:286][E: codex-rs/config/src/mcp_types.rs:290][E: codex-rs/config/src/mcp_types.rs:294][E: codex-rs/config/src/mcp_types.rs:298][E: codex-rs/config/src/mcp_types.rs:302][E: codex-rs/config/src/mcp_types.rs:306][E: codex-rs/config/src/mcp_types.rs:310][E: codex-rs/config/src/mcp_types.rs:314][E: codex-rs/config/src/mcp_types.rs:323]

2026 protocol support is not a server-table field：`[features].mcp_2026_07_28`（under development，default false）maps to global `McpProtocolMode::V20260728`; otherwise config builds `Legacy`。[E: codex-rs/features/src/lib.rs:1382][E: codex-rs/features/src/lib.rs:1383][E: codex-rs/features/src/lib.rs:1384][E: codex-rs/core/src/config/mod.rs:1880][E: codex-rs/core/src/config/mod.rs:1882]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `mcp_servers` | `HashMap<String, McpServerConfig>` | `#[serde(default)]`<br>`#[schemars(schema_with = "crate::schema::mcp_servers_schema")]` | MCP server definition map for tool calls. | [E: codex-rs/config/src/config_toml.rs:293] |
| `mcp_enterprise_managed_auth` | `Option<McpEnterpriseManagedAuthConfig>` | `#[serde(default)]` | Trusted enterprise IdP shared by EMA-enabled MCP servers and plugins。类型定义在 `mcp_ema.rs`；`resolve(..., xaa_enabled)` 校验 IdP 来源层与 XAA opt-in。IdP 只允许 MDM / System / EnterpriseManaged / legacy managed /（非 project 的 user/host）层；plugin 与 project 不能重定向 enterprise credential source。 | [E: codex-rs/config/src/config_toml.rs:297][E: codex-rs/config/src/mcp_ema.rs:31][E: codex-rs/config/src/mcp_ema.rs:77][E: codex-rs/config/src/mcp_ema.rs:81][E: codex-rs/config/src/mcp_ema.rs:108] |
| `mcp_oauth_credentials_store` | `Option<OAuthCredentialsStoreMode>` | `#[serde(default)]` | MCP OAuth credentials storage backend. | [E: codex-rs/config/src/config_toml.rs:305] |
| `mcp_oauth_callback_port` | `Option<u16>` | none | Optional fixed local OAuth callback port. | [E: codex-rs/config/src/config_toml.rs:309] |
| `mcp_oauth_callback_url` | `Option<String>` | none | Optional OAuth redirect URI override. | [E: codex-rs/config/src/config_toml.rs:315] |
| `mcp_optional_startup_grace_ms` | `Option<u64>` | none | Milliseconds to wait for optional MCP servers while building the initial tool catalog.  Defaults to 1000. Set to 0 to disable the shared grace and wait for each server's configured `startup_timeout_sec` instead. | [E: codex-rs/config/src/config_toml.rs:321] |
| `apps_mcp_product_sku` | `Option<String>` | none | Product SKU forwarded on host-owned Codex Apps MCP requests. | [E: codex-rs/config/src/config_toml.rs:412] |
| `tool_output_token_limit` | `Option<usize>` | none | Tool/function output token budget. | [E: codex-rs/config/src/config_toml.rs:337] |
| `background_terminal_max_timeout` | `Option<u64>` | none | Background terminal output poll timeout. | [E: codex-rs/config/src/config_toml.rs:341] |
| `web_search` | `Option<WebSearchMode>` | none | Controls the web search tool mode: disabled, cached, indexed, or live. | [E: codex-rs/config/src/config_toml.rs:469] |
| `tools` | `Option<ToolsToml>` | none | Nested tools section for feature toggles. | [E: codex-rs/config/src/config_toml.rs:472] |
| `tool_suggest` | `Option<ToolSuggestConfig>` | none | Discoverable tool suggestion config. | [E: codex-rs/config/src/config_toml.rs:475] |
| `experimental_use_unified_exec_tool` | `Option<bool>` | none | Unified exec compatibility flag. | [E: codex-rs/config/src/config_toml.rs:555] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/mcp_types.rs`
- `codex-rs/config/src/mcp_ema.rs`
- `codex-rs/protocol/src/config_types.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- `tool.mcp-namespace-tools`
- `tool.web-search`
- `config.skills-plugins-features`
- `subsys.mcp.client`
