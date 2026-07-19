---
id: subsys.mcp.connectors
title: MCP connectors
kind: subsystem
tier: T2
source: [codex-rs/connectors/src/lib.rs, codex-rs/connectors/src/accessible.rs, codex-rs/connectors/src/merge.rs, codex-rs/connectors/src/filter.rs, codex-rs/connectors/src/metadata.rs, codex-rs/connectors/src/connector_runtime/mod.rs, codex-rs/connectors/src/metadata_store.rs, codex-rs/connectors/src/runtime_projection.rs, codex-rs/codex-mcp/src/rmcp_client.rs, codex-rs/rmcp-client/src/rmcp_client.rs]
symbols: [list_all_connectors_with_options, ConnectorDirectoryCacheKey, DirectoryApp, ConnectorRuntimeManager, ConnectorRuntimeSnapshot, ConnectorMetadataStore, installed_connector_runtime, collect_accessible_connectors, merge_connectors, filter_tool_suggest_discoverable_connectors, list_tools_with_connector_ids]
related: [subsys.mcp.client, subsys.mcp.name-qualification, tool.mcp-namespace-tools]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> Connectors now split across a small `connectors` crate and MCP tool metadata plumbing: directory/workspace listing builds a catalog of discoverable `AppInfo`s, accessible connectors are inferred from Codex Apps tool metadata, and only the reserved Codex Apps MCP server path preserves connector metadata for model-visible tool grouping.[E: codex-rs/connectors/src/lib.rs:169][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/codex-mcp/src/rmcp_client.rs:734]

## 能回答的问题

- connector directory 与 workspace connectors 怎样列出、缓存、合并？
- accessible connectors 怎样从 Codex Apps tools 反推？
- plugin connector placeholders 怎样与 accessible connector metadata 合并？
- tool-suggest discoverable connectors 怎样过滤已可访问 connector 并按 discoverable id 限定？
- 为什么普通 MCP server 的 connector `_meta` 不可信？

## 职责边界

`codex-rs/connectors` 管 catalog、accessible aggregation、merge、filter、display metadata；`rmcp-client` 只从 raw tool `_meta` 提取 connector id/name/description；`codex-mcp` 的 Codex Apps tool path 保留这些 metadata，regular MCP tool path 会去掉不可信 connector meta。[E: codex-rs/connectors/src/lib.rs:11][E: codex-rs/connectors/src/lib.rs:16][E: codex-rs/connectors/src/lib.rs:17][E: codex-rs/connectors/src/lib.rs:18][E: codex-rs/rmcp-client/src/rmcp_client.rs:512][E: codex-rs/codex-mcp/src/rmcp_client.rs:740][E: codex-rs/codex-mcp/src/rmcp_client.rs:801]

## 关键文件

- `codex-rs/connectors/src/lib.rs`: directory cache key/TTL, overlapped directory/workspace listing, app normalization, cache writes, and exports for the connector runtime/metadata projections.[E: codex-rs/connectors/src/lib.rs:31][E: codex-rs/connectors/src/lib.rs:41][E: codex-rs/connectors/src/lib.rs:183][E: codex-rs/connectors/src/lib.rs:191][E: codex-rs/connectors/src/lib.rs:201]
- `codex-rs/connectors/src/connector_runtime/mod.rs`: account/workspace-scoped live tool snapshots, one-time disk cold start, generation-guarded publication, and best-effort persistence。[E: codex-rs/connectors/src/connector_runtime/mod.rs:1][E: codex-rs/connectors/src/connector_runtime/mod.rs:42][E: codex-rs/connectors/src/connector_runtime/mod.rs:88][E: codex-rs/connectors/src/connector_runtime/mod.rs:114][E: codex-rs/connectors/src/connector_runtime/mod.rs:195][E: codex-rs/connectors/src/connector_runtime/mod.rs:226][E: codex-rs/connectors/src/connector_runtime/mod.rs:257]
- `codex-rs/connectors/src/metadata_store.rs` and `runtime_projection.rs`: app/read display metadata cache and local-policy projection of a committed tool snapshot into installed/enabled/callable connector rows。[E: codex-rs/connectors/src/metadata_store.rs:8][E: codex-rs/connectors/src/metadata_store.rs:16][E: codex-rs/connectors/src/metadata_store.rs:30][E: codex-rs/connectors/src/metadata_store.rs:56][E: codex-rs/connectors/src/runtime_projection.rs:10][E: codex-rs/connectors/src/runtime_projection.rs:26][E: codex-rs/connectors/src/runtime_projection.rs:38]
- `codex-rs/connectors/src/accessible.rs`: `AccessibleConnectorTool` input and `collect_accessible_connectors` aggregation into `AppInfo`.[E: codex-rs/connectors/src/accessible.rs:8][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/connectors/src/accessible.rs:38][E: codex-rs/connectors/src/accessible.rs:62]
- `codex-rs/connectors/src/merge.rs`: merge directory/plugin placeholders with accessible connector metadata and plugin display names.[E: codex-rs/connectors/src/merge.rs:8][E: codex-rs/connectors/src/merge.rs:20][E: codex-rs/connectors/src/merge.rs:54][E: codex-rs/connectors/src/merge.rs:66][E: codex-rs/connectors/src/merge.rs:86][E: codex-rs/connectors/src/merge.rs:105]
- `codex-rs/connectors/src/filter.rs`: tool-suggest discoverable filtering by accessible connector ids and configured discoverable connector ids.[E: codex-rs/connectors/src/filter.rs:5][E: codex-rs/connectors/src/filter.rs:10][E: codex-rs/connectors/src/filter.rs:18][E: codex-rs/connectors/src/filter.rs:19]
- `codex-rs/connectors/src/metadata.rs`: display label, mention slug, install URL, sanitized name, and accessibility-first sorting.[E: codex-rs/connectors/src/metadata.rs:3][E: codex-rs/connectors/src/metadata.rs:7][E: codex-rs/connectors/src/metadata.rs:15][E: codex-rs/connectors/src/metadata.rs:19][E: codex-rs/connectors/src/metadata.rs:23]

