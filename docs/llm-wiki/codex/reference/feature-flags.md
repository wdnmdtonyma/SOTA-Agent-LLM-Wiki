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
updated: 9ded177ce7
---

> 本页是 `FEATURES` registry 的全量 catalog：当前共 114 条 `FeatureSpec`。macOS/Linux/Windows 上是 Stable 36、UnderDevelopment 40、Experimental 2、Deprecated 3、Removed 33；其它平台是 Stable 36、UnderDevelopment 41、Experimental 1、Deprecated 3、Removed 33。差异来自 `PreventIdleSleep` 的条件 stage。[E: codex-rs/features/src/lib.rs:811][E: codex-rs/features/src/lib.rs:813][E: codex-rs/features/src/lib.rs:1456][E: codex-rs/features/src/lib.rs:1461][E: codex-rs/features/src/lib.rs:1467][E: codex-rs/features/src/lib.rs:1510][I]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?

## 职责边界

本页只维护可 grep 的 registry 快照，不重复解释 feature runtime 机制；关于 `Stage`、`Features`、`FeaturesToml`、legacy keys、合并顺序、dependency normalization、metrics 与 warning，请读 `subsys.config-auth.features-system`。

相对 `7750465934` 的 102 条 registry，本轮净增 12 条到 114。新增 key：`view_image`、`code_mode_interrupt`、`background_paginated_rollout_migration`、`apply_patch_preserve_line_endings`、`unbounded_connection_retries`、`psp`、`image_resize_notice`、`unified_image_budget`、`guardian_reuse_parent_compaction`、`guardian_enhanced_node_repl_transcripts`、`guardian_node_repl_transcript_images`、`retain_client_developer_messages`。`CodeModeBufferedExec` 从 UnderDevelopment 改为 Removed。`UnifiedExec` 默认改为全平台 `true`（含 Windows）。`network_proxy` 仍是 Experimental / 默认关闭；`prevent_idle_sleep` 仍按平台切 Experimental / UnderDevelopment。[E: codex-rs/features/src/lib.rs:826][E: codex-rs/features/src/lib.rs:838][E: codex-rs/features/src/lib.rs:841][E: codex-rs/features/src/lib.rs:886][E: codex-rs/features/src/lib.rs:898][E: codex-rs/features/src/lib.rs:982][E: codex-rs/features/src/lib.rs:1006][E: codex-rs/features/src/lib.rs:1072][E: codex-rs/features/src/lib.rs:1078][E: codex-rs/features/src/lib.rs:1124][E: codex-rs/features/src/lib.rs:1268][E: codex-rs/features/src/lib.rs:1274][E: codex-rs/features/src/lib.rs:1346][E: codex-rs/features/src/lib.rs:1352][E: codex-rs/features/src/lib.rs:1358][E: codex-rs/features/src/lib.rs:1496][I]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:301][E: codex-rs/features/src/lib.rs:814][E: codex-rs/features/src/lib.rs:815][E: codex-rs/features/src/lib.rs:816] |
| 2 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:92][E: codex-rs/features/src/lib.rs:820][E: codex-rs/features/src/lib.rs:821][E: codex-rs/features/src/lib.rs:822] |
| 3 | `ViewImage` | `view_image` | Stable | `true` | [E: codex-rs/features/src/lib.rs:94][E: codex-rs/features/src/lib.rs:826][E: codex-rs/features/src/lib.rs:827][E: codex-rs/features/src/lib.rs:828] |
| 4 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:98][E: codex-rs/features/src/lib.rs:832][E: codex-rs/features/src/lib.rs:833][E: codex-rs/features/src/lib.rs:834] |
| 5 | `UnifiedExec` | `unified_exec` | Stable | `true` | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:838][E: codex-rs/features/src/lib.rs:839][E: codex-rs/features/src/lib.rs:840] |
| 6 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/features/src/lib.rs:844][E: codex-rs/features/src/lib.rs:845][E: codex-rs/features/src/lib.rs:846] |
| 7 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:122][E: codex-rs/features/src/lib.rs:850][E: codex-rs/features/src/lib.rs:851][E: codex-rs/features/src/lib.rs:852] |
| 8 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:856][E: codex-rs/features/src/lib.rs:857][E: codex-rs/features/src/lib.rs:858] |
| 9 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:862][E: codex-rs/features/src/lib.rs:863][E: codex-rs/features/src/lib.rs:864] |
| 10 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:303][E: codex-rs/features/src/lib.rs:868][E: codex-rs/features/src/lib.rs:869][E: codex-rs/features/src/lib.rs:870] |
| 11 | `ExecutedToolCallMetadata` | `executed_tool_call_metadata` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:874][E: codex-rs/features/src/lib.rs:875][E: codex-rs/features/src/lib.rs:876] |
| 12 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:104][E: codex-rs/features/src/lib.rs:880][E: codex-rs/features/src/lib.rs:881][E: codex-rs/features/src/lib.rs:882] |
| 13 | `CodeModeBufferedExec` | `code_mode_buffered_exec` | Removed | `false` | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:886][E: codex-rs/features/src/lib.rs:887][E: codex-rs/features/src/lib.rs:888] |
| 14 | `CodeModeHost` | `code_mode_host` | Stable | `true` | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:892][E: codex-rs/features/src/lib.rs:893][E: codex-rs/features/src/lib.rs:894] |
| 15 | `CodeModeInterrupt` | `code_mode_interrupt` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:110][E: codex-rs/features/src/lib.rs:898][E: codex-rs/features/src/lib.rs:899][E: codex-rs/features/src/lib.rs:900] |
| 16 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:112][E: codex-rs/features/src/lib.rs:904][E: codex-rs/features/src/lib.rs:905][E: codex-rs/features/src/lib.rs:906] |
| 17 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:305][E: codex-rs/features/src/lib.rs:910][E: codex-rs/features/src/lib.rs:911][E: codex-rs/features/src/lib.rs:912] |
| 18 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:124][E: codex-rs/features/src/lib.rs:916][E: codex-rs/features/src/lib.rs:917][E: codex-rs/features/src/lib.rs:918] |
| 19 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:136][E: codex-rs/features/src/lib.rs:922][E: codex-rs/features/src/lib.rs:923][E: codex-rs/features/src/lib.rs:924] |
| 20 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:139][E: codex-rs/features/src/lib.rs:928][E: codex-rs/features/src/lib.rs:929][E: codex-rs/features/src/lib.rs:930] |
| 21 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:141][E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:935][E: codex-rs/features/src/lib.rs:936] |
| 22 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:307][E: codex-rs/features/src/lib.rs:940][E: codex-rs/features/src/lib.rs:941][E: codex-rs/features/src/lib.rs:942] |
| 23 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:320][E: codex-rs/features/src/lib.rs:946][E: codex-rs/features/src/lib.rs:947][E: codex-rs/features/src/lib.rs:948] |
| 24 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:952][E: codex-rs/features/src/lib.rs:953][E: codex-rs/features/src/lib.rs:954] |
| 25 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:322][E: codex-rs/features/src/lib.rs:958][E: codex-rs/features/src/lib.rs:959][E: codex-rs/features/src/lib.rs:960] |
| 26 | `MemoryTool` | `memories` | Stable | `false` | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:964][E: codex-rs/features/src/lib.rs:965][E: codex-rs/features/src/lib.rs:966] |
| 27 | `ExternalAgentMemoryImport` | `external_agent_memory_import` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:970][E: codex-rs/features/src/lib.rs:971][E: codex-rs/features/src/lib.rs:972] |
| 28 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:156][E: codex-rs/features/src/lib.rs:976][E: codex-rs/features/src/lib.rs:977][E: codex-rs/features/src/lib.rs:978] |
| 29 | `BackgroundPaginatedRolloutMigration` | `background_paginated_rollout_migration` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:158][E: codex-rs/features/src/lib.rs:982][E: codex-rs/features/src/lib.rs:983][E: codex-rs/features/src/lib.rs:984] |
| 30 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:160][E: codex-rs/features/src/lib.rs:988][E: codex-rs/features/src/lib.rs:989][E: codex-rs/features/src/lib.rs:990] |
| 31 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:324][E: codex-rs/features/src/lib.rs:994][E: codex-rs/features/src/lib.rs:995][E: codex-rs/features/src/lib.rs:996] |
| 32 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:128][E: codex-rs/features/src/lib.rs:1000][E: codex-rs/features/src/lib.rs:1001][E: codex-rs/features/src/lib.rs:1002] |
| 33 | `ApplyPatchPreserveLineEndings` | `apply_patch_preserve_line_endings` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:130][E: codex-rs/features/src/lib.rs:1006][E: codex-rs/features/src/lib.rs:1007][E: codex-rs/features/src/lib.rs:1008] |
| 34 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:132][E: codex-rs/features/src/lib.rs:1012][E: codex-rs/features/src/lib.rs:1013][E: codex-rs/features/src/lib.rs:1014] |
| 35 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:96][E: codex-rs/features/src/lib.rs:1018][E: codex-rs/features/src/lib.rs:1019][E: codex-rs/features/src/lib.rs:1020] |
| 36 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:134][E: codex-rs/features/src/lib.rs:1024][E: codex-rs/features/src/lib.rs:1025][E: codex-rs/features/src/lib.rs:1026] |
| 37 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:310][E: codex-rs/features/src/lib.rs:1030][E: codex-rs/features/src/lib.rs:1031][E: codex-rs/features/src/lib.rs:1032] |
| 38 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:1036][E: codex-rs/features/src/lib.rs:1037][E: codex-rs/features/src/lib.rs:1038] |
| 39 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:312][E: codex-rs/features/src/lib.rs:1042][E: codex-rs/features/src/lib.rs:1043][E: codex-rs/features/src/lib.rs:1044] |
| 40 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:314][E: codex-rs/features/src/lib.rs:1048][E: codex-rs/features/src/lib.rs:1049][E: codex-rs/features/src/lib.rs:1050] |
| 41 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:316][E: codex-rs/features/src/lib.rs:1054][E: codex-rs/features/src/lib.rs:1055][E: codex-rs/features/src/lib.rs:1056] |
| 42 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:318][E: codex-rs/features/src/lib.rs:1060][E: codex-rs/features/src/lib.rs:1061][E: codex-rs/features/src/lib.rs:1062] |
| 43 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1066][E: codex-rs/features/src/lib.rs:1067][E: codex-rs/features/src/lib.rs:1068] |
| 44 | `UnboundedConnectionRetries` | `unbounded_connection_retries` | Stable | `true` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:1072][E: codex-rs/features/src/lib.rs:1073][E: codex-rs/features/src/lib.rs:1074] |
| 45 | `NetworkProxy` | `network_proxy` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:1078][E: codex-rs/features/src/lib.rs:1079][E: codex-rs/features/src/lib.rs:1080] |
| 46 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:1088][E: codex-rs/features/src/lib.rs:1089][E: codex-rs/features/src/lib.rs:1090] |
| 47 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:170][E: codex-rs/features/src/lib.rs:1094][E: codex-rs/features/src/lib.rs:1095][E: codex-rs/features/src/lib.rs:1096] |
| 48 | `MultiAgentV2` | `multi_agent_v2` | Stable | `false` | [E: codex-rs/features/src/lib.rs:172][E: codex-rs/features/src/lib.rs:1100][E: codex-rs/features/src/lib.rs:1101][E: codex-rs/features/src/lib.rs:1102] |
| 49 | `MultiAgentMode` | `multi_agent_mode` | Removed | `false` | [E: codex-rs/features/src/lib.rs:174][E: codex-rs/features/src/lib.rs:1106][E: codex-rs/features/src/lib.rs:1107][E: codex-rs/features/src/lib.rs:1108] |
| 50 | `SpawnCsv` | `enable_fanout` | Removed | `false` | [E: codex-rs/features/src/lib.rs:176][E: codex-rs/features/src/lib.rs:1112][E: codex-rs/features/src/lib.rs:1113][E: codex-rs/features/src/lib.rs:1114] |
| 51 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:178][E: codex-rs/features/src/lib.rs:1118][E: codex-rs/features/src/lib.rs:1119][E: codex-rs/features/src/lib.rs:1120] |
| 52 | `Psp` | `psp` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:180][E: codex-rs/features/src/lib.rs:1124][E: codex-rs/features/src/lib.rs:1125][E: codex-rs/features/src/lib.rs:1126] |
| 53 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:182][E: codex-rs/features/src/lib.rs:1130][E: codex-rs/features/src/lib.rs:1131][E: codex-rs/features/src/lib.rs:1132] |
| 54 | `Mcp20260728` | `mcp_2026_07_28` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:184][E: codex-rs/features/src/lib.rs:1136][E: codex-rs/features/src/lib.rs:1137][E: codex-rs/features/src/lib.rs:1138] |
| 55 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:186][E: codex-rs/features/src/lib.rs:1142][E: codex-rs/features/src/lib.rs:1143][E: codex-rs/features/src/lib.rs:1144] |
| 56 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:188][E: codex-rs/features/src/lib.rs:1148][E: codex-rs/features/src/lib.rs:1149][E: codex-rs/features/src/lib.rs:1150] |
| 57 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:190][E: codex-rs/features/src/lib.rs:1154][E: codex-rs/features/src/lib.rs:1155][E: codex-rs/features/src/lib.rs:1156] |
| 58 | `DeferredToolWorldState` | `deferred_tool_world_state` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:192][E: codex-rs/features/src/lib.rs:1160][E: codex-rs/features/src/lib.rs:1161][E: codex-rs/features/src/lib.rs:1162] |
| 59 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:194][E: codex-rs/features/src/lib.rs:1166][E: codex-rs/features/src/lib.rs:1167][E: codex-rs/features/src/lib.rs:1168] |
| 60 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:326][E: codex-rs/features/src/lib.rs:1172][E: codex-rs/features/src/lib.rs:1173][E: codex-rs/features/src/lib.rs:1174] |
| 61 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:196][E: codex-rs/features/src/lib.rs:1178][E: codex-rs/features/src/lib.rs:1179][E: codex-rs/features/src/lib.rs:1180] |
| 62 | `RecommendedPlugins` | `recommended_plugins` | Stable | `false` | [E: codex-rs/features/src/lib.rs:198][E: codex-rs/features/src/lib.rs:1184][E: codex-rs/features/src/lib.rs:1185][E: codex-rs/features/src/lib.rs:1186] |
| 63 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1190][E: codex-rs/features/src/lib.rs:1191][E: codex-rs/features/src/lib.rs:1192] |
| 64 | `ExecutorCapabilityDiscovery` | `executor_capability_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:202][E: codex-rs/features/src/lib.rs:1196][E: codex-rs/features/src/lib.rs:1197][E: codex-rs/features/src/lib.rs:1198] |
| 65 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:1202][E: codex-rs/features/src/lib.rs:1203][E: codex-rs/features/src/lib.rs:1204] |
| 66 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:208][E: codex-rs/features/src/lib.rs:1208][E: codex-rs/features/src/lib.rs:1209][E: codex-rs/features/src/lib.rs:1210] |
| 67 | `InAppUpdates` | `in_app_updates` | Stable | `true` | [E: codex-rs/features/src/lib.rs:212][E: codex-rs/features/src/lib.rs:1214][E: codex-rs/features/src/lib.rs:1215][E: codex-rs/features/src/lib.rs:1216] |
| 68 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:216][E: codex-rs/features/src/lib.rs:1220][E: codex-rs/features/src/lib.rs:1221][E: codex-rs/features/src/lib.rs:1222] |
| 69 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:220][E: codex-rs/features/src/lib.rs:1226][E: codex-rs/features/src/lib.rs:1227][E: codex-rs/features/src/lib.rs:1228] |
| 70 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:224][E: codex-rs/features/src/lib.rs:1232][E: codex-rs/features/src/lib.rs:1233][E: codex-rs/features/src/lib.rs:1234] |
| 71 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:228][E: codex-rs/features/src/lib.rs:1238][E: codex-rs/features/src/lib.rs:1239][E: codex-rs/features/src/lib.rs:1240] |
| 72 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:230][E: codex-rs/features/src/lib.rs:1244][E: codex-rs/features/src/lib.rs:1245][E: codex-rs/features/src/lib.rs:1246] |
| 73 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:232][E: codex-rs/features/src/lib.rs:1250][E: codex-rs/features/src/lib.rs:1251][E: codex-rs/features/src/lib.rs:1252] |
| 74 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:234][E: codex-rs/features/src/lib.rs:1256][E: codex-rs/features/src/lib.rs:1257][E: codex-rs/features/src/lib.rs:1258] |
| 75 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:236][E: codex-rs/features/src/lib.rs:1262][E: codex-rs/features/src/lib.rs:1263][E: codex-rs/features/src/lib.rs:1264] |
| 76 | `ImageResizeNotice` | `image_resize_notice` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:238][E: codex-rs/features/src/lib.rs:1268][E: codex-rs/features/src/lib.rs:1269][E: codex-rs/features/src/lib.rs:1270] |
| 77 | `UnifiedImageBudget` | `unified_image_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:240][E: codex-rs/features/src/lib.rs:1274][E: codex-rs/features/src/lib.rs:1275][E: codex-rs/features/src/lib.rs:1276] |
| 78 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:242][E: codex-rs/features/src/lib.rs:1280][E: codex-rs/features/src/lib.rs:1281][E: codex-rs/features/src/lib.rs:1282] |
| 79 | `ItemIds` | `item_ids` | Removed | `true` | [E: codex-rs/features/src/lib.rs:244][E: codex-rs/features/src/lib.rs:1286][E: codex-rs/features/src/lib.rs:1287][E: codex-rs/features/src/lib.rs:1288] |
| 80 | `ConcurrentReasoningSummaries` | `concurrent_reasoning_summaries` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:246][E: codex-rs/features/src/lib.rs:1292][E: codex-rs/features/src/lib.rs:1293][E: codex-rs/features/src/lib.rs:1294] |
| 81 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:248][E: codex-rs/features/src/lib.rs:1298][E: codex-rs/features/src/lib.rs:1299][E: codex-rs/features/src/lib.rs:1300] |
| 82 | `SkillSearch` | `skill_search` | Stable | `true` | [E: codex-rs/features/src/lib.rs:250][E: codex-rs/features/src/lib.rs:1304][E: codex-rs/features/src/lib.rs:1305][E: codex-rs/features/src/lib.rs:1306] |
| 83 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:252][E: codex-rs/features/src/lib.rs:1310][E: codex-rs/features/src/lib.rs:1311][E: codex-rs/features/src/lib.rs:1312] |
| 84 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:254][E: codex-rs/features/src/lib.rs:1316][E: codex-rs/features/src/lib.rs:1317][E: codex-rs/features/src/lib.rs:1318] |
| 85 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:329][E: codex-rs/features/src/lib.rs:1322][E: codex-rs/features/src/lib.rs:1323][E: codex-rs/features/src/lib.rs:1324] |
| 86 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:256][E: codex-rs/features/src/lib.rs:1328][E: codex-rs/features/src/lib.rs:1329][E: codex-rs/features/src/lib.rs:1330] |
| 87 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:126][E: codex-rs/features/src/lib.rs:1334][E: codex-rs/features/src/lib.rs:1335][E: codex-rs/features/src/lib.rs:1336] |
| 88 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:258][E: codex-rs/features/src/lib.rs:1340][E: codex-rs/features/src/lib.rs:1341][E: codex-rs/features/src/lib.rs:1342] |
| 89 | `GuardianReuseParentCompaction` | `guardian_reuse_parent_compaction` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:260][E: codex-rs/features/src/lib.rs:1346][E: codex-rs/features/src/lib.rs:1347][E: codex-rs/features/src/lib.rs:1348] |
| 90 | `GuardianEnhancedNodeReplTranscripts` | `guardian_enhanced_node_repl_transcripts` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:262][E: codex-rs/features/src/lib.rs:1352][E: codex-rs/features/src/lib.rs:1353][E: codex-rs/features/src/lib.rs:1354] |
| 91 | `GuardianNodeReplTranscriptImages` | `guardian_node_repl_transcript_images` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:264][E: codex-rs/features/src/lib.rs:1358][E: codex-rs/features/src/lib.rs:1359][E: codex-rs/features/src/lib.rs:1360] |
| 92 | `GuardianV2` | `guardianv2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:266][E: codex-rs/features/src/lib.rs:1364][E: codex-rs/features/src/lib.rs:1365][E: codex-rs/features/src/lib.rs:1366] |
| 93 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:268][E: codex-rs/features/src/lib.rs:1370][E: codex-rs/features/src/lib.rs:1371][E: codex-rs/features/src/lib.rs:1372] |
| 94 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:270][E: codex-rs/features/src/lib.rs:1376][E: codex-rs/features/src/lib.rs:1377][E: codex-rs/features/src/lib.rs:1378] |
| 95 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:272][E: codex-rs/features/src/lib.rs:1382][E: codex-rs/features/src/lib.rs:1383][E: codex-rs/features/src/lib.rs:1384] |
| 96 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:274][E: codex-rs/features/src/lib.rs:1388][E: codex-rs/features/src/lib.rs:1389][E: codex-rs/features/src/lib.rs:1390] |
| 97 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:332][E: codex-rs/features/src/lib.rs:1394][E: codex-rs/features/src/lib.rs:1395][E: codex-rs/features/src/lib.rs:1396] |
| 98 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:276][E: codex-rs/features/src/lib.rs:1400][E: codex-rs/features/src/lib.rs:1401][E: codex-rs/features/src/lib.rs:1402] |
| 99 | `AuthElicitation` | `auth_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:278][E: codex-rs/features/src/lib.rs:1406][E: codex-rs/features/src/lib.rs:1407][E: codex-rs/features/src/lib.rs:1408] |
| 100 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:280][E: codex-rs/features/src/lib.rs:1412][E: codex-rs/features/src/lib.rs:1413][E: codex-rs/features/src/lib.rs:1414] |
| 101 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:282][E: codex-rs/features/src/lib.rs:1418][E: codex-rs/features/src/lib.rs:1419][E: codex-rs/features/src/lib.rs:1420] |
| 102 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:284][E: codex-rs/features/src/lib.rs:1424][E: codex-rs/features/src/lib.rs:1425][E: codex-rs/features/src/lib.rs:1426] |
| 103 | `RealtimeConversation` | `realtime_conversation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:286][E: codex-rs/features/src/lib.rs:1430][E: codex-rs/features/src/lib.rs:1431][E: codex-rs/features/src/lib.rs:1432] |
| 104 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:334][E: codex-rs/features/src/lib.rs:1436][E: codex-rs/features/src/lib.rs:1437][E: codex-rs/features/src/lib.rs:1438] |
| 105 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:337][E: codex-rs/features/src/lib.rs:1442][E: codex-rs/features/src/lib.rs:1443][E: codex-rs/features/src/lib.rs:1444] |
| 106 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:339][E: codex-rs/features/src/lib.rs:1448][E: codex-rs/features/src/lib.rs:1449][E: codex-rs/features/src/lib.rs:1450] |
| 107 | `PreventIdleSleep` | `prevent_idle_sleep` | Experimental (macOS/Linux/Windows); UnderDevelopment (other) | `false` | [E: codex-rs/features/src/lib.rs:288][E: codex-rs/features/src/lib.rs:1454][E: codex-rs/features/src/lib.rs:1455][E: codex-rs/features/src/lib.rs:1456] |
| 108 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:342][E: codex-rs/features/src/lib.rs:1472][E: codex-rs/features/src/lib.rs:1473][E: codex-rs/features/src/lib.rs:1474] |
| 109 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:1478][E: codex-rs/features/src/lib.rs:1479][E: codex-rs/features/src/lib.rs:1480] |
| 110 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:1484][E: codex-rs/features/src/lib.rs:1485][E: codex-rs/features/src/lib.rs:1486] |
| 111 | `RemoteCompactionV2` | `remote_compaction_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:290][E: codex-rs/features/src/lib.rs:1490][E: codex-rs/features/src/lib.rs:1491][E: codex-rs/features/src/lib.rs:1492] |
| 112 | `RetainClientDeveloperMessages` | `retain_client_developer_messages` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:292][E: codex-rs/features/src/lib.rs:1496][E: codex-rs/features/src/lib.rs:1497][E: codex-rs/features/src/lib.rs:1498] |
| 113 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:294][E: codex-rs/features/src/lib.rs:1502][E: codex-rs/features/src/lib.rs:1503][E: codex-rs/features/src/lib.rs:1504] |
| 114 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:296][E: codex-rs/features/src/lib.rs:1508][E: codex-rs/features/src/lib.rs:1509][E: codex-rs/features/src/lib.rs:1510] |

## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
