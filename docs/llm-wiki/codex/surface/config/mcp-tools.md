---
id: config.mcp-tools
title: MCP 与工具设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/mcp_types.rs, codex-rs/config/src/types.rs, codex-rs/core/src/config/mod.rs, codex-rs/core/src/unified_exec/mod.rs, codex-rs/protocol/src/config_types.rs, docs/config.md]
symbols: [ConfigToml, McpServerConfig, RawMcpServerConfig, ToolsToml, ToolSuggestConfig, WebSearchToolConfig, resolve_web_search_mode, resolve_web_search_config, resolve_tool_suggest_config]
related: [command.tools-integrations, tool.web-search, tool.view-image, cli.global-flags]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> MCP 与工具设置 catalog 覆盖 `ConfigToml` 中配置 MCP servers、tool output budget、background terminal polling、JavaScript/zsh runtimes、web search mode、built-in tools 和 tool suggestion 的顶层键。

## 能回答的问题

- `[mcp_servers.<name>]` 支持 stdio 与 streamable HTTP 哪些字段?
- `supports_parallel_tool_calls` 为什么默认是 false，何时能打开?
- `web_search` 顶层 mode 与 `[tools.web_search]` nested config 有什么区别?
- `background_terminal_max_timeout` 的默认值和最小 clamp 是多少?
- `tool_suggest.discoverables` 如何过滤空 id?

## Catalog

