---
id: subsys.mcp.connectors
title: MCP connectors
kind: subsystem
tier: T2
source: [codex-rs/connectors/src/lib.rs, codex-rs/connectors/src/accessible.rs, codex-rs/connectors/src/metadata.rs, codex-rs/codex-mcp/src/mcp_connection_manager.rs, codex-rs/rmcp-client/src/rmcp_client.rs]
symbols: [list_all_connectors_with_options, AllConnectorsCacheKey, DirectoryApp, collect_accessible_connectors, connector_install_url, connector_display_label, connector_mention_slug, sort_connectors_by_accessibility_and_name]
related: [subsys.mcp.client, subsys.mcp.name-qualification, tool.mcp-namespace-tools]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> Connectors 子系统有两条源码路径：directory/workspace directory 生成默认不可访问的 `AppInfo` catalog，accessible connectors 由 Codex Apps MCP tool metadata 单独聚合；MCP client 会把 connector id/name/description 和 plugin provenance 附着到 `ToolInfo` 与 model-visible descriptions。[E: codex-rs/connectors/src/lib.rs:97][E: codex-rs/connectors/src/lib.rs:116][E: codex-rs/connectors/src/lib.rs:365][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/rmcp-client/src/rmcp_client.rs:651][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1772][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:599]

## 能回答的问题

- connectors directory 与 workspace connectors 怎样合并？
- accessible connectors 怎样从已列出的 Codex Apps tools 反推？
- install URL 和 slug 怎样生成？
- plugin display names 怎样进入 tool description？
- connectors catalog cache 的 key 和 TTL 是什么？

## 职责边界

`codex-rs/connectors` 负责 directory/workspace connector catalog 和 accessible connector aggregation；`rmcp-client` 从 Codex Apps MCP tool `_meta` 提取 connector metadata，`codex-mcp` 负责过滤 connector id、把 plugin provenance 写入 `ToolInfo.plugin_display_names` 并追加到 model-visible description。[E: codex-rs/connectors/src/lib.rs:97][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/rmcp-client/src/rmcp_client.rs:651][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:585][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:599][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1712]

## 关键 crate/文件

- `codex-rs/connectors/src/lib.rs`: directory/workspace list、cache、merge、normalization、install URL。[E: codex-rs/connectors/src/lib.rs:18][E: codex-rs/connectors/src/lib.rs:79][E: codex-rs/connectors/src/lib.rs:150][E: codex-rs/connectors/src/lib.rs:183][E: codex-rs/connectors/src/lib.rs:200][E: codex-rs/connectors/src/lib.rs:374][E: codex-rs/connectors/src/lib.rs:396][E: codex-rs/connectors/src/lib.rs:405]
- `codex-rs/connectors/src/accessible.rs`: 从 accessible tool metadata 聚合 `AppInfo`。[E: codex-rs/connectors/src/accessible.rs:8][E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/connectors/src/accessible.rs:34]
- `codex-rs/connectors/src/metadata.rs`: display label、mention slug、install URL reexport、sorting 规则。[E: codex-rs/connectors/src/metadata.rs:3][E: codex-rs/connectors/src/metadata.rs:7][E: codex-rs/connectors/src/metadata.rs:11][E: codex-rs/connectors/src/metadata.rs:19]
- `codex-rs/codex-mcp/src/mcp_connection_manager.rs`: Codex Apps tool metadata 读取、description 注入、connector id allow-list。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:585][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:599][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1712]

## 数据模型

- `AllConnectorsCacheKey` 包含 base_url、account_id、user_id、is_workspace；cache static 使用该 key 存储 connectors 与 expires_at。[E: codex-rs/connectors/src/lib.rs:20][E: codex-rs/connectors/src/lib.rs:22][E: codex-rs/connectors/src/lib.rs:23][E: codex-rs/connectors/src/lib.rs:25][E: codex-rs/connectors/src/lib.rs:44]
- cache TTL 是 3600 秒；`cached_all_connectors` 在 key 匹配且未过期时命中，过期时清空 cache，key 不匹配时 miss 但保留现有 cache。[E: codex-rs/connectors/src/lib.rs:18][E: codex-rs/connectors/src/lib.rs:79][E: codex-rs/connectors/src/lib.rs:84][E: codex-rs/connectors/src/lib.rs:85][E: codex-rs/connectors/src/lib.rs:90]
- `DirectoryApp` 映射 directory API 的 id、name、description、appMetadata、branding、labels、logo URL、distributionChannel、visibility。[E: codex-rs/connectors/src/lib.rs:61][E: codex-rs/connectors/src/lib.rs:63][E: codex-rs/connectors/src/lib.rs:64][E: codex-rs/connectors/src/lib.rs:65][E: codex-rs/connectors/src/lib.rs:69][E: codex-rs/connectors/src/lib.rs:75]
- `AccessibleConnectorTool` 包含 connector_id/name/description/plugin_display_name，是从 Codex Apps MCP tools 中提取 accessibility 的输入模型。[E: codex-rs/connectors/src/accessible.rs:8][E: codex-rs/connectors/src/accessible.rs:10][E: codex-rs/connectors/src/accessible.rs:11][E: codex-rs/connectors/src/accessible.rs:12]

## 控制流

