---
id: rpc.mcp-skills-plugin-methods
title: mcp/skills/plugin/app 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs, codex-rs/app-server-protocol/src/protocol/v2/apps.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs, codex-rs/app-server-protocol/src/protocol/v2/memory.rs, codex-rs/app-server/src/request_processors/plugins.rs, codex-rs/app-server/src/request_processors/plugins/search.rs, codex-rs/app-server/src/request_processors/memory_status.rs]
symbols: [MemoryStatusParams, MemoryStatusResponse, SkillsListParams, SkillsListResponse, SkillsExtraRootsSetParams, MarketplaceAddParams, PluginListParams, PluginSearchParams, PluginSearchResponse, PluginSummary, PluginDisabledReason, PluginInstallParams, PluginShareSaveResponse, PluginShareContext, SkillInterface, HookMetadata, AppsListParams, AppsReadParams, AppsReadResponse, AppsInstalledParams, AppsInstalledResponse, ListMcpServerStatusParams, McpServerToolCallParams]
related: [rpc.overview, rpc.notifications-system, rpc.thread-methods, subsys.mcp.client, subsys.config-auth.plugins, subsys.config-auth.skills]
evidence: explicit
status: verified
updated: 02a8f038b8
---

> mcp/skills/plugin/app 方法是 app-server 对 MCP server、skills roots/config、marketplace、plugin install/share/read 和 app connector catalog 的 client request catalog。

## 能回答的问题

- skills、marketplace、plugin、app、mcpServer 当前有哪些 wire method？
- `config/mcpServer/reload` 属于哪个 catalog？
- MCP OAuth、status、resource read 和 tool call 使用哪些 params/response 类型？
- plugin share/install/read/list 方法如何分组？
- `memory/status` 是否在本 catalog？

## 字段模型

