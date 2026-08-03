---
id: ref.feature-flags
title: Feature flags 全量索引
kind: reference
tier: T3
source: [codex-rs/features/src/lib.rs]
symbols: [FEATURES]
related: [config.skills-plugins-features, ref.key-types, ref.crate-index, subsys.config-auth.features-system]
evidence: explicit
status: verified
updated: 7750465934
---

> 本页是 `FEATURES` registry 的全量 catalog：当前共 102 条。macOS/Linux/Windows 上是 Stable 34、UnderDevelopment 31、Experimental 2、Deprecated 3、Removed 32；其它平台是 Stable 34、UnderDevelopment 32、Experimental 1、Deprecated 3、Removed 32。差异来自 `PreventIdleSleep` 的条件 stage。[E: codex-rs/features/src/lib.rs:831][E: codex-rs/features/src/lib.rs:838][E: codex-rs/features/src/lib.rs:1415][E: codex-rs/features/src/lib.rs:1417][E: codex-rs/features/src/lib.rs:1422][E: codex-rs/features/src/lib.rs:1428][E: codex-rs/features/src/lib.rs:1463][E: codex-rs/features/src/lib.rs:1466][I]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?

## 职责边界

本页只维护可 grep 的 registry 快照，不重复解释 feature runtime 机制；关于 `Stage`、`Features`、`FeaturesToml`、legacy keys、合并顺序、dependency normalization、metrics 与 warning，请读 `subsys.config-auth.features-system`。

