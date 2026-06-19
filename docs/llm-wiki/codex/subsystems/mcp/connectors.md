---
id: subsys.mcp.connectors
title: MCP connectors
kind: subsystem
tier: T2
source: [codex-rs/connectors/src/lib.rs, codex-rs/connectors/src/accessible.rs, codex-rs/connectors/src/merge.rs, codex-rs/connectors/src/filter.rs, codex-rs/connectors/src/metadata.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/rmcp-client/src/rmcp_client.rs]
symbols: [list_all_connectors_with_options, ConnectorDirectoryCacheKey, DirectoryApp, collect_accessible_connectors, merge_connectors, filter_tool_suggest_discoverable_connectors, list_tools_with_connector_ids]
related: [subsys.mcp.client, subsys.mcp.name-qualification, tool.mcp-namespace-tools]
evidence: explicit
status: verified
updated: 5670360009
---

> Connectors now split across a small `connectors` crate and MCP tool metadata plumbing: directory/workspace listing builds a catalog of discoverable `AppInfo`s, accessible connectors are inferred from Codex Apps tool metadata, and only the reserved Codex Apps MCP server is trusted to provide connector metadata for model-visible tool grouping.[E: codex-rs/connectors/src/lib.rs:135][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/codex-mcp/src/rmcp_client.rs:410]

## 能回答的问题

- connector directory 与 workspace connectors 怎样列出、缓存、合并？
- accessible connectors 怎样从 Codex Apps tools 反推？
- plugin connector placeholders 怎样与 accessible connector metadata 合并？
- tool-suggest discoverable connectors 怎样过滤不可见/已可访问/被禁 connector？
- 为什么普通 MCP server 的 connector `_meta` 不可信？

## 职责边界

`codex-rs/connectors` 管 catalog、accessible aggregation、merge、filter、display metadata；`rmcp-client` 只从 raw tool `_meta` 提取 connector id/name/description；`codex-mcp` 决定是否信任这些 metadata 并把它们装入 `ToolInfo`。[E: codex-rs/connectors/src/lib.rs:14][E: codex-rs/connectors/src/lib.rs:17][E: codex-rs/connectors/src/lib.rs:18][E: codex-rs/connectors/src/lib.rs:19][E: codex-rs/rmcp-client/src/rmcp_client.rs:487][E: codex-rs/codex-mcp/src/rmcp_client.rs:410]

## 关键文件

- `codex-rs/connectors/src/lib.rs`: directory cache key/TTL, directory listing, workspace listing, app normalization, cache writes.[E: codex-rs/connectors/src/lib.rs:28][E: codex-rs/connectors/src/lib.rs:31][E: codex-rs/connectors/src/lib.rs:65][E: codex-rs/connectors/src/lib.rs:135][E: codex-rs/connectors/src/lib.rs:157][E: codex-rs/connectors/src/lib.rs:180]
- `codex-rs/connectors/src/accessible.rs`: `AccessibleConnectorTool` input and `collect_accessible_connectors` aggregation into `AppInfo`.[E: codex-rs/connectors/src/accessible.rs:8][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/connectors/src/accessible.rs:38][E: codex-rs/connectors/src/accessible.rs:60]
- `codex-rs/connectors/src/merge.rs`: merge directory/plugin placeholders with accessible connector metadata and plugin display names.[E: codex-rs/connectors/src/merge.rs:8][E: codex-rs/connectors/src/merge.rs:20][E: codex-rs/connectors/src/merge.rs:48][E: codex-rs/connectors/src/merge.rs:60][E: codex-rs/connectors/src/merge.rs:80][E: codex-rs/connectors/src/merge.rs:99]
- `codex-rs/connectors/src/filter.rs`: tool-suggest discoverable filtering and hard disallow lists.[E: codex-rs/connectors/src/filter.rs:5][E: codex-rs/connectors/src/filter.rs:17][E: codex-rs/connectors/src/filter.rs:30][E: codex-rs/connectors/src/filter.rs:41]
- `codex-rs/connectors/src/metadata.rs`: display label, mention slug, install URL, sanitized name, and accessibility-first sorting.[E: codex-rs/connectors/src/metadata.rs:3][E: codex-rs/connectors/src/metadata.rs:7][E: codex-rs/connectors/src/metadata.rs:15][E: codex-rs/connectors/src/metadata.rs:19][E: codex-rs/connectors/src/metadata.rs:23]

## Catalog flow