| key | TOML 类型 | TOML 默认 | 有效配置默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `mcp_servers` | `HashMap<String, McpServerConfig>` | `{}` | requirements constraint 后写入 effective `Config.mcp_servers`。[E: codex-rs/core/src/config/mod.rs:2144][E: codex-rs/core/src/config/mod.rs:2246] | 定义 Codex 可连接的 MCP servers；docs 明确配置位置是 `~/.codex/config.toml`。[E: codex-rs/config/src/config_toml.rs:169][E: docs/config.md:11] | `codex-rs/config/src/config_toml.rs:173` |
| `tool_output_token_limit` | `Option<usize>` | unset | 直接写入 effective config。[E: codex-rs/core/src/config/mod.rs:2270] | context manager 存储 tool/function outputs 时使用的 token budget。[E: codex-rs/config/src/config_toml.rs:204] | `codex-rs/config/src/config_toml.rs:205` |
| `background_terminal_max_timeout` | `Option<u64>` milliseconds | unset | 默认 `300000` ms，并至少 clamp 到 `5000` ms。[E: codex-rs/core/src/unified_exec/mod.rs:61][E: codex-rs/core/src/unified_exec/mod.rs:63][E: codex-rs/core/src/config/mod.rs:1931][E: codex-rs/core/src/config/mod.rs:1932] | 控制 background terminal output polling 的最大窗口；字段注释把默认值写成 5 minutes。[E: codex-rs/config/src/config_toml.rs:207][E: codex-rs/config/src/config_toml.rs:208] | `codex-rs/config/src/config_toml.rs:209` |
| `js_repl_node_path` | `Option<AbsolutePathBuf>` | unset | CLI override、profile、global 依次选择。[E: codex-rs/core/src/config/mod.rs:2050][E: codex-rs/core/src/config/mod.rs:2051][E: codex-rs/core/src/config/mod.rs:2052] | 指定 `js_repl` 使用的 Node runtime absolute path。[E: codex-rs/config/src/config_toml.rs:211] | `codex-rs/config/src/config_toml.rs:212` |
| `js_repl_node_module_dirs` | `Option<Vec<AbsolutePathBuf>>` | unset | CLI override、profile、global 依次选择；最终默认 empty vec。[E: codex-rs/core/src/config/mod.rs:2053][E: codex-rs/core/src/config/mod.rs:2055][E: codex-rs/core/src/config/mod.rs:2060][E: codex-rs/core/src/config/mod.rs:2063] | 指定 `js_repl` 解析 Node modules 的 ordered directories。[E: codex-rs/config/src/config_toml.rs:214] | `codex-rs/config/src/config_toml.rs:215` |
| `zsh_path` | `Option<AbsolutePathBuf>` | unset | CLI override、profile、global 依次选择。[E: codex-rs/core/src/config/mod.rs:2064][E: codex-rs/core/src/config/mod.rs:2065][E: codex-rs/core/src/config/mod.rs:2066] | 指定 zsh-exec-bridge-backed shell execution 使用的 patched zsh absolute path。[E: codex-rs/config/src/config_toml.rs:217] | `codex-rs/config/src/config_toml.rs:218` |
| `web_search` | `Option<WebSearchMode>` | unset | profile/global explicit mode 优先；feature `web_search_cached` 其次；feature `web_search_request` 再其次；都 unset 时 default `Cached`。[E: codex-rs/core/src/config/mod.rs:1436][E: codex-rs/core/src/config/mod.rs:1440][E: codex-rs/core/src/config/mod.rs:1443][E: codex-rs/core/src/config/mod.rs:1850] | 控制 web search tool mode：disabled、cached 或 live。[E: codex-rs/config/src/config_toml.rs:313] | `codex-rs/config/src/config_toml.rs:314` |
| `tools` | `Option<ToolsToml>` | unset | nested `tools.web_search` profile/global 合并为 `WebSearchConfig`；nested `tools.view_image` 在 `ToolsToml -> Tools` 转换中复制到 `Tools.view_image`。[E: codex-rs/core/src/config/mod.rs:1452][E: codex-rs/core/src/config/mod.rs:1456][E: codex-rs/core/src/config/mod.rs:1465][E: codex-rs/config/src/config_toml.rs:580][E: codex-rs/config/src/config_toml.rs:584] | 维护 built-in tools 的 nested toggles/config；当前 schema 包含 `web_search` 和 `view_image`。[E: codex-rs/config/src/config_toml.rs:500][E: codex-rs/config/src/config_toml.rs:505][E: codex-rs/config/src/config_toml.rs:509] | `codex-rs/config/src/config_toml.rs:317` |
| `tool_suggest` | `Option<ToolSuggestConfig>` | unset | 空 id 会被 trim 后丢弃，非空 id 保留 kind 与 trimmed id。[E: codex-rs/core/src/config/mod.rs:1276][E: codex-rs/core/src/config/mod.rs:1277][E: codex-rs/core/src/config/mod.rs:1281][E: codex-rs/core/src/config/mod.rs:1282] | 配置可被建议安装的 discoverable tools；discoverable type 是 `connector` 或 `plugin`。[E: codex-rs/config/src/types.rs:162][E: codex-rs/config/src/types.rs:163][E: codex-rs/config/src/types.rs:164][E: codex-rs/config/src/types.rs:177][E: codex-rs/config/src/types.rs:179] | `codex-rs/config/src/config_toml.rs:320` |

## MCP server schema

`RawMcpServerConfig` 是 TOML/JSON schema 的输入形状：stdio transport 使用 `command`、`args`、`env`、`env_vars`、`cwd`，streamable HTTP transport 使用 `url`、`bearer_token_env_var`、`http_headers`、`env_http_headers`。[E: codex-rs/config/src/mcp_types.rs:186][E: codex-rs/config/src/mcp_types.rs:188][E: codex-rs/config/src/mcp_types.rs:190][E: codex-rs/config/src/mcp_types.rs:192][E: codex-rs/config/src/mcp_types.rs:194][E: codex-rs/config/src/mcp_types.rs:196][E: codex-rs/config/src/mcp_types.rs:197][E: codex-rs/config/src/mcp_types.rs:199][E: codex-rs/config/src/mcp_types.rs:202][E: codex-rs/config/src/mcp_types.rs:204] Shared MCP fields 包括 `experimental_environment`、timeouts、`enabled`、`required`、parallel flag、tool approval defaults、allow/deny tools、OAuth scopes/resource 和 per-tool overrides。[E: codex-rs/config/src/mcp_types.rs:208][E: codex-rs/config/src/mcp_types.rs:210][E: codex-rs/config/src/mcp_types.rs:212][E: codex-rs/config/src/mcp_types.rs:215][E: codex-rs/config/src/mcp_types.rs:217][E: codex-rs/config/src/mcp_types.rs:219][E: codex-rs/config/src/mcp_types.rs:221][E: codex-rs/config/src/mcp_types.rs:223][E: codex-rs/config/src/mcp_types.rs:225][E: codex-rs/config/src/mcp_types.rs:227][E: codex-rs/config/src/mcp_types.rs:229][E: codex-rs/config/src/mcp_types.rs:231][E: codex-rs/config/src/mcp_types.rs:236]