1. `list_all_connectors_with_options` 在 `force_refetch == false` 时先查 cache；cache miss 后拉 directory apps，workspace account 额外拉 workspace connectors。[E: codex-rs/connectors/src/lib.rs:97][E: codex-rs/connectors/src/lib.rs:103][E: codex-rs/connectors/src/lib.rs:107][E: codex-rs/connectors/src/lib.rs:111][E: codex-rs/connectors/src/lib.rs:112]
2. directory list 调用 `/connectors/directory/list?external_logos=true`，按 `next_token` 继续分页，并过滤 hidden apps。[E: codex-rs/connectors/src/lib.rs:150][E: codex-rs/connectors/src/lib.rs:159][E: codex-rs/connectors/src/lib.rs:170][E: codex-rs/connectors/src/lib.rs:174]
3. workspace list 调用 `/connectors/directory/list_workspace?external_logos=true`；请求失败时返回 empty vector，而不是让整个 connectors catalog 失败。[E: codex-rs/connectors/src/lib.rs:183][E: codex-rs/connectors/src/lib.rs:189][E: codex-rs/connectors/src/lib.rs:194][E: codex-rs/connectors/src/lib.rs:196]
4. directory apps 与 workspace apps 先通过 `merge_directory_apps` 合并，再转换成 `AppInfo`；directory-derived `AppInfo` 默认 `is_accessible = false`，然后按 name/id 排序并写 cache。[E: codex-rs/connectors/src/lib.rs:116][E: codex-rs/connectors/src/lib.rs:119][E: codex-rs/connectors/src/lib.rs:128][E: codex-rs/connectors/src/lib.rs:130][E: codex-rs/connectors/src/lib.rs:135]
5. `collect_accessible_connectors` 按 connector_id 聚合 tools，name 缺失或空白时 fallback 到 connector_id，description 只保留非空 metadata，并用 `BTreeSet` 去重 plugin display names。[E: codex-rs/connectors/src/accessible.rs:15][E: codex-rs/connectors/src/accessible.rs:21][E: codex-rs/connectors/src/accessible.rs:23][E: codex-rs/connectors/src/accessible.rs:24][E: codex-rs/connectors/src/accessible.rs:60]
6. `connector_install_url` 输出 `https://chatgpt.com/apps/{slug}/{connector_id}`，slug 由 connector name 转小写并把非 alphanumeric 字符归一化为 `-`。[E: codex-rs/connectors/src/lib.rs:374][E: codex-rs/connectors/src/lib.rs:376][E: codex-rs/connectors/src/lib.rs:379][E: codex-rs/connectors/src/lib.rs:385]
7. `RmcpClient::list_tools_with_connector_ids` 从 tool `_meta` 读取 `connector_id`、`connector_name` 或 `connector_display_name`、`connector_description` 或 `connectorDescription`。[E: codex-rs/rmcp-client/src/rmcp_client.rs:635][E: codex-rs/rmcp-client/src/rmcp_client.rs:651][E: codex-rs/rmcp-client/src/rmcp_client.rs:652][E: codex-rs/rmcp-client/src/rmcp_client.rs:653][E: codex-rs/rmcp-client/src/rmcp_client.rs:655]
8. `AsyncManagedClient::listed_tools` 对 Codex Apps tools 追加 plugin provenance note；`list_tools_for_client_uncached` 把 connector metadata 映射到 `ToolInfo`，并把 `plugin_display_names` 初始化为空，等待 `listed_tools` 按当前 session provenance 填充。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:585][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:593][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:599][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:624][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1772][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1780][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1781]

## 设计动机与权衡

- `directory_app_to_app_info` 默认 `is_accessible = false`、`is_enabled = true`、plugin_display_names empty；这表示 directory-derived catalog 默认不声明当前用户可访问性。[E: codex-rs/connectors/src/lib.rs:356][E: codex-rs/connectors/src/lib.rs:368][E: codex-rs/connectors/src/lib.rs:369][E: codex-rs/connectors/src/lib.rs:370][I]
- `sort_connectors_by_accessibility_and_name` 把 accessible connectors 排在前面，再按当前 `name` 和 `id` 字符串排序。[E: codex-rs/connectors/src/metadata.rs:19][E: codex-rs/connectors/src/metadata.rs:21][E: codex-rs/connectors/src/metadata.rs:24][E: codex-rs/connectors/src/metadata.rs:25]
- Codex Apps tool cache 和 uncached list 都会经过 `filter_disallowed_codex_apps_tools`，该函数用 `is_connector_id_allowed` 过滤带 connector id 的 tools。[E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1692][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1702][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1712][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1717][E: codex-rs/codex-mcp/src/mcp_connection_manager.rs:1785]

## gotcha

- hidden directory apps 被过滤，但 workspace list 请求失败只变成 empty list；catalog 缺少 workspace connector 不一定代表 workspace 没有 connector。[E: codex-rs/connectors/src/lib.rs:170][E: codex-rs/connectors/src/lib.rs:194]
- `connector_display_label` 使用 app name；`connector_mention_slug` 使用 connector name slug；两者不是同一个文本形态。[E: codex-rs/connectors/src/metadata.rs:3][E: codex-rs/connectors/src/metadata.rs:7]
- connector description 会经过 trim/empty normalization；空白 description 会变成 `None`，而不是空字符串。[E: codex-rs/connectors/src/lib.rs:405][E: codex-rs/connectors/src/lib.rs:407][E: codex-rs/connectors/src/lib.rs:409]

## Sources

- codex-rs/connectors/src/lib.rs
- codex-rs/connectors/src/accessible.rs
- codex-rs/connectors/src/metadata.rs
- codex-rs/codex-mcp/src/mcp_connection_manager.rs
- codex-rs/rmcp-client/src/rmcp_client.rs

## 相关

- `subsys.mcp.client`
- `subsys.mcp.name-qualification`
- `tool.mcp-namespace-tools`
