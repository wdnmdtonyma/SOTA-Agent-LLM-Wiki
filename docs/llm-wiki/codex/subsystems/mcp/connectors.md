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
updated: db887d03e1
---

> Connectors now split across a small `connectors` crate and MCP tool metadata plumbing: directory/workspace listing builds a catalog of discoverable `AppInfo`s, accessible connectors are inferred from Codex Apps tool metadata, and only the reserved Codex Apps MCP server path preserves connector metadata for model-visible tool grouping.[E: codex-rs/connectors/src/lib.rs:148][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/codex-mcp/src/rmcp_client.rs:658]

## 能回答的问题

- connector directory 与 workspace connectors 怎样列出、缓存、合并？
- accessible connectors 怎样从 Codex Apps tools 反推？
- plugin connector placeholders 怎样与 accessible connector metadata 合并？
- tool-suggest discoverable connectors 怎样过滤已可访问 connector 并按 discoverable id 限定？
- 为什么普通 MCP server 的 connector `_meta` 不可信？

## 职责边界

`codex-rs/connectors` 管 catalog、accessible aggregation、merge、filter、display metadata；`rmcp-client` 只从 raw tool `_meta` 提取 connector id/name/description；`codex-mcp` 的 Codex Apps tool path 保留这些 metadata，regular MCP tool path 会去掉不可信 connector meta。[E: codex-rs/connectors/src/lib.rs:11][E: codex-rs/connectors/src/lib.rs:15][E: codex-rs/connectors/src/lib.rs:16][E: codex-rs/connectors/src/lib.rs:17][E: codex-rs/rmcp-client/src/rmcp_client.rs:506][E: codex-rs/codex-mcp/src/rmcp_client.rs:664][E: codex-rs/codex-mcp/src/rmcp_client.rs:724]

## 关键文件

- `codex-rs/connectors/src/lib.rs`: directory cache key/TTL, directory listing, workspace listing, app normalization, cache writes.[E: codex-rs/connectors/src/lib.rs:37][E: codex-rs/connectors/src/lib.rs:40][E: codex-rs/connectors/src/lib.rs:74][E: codex-rs/connectors/src/lib.rs:148][E: codex-rs/connectors/src/lib.rs:170][E: codex-rs/connectors/src/lib.rs:193]
- `codex-rs/connectors/src/accessible.rs`: `AccessibleConnectorTool` input and `collect_accessible_connectors` aggregation into `AppInfo`.[E: codex-rs/connectors/src/accessible.rs:8][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/connectors/src/accessible.rs:38][E: codex-rs/connectors/src/accessible.rs:62]
- `codex-rs/connectors/src/merge.rs`: merge directory/plugin placeholders with accessible connector metadata and plugin display names.[E: codex-rs/connectors/src/merge.rs:8][E: codex-rs/connectors/src/merge.rs:20][E: codex-rs/connectors/src/merge.rs:54][E: codex-rs/connectors/src/merge.rs:66][E: codex-rs/connectors/src/merge.rs:86][E: codex-rs/connectors/src/merge.rs:105]
- `codex-rs/connectors/src/filter.rs`: tool-suggest discoverable filtering by accessible connector ids and configured discoverable connector ids.[E: codex-rs/connectors/src/filter.rs:5][E: codex-rs/connectors/src/filter.rs:10][E: codex-rs/connectors/src/filter.rs:18][E: codex-rs/connectors/src/filter.rs:19]
- `codex-rs/connectors/src/metadata.rs`: display label, mention slug, install URL, sanitized name, and accessibility-first sorting.[E: codex-rs/connectors/src/metadata.rs:3][E: codex-rs/connectors/src/metadata.rs:7][E: codex-rs/connectors/src/metadata.rs:15][E: codex-rs/connectors/src/metadata.rs:19][E: codex-rs/connectors/src/metadata.rs:23]

## Catalog flow

1. `list_all_connectors_with_options` returns unexpired in-memory cache unless `force_refetch` is true, then lists directory connectors and conditionally workspace connectors for workspace accounts.[E: codex-rs/connectors/src/lib.rs:148][E: codex-rs/connectors/src/lib.rs:158][E: codex-rs/connectors/src/lib.rs:165][E: codex-rs/connectors/src/lib.rs:179]
2. Directory/workspace apps are merged, converted to `AppInfo`, assigned install URLs, normalized names/descriptions, marked inaccessible by default, sorted by name/id, and written to cache.[E: codex-rs/connectors/src/lib.rs:170][E: codex-rs/connectors/src/lib.rs:174][E: codex-rs/connectors/src/lib.rs:179][E: codex-rs/connectors/src/lib.rs:180][E: codex-rs/connectors/src/lib.rs:182][E: codex-rs/connectors/src/lib.rs:184][E: codex-rs/connectors/src/lib.rs:189]
3. Cache has both memory and disk paths: memory uses `ConnectorDirectoryCacheKey` plus TTL, while disk load/write is delegated to `directory_cache`.[E: codex-rs/connectors/src/lib.rs:40][E: codex-rs/connectors/src/lib.rs:64][E: codex-rs/connectors/src/lib.rs:102][E: codex-rs/connectors/src/lib.rs:193]

