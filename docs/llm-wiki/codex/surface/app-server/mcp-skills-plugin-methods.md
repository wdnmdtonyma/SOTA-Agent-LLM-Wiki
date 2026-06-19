---
id: rpc.mcp-skills-plugin-methods
title: mcp/skills/plugin/app 方法
kind: rpc
tier: T1
source: [codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/plugin.rs, codex-rs/app-server-protocol/src/protocol/v2/apps.rs, codex-rs/app-server-protocol/src/protocol/v2/mcp.rs]
symbols: [SkillsListParams, SkillsListResponse, SkillsExtraRootsSetParams, MarketplaceAddParams, PluginListParams, PluginInstallParams, AppsListParams, ListMcpServerStatusParams, McpServerToolCallParams]
related: [rpc.overview, rpc.notifications-system, subsys.mcp.client, subsys.config-auth.plugins, subsys.config-auth.skills]
evidence: explicit
status: verified
updated: 5670360009
---

> mcp/skills/plugin/app 方法是 app-server 对 MCP server、skills roots/config、marketplace、plugin install/share/read 和 app connector catalog 的 client request catalog。

## 能回答的问题

- skills、marketplace、plugin、app、mcpServer 当前有哪些 wire method？
- `config/mcpServer/reload` 属于哪个 catalog？
- MCP OAuth、status、resource read 和 tool call 使用哪些 params/response 类型？
- plugin share/install/read/list 方法如何分组？

## 字段模型

skills、marketplace 和 plugin 类型集中在 `v2/plugin.rs`；app connector list params 在 `v2/apps.rs`；MCP status/resource/tool/OAuth/reload 类型在 `v2/mcp.rs`。[E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:21][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:34][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:69][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:129][E: codex-rs/app-server-protocol/src/protocol/v2/plugin.rs:771][E: codex-rs/app-server-protocol/src/protocol/v2/apps.rs:12][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:29][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:77][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:94][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:182][E: codex-rs/app-server-protocol/src/protocol/v2/mcp.rs:187]

`skills/list` uses a shared-read config serialization scope, while skills config write, marketplace mutation and plugin install/uninstall use global config serialization in the macro invocation.[E: codex-rs/app-server-protocol/src/protocol/common.rs:659][E: codex-rs/app-server-protocol/src/protocol/common.rs:664][E: codex-rs/app-server-protocol/src/protocol/common.rs:674][E: codex-rs/app-server-protocol/src/protocol/common.rs:786][E: codex-rs/app-server-protocol/src/protocol/common.rs:791][E: codex-rs/app-server-protocol/src/protocol/common.rs:796]

## 方法 catalog

