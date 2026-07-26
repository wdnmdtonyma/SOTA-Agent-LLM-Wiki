---
id: rpc.mcp-skills-plugin-methods
title: mcp/skills/plugin/app 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/apps.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server/src/request_processors/plugins.rs]
symbols: [SkillsListParams, SkillsListResponse, SkillsExtraRootsSetParams, MarketplaceAddParams, PluginListParams, PluginInstallParams, PluginShareSaveResponse, PluginShareContext, SkillInterface, HookMetadata, AppsListParams, AppsReadParams, AppsReadResponse, AppsInstalledParams, AppsInstalledResponse, ListMcpServerStatusParams, McpServerToolCallParams]
related: [rpc.overview, rpc.notifications-system, subsys.mcp.client, subsys.config-auth.plugins, subsys.config-auth.skills]
evidence: explicit
status: verified
updated: 61a44880a8
---

> mcp/skills/plugin/app 方法是 app-server 对 MCP server、skills roots/config、marketplace、plugin install/share/read 和 app connector catalog 的 client request catalog。

## 能回答的问题

- skills、marketplace、plugin、app、mcpServer 当前有哪些 wire method？
- `config/mcpServer/reload` 属于哪个 catalog？
- MCP OAuth、status、resource read 和 tool call 使用哪些 params/response 类型？
- plugin share/install/read/list 方法如何分组？

## 字段模型