## Catalog flow

1. `list_all_connectors_with_options` returns unexpired in-memory cache unless `force_refetch` is true；workspace accounts start the paginated public directory and independent workspace request before awaiting either, then tolerate a failed workspace response while keeping the directory result。[E: codex-rs/connectors/src/lib.rs:183][E: codex-rs/connectors/src/lib.rs:191][E: codex-rs/connectors/src/lib.rs:195][E: codex-rs/connectors/src/lib.rs:198][E: codex-rs/connectors/src/lib.rs:201][E: codex-rs/connectors/src/lib.rs:203]
2. Directory/workspace apps are merged, converted to `AppInfo`, assigned install URLs, normalized names/descriptions, marked inaccessible by default, sorted by name/id, and written to cache.[E: codex-rs/connectors/src/lib.rs:209][E: codex-rs/connectors/src/lib.rs:213][E: codex-rs/connectors/src/lib.rs:218][E: codex-rs/connectors/src/lib.rs:219][E: codex-rs/connectors/src/lib.rs:221][E: codex-rs/connectors/src/lib.rs:223][E: codex-rs/connectors/src/lib.rs:228]
3. Cache has both memory and disk paths: memory uses `ConnectorDirectoryCacheKey` plus TTL, while disk load/write is delegated to `directory_cache`.[E: codex-rs/connectors/src/lib.rs:61][E: codex-rs/connectors/src/lib.rs:85][E: codex-rs/connectors/src/lib.rs:123][E: codex-rs/connectors/src/lib.rs:232]

## Accessible connector flow

- `collect_accessible_connectors` groups tools by connector id, prefers real connector names over id placeholders, fills missing descriptions, unions plugin display names, sets `is_accessible`/`is_enabled`, creates install URLs, and sorts accessibility-first.[E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/connectors/src/accessible.rs:19][E: codex-rs/connectors/src/accessible.rs:26][E: codex-rs/connectors/src/accessible.rs:38][E: codex-rs/connectors/src/accessible.rs:51][E: codex-rs/connectors/src/accessible.rs:65][E: codex-rs/connectors/src/accessible.rs:66][E: codex-rs/connectors/src/accessible.rs:70]
- `merge_connectors` overlays accessible metadata onto catalog entries, preserving accessible name/description/logo/distribution values when the catalog has placeholders or gaps, then deduplicates plugin display names.[E: codex-rs/connectors/src/merge.rs:8][E: codex-rs/connectors/src/merge.rs:20][E: codex-rs/connectors/src/merge.rs:23][E: codex-rs/connectors/src/merge.rs:25][E: codex-rs/connectors/src/merge.rs:28][E: codex-rs/connectors/src/merge.rs:31][E: codex-rs/connectors/src/merge.rs:43][E: codex-rs/connectors/src/merge.rs:59]
- Plugin connector placeholders intentionally use connector id as name so later directory or accessible metadata can replace it.[E: codex-rs/connectors/src/merge.rs:106][E: codex-rs/connectors/src/merge.rs:109]

## Runtime 与 metadata snapshots