| Variant | Wire method | Params type | Response type | Gate | Evidence |
|---|---|---|---|---|---|
| `SkillsList` | `skills/list` | `v2::SkillsListParams` | `v2::SkillsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:657][E: codex-rs/app-server-protocol/src/protocol/common.rs:658][E: codex-rs/app-server-protocol/src/protocol/common.rs:660] |
| `SkillsExtraRootsSet` | `skills/extraRoots/set` | `v2::SkillsExtraRootsSetParams` | `v2::SkillsExtraRootsSetResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:662][E: codex-rs/app-server-protocol/src/protocol/common.rs:663][E: codex-rs/app-server-protocol/src/protocol/common.rs:665] |
| `MarketplaceAdd` | `marketplace/add` | `v2::MarketplaceAddParams` | `v2::MarketplaceAddResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:672][E: codex-rs/app-server-protocol/src/protocol/common.rs:673][E: codex-rs/app-server-protocol/src/protocol/common.rs:675] |
| `MarketplaceRemove` | `marketplace/remove` | `v2::MarketplaceRemoveParams` | `v2::MarketplaceRemoveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:677][E: codex-rs/app-server-protocol/src/protocol/common.rs:678][E: codex-rs/app-server-protocol/src/protocol/common.rs:680] |
| `MarketplaceUpgrade` | `marketplace/upgrade` | `v2::MarketplaceUpgradeParams` | `v2::MarketplaceUpgradeResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:682][E: codex-rs/app-server-protocol/src/protocol/common.rs:683][E: codex-rs/app-server-protocol/src/protocol/common.rs:685] |
| `PluginList` | `plugin/list` | `v2::PluginListParams` | `v2::PluginListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:687][E: codex-rs/app-server-protocol/src/protocol/common.rs:688][E: codex-rs/app-server-protocol/src/protocol/common.rs:690] |
| `PluginInstalled` | `plugin/installed` | `v2::PluginInstalledParams` | `v2::PluginInstalledResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:692][E: codex-rs/app-server-protocol/src/protocol/common.rs:693][E: codex-rs/app-server-protocol/src/protocol/common.rs:695] |
| `PluginRead` | `plugin/read` | `v2::PluginReadParams` | `v2::PluginReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:697][E: codex-rs/app-server-protocol/src/protocol/common.rs:698][E: codex-rs/app-server-protocol/src/protocol/common.rs:700] |
| `PluginSkillRead` | `plugin/skill/read` | `v2::PluginSkillReadParams` | `v2::PluginSkillReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:702][E: codex-rs/app-server-protocol/src/protocol/common.rs:703][E: codex-rs/app-server-protocol/src/protocol/common.rs:705] |
| `PluginShareSave` | `plugin/share/save` | `v2::PluginShareSaveParams` | `v2::PluginShareSaveResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:707][E: codex-rs/app-server-protocol/src/protocol/common.rs:708][E: codex-rs/app-server-protocol/src/protocol/common.rs:710] |
| `PluginShareUpdateTargets` | `plugin/share/updateTargets` | `v2::PluginShareUpdateTargetsParams` | `v2::PluginShareUpdateTargetsResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:712][E: codex-rs/app-server-protocol/src/protocol/common.rs:713][E: codex-rs/app-server-protocol/src/protocol/common.rs:715] |
| `PluginShareList` | `plugin/share/list` | `v2::PluginShareListParams` | `v2::PluginShareListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:717][E: codex-rs/app-server-protocol/src/protocol/common.rs:718][E: codex-rs/app-server-protocol/src/protocol/common.rs:720] |
| `PluginShareCheckout` | `plugin/share/checkout` | `v2::PluginShareCheckoutParams` | `v2::PluginShareCheckoutResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:722][E: codex-rs/app-server-protocol/src/protocol/common.rs:723][E: codex-rs/app-server-protocol/src/protocol/common.rs:725] |
| `PluginShareDelete` | `plugin/share/delete` | `v2::PluginShareDeleteParams` | `v2::PluginShareDeleteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:727][E: codex-rs/app-server-protocol/src/protocol/common.rs:728][E: codex-rs/app-server-protocol/src/protocol/common.rs:730] |
| `AppsList` | `app/list` | `v2::AppsListParams` | `v2::AppsListResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:732][E: codex-rs/app-server-protocol/src/protocol/common.rs:733][E: codex-rs/app-server-protocol/src/protocol/common.rs:735] |
| `SkillsConfigWrite` | `skills/config/write` | `v2::SkillsConfigWriteParams` | `v2::SkillsConfigWriteResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:784][E: codex-rs/app-server-protocol/src/protocol/common.rs:785][E: codex-rs/app-server-protocol/src/protocol/common.rs:787] |
| `PluginInstall` | `plugin/install` | `v2::PluginInstallParams` | `v2::PluginInstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:789][E: codex-rs/app-server-protocol/src/protocol/common.rs:790][E: codex-rs/app-server-protocol/src/protocol/common.rs:792] |
| `PluginUninstall` | `plugin/uninstall` | `v2::PluginUninstallParams` | `v2::PluginUninstallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:794][E: codex-rs/app-server-protocol/src/protocol/common.rs:795][E: codex-rs/app-server-protocol/src/protocol/common.rs:797] |
| `McpServerOauthLogin` | `mcpServer/oauth/login` | `v2::McpServerOauthLoginParams` | `v2::McpServerOauthLoginResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:947][E: codex-rs/app-server-protocol/src/protocol/common.rs:948][E: codex-rs/app-server-protocol/src/protocol/common.rs:950] |
| `McpServerRefresh` | `config/mcpServer/reload` | `Option<()>` | `v2::McpServerRefreshResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:953][E: codex-rs/app-server-protocol/src/protocol/common.rs:954][E: codex-rs/app-server-protocol/src/protocol/common.rs:956] |
| `McpServerStatusList` | `mcpServerStatus/list` | `v2::ListMcpServerStatusParams` | `v2::ListMcpServerStatusResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:959][E: codex-rs/app-server-protocol/src/protocol/common.rs:960][E: codex-rs/app-server-protocol/src/protocol/common.rs:962] |
| `McpResourceRead` | `mcpServer/resource/read` | `v2::McpResourceReadParams` | `v2::McpResourceReadResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:965][E: codex-rs/app-server-protocol/src/protocol/common.rs:966][E: codex-rs/app-server-protocol/src/protocol/common.rs:968] |
| `McpServerToolCall` | `mcpServer/tool/call` | `v2::McpServerToolCallParams` | `v2::McpServerToolCallResponse` | stable | [E: codex-rs/app-server-protocol/src/protocol/common.rs:971][E: codex-rs/app-server-protocol/src/protocol/common.rs:972][E: codex-rs/app-server-protocol/src/protocol/common.rs:974] |

## Sources

- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/plugin.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/apps.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/mcp.rs`

## 相关

- `rpc.overview` -> [App-Server 协议总览](overview.md)
- `rpc.notifications-system` -> [server notifications: system](notifications-system.md)