1. `list_all_connectors_with_options` returns unexpired in-memory cache unless `force_refetch` is true, then lists directory connectors and conditionally workspace connectors for workspace accounts.[E: codex-rs/connectors/src/lib.rs:135][E: codex-rs/connectors/src/lib.rs:145][E: codex-rs/connectors/src/lib.rs:152][E: codex-rs/connectors/src/lib.rs:153]
2. Directory/workspace apps are merged, converted to `AppInfo`, assigned install URLs, normalized names/descriptions, marked inaccessible by default, sorted by name/id, and written to cache.[E: codex-rs/connectors/src/lib.rs:157][E: codex-rs/connectors/src/lib.rs:161][E: codex-rs/connectors/src/lib.rs:166][E: codex-rs/connectors/src/lib.rs:167][E: codex-rs/connectors/src/lib.rs:169][E: codex-rs/connectors/src/lib.rs:171][E: codex-rs/connectors/src/lib.rs:176]
3. Cache has both memory and disk paths: memory uses `ConnectorDirectoryCacheKey` plus TTL, while disk load/write is delegated to `directory_cache`.[E: codex-rs/connectors/src/lib.rs:31][E: codex-rs/connectors/src/lib.rs:55][E: codex-rs/connectors/src/lib.rs:89][E: codex-rs/connectors/src/lib.rs:180]

## Accessible connector flow

- `collect_accessible_connectors` groups tools by connector id, prefers real connector names over id placeholders, fills missing descriptions, unions plugin display names, sets `is_accessible`/`is_enabled`, creates install URLs, and sorts accessibility-first.[E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/connectors/src/accessible.rs:19][E: codex-rs/connectors/src/accessible.rs:26][E: codex-rs/connectors/src/accessible.rs:38][E: codex-rs/connectors/src/accessible.rs:49][E: codex-rs/connectors/src/accessible.rs:63][E: codex-rs/connectors/src/accessible.rs:64][E: codex-rs/connectors/src/accessible.rs:68]
- `merge_connectors` overlays accessible metadata onto catalog entries, preserving accessible name/description/logo/distribution values when the catalog has placeholders or gaps, then deduplicates plugin display names.[E: codex-rs/connectors/src/merge.rs:8][E: codex-rs/connectors/src/merge.rs:20][E: codex-rs/connectors/src/merge.rs:23][E: codex-rs/connectors/src/merge.rs:25][E: codex-rs/connectors/src/merge.rs:28][E: codex-rs/connectors/src/merge.rs:31][E: codex-rs/connectors/src/merge.rs:37][E: codex-rs/connectors/src/merge.rs:53]
- Plugin connector placeholders intentionally use connector id as name so later directory or accessible metadata can replace it.[E: codex-rs/connectors/src/merge.rs:100][E: codex-rs/connectors/src/merge.rs:103]

## MCP metadata trust boundary

- `RmcpClient::list_tools_with_connector_ids` extracts connector metadata from raw MCP tool `_meta` keys `connector_id`, `connector_name`/`connector_display_name`, and `connector_description`/`connectorDescription`.[E: codex-rs/rmcp-client/src/rmcp_client.rs:487][E: codex-rs/rmcp-client/src/rmcp_client.rs:503][E: codex-rs/rmcp-client/src/rmcp_client.rs:504][E: codex-rs/rmcp-client/src/rmcp_client.rs:505][E: codex-rs/rmcp-client/src/rmcp_client.rs:507]
- `codex-mcp` accepts that connector metadata only when `server_name == CODEX_APPS_MCP_SERVER_NAME`; other servers have untrusted connector meta stripped and connector id/name/description cleared.[E: codex-rs/codex-mcp/src/rmcp_client.rs:410][E: codex-rs/codex-mcp/src/rmcp_client.rs:417][E: codex-rs/codex-mcp/src/rmcp_client.rs:421]
- `list_tools_for_client_uncached` uses trusted connector metadata to choose namespace descriptions; without connector metadata it falls back to server instructions.[E: codex-rs/codex-mcp/src/rmcp_client.rs:359][E: codex-rs/codex-mcp/src/rmcp_client.rs:382][E: codex-rs/codex-mcp/src/rmcp_client.rs:385][E: codex-rs/codex-mcp/src/rmcp_client.rs:388]

## Discoverability filters

- `filter_tool_suggest_discoverable_connectors` removes already-accessible connectors, removes hard-disallowed connectors for the originator, intersects with the supplied discoverable id set, and sorts by name/id.[E: codex-rs/connectors/src/filter.rs:5][E: codex-rs/connectors/src/filter.rs:11][E: codex-rs/connectors/src/filter.rs:17][E: codex-rs/connectors/src/filter.rs:19][E: codex-rs/connectors/src/filter.rs:20][E: codex-rs/connectors/src/filter.rs:22]
- First-party chat originators use a separate disallow list; other origins use the general disallow list.[E: codex-rs/connectors/src/filter.rs:30][E: codex-rs/connectors/src/filter.rs:38][E: codex-rs/connectors/src/filter.rs:41][E: codex-rs/connectors/src/filter.rs:54][E: codex-rs/connectors/src/filter.rs:58]

## Sources

- codex-rs/connectors/src/lib.rs
- codex-rs/connectors/src/accessible.rs
- codex-rs/connectors/src/merge.rs
- codex-rs/connectors/src/filter.rs
- codex-rs/connectors/src/metadata.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
- codex-rs/rmcp-client/src/rmcp_client.rs
