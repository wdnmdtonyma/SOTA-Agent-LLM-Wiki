---
id: rpc.mcp-skills-plugin-methods
title: mcp/skills/plugin/app 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs, codex-rs/app-server-protocol/src/protocol/v2/apps.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server/src/request_processors/plugins.rs, codex-rs/app-server/src/request_processors/plugins/search.rs]
symbols: [SkillsListParams, SkillsListResponse, SkillsExtraRootsSetParams, MarketplaceAddParams, PluginListParams, PluginSearchParams, PluginSearchResponse, PluginSummary, PluginDisabledReason, PluginInstallParams, PluginShareSaveResponse, PluginShareContext, SkillInterface, HookMetadata, AppsListParams, AppsReadParams, AppsReadResponse, AppsInstalledParams, AppsInstalledResponse, ListMcpServerStatusParams, McpServerToolCallParams]
related: [rpc.overview, rpc.notifications-system, subsys.mcp.client, subsys.config-auth.plugins, subsys.config-auth.skills]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> mcp/skills/plugin/app 方法是 app-server 对 MCP server、skills roots/config、marketplace、plugin install/share/read 和 app connector catalog 的 client request catalog。

## 能回答的问题

- skills、marketplace、plugin、app、mcpServer 当前有哪些 wire method？
- `config/mcpServer/reload` 属于哪个 catalog？
- MCP OAuth、status、resource read 和 tool call 使用哪些 params/response 类型？
- plugin share/install/read/list 方法如何分组？

## 字段模型