## Accessible connector flow

- `collect_accessible_connectors` groups tools by connector id, prefers real connector names over id placeholders, fills missing descriptions, unions plugin display names, sets `is_accessible`/`is_enabled`, creates install URLs, and sorts accessibility-first.[E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/connectors/src/accessible.rs:19][E: codex-rs/connectors/src/accessible.rs:26][E: codex-rs/connectors/src/accessible.rs:38][E: codex-rs/connectors/src/accessible.rs:51][E: codex-rs/connectors/src/accessible.rs:65][E: codex-rs/connectors/src/accessible.rs:66][E: codex-rs/connectors/src/accessible.rs:70]
- `merge_connectors` overlays accessible metadata onto catalog entries, preserving accessible name/description/logo/distribution values when the catalog has placeholders or gaps, then deduplicates plugin display names.[E: codex-rs/connectors/src/merge.rs:8][E: codex-rs/connectors/src/merge.rs:20][E: codex-rs/connectors/src/merge.rs:23][E: codex-rs/connectors/src/merge.rs:25][E: codex-rs/connectors/src/merge.rs:28][E: codex-rs/connectors/src/merge.rs:31][E: codex-rs/connectors/src/merge.rs:43][E: codex-rs/connectors/src/merge.rs:59]
- Plugin connector placeholders intentionally use connector id as name so later directory or accessible metadata can replace it.[E: codex-rs/connectors/src/merge.rs:106][E: codex-rs/connectors/src/merge.rs:109]

## MCP metadata trust boundary

- `RmcpClient::list_tools_with_connector_ids` extracts connector metadata from raw MCP tool `_meta` keys `connector_id`, `connector_name`/`connector_display_name`, and `connector_description`/`connectorDescription`.[E: codex-rs/rmcp-client/src/rmcp_client.rs:506][E: codex-rs/rmcp-client/src/rmcp_client.rs:522][E: codex-rs/rmcp-client/src/rmcp_client.rs:523][E: codex-rs/rmcp-client/src/rmcp_client.rs:524][E: codex-rs/rmcp-client/src/rmcp_client.rs:526]
- `codex-mcp` routes listed tools through a Codex Apps conversion only for `is_codex_apps_mcp_server`; that path preserves connector id/name/description, while the regular MCP conversion strips untrusted connector metadata and clears connector fields.[E: codex-rs/codex-mcp/src/rmcp_client.rs:658][E: codex-rs/codex-mcp/src/rmcp_client.rs:664][E: codex-rs/codex-mcp/src/rmcp_client.rs:673][E: codex-rs/codex-mcp/src/rmcp_client.rs:679][E: codex-rs/codex-mcp/src/rmcp_client.rs:681][E: codex-rs/codex-mcp/src/rmcp_client.rs:718][E: codex-rs/codex-mcp/src/rmcp_client.rs:724][E: codex-rs/codex-mcp/src/rmcp_client.rs:733]
- `list_tools_for_client_uncached` obtains tools plus optional connector metadata, then Codex Apps tools use connector metadata to choose namespace descriptions; regular MCP tools fall back to server instructions.[E: codex-rs/codex-mcp/src/rmcp_client.rs:564][E: codex-rs/codex-mcp/src/rmcp_client.rs:571][E: codex-rs/codex-mcp/src/rmcp_client.rs:578][E: codex-rs/codex-mcp/src/rmcp_client.rs:697][E: codex-rs/codex-mcp/src/rmcp_client.rs:700][E: codex-rs/codex-mcp/src/rmcp_client.rs:729][E: codex-rs/codex-mcp/src/rmcp_client.rs:731]

## Discoverability filters

- `filter_tool_suggest_discoverable_connectors` removes already-accessible connectors, intersects with the supplied discoverable id set, and sorts by name/id.[E: codex-rs/connectors/src/filter.rs:5][E: codex-rs/connectors/src/filter.rs:10][E: codex-rs/connectors/src/filter.rs:18][E: codex-rs/connectors/src/filter.rs:19][E: codex-rs/connectors/src/filter.rs:21]
- The previous hard-disallow/originator-specific filter branch is not present in current `codex-rs/connectors/src/filter.rs`; whether that policy moved to a caller or was intentionally removed needs product confirmation.[U]

## Sources

- codex-rs/connectors/src/lib.rs
- codex-rs/connectors/src/accessible.rs
- codex-rs/connectors/src/merge.rs
- codex-rs/connectors/src/filter.rs
- codex-rs/connectors/src/metadata.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
- codex-rs/rmcp-client/src/rmcp_client.rs
