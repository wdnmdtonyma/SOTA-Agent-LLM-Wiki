---
id: rpc.mcp-skills-plugin-methods
title: mcp/skills/plugin/app 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/apps.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs]
symbols: [SkillsListParams, SkillsListResponse, SkillsExtraRootsSetParams, MarketplaceAddParams, PluginListParams, PluginInstallParams, AppsListParams, AppsReadParams, AppsReadResponse, AppsInstalledParams, AppsInstalledResponse, ListMcpServerStatusParams, McpServerToolCallParams]
related: [rpc.overview, rpc.notifications-system, subsys.mcp.client, subsys.config-auth.plugins, subsys.config-auth.skills]
evidence: explicit
status: verified
updated: 4d7a5c7c73
---

> mcp/skills/plugin/app 方法是 app-server 对 MCP server、skills roots/config、marketplace、plugin install/share/read 和 app connector catalog 的 client request catalog。

## 能回答的问题

- skills、marketplace、plugin、app、mcpServer 当前有哪些 wire method？
- `config/mcpServer/reload` 属于哪个 catalog？
- MCP OAuth、status、resource read 和 tool call 使用哪些 params/response 类型？
- plugin share/install/read/list 方法如何分组？

## 字段模型

skills、marketplace 和 plugin 类型集中在 `v2/plugin.rs`；app connector 的 list/read/installed types 在 `v2/apps.rs`；MCP status/resource/tool/OAuth/reload 类型在 `v2/mcp.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:21][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:34][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:69][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:12][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:31][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:177][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:212][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:35][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:83]

`app/read` 一次读取最多 100 个 app ids，可选择返回 display-only public tool summaries，并把找不到的 ids 放进 `missing_app_ids`。`app/installed` 读取已提交的 runtime connector snapshot，可按 thread effective config 计算，并可先 force refresh；每项明确 `enabled` 与 model-visible `callable`。[E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:176][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:177][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:178][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:181][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:212][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:214][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:30][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:34][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:35][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:44][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:50][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:53]

`skills/list` uses a shared-read config serialization scope, while skills config write, marketplace mutation and plugin install/uninstall use global config serialization in the macro invocation.[E: codex-rs/app-server-protocol/src/protocol/common.rs:672][E: codex-rs/app-server-protocol/src/protocol/common.rs:677][E: codex-rs/app-server-protocol/src/protocol/common.rs:687][E: codex-rs/app-server-protocol/src/protocol/common.rs:809][E: codex-rs/app-server-protocol/src/protocol/common.rs:814][E: codex-rs/app-server-protocol/src/protocol/common.rs:819]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `SkillsList` | `skills/list` | `v2::SkillsListParams` | `v2::SkillsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:670][E: codex-rs/app-server-protocol/src/protocol/common.rs:671][E: codex-rs/app-server-protocol/src/protocol/common.rs:673] |
| `SkillsExtraRootsSet` | `skills/extraRoots/set` | `v2::SkillsExtraRootsSetParams` | `v2::SkillsExtraRootsSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:675][E: codex-rs/app-server-protocol/src/protocol/common.rs:676][E: codex-rs/app-server-protocol/src/protocol/common.rs:678] |
| `MarketplaceAdd` | `marketplace/add` | `v2::MarketplaceAddParams` | `v2::MarketplaceAddResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:685][E: codex-rs/app-server-protocol/src/protocol/common.rs:686][E: codex-rs/app-server-protocol/src/protocol/common.rs:688] |
| `MarketplaceRemove` | `marketplace/remove` | `v2::MarketplaceRemoveParams` | `v2::MarketplaceRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:690][E: codex-rs/app-server-protocol/src/protocol/common.rs:691][E: codex-rs/app-server-protocol/src/protocol/common.rs:693] |
| `MarketplaceUpgrade` | `marketplace/upgrade` | `v2::MarketplaceUpgradeParams` | `v2::MarketplaceUpgradeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:695][E: codex-rs/app-server-protocol/src/protocol/common.rs:696][E: codex-rs/app-server-protocol/src/protocol/common.rs:698] |
| `PluginList` | `plugin/list` | `v2::PluginListParams` | `v2::PluginListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:700][E: codex-rs/app-server-protocol/src/protocol/common.rs:701][E: codex-rs/app-server-protocol/src/protocol/common.rs:703] |
| `PluginInstalled` | `plugin/installed` | `v2::PluginInstalledParams` | `v2::PluginInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:705][E: codex-rs/app-server-protocol/src/protocol/common.rs:706][E: codex-rs/app-server-protocol/src/protocol/common.rs:708] |
| `PluginRead` | `plugin/read` | `v2::PluginReadParams` | `v2::PluginReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:710][E: codex-rs/app-server-protocol/src/protocol/common.rs:711][E: codex-rs/app-server-protocol/src/protocol/common.rs:713] |
| `PluginSkillRead` | `plugin/skill/read` | `v2::PluginSkillReadParams` | `v2::PluginSkillReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:715][E: codex-rs/app-server-protocol/src/protocol/common.rs:716][E: codex-rs/app-server-protocol/src/protocol/common.rs:718] |
| `PluginShareSave` | `plugin/share/save` | `v2::PluginShareSaveParams` | `v2::PluginShareSaveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:720][E: codex-rs/app-server-protocol/src/protocol/common.rs:721][E: codex-rs/app-server-protocol/src/protocol/common.rs:723] |
| `PluginShareUpdateTargets` | `plugin/share/updateTargets` | `v2::PluginShareUpdateTargetsParams` | `v2::PluginShareUpdateTargetsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:725][E: codex-rs/app-server-protocol/src/protocol/common.rs:726][E: codex-rs/app-server-protocol/src/protocol/common.rs:728] |
| `PluginShareList` | `plugin/share/list` | `v2::PluginShareListParams` | `v2::PluginShareListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:730][E: codex-rs/app-server-protocol/src/protocol/common.rs:731][E: codex-rs/app-server-protocol/src/protocol/common.rs:733] |
| `PluginShareCheckout` | `plugin/share/checkout` | `v2::PluginShareCheckoutParams` | `v2::PluginShareCheckoutResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:735][E: codex-rs/app-server-protocol/src/protocol/common.rs:736][E: codex-rs/app-server-protocol/src/protocol/common.rs:738] |
| `PluginShareDelete` | `plugin/share/delete` | `v2::PluginShareDeleteParams` | `v2::PluginShareDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:740][E: codex-rs/app-server-protocol/src/protocol/common.rs:741][E: codex-rs/app-server-protocol/src/protocol/common.rs:743] |
| `AppsRead` | `app/read` | `v2::AppsReadParams` | `v2::AppsReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:745][E: codex-rs/app-server-protocol/src/protocol/common.rs:746][E: codex-rs/app-server-protocol/src/protocol/common.rs:748] |
| `AppsList` | `app/list` | `v2::AppsListParams` | `v2::AppsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:750][E: codex-rs/app-server-protocol/src/protocol/common.rs:751][E: codex-rs/app-server-protocol/src/protocol/common.rs:753] |
| `AppsInstalled` | `app/installed` | `v2::AppsInstalledParams` | `v2::AppsInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:755][E: codex-rs/app-server-protocol/src/protocol/common.rs:756][E: codex-rs/app-server-protocol/src/protocol/common.rs:758] |
| `SkillsConfigWrite` | `skills/config/write` | `v2::SkillsConfigWriteParams` | `v2::SkillsConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:807][E: codex-rs/app-server-protocol/src/protocol/common.rs:808][E: codex-rs/app-server-protocol/src/protocol/common.rs:810] |
| `PluginInstall` | `plugin/install` | `v2::PluginInstallParams` | `v2::PluginInstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:812][E: codex-rs/app-server-protocol/src/protocol/common.rs:813][E: codex-rs/app-server-protocol/src/protocol/common.rs:815] |
| `PluginUninstall` | `plugin/uninstall` | `v2::PluginUninstallParams` | `v2::PluginUninstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:817][E: codex-rs/app-server-protocol/src/protocol/common.rs:818][E: codex-rs/app-server-protocol/src/protocol/common.rs:820] |
| `McpServerOauthLogin` | `mcpServer/oauth/login` | `v2::McpServerOauthLoginParams` | `v2::McpServerOauthLoginResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:984][E: codex-rs/app-server-protocol/src/protocol/common.rs:985][E: codex-rs/app-server-protocol/src/protocol/common.rs:987] |
| `McpServerRefresh` | `config/mcpServer/reload` | `Option<()>` | `v2::McpServerRefreshResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:990][E: codex-rs/app-server-protocol/src/protocol/common.rs:991][E: codex-rs/app-server-protocol/src/protocol/common.rs:993] |
| `McpServerStatusList` | `mcpServerStatus/list` | `v2::ListMcpServerStatusParams` | `v2::ListMcpServerStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:996][E: codex-rs/app-server-protocol/src/protocol/common.rs:997][E: codex-rs/app-server-protocol/src/protocol/common.rs:999] |
| `McpResourceRead` | `mcpServer/resource/read` | `v2::McpResourceReadParams` | `v2::McpResourceReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1002][E: codex-rs/app-server-protocol/src/protocol/common.rs:1003][E: codex-rs/app-server-protocol/src/protocol/common.rs:1005] |
| `McpServerToolCall` | `mcpServer/tool/call` | `v2::McpServerToolCallParams` | `v2::McpServerToolCallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:1008][E: codex-rs/app-server-protocol/src/protocol/common.rs:1009][E: codex-rs/app-server-protocol/src/protocol/common.rs:1011] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/apps.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