skills、marketplace 和 plugin 类型集中在 `v2/plugin.rs`；app connector 的 list/read/installed types 在 `v2/apps.rs`；MCP status/resource/tool/OAuth/reload 类型在 `v2/mcp.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:20][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:33][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:128][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:12][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:31][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:224][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:50][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:104]

`app/read` 一次读取最多 100 个 app ids，可选择返回 display-only public tool summaries，并把找不到的 ids 放进 `missing_app_ids`。`app/installed` 读取已提交的 runtime connector snapshot，可按 thread effective config 计算，并可先 force refresh；每项明确 `enabled` 与 model-visible `callable`。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:224][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:31][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:52][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:55]

`plugin/list` params 含 `forceRefetch`：默认 false。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:128][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:139] `plugin/reconcile` 用 optional `reason` 并返回 `changedPlugins` 与 failed remote plugin ids。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:198][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:210]

experimental `plugin/search` 以 `searchTerm` 搜索 remote plugin catalog，支持 Global/Workspace/Personal scope、cursor 和 limit。空查询或 Plugins disabled 返回空；无 Codex-backend auth 时跳过 remote catalog，本地 marketplace 仍可能出结果。RemotePlugin 关闭时 remote scope 只允许 Workspace，limit 默认 16 且最大 1,000，plugin sharing 关闭时会过滤 shared marketplace 结果。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs:26][E: codex-rs/app-server/src/request_processors/plugins/search.rs:10][E: codex-rs/app-server/src/request_processors/plugins/search.rs:11][E: codex-rs/app-server/src/request_processors/plugins/search.rs:41][E: codex-rs/app-server/src/request_processors/plugins/search.rs:48][E: codex-rs/app-server/src/request_processors/plugins/search.rs:65][E: codex-rs/app-server/src/request_processors/plugins/search.rs:77][E: codex-rs/app-server/src/request_processors/plugins/search.rs:106]

`PluginSummary` 用 `id` 标识 plugin；`PluginDisabledReason` 覆盖 admin 禁用、plan 不合资格、所需 app 不可用与 unknown。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:698][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:687]

App metadata 当前包含 categories、screenshots、developer/version、install/composer flags；旧 `firstPartyType` 已不在目标 wire shape。`app/read` 的 public tool summary 则明确提供 enable/read-only/disabled-reason 信息。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:100][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:110][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176]

plugin wire types 仍保留四组字段：`PluginShareSaveResponse` 与 `PluginShareContext` 都有 optional `canPublishToWorkspace`；`SkillInterface` 有 remote `iconSmallUrl`/`iconLargeUrl`；`HookMetadata` 有 optional `additionalContextLimit`，其中 null 使用 2,500 tokens、0 禁用 spill。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:297][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:301][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:490][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:500][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:502][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:585][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:595][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:740][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:751]

`skills/list` 使用 shared-read config serialization scope，而 skills config write、marketplace mutation 和 plugin install/uninstall 使用 global config serialization。[E: codex-rs/app-server-protocol/src/protocol/common.rs:875][E: codex-rs/app-server-protocol/src/protocol/common.rs:880][E: codex-rs/app-server-protocol/src/protocol/common.rs:890][E: codex-rs/app-server-protocol/src/protocol/common.rs:1023][E: codex-rs/app-server-protocol/src/protocol/common.rs:1028][E: codex-rs/app-server-protocol/src/protocol/common.rs:1033]

experimental `memory/status` 与 `memory/reset` 同属 memory RPC：`memory/reset` 的权威 catalog 在 thread 方法页；本页是 `MemoryStatusParams` / `MemoryStatusResponse` 的权威行。params 可带 `minConsolidatedThreads`（默认 20，范围 1..=4096），response 只给 `v2ConsolidatedThreads` 与 `v2Ready`，不暴露 memory 正文。[E: codex-rs/app-server-protocol/src/protocol/common.rs:706][E: codex-rs/app-server-protocol/src/protocol/v2/memory.rs:11][E: codex-rs/app-server-protocol/src/protocol/v2/memory.rs:20][E: codex-rs/app-server/src/request_processors/memory_status.rs:9][E: codex-rs/app-server/src/request_processors/memory_status.rs:13]

## 方法 catalog

本 catalog 覆盖 31 个 skills/marketplace/plugin/app/mcp/memory 方法。本轮新增 experimental `memory/status`。


| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `MemoryStatus` | `memory/status` | `v2::MemoryStatusParams` | `v2::MemoryStatusResponse` | experimental: memory/status | [E: codex-rs/app-server-protocol/src/protocol/common.rs:707] |
| `SkillsList` | `skills/list` | `v2::SkillsListParams` | `v2::SkillsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:875] |
| `SkillsExtraRootsSet` | `skills/extraRoots/set` | `v2::SkillsExtraRootsSetParams` | `v2::SkillsExtraRootsSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:880] |
| `HooksList` | `hooks/list` | `v2::HooksListParams` | `v2::HooksListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:885] |
| `MarketplaceAdd` | `marketplace/add` | `v2::MarketplaceAddParams` | `v2::MarketplaceAddResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:890] |
| `MarketplaceRemove` | `marketplace/remove` | `v2::MarketplaceRemoveParams` | `v2::MarketplaceRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:895] |
| `MarketplaceUpgrade` | `marketplace/upgrade` | `v2::MarketplaceUpgradeParams` | `v2::MarketplaceUpgradeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:900] |
| `PluginList` | `plugin/list` | `v2::PluginListParams` | `v2::PluginListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:905] |
| `PluginSearch` | `plugin/search` | `v2::PluginSearchParams` | `v2::PluginSearchResponse` | experimental: plugin/search | [E: codex-rs/app-server-protocol/src/protocol/common.rs:911] |
| `PluginInstalled` | `plugin/installed` | `v2::PluginInstalledParams` | `v2::PluginInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:916] |
| `PluginReconcile` | `plugin/reconcile` | `v2::PluginReconcileParams` | `v2::PluginReconcileResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:921] |
| `PluginRead` | `plugin/read` | `v2::PluginReadParams` | `v2::PluginReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:926] |
| `PluginSkillRead` | `plugin/skill/read` | `v2::PluginSkillReadParams` | `v2::PluginSkillReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:931] |
| `PluginShareSave` | `plugin/share/save` | `v2::PluginShareSaveParams` | `v2::PluginShareSaveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:936] |
| `PluginShareUpdateTargets` | `plugin/share/updateTargets` | `v2::PluginShareUpdateTargetsParams` | `v2::PluginShareUpdateTargetsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:941] |
| `PluginShareList` | `plugin/share/list` | `v2::PluginShareListParams` | `v2::PluginShareListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:946] |
| `PluginShareCheckout` | `plugin/share/checkout` | `v2::PluginShareCheckoutParams` | `v2::PluginShareCheckoutResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:951] |
| `PluginShareDelete` | `plugin/share/delete` | `v2::PluginShareDeleteParams` | `v2::PluginShareDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:956] |
| `AppsRead` | `app/read` | `v2::AppsReadParams` | `v2::AppsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:961] |
| `AppsList` | `app/list` | `v2::AppsListParams` | `v2::AppsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:966] |
| `AppsInstalled` | `app/installed` | `v2::AppsInstalledParams` | `v2::AppsInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:971] |
| `SkillsConfigWrite` | `skills/config/write` | `v2::SkillsConfigWriteParams` | `v2::SkillsConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1023] |
| `PluginInstall` | `plugin/install` | `v2::PluginInstallParams` | `v2::PluginInstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1028] |
| `PluginUninstall` | `plugin/uninstall` | `v2::PluginUninstallParams` | `v2::PluginUninstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1033] |
| `McpServerOauthLogin` | `mcpServer/oauth/login` | `v2::McpServerOauthLoginParams` | `v2::McpServerOauthLoginResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1212] |
| `McpServerRefresh` | `config/mcpServer/reload` | `Option<()>` | `v2::McpServerRefreshResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1218] |
| `McpServerStatusList` | `mcpServerStatus/list` | `v2::ListMcpServerStatusParams` | `v2::ListMcpServerStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1224] |
| `McpResourceRead` | `mcpServer/resource/read` | `v2::McpResourceReadParams` | `v2::McpResourceReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1230] |
| `McpServerEventStreamStart` | `mcpServer/event/stream/start` | `v2::McpServerEventStreamStartParams` | `v2::McpServerEventStreamStartResponse` | experimental: mcpServer/event/stream/start | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1237] |
| `McpServerEventStreamStop` | `mcpServer/event/stream/stop` | `v2::McpServerEventStreamStopParams` | `v2::McpServerEventStreamStopResponse` | experimental: mcpServer/event/stream/stop | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1244] |
| `McpServerToolCall` | `mcpServer/tool/call` | `v2::McpServerToolCallParams` | `v2::McpServerToolCallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1250] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin_search.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/apps.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/memory.rs`
- `codex-rs/app-server/src/request_processors/plugins.rs`
- `codex-rs/app-server/src/request_processors/memory_status.rs`
- `codex-rs/app-server/src/request_processors/plugins/search.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
- `rpc.thread-methods` -> [thread 方法](thread-methods.md)
