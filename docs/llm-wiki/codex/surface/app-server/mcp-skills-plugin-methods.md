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
updated: 7750465934
---

> mcp/skills/plugin/app 方法是 app-server 对 MCP server、skills roots/config、marketplace、plugin install/share/read 和 app connector catalog 的 client request catalog。

## 能回答的问题

- skills、marketplace、plugin、app、mcpServer 当前有哪些 wire method？
- `config/mcpServer/reload` 属于哪个 catalog？
- MCP OAuth、status、resource read 和 tool call 使用哪些 params/response 类型？
- plugin share/install/read/list 方法如何分组？

## 字段模型

skills、marketplace 和 plugin 类型集中在 `v2/plugin.rs`；app connector 的 list/read/installed types 在 `v2/apps.rs`；MCP status/resource/tool/OAuth/reload 类型在 `v2/mcp.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:21][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:34][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:69][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:12][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:31][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:221][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:36][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:84]

`app/read` 一次读取最多 100 个 app ids，可选择返回 display-only public tool summaries，并把找不到的 ids 放进 `missing_app_ids`。`app/installed` 读取已提交的 runtime connector snapshot，可按 thread effective config 计算，并可先 force refresh；每项明确 `enabled` 与 model-visible `callable`。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:221][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:223][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:34]

`plugin/list` params 新增 `forceRefetch`：默认 false。为 true 且查询包含 Local 时，它刷新匹配当前 config/roots 的 non-curated local plugin cache；remote catalog 同时使用 `ForceRefetch` cache mode。它不改变 marketplace filters，仍与 `cwds`、`marketplaceKinds` 一起决定查询范围。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:126][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:140][E: codex-rs/app-server/src/request_processors/plugins.rs:590][E: codex-rs/app-server/src/request_processors/plugins.rs:593][E: codex-rs/app-server/src/request_processors/plugins.rs:608][E: codex-rs/app-server/src/request_processors/plugins.rs:611]

experimental `plugin/search` 以 `searchTerm` 搜索 remote plugin catalog，支持 Global/Workspace/Personal scope、cursor 和 limit；空查询、Plugins disabled、缺少 workspace plugin/backend auth 都返回空。RemotePlugin feature 关闭时只允许 Workspace，limit 默认 16 且最大 1,000，plugin sharing 关闭时会过滤 shared marketplace 结果。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs:8][E: codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs:23][E: codex-rs/app-server/src/request_processors/plugins/search.rs:33][E: codex-rs/app-server/src/request_processors/plugins/search.rs:42][E: codex-rs/app-server/src/request_processors/plugins/search.rs:46][E: codex-rs/app-server/src/request_processors/plugins/search.rs:75][E: codex-rs/app-server/src/request_processors/plugins/search.rs:104]

`PluginSummary` 增加 `installedAt`、`disabledReason` 和 `eligiblePlanTypes`；disabled reason 覆盖 admin 禁用、plan 不合资格、所需 app 不可用与 unknown。remote catalog conversion 把 installed time 转成 Unix 秒并原样传递 eligibility metadata。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:622][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:654][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:666][E: codex-rs/app-server/src/request_processors/plugins.rs:2236]

App metadata 当前包含 categories、screenshots、developer/version、install/composer flags 等；旧 `firstPartyType` 已从目标 wire shape 删除。`app/read` 的 public tool summary 则明确提供 enable/read-only/disabled-reason 信息。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:100][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:111][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:185][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:197]

plugin wire types 本轮还增加四组字段：`PluginShareSaveResponse` 与 `PluginShareContext` 都有 optional `canPublishToWorkspace`；`SkillInterface` 增 remote `iconSmallUrl`/`iconLargeUrl`；`HookMetadata` 新增 optional `additionalContextLimit`，其中 null 使用 2,500 tokens、0 禁用 spill。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:251][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:258][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:442][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:455][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:457][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:520][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:530][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:533][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:675][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:689]

`skills/list` uses a shared-read config serialization scope, while skills config write, marketplace mutation and plugin install/uninstall use global config serialization in the macro invocation.[E: codex-rs/app-server-protocol/src/protocol/common.rs:699][E: codex-rs/app-server-protocol/src/protocol/common.rs:704][E: codex-rs/app-server-protocol/src/protocol/common.rs:714][E: codex-rs/app-server-protocol/src/protocol/common.rs:842][E: codex-rs/app-server-protocol/src/protocol/common.rs:847][E: codex-rs/app-server-protocol/src/protocol/common.rs:852]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `SkillsList` | `skills/list` | `v2::SkillsListParams` | `v2::SkillsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:697][E: codex-rs/app-server-protocol/src/protocol/common.rs:698][E: codex-rs/app-server-protocol/src/protocol/common.rs:700] |
| `SkillsExtraRootsSet` | `skills/extraRoots/set` | `v2::SkillsExtraRootsSetParams` | `v2::SkillsExtraRootsSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:702][E: codex-rs/app-server-protocol/src/protocol/common.rs:703][E: codex-rs/app-server-protocol/src/protocol/common.rs:705] |
| `MarketplaceAdd` | `marketplace/add` | `v2::MarketplaceAddParams` | `v2::MarketplaceAddResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:712][E: codex-rs/app-server-protocol/src/protocol/common.rs:713][E: codex-rs/app-server-protocol/src/protocol/common.rs:715] |
| `MarketplaceRemove` | `marketplace/remove` | `v2::MarketplaceRemoveParams` | `v2::MarketplaceRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:717][E: codex-rs/app-server-protocol/src/protocol/common.rs:718][E: codex-rs/app-server-protocol/src/protocol/common.rs:720] |
| `MarketplaceUpgrade` | `marketplace/upgrade` | `v2::MarketplaceUpgradeParams` | `v2::MarketplaceUpgradeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:722][E: codex-rs/app-server-protocol/src/protocol/common.rs:723][E: codex-rs/app-server-protocol/src/protocol/common.rs:725] |
| `PluginList` | `plugin/list` | `v2::PluginListParams` | `v2::PluginListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:727][E: codex-rs/app-server-protocol/src/protocol/common.rs:728][E: codex-rs/app-server-protocol/src/protocol/common.rs:730] |
| `PluginSearch` | `plugin/search` | `v2::PluginSearchParams` | `v2::PluginSearchResponse` | experimental: plugin/search | [E: codex-rs/app-server-protocol/src/protocol/common.rs:732][E: codex-rs/app-server-protocol/src/protocol/common.rs:733][E: codex-rs/app-server-protocol/src/protocol/common.rs:734][E: codex-rs/app-server-protocol/src/protocol/common.rs:736] |
| `PluginInstalled` | `plugin/installed` | `v2::PluginInstalledParams` | `v2::PluginInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:738][E: codex-rs/app-server-protocol/src/protocol/common.rs:739][E: codex-rs/app-server-protocol/src/protocol/common.rs:741] |
| `PluginRead` | `plugin/read` | `v2::PluginReadParams` | `v2::PluginReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:743][E: codex-rs/app-server-protocol/src/protocol/common.rs:744][E: codex-rs/app-server-protocol/src/protocol/common.rs:746] |
| `PluginSkillRead` | `plugin/skill/read` | `v2::PluginSkillReadParams` | `v2::PluginSkillReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:748][E: codex-rs/app-server-protocol/src/protocol/common.rs:749][E: codex-rs/app-server-protocol/src/protocol/common.rs:751] |
| `PluginShareSave` | `plugin/share/save` | `v2::PluginShareSaveParams` | `v2::PluginShareSaveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:753][E: codex-rs/app-server-protocol/src/protocol/common.rs:754][E: codex-rs/app-server-protocol/src/protocol/common.rs:756] |
| `PluginShareUpdateTargets` | `plugin/share/updateTargets` | `v2::PluginShareUpdateTargetsParams` | `v2::PluginShareUpdateTargetsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:758][E: codex-rs/app-server-protocol/src/protocol/common.rs:759][E: codex-rs/app-server-protocol/src/protocol/common.rs:761] |
| `PluginShareList` | `plugin/share/list` | `v2::PluginShareListParams` | `v2::PluginShareListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:763][E: codex-rs/app-server-protocol/src/protocol/common.rs:764][E: codex-rs/app-server-protocol/src/protocol/common.rs:766] |
| `PluginShareCheckout` | `plugin/share/checkout` | `v2::PluginShareCheckoutParams` | `v2::PluginShareCheckoutResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:768][E: codex-rs/app-server-protocol/src/protocol/common.rs:769][E: codex-rs/app-server-protocol/src/protocol/common.rs:771] |
| `PluginShareDelete` | `plugin/share/delete` | `v2::PluginShareDeleteParams` | `v2::PluginShareDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:773][E: codex-rs/app-server-protocol/src/protocol/common.rs:774][E: codex-rs/app-server-protocol/src/protocol/common.rs:776] |
| `AppsRead` | `app/read` | `v2::AppsReadParams` | `v2::AppsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:778][E: codex-rs/app-server-protocol/src/protocol/common.rs:779][E: codex-rs/app-server-protocol/src/protocol/common.rs:781] |
| `AppsList` | `app/list` | `v2::AppsListParams` | `v2::AppsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:783][E: codex-rs/app-server-protocol/src/protocol/common.rs:784][E: codex-rs/app-server-protocol/src/protocol/common.rs:786] |
| `AppsInstalled` | `app/installed` | `v2::AppsInstalledParams` | `v2::AppsInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:788][E: codex-rs/app-server-protocol/src/protocol/common.rs:789][E: codex-rs/app-server-protocol/src/protocol/common.rs:791] |
| `SkillsConfigWrite` | `skills/config/write` | `v2::SkillsConfigWriteParams` | `v2::SkillsConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:840][E: codex-rs/app-server-protocol/src/protocol/common.rs:841][E: codex-rs/app-server-protocol/src/protocol/common.rs:843] |
| `PluginInstall` | `plugin/install` | `v2::PluginInstallParams` | `v2::PluginInstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:845][E: codex-rs/app-server-protocol/src/protocol/common.rs:846][E: codex-rs/app-server-protocol/src/protocol/common.rs:848] |
| `PluginUninstall` | `plugin/uninstall` | `v2::PluginUninstallParams` | `v2::PluginUninstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:850][E: codex-rs/app-server-protocol/src/protocol/common.rs:851][E: codex-rs/app-server-protocol/src/protocol/common.rs:853] |
| `McpServerOauthLogin` | `mcpServer/oauth/login` | `v2::McpServerOauthLoginParams` | `v2::McpServerOauthLoginResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1017][E: codex-rs/app-server-protocol/src/protocol/common.rs:1018][E: codex-rs/app-server-protocol/src/protocol/common.rs:1020] |
| `McpServerRefresh` | `config/mcpServer/reload` | `Option<()>` | `v2::McpServerRefreshResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1023][E: codex-rs/app-server-protocol/src/protocol/common.rs:1024][E: codex-rs/app-server-protocol/src/protocol/common.rs:1026] |
| `McpServerStatusList` | `mcpServerStatus/list` | `v2::ListMcpServerStatusParams` | `v2::ListMcpServerStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1029][E: codex-rs/app-server-protocol/src/protocol/common.rs:1030][E: codex-rs/app-server-protocol/src/protocol/common.rs:1032] |
| `McpResourceRead` | `mcpServer/resource/read` | `v2::McpResourceReadParams` | `v2::McpResourceReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1035][E: codex-rs/app-server-protocol/src/protocol/common.rs:1036][E: codex-rs/app-server-protocol/src/protocol/common.rs:1038] |
| `McpServerToolCall` | `mcpServer/tool/call` | `v2::McpServerToolCallParams` | `v2::McpServerToolCallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1041][E: codex-rs/app-server-protocol/src/protocol/common.rs:1042][E: codex-rs/app-server-protocol/src/protocol/common.rs:1044] |

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