`TryFrom<RawMcpServerConfig>` rejects incompatible transport fields: stdio rejects URL/bearer/http/OAuth-resource fields, streamable HTTP rejects stdio args/env/cwd and literal `bearer_token`.[E: codex-rs/config/src/mcp_types.rs:286][E: codex-rs/config/src/mcp_types.rs:292][E: codex-rs/config/src/mcp_types.rs:293][E: codex-rs/config/src/mcp_types.rs:294][E: codex-rs/config/src/mcp_types.rs:295][E: codex-rs/config/src/mcp_types.rs:308][E: codex-rs/config/src/mcp_types.rs:309][E: codex-rs/config/src/mcp_types.rs:310][E: codex-rs/config/src/mcp_types.rs:311][E: codex-rs/config/src/mcp_types.rs:312] MCP server defaults are `enabled=true`、`required=false`、`supports_parallel_tool_calls=false`、`tools={}`。[E: codex-rs/config/src/mcp_types.rs:328][E: codex-rs/config/src/mcp_types.rs:329][E: codex-rs/config/src/mcp_types.rs:330][E: codex-rs/config/src/mcp_types.rs:337][E: codex-rs/config/src/mcp_types.rs:353][E: codex-rs/config/src/mcp_types.rs:354]

Docs warn that MCP tools default to serialized calls and `supports_parallel_tool_calls` should only be enabled for servers whose tools are safe to run at the same time.[E: docs/config.md:15][E: docs/config.md:25][E: docs/config.md:26] Per-server `default_tools_approval_mode` and per-tool `approval_mode` entries live under `mcp_servers`.[E: docs/config.md:31][E: docs/config.md:33][E: docs/config.md:41][E: docs/config.md:42]

## Web Search nested config

`WebSearchToolConfig` contains `context_size`、`allowed_domains`、`location`，and `From<WebSearchToolConfig> for WebSearchConfig` maps them into Responses API-facing filters, user location, and search context size.[E: codex-rs/protocol/src/config_types.rs:167][E: codex-rs/protocol/src/config_types.rs:168][E: codex-rs/protocol/src/config_types.rs:169][E: codex-rs/protocol/src/config_types.rs:240][E: codex-rs/protocol/src/config_types.rs:245][E: codex-rs/protocol/src/config_types.rs:246] `tools.web_search = true/false` is accepted by the custom deserializer but boolean values are ignored into `None`; structured config is preserved.[E: codex-rs/config/src/config_toml.rs:514][E: codex-rs/config/src/config_toml.rs:531][E: codex-rs/config/src/config_toml.rs:533]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/mcp_types.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/core/src/unified_exec/mod.rs`
- `codex-rs/protocol/src/config_types.rs`
- `docs/config.md`

## 相关

- [工具与集成 slash command](../slash-commands/tools-integrations.md) — 覆盖 `/mcp`、`/apps`、`/plugins`、`/skills` 的 TUI entrypoints。
- [web_search 工具](../tools/web-search.md) — 覆盖 web search tool registry 与 runtime behavior。
- [view_image 工具](../tools/view-image.md) — 覆盖 local image attachment tool。