- `ConnectorRuntimeManager` partitions live state by account id、ChatGPT user id、workspace classification；same identity shares an atomic snapshot, while a context reads disk only at construction and never treats disk as live authority。[E: codex-rs/connectors/src/connector_runtime/mod.rs:42][E: codex-rs/connectors/src/connector_runtime/mod.rs:68][E: codex-rs/connectors/src/connector_runtime/mod.rs:114][E: codex-rs/connectors/src/connector_runtime/mod.rs:116][E: codex-rs/connectors/src/connector_runtime/mod.rs:118][E: codex-rs/connectors/src/connector_runtime/mod.rs:163]
- Fetch tickets monotonically increase generation；a stale startup/hard-refresh completion cannot overwrite a newer accepted snapshot or persist out of order。[E: codex-rs/connectors/src/connector_runtime/mod.rs:195][E: codex-rs/connectors/src/connector_runtime/mod.rs:197][E: codex-rs/connectors/src/connector_runtime/mod.rs:226][E: codex-rs/connectors/src/connector_runtime/mod.rs:256][E: codex-rs/connectors/src/connector_runtime/mod.rs:257][E: codex-rs/connectors/src/connector_runtime/mod.rs:274][E: codex-rs/connectors/src/connector_runtime/mod.rs:278]
- `ConnectorMetadataStore` is a process-wide TTL cache scoped by backend plus auth identity；when tool summaries were requested, metadata-only late responses cannot replace still-fresh tool summaries。[E: codex-rs/connectors/src/metadata_store.rs:30][E: codex-rs/connectors/src/metadata_store.rs:56][E: codex-rs/connectors/src/metadata_store.rs:77][E: codex-rs/connectors/src/metadata_store.rs:85][E: codex-rs/connectors/src/metadata_store.rs:99]
- `installed_connector_runtime` drops synthetic helpers, groups tools by connector id, then derives `enabled` from app policy and `callable` from model visibility plus per-tool policy。[E: codex-rs/connectors/src/runtime_projection.rs:38][E: codex-rs/connectors/src/runtime_projection.rs:43][E: codex-rs/connectors/src/runtime_projection.rs:47][E: codex-rs/connectors/src/runtime_projection.rs:69][E: codex-rs/connectors/src/runtime_projection.rs:78][E: codex-rs/connectors/src/runtime_projection.rs:81]

## MCP metadata trust boundary

- `RmcpClient::list_tools_with_connector_ids` extracts connector metadata from raw MCP tool `_meta` keys `connector_id`, `connector_name`/`connector_display_name`, and `connector_description`/`connectorDescription`.[E: codex-rs/rmcp-client/src/rmcp_client.rs:512][E: codex-rs/rmcp-client/src/rmcp_client.rs:528][E: codex-rs/rmcp-client/src/rmcp_client.rs:529][E: codex-rs/rmcp-client/src/rmcp_client.rs:530][E: codex-rs/rmcp-client/src/rmcp_client.rs:532]
- `codex-mcp` routes listed tools through a Codex Apps conversion only for `is_codex_apps_mcp_server`; that path preserves connector id/name/description, while the regular MCP conversion strips untrusted connector metadata and clears connector fields.[E: codex-rs/codex-mcp/src/rmcp_client.rs:734][E: codex-rs/codex-mcp/src/rmcp_client.rs:740][E: codex-rs/codex-mcp/src/rmcp_client.rs:749][E: codex-rs/codex-mcp/src/rmcp_client.rs:755][E: codex-rs/codex-mcp/src/rmcp_client.rs:757][E: codex-rs/codex-mcp/src/rmcp_client.rs:795][E: codex-rs/codex-mcp/src/rmcp_client.rs:801][E: codex-rs/codex-mcp/src/rmcp_client.rs:811]
- `list_tools_for_client_uncached` obtains tools plus optional connector metadata, then Codex Apps tools use connector metadata to choose namespace descriptions; regular MCP tools fall back to server instructions.[E: codex-rs/codex-mcp/src/rmcp_client.rs:625][E: codex-rs/codex-mcp/src/rmcp_client.rs:634][E: codex-rs/codex-mcp/src/rmcp_client.rs:641][E: codex-rs/codex-mcp/src/rmcp_client.rs:773][E: codex-rs/codex-mcp/src/rmcp_client.rs:776][E: codex-rs/codex-mcp/src/rmcp_client.rs:806][E: codex-rs/codex-mcp/src/rmcp_client.rs:808]

## Discoverability filters

- `filter_tool_suggest_discoverable_connectors` removes already-accessible connectors, intersects with the supplied discoverable id set, and sorts by name/id.[E: codex-rs/connectors/src/filter.rs:5][E: codex-rs/connectors/src/filter.rs:10][E: codex-rs/connectors/src/filter.rs:18][E: codex-rs/connectors/src/filter.rs:19][E: codex-rs/connectors/src/filter.rs:21]
- This filter is deliberately scoped to discoverability: it removes already-accessible connectors and intersects the configured discoverable-id set；global/workspace app policy is applied by callers and runtime projection。[E: codex-rs/connectors/src/filter.rs:5][E: codex-rs/connectors/src/filter.rs:10][E: codex-rs/connectors/src/filter.rs:18][E: codex-rs/connectors/src/runtime_projection.rs:28][I]

## Sources

- codex-rs/connectors/src/lib.rs
- codex-rs/connectors/src/accessible.rs
- codex-rs/connectors/src/merge.rs
- codex-rs/connectors/src/filter.rs
- codex-rs/connectors/src/metadata.rs
- codex-rs/connectors/src/connector_runtime/mod.rs
- codex-rs/connectors/src/metadata_store.rs
- codex-rs/connectors/src/runtime_projection.rs
- codex-rs/codex-mcp/src/rmcp_client.rs
- codex-rs/rmcp-client/src/rmcp_client.rs