skills、marketplace 和 plugin 类型集中在 `v2/plugin.rs`；app connector 的 list/read/installed types 在 `v2/apps.rs`；MCP status/resource/tool/OAuth/reload 类型在 `v2/mcp.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:20][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:33][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:128][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:12][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:31][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:224][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:36][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:102]

`app/read` 一次读取最多 100 个 app ids，可选择返回 display-only public tool summaries，并把找不到的 ids 放进 `missing_app_ids`。`app/installed` 读取已提交的 runtime connector snapshot，可按 thread effective config 计算，并可先 force refresh；每项明确 `enabled` 与 model-visible `callable`。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:224][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:31][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:62]

`plugin/list` params 含 `forceRefetch`：默认 false。为 true 且查询包含 Local 时，它刷新匹配当前 config/roots 的 non-curated local plugin cache。它不改变 marketplace filters，仍与 `cwds`、`marketplaceKinds` 一起决定查询范围。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:128][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:139][E: codex-rs/app-server/src/request_processors/plugins.rs:603][E: codex-rs/app-server/src/request_processors/plugins.rs:604][E: codex-rs/app-server/src/request_processors/plugins.rs:607]

experimental `plugin/search` 以 `searchTerm` 搜索 remote plugin catalog，支持 Global/Workspace/Personal scope、cursor 和 limit；空查询、Plugins disabled、缺少 workspace plugin/backend auth 都返回空。RemotePlugin feature 关闭时只允许 Workspace，limit 默认 16 且最大 1,000，plugin sharing 关闭时会过滤 shared marketplace 结果。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs:26][E: codex-rs/app-server/src/request_processors/plugins/search.rs:10][E: codex-rs/app-server/src/request_processors/plugins/search.rs:11][E: codex-rs/app-server/src/request_processors/plugins/search.rs:41][E: codex-rs/app-server/src/request_processors/plugins/search.rs:46][E: codex-rs/app-server/src/request_processors/plugins/search.rs:73][E: codex-rs/app-server/src/request_processors/plugins/search.rs:82]

`PluginSummary` 有 `installedAt`、`disabledReason` 和 `eligiblePlanTypes`；disabled reason 覆盖 admin 禁用、plan 不合资格、所需 app 不可用与 unknown。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:652][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:670][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:682][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:641]

App metadata 当前包含 categories、screenshots、developer/version、install/composer flags；旧 `firstPartyType` 已不在目标 wire shape。`app/read` 的 public tool summary 则明确提供 enable/read-only/disabled-reason 信息。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:100][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:110][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176]

plugin wire types 仍保留四组字段：`PluginShareSaveResponse` 与 `PluginShareContext` 都有 optional `canPublishToWorkspace`；`SkillInterface` 有 remote `iconSmallUrl`/`iconLargeUrl`；`HookMetadata` 有 optional `additionalContextLimit`，其中 null 使用 2,500 tokens、0 禁用 spill。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:253][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:257][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:444][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:454][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:456][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:539][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:549][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:694][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:705]

`skills/list` 使用 shared-read config serialization scope，而 skills config write、marketplace mutation 和 plugin install/uninstall 使用 global config serialization。[E: codex-rs/app-server-protocol/src/protocol/common.rs:762][E: codex-rs/app-server-protocol/src/protocol/common.rs:767][E: codex-rs/app-server-protocol/src/protocol/common.rs:777][E: codex-rs/app-server-protocol/src/protocol/common.rs:905][E: codex-rs/app-server-protocol/src/protocol/common.rs:910][E: codex-rs/app-server-protocol/src/protocol/common.rs:915]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `SkillsList` | `skills/list` | `v2::SkillsListParams` | `v2::SkillsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:760][E: codex-rs/app-server-protocol/src/protocol/common.rs:761][E: codex-rs/app-server-protocol/src/protocol/common.rs:763] |
| `SkillsExtraRootsSet` | `skills/extraRoots/set` | `v2::SkillsExtraRootsSetParams` | `v2::SkillsExtraRootsSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:765][E: codex-rs/app-server-protocol/src/protocol/common.rs:766][E: codex-rs/app-server-protocol/src/protocol/common.rs:768] |
| `MarketplaceAdd` | `marketplace/add` | `v2::MarketplaceAddParams` | `v2::MarketplaceAddResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:775][E: codex-rs/app-server-protocol/src/protocol/common.rs:776][E: codex-rs/app-server-protocol/src/protocol/common.rs:778] |
| `MarketplaceRemove` | `marketplace/remove` | `v2::MarketplaceRemoveParams` | `v2::MarketplaceRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:780][E: codex-rs/app-server-protocol/src/protocol/common.rs:781][E: codex-rs/app-server-protocol/src/protocol/common.rs:783] |
| `MarketplaceUpgrade` | `marketplace/upgrade` | `v2::MarketplaceUpgradeParams` | `v2::MarketplaceUpgradeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:785][E: codex-rs/app-server-protocol/src/protocol/common.rs:786][E: codex-rs/app-server-protocol/src/protocol/common.rs:788] |
| `PluginList` | `plugin/list` | `v2::PluginListParams` | `v2::PluginListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:790][E: codex-rs/app-server-protocol/src/protocol/common.rs:791][E: codex-rs/app-server-protocol/src/protocol/common.rs:793] |
| `PluginSearch` | `plugin/search` | `v2::PluginSearchParams` | `v2::PluginSearchResponse` | experimental: plugin/search | [E: codex-rs/app-server-protocol/src/protocol/common.rs:795][E: codex-rs/app-server-protocol/src/protocol/common.rs:796][E: codex-rs/app-server-protocol/src/protocol/common.rs:797][E: codex-rs/app-server-protocol/src/protocol/common.rs:799] |
| `PluginInstalled` | `plugin/installed` | `v2::PluginInstalledParams` | `v2::PluginInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:801][E: codex-rs/app-server-protocol/src/protocol/common.rs:802][E: codex-rs/app-server-protocol/src/protocol/common.rs:804] |
| `PluginRead` | `plugin/read` | `v2::PluginReadParams` | `v2::PluginReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:806][E: codex-rs/app-server-protocol/src/protocol/common.rs:807][E: codex-rs/app-server-protocol/src/protocol/common.rs:809] |
| `PluginSkillRead` | `plugin/skill/read` | `v2::PluginSkillReadParams` | `v2::PluginSkillReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:811][E: codex-rs/app-server-protocol/src/protocol/common.rs:812][E: codex-rs/app-server-protocol/src/protocol/common.rs:814] |
| `PluginShareSave` | `plugin/share/save` | `v2::PluginShareSaveParams` | `v2::PluginShareSaveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:816][E: codex-rs/app-server-protocol/src/protocol/common.rs:817][E: codex-rs/app-server-protocol/src/protocol/common.rs:819] |
| `PluginShareUpdateTargets` | `plugin/share/updateTargets` | `v2::PluginShareUpdateTargetsParams` | `v2::PluginShareUpdateTargetsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:821][E: codex-rs/app-server-protocol/src/protocol/common.rs:822][E: codex-rs/app-server-protocol/src/protocol/common.rs:824] |
| `PluginShareList` | `plugin/share/list` | `v2::PluginShareListParams` | `v2::PluginShareListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:826][E: codex-rs/app-server-protocol/src/protocol/common.rs:827][E: codex-rs/app-server-protocol/src/protocol/common.rs:829] |
| `PluginShareCheckout` | `plugin/share/checkout` | `v2::PluginShareCheckoutParams` | `v2::PluginShareCheckoutResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:831][E: codex-rs/app-server-protocol/src/protocol/common.rs:832][E: codex-rs/app-server-protocol/src/protocol/common.rs:834] |
| `PluginShareDelete` | `plugin/share/delete` | `v2::PluginShareDeleteParams` | `v2::PluginShareDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:836][E: codex-rs/app-server-protocol/src/protocol/common.rs:837][E: codex-rs/app-server-protocol/src/protocol/common.rs:839] |
| `AppsRead` | `app/read` | `v2::AppsReadParams` | `v2::AppsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:841][E: codex-rs/app-server-protocol/src/protocol/common.rs:842][E: codex-rs/app-server-protocol/src/protocol/common.rs:844] |
| `AppsList` | `app/list` | `v2::AppsListParams` | `v2::AppsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:846][E: codex-rs/app-server-protocol/src/protocol/common.rs:847][E: codex-rs/app-server-protocol/src/protocol/common.rs:849] |
| `AppsInstalled` | `app/installed` | `v2::AppsInstalledParams` | `v2::AppsInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:851][E: codex-rs/app-server-protocol/src/protocol/common.rs:852][E: codex-rs/app-server-protocol/src/protocol/common.rs:854] |
| `SkillsConfigWrite` | `skills/config/write` | `v2::SkillsConfigWriteParams` | `v2::SkillsConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:903][E: codex-rs/app-server-protocol/src/protocol/common.rs:904][E: codex-rs/app-server-protocol/src/protocol/common.rs:906] |
| `PluginInstall` | `plugin/install` | `v2::PluginInstallParams` | `v2::PluginInstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:908][E: codex-rs/app-server-protocol/src/protocol/common.rs:909][E: codex-rs/app-server-protocol/src/protocol/common.rs:911] |
| `PluginUninstall` | `plugin/uninstall` | `v2::PluginUninstallParams` | `v2::PluginUninstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:913][E: codex-rs/app-server-protocol/src/protocol/common.rs:914][E: codex-rs/app-server-protocol/src/protocol/common.rs:916] |
| `McpServerOauthLogin` | `mcpServer/oauth/login` | `v2::McpServerOauthLoginParams` | `v2::McpServerOauthLoginResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1080][E: codex-rs/app-server-protocol/src/protocol/common.rs:1081][E: codex-rs/app-server-protocol/src/protocol/common.rs:1083] |
| `McpServerRefresh` | `config/mcpServer/reload` | `Option<()>` | `v2::McpServerRefreshResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1086][E: codex-rs/app-server-protocol/src/protocol/common.rs:1087][E: codex-rs/app-server-protocol/src/protocol/common.rs:1089] |
| `McpServerStatusList` | `mcpServerStatus/list` | `v2::ListMcpServerStatusParams` | `v2::ListMcpServerStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1092][E: codex-rs/app-server-protocol/src/protocol/common.rs:1093][E: codex-rs/app-server-protocol/src/protocol/common.rs:1095] |
| `McpResourceRead` | `mcpServer/resource/read` | `v2::McpResourceReadParams` | `v2::McpResourceReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1098][E: codex-rs/app-server-protocol/src/protocol/common.rs:1099][E: codex-rs/app-server-protocol/src/protocol/common.rs:1101] |
| `McpServerToolCall` | `mcpServer/tool/call` | `v2::McpServerToolCallParams` | `v2::McpServerToolCallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1104][E: codex-rs/app-server-protocol/src/protocol/common.rs:1105][E: codex-rs/app-server-protocol/src/protocol/common.rs:1107] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/apps.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server/src/request_processors/plugins.rs`
- `codex-rs/app-server/src/request_processors/plugins/search.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