相对 `61a44880a8`，registry 净增 3、无移除：`executed_tool_call_metadata`（UnderDevelopment，默认关闭）、`recommended_plugins`（Stable，默认关闭）与 requirements-only 的 `in_app_updates`（Stable，默认开启）。[E: codex-rs/features/src/lib.rs:895][E: codex-rs/features/src/lib.rs:896][E: codex-rs/features/src/lib.rs:897][E: codex-rs/features/src/lib.rs:898][E: codex-rs/features/src/lib.rs:1175][E: codex-rs/features/src/lib.rs:1176][E: codex-rs/features/src/lib.rs:1177][E: codex-rs/features/src/lib.rs:1178][E: codex-rs/features/src/lib.rs:196][E: codex-rs/features/src/lib.rs:1205][E: codex-rs/features/src/lib.rs:1206][E: codex-rs/features/src/lib.rs:1207][E: codex-rs/features/src/lib.rs:1208][I]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:273][E: codex-rs/features/src/lib.rs:842][E: codex-rs/features/src/lib.rs:843][E: codex-rs/features/src/lib.rs:844] |
| 2 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:88][E: codex-rs/features/src/lib.rs:848][E: codex-rs/features/src/lib.rs:849][E: codex-rs/features/src/lib.rs:850] |
| 3 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:92][E: codex-rs/features/src/lib.rs:854][E: codex-rs/features/src/lib.rs:855][E: codex-rs/features/src/lib.rs:856] |
| 4 | `UnifiedExec` | `unified_exec` | Stable | `!cfg!(windows)` | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:860][E: codex-rs/features/src/lib.rs:861][E: codex-rs/features/src/lib.rs:862] |
| 5 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:866][E: codex-rs/features/src/lib.rs:867][E: codex-rs/features/src/lib.rs:868] |
| 6 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:872][E: codex-rs/features/src/lib.rs:873][E: codex-rs/features/src/lib.rs:874] |
| 7 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:136][E: codex-rs/features/src/lib.rs:878][E: codex-rs/features/src/lib.rs:879][E: codex-rs/features/src/lib.rs:880] |
| 8 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:138][E: codex-rs/features/src/lib.rs:884][E: codex-rs/features/src/lib.rs:885][E: codex-rs/features/src/lib.rs:886] |
| 9 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:275][E: codex-rs/features/src/lib.rs:890][E: codex-rs/features/src/lib.rs:891][E: codex-rs/features/src/lib.rs:892] |
| 10 | `ExecutedToolCallMetadata` | `executed_tool_call_metadata` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:96][E: codex-rs/features/src/lib.rs:895][E: codex-rs/features/src/lib.rs:896][E: codex-rs/features/src/lib.rs:897][E: codex-rs/features/src/lib.rs:898] |
| 11 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:98][E: codex-rs/features/src/lib.rs:902][E: codex-rs/features/src/lib.rs:903][E: codex-rs/features/src/lib.rs:904] |
| 12 | `CodeModeBufferedExec` | `code_mode_buffered_exec` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:100][E: codex-rs/features/src/lib.rs:908][E: codex-rs/features/src/lib.rs:909][E: codex-rs/features/src/lib.rs:910] |
| 13 | `CodeModeHost` | `code_mode_host` | Stable | `true` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:914][E: codex-rs/features/src/lib.rs:915][E: codex-rs/features/src/lib.rs:916] |
| 14 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:104][E: codex-rs/features/src/lib.rs:920][E: codex-rs/features/src/lib.rs:921][E: codex-rs/features/src/lib.rs:922] |
| 15 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:277][E: codex-rs/features/src/lib.rs:926][E: codex-rs/features/src/lib.rs:927][E: codex-rs/features/src/lib.rs:928] |
| 16 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/features/src/lib.rs:932][E: codex-rs/features/src/lib.rs:933][E: codex-rs/features/src/lib.rs:934] |
| 17 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:126][E: codex-rs/features/src/lib.rs:938][E: codex-rs/features/src/lib.rs:939][E: codex-rs/features/src/lib.rs:940] |
| 18 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:129][E: codex-rs/features/src/lib.rs:944][E: codex-rs/features/src/lib.rs:945][E: codex-rs/features/src/lib.rs:946] |
| 19 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:131][E: codex-rs/features/src/lib.rs:950][E: codex-rs/features/src/lib.rs:951][E: codex-rs/features/src/lib.rs:952] |
| 20 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:279][E: codex-rs/features/src/lib.rs:956][E: codex-rs/features/src/lib.rs:957][E: codex-rs/features/src/lib.rs:958] |
| 21 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:292][E: codex-rs/features/src/lib.rs:962][E: codex-rs/features/src/lib.rs:963][E: codex-rs/features/src/lib.rs:964] |
| 22 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:140][E: codex-rs/features/src/lib.rs:968][E: codex-rs/features/src/lib.rs:969][E: codex-rs/features/src/lib.rs:970] |
| 23 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:294][E: codex-rs/features/src/lib.rs:974][E: codex-rs/features/src/lib.rs:975][E: codex-rs/features/src/lib.rs:976] |
| 24 | `MemoryTool` | `memories` | Stable | `false` | [E: codex-rs/features/src/lib.rs:142][E: codex-rs/features/src/lib.rs:980][E: codex-rs/features/src/lib.rs:981][E: codex-rs/features/src/lib.rs:982] |
| 25 | `ExternalAgentMemoryImport` | `external_agent_memory_import` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:986][E: codex-rs/features/src/lib.rs:987][E: codex-rs/features/src/lib.rs:988] |
| 26 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:992][E: codex-rs/features/src/lib.rs:993][E: codex-rs/features/src/lib.rs:994] |
| 27 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:998][E: codex-rs/features/src/lib.rs:999][E: codex-rs/features/src/lib.rs:1000] |
| 28 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:296][E: codex-rs/features/src/lib.rs:1004][E: codex-rs/features/src/lib.rs:1005][E: codex-rs/features/src/lib.rs:1006] |
| 29 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:120][E: codex-rs/features/src/lib.rs:1010][E: codex-rs/features/src/lib.rs:1011][E: codex-rs/features/src/lib.rs:1012] |
| 30 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:122][E: codex-rs/features/src/lib.rs:1016][E: codex-rs/features/src/lib.rs:1017][E: codex-rs/features/src/lib.rs:1018] |
| 31 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:90][E: codex-rs/features/src/lib.rs:1022][E: codex-rs/features/src/lib.rs:1023][E: codex-rs/features/src/lib.rs:1024] |
| 32 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:124][E: codex-rs/features/src/lib.rs:1028][E: codex-rs/features/src/lib.rs:1029][E: codex-rs/features/src/lib.rs:1030] |
| 33 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:282][E: codex-rs/features/src/lib.rs:1034][E: codex-rs/features/src/lib.rs:1035][E: codex-rs/features/src/lib.rs:1036] |
| 34 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:134][E: codex-rs/features/src/lib.rs:1040][E: codex-rs/features/src/lib.rs:1041][E: codex-rs/features/src/lib.rs:1042] |
| 35 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:284][E: codex-rs/features/src/lib.rs:1046][E: codex-rs/features/src/lib.rs:1047][E: codex-rs/features/src/lib.rs:1048] |
| 36 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:286][E: codex-rs/features/src/lib.rs:1052][E: codex-rs/features/src/lib.rs:1053][E: codex-rs/features/src/lib.rs:1054] |
| 37 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:288][E: codex-rs/features/src/lib.rs:1058][E: codex-rs/features/src/lib.rs:1059][E: codex-rs/features/src/lib.rs:1060] |
| 38 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:290][E: codex-rs/features/src/lib.rs:1064][E: codex-rs/features/src/lib.rs:1065][E: codex-rs/features/src/lib.rs:1066] |
| 39 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:1070][E: codex-rs/features/src/lib.rs:1071][E: codex-rs/features/src/lib.rs:1072] |
| 40 | `NetworkProxy` | `network_proxy` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:1076][E: codex-rs/features/src/lib.rs:1077][E: codex-rs/features/src/lib.rs:1082] |
| 41 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:1086][E: codex-rs/features/src/lib.rs:1087][E: codex-rs/features/src/lib.rs:1088] |
| 42 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:156][E: codex-rs/features/src/lib.rs:1092][E: codex-rs/features/src/lib.rs:1093][E: codex-rs/features/src/lib.rs:1094] |
| 43 | `MultiAgentV2` | `multi_agent_v2` | Stable | `false` | [E: codex-rs/features/src/lib.rs:158][E: codex-rs/features/src/lib.rs:1098][E: codex-rs/features/src/lib.rs:1099][E: codex-rs/features/src/lib.rs:1100] |
| 44 | `MultiAgentMode` | `multi_agent_mode` | Removed | `false` | [E: codex-rs/features/src/lib.rs:160][E: codex-rs/features/src/lib.rs:1104][E: codex-rs/features/src/lib.rs:1105][E: codex-rs/features/src/lib.rs:1106] |
| 45 | `SpawnCsv` | `enable_fanout` | Removed | `false` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1110][E: codex-rs/features/src/lib.rs:1111][E: codex-rs/features/src/lib.rs:1112] |
| 46 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:1116][E: codex-rs/features/src/lib.rs:1117][E: codex-rs/features/src/lib.rs:1118] |
| 47 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:1122][E: codex-rs/features/src/lib.rs:1123][E: codex-rs/features/src/lib.rs:1124] |
| 48 | `Mcp20260728` | `mcp_2026_07_28` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:1128][E: codex-rs/features/src/lib.rs:1129][E: codex-rs/features/src/lib.rs:1130] |
| 49 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:170][E: codex-rs/features/src/lib.rs:1134][E: codex-rs/features/src/lib.rs:1135][E: codex-rs/features/src/lib.rs:1136] |
| 50 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:172][E: codex-rs/features/src/lib.rs:1140][E: codex-rs/features/src/lib.rs:1141][E: codex-rs/features/src/lib.rs:1142] |
| 51 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:174][E: codex-rs/features/src/lib.rs:1146][E: codex-rs/features/src/lib.rs:1147][E: codex-rs/features/src/lib.rs:1148] |
| 52 | `DeferredToolWorldState` | `deferred_tool_world_state` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:176][E: codex-rs/features/src/lib.rs:1152][E: codex-rs/features/src/lib.rs:1153][E: codex-rs/features/src/lib.rs:1154] |
| 53 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:178][E: codex-rs/features/src/lib.rs:1158][E: codex-rs/features/src/lib.rs:1159][E: codex-rs/features/src/lib.rs:1160] |
| 54 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:298][E: codex-rs/features/src/lib.rs:1164][E: codex-rs/features/src/lib.rs:1165][E: codex-rs/features/src/lib.rs:1166] |
| 55 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:180][E: codex-rs/features/src/lib.rs:1170][E: codex-rs/features/src/lib.rs:1171][E: codex-rs/features/src/lib.rs:1172] |
| 56 | `RecommendedPlugins` | `recommended_plugins` | Stable | `false` | [E: codex-rs/features/src/lib.rs:182][E: codex-rs/features/src/lib.rs:1175][E: codex-rs/features/src/lib.rs:1176][E: codex-rs/features/src/lib.rs:1177][E: codex-rs/features/src/lib.rs:1178] |
| 57 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:184][E: codex-rs/features/src/lib.rs:1182][E: codex-rs/features/src/lib.rs:1183][E: codex-rs/features/src/lib.rs:1184] |
| 58 | `ExecutorCapabilityDiscovery` | `executor_capability_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:186][E: codex-rs/features/src/lib.rs:1188][E: codex-rs/features/src/lib.rs:1189][E: codex-rs/features/src/lib.rs:1190] |
| 59 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:188][E: codex-rs/features/src/lib.rs:1194][E: codex-rs/features/src/lib.rs:1195][E: codex-rs/features/src/lib.rs:1196] |
| 60 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:192][E: codex-rs/features/src/lib.rs:1200][E: codex-rs/features/src/lib.rs:1201][E: codex-rs/features/src/lib.rs:1202] |
| 61 | `InAppUpdates` | `in_app_updates` | Stable | `true` | [E: codex-rs/features/src/lib.rs:196][E: codex-rs/features/src/lib.rs:1205][E: codex-rs/features/src/lib.rs:1206][E: codex-rs/features/src/lib.rs:1207][E: codex-rs/features/src/lib.rs:1208] |
| 62 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1212][E: codex-rs/features/src/lib.rs:1213][E: codex-rs/features/src/lib.rs:1214] |
| 63 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:1218][E: codex-rs/features/src/lib.rs:1219][E: codex-rs/features/src/lib.rs:1220] |
| 64 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:208][E: codex-rs/features/src/lib.rs:1224][E: codex-rs/features/src/lib.rs:1225][E: codex-rs/features/src/lib.rs:1226] |
| 65 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:212][E: codex-rs/features/src/lib.rs:1230][E: codex-rs/features/src/lib.rs:1231][E: codex-rs/features/src/lib.rs:1232] |
| 66 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:214][E: codex-rs/features/src/lib.rs:1236][E: codex-rs/features/src/lib.rs:1237][E: codex-rs/features/src/lib.rs:1238] |
| 67 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:216][E: codex-rs/features/src/lib.rs:1242][E: codex-rs/features/src/lib.rs:1243][E: codex-rs/features/src/lib.rs:1244] |
| 68 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:218][E: codex-rs/features/src/lib.rs:1248][E: codex-rs/features/src/lib.rs:1249][E: codex-rs/features/src/lib.rs:1250] |
| 69 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:220][E: codex-rs/features/src/lib.rs:1254][E: codex-rs/features/src/lib.rs:1255][E: codex-rs/features/src/lib.rs:1256] |
| 70 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:222][E: codex-rs/features/src/lib.rs:1260][E: codex-rs/features/src/lib.rs:1261][E: codex-rs/features/src/lib.rs:1262] |
| 71 | `ItemIds` | `item_ids` | Removed | `true` | [E: codex-rs/features/src/lib.rs:224][E: codex-rs/features/src/lib.rs:1266][E: codex-rs/features/src/lib.rs:1267][E: codex-rs/features/src/lib.rs:1268] |
| 72 | `ConcurrentReasoningSummaries` | `concurrent_reasoning_summaries` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:226][E: codex-rs/features/src/lib.rs:1272][E: codex-rs/features/src/lib.rs:1273][E: codex-rs/features/src/lib.rs:1274] |
| 73 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:228][E: codex-rs/features/src/lib.rs:1278][E: codex-rs/features/src/lib.rs:1279][E: codex-rs/features/src/lib.rs:1280] |
| 74 | `SkillSearch` | `skill_search` | Stable | `true` | [E: codex-rs/features/src/lib.rs:230][E: codex-rs/features/src/lib.rs:1284][E: codex-rs/features/src/lib.rs:1285][E: codex-rs/features/src/lib.rs:1286] |
| 75 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:232][E: codex-rs/features/src/lib.rs:1290][E: codex-rs/features/src/lib.rs:1291][E: codex-rs/features/src/lib.rs:1292] |
| 76 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:234][E: codex-rs/features/src/lib.rs:1296][E: codex-rs/features/src/lib.rs:1297][E: codex-rs/features/src/lib.rs:1298] |
| 77 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:301][E: codex-rs/features/src/lib.rs:1302][E: codex-rs/features/src/lib.rs:1303][E: codex-rs/features/src/lib.rs:1304] |
| 78 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:236][E: codex-rs/features/src/lib.rs:1308][E: codex-rs/features/src/lib.rs:1309][E: codex-rs/features/src/lib.rs:1310] |
| 79 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:118][E: codex-rs/features/src/lib.rs:1314][E: codex-rs/features/src/lib.rs:1315][E: codex-rs/features/src/lib.rs:1316] |
| 80 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:238][E: codex-rs/features/src/lib.rs:1320][E: codex-rs/features/src/lib.rs:1321][E: codex-rs/features/src/lib.rs:1322] |
| 81 | `GuardianV2` | `guardianv2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:240][E: codex-rs/features/src/lib.rs:1326][E: codex-rs/features/src/lib.rs:1327][E: codex-rs/features/src/lib.rs:1328] |
| 82 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:242][E: codex-rs/features/src/lib.rs:1332][E: codex-rs/features/src/lib.rs:1333][E: codex-rs/features/src/lib.rs:1334] |
| 83 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:244][E: codex-rs/features/src/lib.rs:1338][E: codex-rs/features/src/lib.rs:1339][E: codex-rs/features/src/lib.rs:1340] |
| 84 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:246][E: codex-rs/features/src/lib.rs:1344][E: codex-rs/features/src/lib.rs:1345][E: codex-rs/features/src/lib.rs:1346] |
| 85 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:248][E: codex-rs/features/src/lib.rs:1350][E: codex-rs/features/src/lib.rs:1351][E: codex-rs/features/src/lib.rs:1352] |
| 86 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:304][E: codex-rs/features/src/lib.rs:1356][E: codex-rs/features/src/lib.rs:1357][E: codex-rs/features/src/lib.rs:1358] |
| 87 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:250][E: codex-rs/features/src/lib.rs:1362][E: codex-rs/features/src/lib.rs:1363][E: codex-rs/features/src/lib.rs:1364] |
| 88 | `AuthElicitation` | `auth_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:252][E: codex-rs/features/src/lib.rs:1368][E: codex-rs/features/src/lib.rs:1369][E: codex-rs/features/src/lib.rs:1370] |
| 89 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:254][E: codex-rs/features/src/lib.rs:1374][E: codex-rs/features/src/lib.rs:1375][E: codex-rs/features/src/lib.rs:1376] |
| 90 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:256][E: codex-rs/features/src/lib.rs:1380][E: codex-rs/features/src/lib.rs:1381][E: codex-rs/features/src/lib.rs:1382] |
| 91 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:258][E: codex-rs/features/src/lib.rs:1386][E: codex-rs/features/src/lib.rs:1387][E: codex-rs/features/src/lib.rs:1388] |
| 92 | `RealtimeConversation` | `realtime_conversation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:260][E: codex-rs/features/src/lib.rs:1392][E: codex-rs/features/src/lib.rs:1393][E: codex-rs/features/src/lib.rs:1394] |
| 93 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:306][E: codex-rs/features/src/lib.rs:1398][E: codex-rs/features/src/lib.rs:1399][E: codex-rs/features/src/lib.rs:1400] |
| 94 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:309][E: codex-rs/features/src/lib.rs:1404][E: codex-rs/features/src/lib.rs:1405][E: codex-rs/features/src/lib.rs:1406] |
| 95 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:311][E: codex-rs/features/src/lib.rs:1410][E: codex-rs/features/src/lib.rs:1411][E: codex-rs/features/src/lib.rs:1412] |
| 96 | `PreventIdleSleep` | `prevent_idle_sleep` | Experimental (macOS/Linux/Windows); UnderDevelopment (other) | `false` | [E: codex-rs/features/src/lib.rs:262][E: codex-rs/features/src/lib.rs:1416][E: codex-rs/features/src/lib.rs:1417][E: codex-rs/features/src/lib.rs:1422][E: codex-rs/features/src/lib.rs:1428][E: codex-rs/features/src/lib.rs:1430] |
| 97 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:314][E: codex-rs/features/src/lib.rs:1434][E: codex-rs/features/src/lib.rs:1435][E: codex-rs/features/src/lib.rs:1436] |
| 98 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:316][E: codex-rs/features/src/lib.rs:1440][E: codex-rs/features/src/lib.rs:1441][E: codex-rs/features/src/lib.rs:1442] |
| 99 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:318][E: codex-rs/features/src/lib.rs:1446][E: codex-rs/features/src/lib.rs:1447][E: codex-rs/features/src/lib.rs:1448] |
| 100 | `RemoteCompactionV2` | `remote_compaction_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:264][E: codex-rs/features/src/lib.rs:1452][E: codex-rs/features/src/lib.rs:1453][E: codex-rs/features/src/lib.rs:1454] |
| 101 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:266][E: codex-rs/features/src/lib.rs:1458][E: codex-rs/features/src/lib.rs:1459][E: codex-rs/features/src/lib.rs:1460] |
| 102 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:268][E: codex-rs/features/src/lib.rs:1464][E: codex-rs/features/src/lib.rs:1465][E: codex-rs/features/src/lib.rs:1466] |
## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