skills、marketplace 和 plugin 类型集中在 `v2/plugin.rs`；app connector 的 list/read/installed types 在 `v2/apps.rs`；MCP status/resource/tool/OAuth/reload 类型在 `v2/mcp.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:21][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:34][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:69][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:12][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:31][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:221][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:35][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:83]

`app/read` 一次读取最多 100 个 app ids，可选择返回 display-only public tool summaries，并把找不到的 ids 放进 `missing_app_ids`。`app/installed` 读取已提交的 runtime connector snapshot，可按 thread effective config 计算，并可先 force refresh；每项明确 `enabled` 与 model-visible `callable`。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:221][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:223][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:34]

`plugin/list` params 新增 `forceRefetch`：默认 false。为 true 且查询包含 Local 时，它刷新匹配当前 config/roots 的 non-curated local plugin cache；remote catalog 同时使用 `ForceRefetch` cache mode。它不改变 marketplace filters，仍与 `cwds`、`marketplaceKinds` 一起决定查询范围。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:126][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:140][E: codex-rs/app-server/src/request_processors/plugins.rs:577][E: codex-rs/app-server/src/request_processors/plugins.rs:580][E: codex-rs/app-server/src/request_processors/plugins.rs:595][E: codex-rs/app-server/src/request_processors/plugins.rs:598]

App metadata 当前包含 categories、screenshots、developer/version、install/composer flags 等；旧 `firstPartyType` 已从目标 wire shape 删除。`app/read` 的 public tool summary 则明确提供 enable/read-only/disabled-reason 信息。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:100][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:111][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:185][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:197]

plugin wire types 本轮还增加四组字段：`PluginShareSaveResponse` 与 `PluginShareContext` 都有 optional `canPublishToWorkspace`；`SkillInterface` 增 remote `iconSmallUrl`/`iconLargeUrl`；`HookMetadata` 新增 optional `additionalContextLimit`，其中 null 使用 2,500 tokens、0 禁用 spill。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:251][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:258][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:442][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:455][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:457][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:520][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:530][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:533][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:654][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:668]

`skills/list` uses a shared-read config serialization scope, while skills config write, marketplace mutation and plugin install/uninstall use global config serialization in the macro invocation.[E: codex-rs/app-server-protocol/src/protocol/common.rs:681][E: codex-rs/app-server-protocol/src/protocol/common.rs:686][E: codex-rs/app-server-protocol/src/protocol/common.rs:696][E: codex-rs/app-server-protocol/src/protocol/common.rs:818][E: codex-rs/app-server-protocol/src/protocol/common.rs:823][E: codex-rs/app-server-protocol/src/protocol/common.rs:828]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `SkillsList` | `skills/list` | `v2::SkillsListParams` | `v2::SkillsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:679][E: codex-rs/app-server-protocol/src/protocol/common.rs:680][E: codex-rs/app-server-protocol/src/protocol/common.rs:682] |
| `SkillsExtraRootsSet` | `skills/extraRoots/set` | `v2::SkillsExtraRootsSetParams` | `v2::SkillsExtraRootsSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:684][E: codex-rs/app-server-protocol/src/protocol/common.rs:685][E: codex-rs/app-server-protocol/src/protocol/common.rs:687] |
| `MarketplaceAdd` | `marketplace/add` | `v2::MarketplaceAddParams` | `v2::MarketplaceAddResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:694][E: codex-rs/app-server-protocol/src/protocol/common.rs:695][E: codex-rs/app-server-protocol/src/protocol/common.rs:697] |
| `MarketplaceRemove` | `marketplace/remove` | `v2::MarketplaceRemoveParams` | `v2::MarketplaceRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:699][E: codex-rs/app-server-protocol/src/protocol/common.rs:700][E: codex-rs/app-server-protocol/src/protocol/common.rs:702] |
| `MarketplaceUpgrade` | `marketplace/upgrade` | `v2::MarketplaceUpgradeParams` | `v2::MarketplaceUpgradeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:704][E: codex-rs/app-server-protocol/src/protocol/common.rs:705][E: codex-rs/app-server-protocol/src/protocol/common.rs:707] |
| `PluginList` | `plugin/list` | `v2::PluginListParams` | `v2::PluginListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:709][E: codex-rs/app-server-protocol/src/protocol/common.rs:710][E: codex-rs/app-server-protocol/src/protocol/common.rs:712] |
| `PluginInstalled` | `plugin/installed` | `v2::PluginInstalledParams` | `v2::PluginInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:714][E: codex-rs/app-server-protocol/src/protocol/common.rs:715][E: codex-rs/app-server-protocol/src/protocol/common.rs:717] |
| `PluginRead` | `plugin/read` | `v2::PluginReadParams` | `v2::PluginReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:719][E: codex-rs/app-server-protocol/src/protocol/common.rs:720][E: codex-rs/app-server-protocol/src/protocol/common.rs:722] |
| `PluginSkillRead` | `plugin/skill/read` | `v2::PluginSkillReadParams` | `v2::PluginSkillReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:724][E: codex-rs/app-server-protocol/src/protocol/common.rs:725][E: codex-rs/app-server-protocol/src/protocol/common.rs:727] |
| `PluginShareSave` | `plugin/share/save` | `v2::PluginShareSaveParams` | `v2::PluginShareSaveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:729][E: codex-rs/app-server-protocol/src/protocol/common.rs:730][E: codex-rs/app-server-protocol/src/protocol/common.rs:732] |
| `PluginShareUpdateTargets` | `plugin/share/updateTargets` | `v2::PluginShareUpdateTargetsParams` | `v2::PluginShareUpdateTargetsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:734][E: codex-rs/app-server-protocol/src/protocol/common.rs:735][E: codex-rs/app-server-protocol/src/protocol/common.rs:737] |
| `PluginShareList` | `plugin/share/list` | `v2::PluginShareListParams` | `v2::PluginShareListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:739][E: codex-rs/app-server-protocol/src/protocol/common.rs:740][E: codex-rs/app-server-protocol/src/protocol/common.rs:742] |
| `PluginShareCheckout` | `plugin/share/checkout` | `v2::PluginShareCheckoutParams` | `v2::PluginShareCheckoutResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:744][E: codex-rs/app-server-protocol/src/protocol/common.rs:745][E: codex-rs/app-server-protocol/src/protocol/common.rs:747] |
| `PluginShareDelete` | `plugin/share/delete` | `v2::PluginShareDeleteParams` | `v2::PluginShareDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:749][E: codex-rs/app-server-protocol/src/protocol/common.rs:750][E: codex-rs/app-server-protocol/src/protocol/common.rs:752] |
| `AppsRead` | `app/read` | `v2::AppsReadParams` | `v2::AppsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:754][E: codex-rs/app-server-protocol/src/protocol/common.rs:755][E: codex-rs/app-server-protocol/src/protocol/common.rs:757] |
| `AppsList` | `app/list` | `v2::AppsListParams` | `v2::AppsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:759][E: codex-rs/app-server-protocol/src/protocol/common.rs:760][E: codex-rs/app-server-protocol/src/protocol/common.rs:762] |
| `AppsInstalled` | `app/installed` | `v2::AppsInstalledParams` | `v2::AppsInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:764][E: codex-rs/app-server-protocol/src/protocol/common.rs:765][E: codex-rs/app-server-protocol/src/protocol/common.rs:767] |
| `SkillsConfigWrite` | `skills/config/write` | `v2::SkillsConfigWriteParams` | `v2::SkillsConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:816][E: codex-rs/app-server-protocol/src/protocol/common.rs:817][E: codex-rs/app-server-protocol/src/protocol/common.rs:819] |
| `PluginInstall` | `plugin/install` | `v2::PluginInstallParams` | `v2::PluginInstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:821][E: codex-rs/app-server-protocol/src/protocol/common.rs:822][E: codex-rs/app-server-protocol/src/protocol/common.rs:824] |
| `PluginUninstall` | `plugin/uninstall` | `v2::PluginUninstallParams` | `v2::PluginUninstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:826][E: codex-rs/app-server-protocol/src/protocol/common.rs:827][E: codex-rs/app-server-protocol/src/protocol/common.rs:829] |
| `McpServerOauthLogin` | `mcpServer/oauth/login` | `v2::McpServerOauthLoginParams` | `v2::McpServerOauthLoginResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:993][E: codex-rs/app-server-protocol/src/protocol/common.rs:994][E: codex-rs/app-server-protocol/src/protocol/common.rs:996] |
| `McpServerRefresh` | `config/mcpServer/reload` | `Option<()>` | `v2::McpServerRefreshResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:999][E: codex-rs/app-server-protocol/src/protocol/common.rs:1000][E: codex-rs/app-server-protocol/src/protocol/common.rs:1002] |
| `McpServerStatusList` | `mcpServerStatus/list` | `v2::ListMcpServerStatusParams` | `v2::ListMcpServerStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1005][E: codex-rs/app-server-protocol/src/protocol/common.rs:1006][E: codex-rs/app-server-protocol/src/protocol/common.rs:1008] |
| `McpResourceRead` | `mcpServer/resource/read` | `v2::McpResourceReadParams` | `v2::McpResourceReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1011][E: codex-rs/app-server-protocol/src/protocol/common.rs:1012][E: codex-rs/app-server-protocol/src/protocol/common.rs:1014] |
| `McpServerToolCall` | `mcpServer/tool/call` | `v2::McpServerToolCallParams` | `v2::McpServerToolCallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1017][E: codex-rs/app-server-protocol/src/protocol/common.rs:1018][E: codex-rs/app-server-protocol/src/protocol/common.rs:1020] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/apps.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server/src/request_processors/plugins.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
