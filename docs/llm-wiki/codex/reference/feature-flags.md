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
updated: 121f91fd5d
---

> 本页是 `FEATURES` registry 的全量 catalog：当前共 140 条 `FeatureSpec`，与 `Feature` enum 变体一一对应。[E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:900] macOS/Linux/Windows 上是 Stable 43、UnderDevelopment 56、Experimental 3、Deprecated 3、Removed 35；其它平台是 Stable 43、UnderDevelopment 57、Experimental 2、Deprecated 3、Removed 35。差异来自 `PreventIdleSleep` 的条件 stage。[E: codex-rs/features/src/lib.rs:1234][E: codex-rs/features/src/lib.rs:1297][E: codex-rs/features/src/lib.rs:1698][E: codex-rs/features/src/lib.rs:1712]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?

## 职责边界

本页只维护可 grep 的 registry 快照，不重复解释 feature runtime 机制；关于 `Stage`、`Features`、`FeaturesToml`、legacy keys、合并顺序、dependency normalization、metrics 与 warning，请读 `subsys.config-auth.features-system`。

相对 `a9519cbcdd` 的 133 条 registry，本轮净增 7 条到 140，无 key 从 registry 删除。新增 key：`unified_exec_tty`、`windows_sandbox_service`、`worktrees`、`mcp_oauth_refresh_coordination`、`guardianv2.thread_context`、`context_management`、`reasoning_effort_override`。[E: codex-rs/features/src/lib.rs:983][E: codex-rs/features/src/lib.rs:1210][E: codex-rs/features/src/lib.rs:1244][E: codex-rs/features/src/lib.rs:1367][E: codex-rs/features/src/lib.rs:1631][E: codex-rs/features/src/lib.rs:1679][E: codex-rs/features/src/lib.rs:1691]

`unified_exec_tty` 是 Stable / 默认开启。`worktrees` 与 `network_proxy` 同为 Experimental / 默认关闭；`prevent_idle_sleep` 仍按平台切 Experimental / UnderDevelopment。[E: codex-rs/features/src/lib.rs:984][E: codex-rs/features/src/lib.rs:948][E: codex-rs/features/src/lib.rs:1235][E: codex-rs/features/src/lib.rs:1298][E: codex-rs/features/src/lib.rs:1699]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `TranscriptV2` | `transcript_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:933][E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:935][E: codex-rs/features/src/lib.rs:936] |
| 2 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:378][E: codex-rs/features/src/lib.rs:940][E: codex-rs/features/src/lib.rs:941][E: codex-rs/features/src/lib.rs:942][E: codex-rs/features/src/lib.rs:912] |
| 3 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:98][E: codex-rs/features/src/lib.rs:952][E: codex-rs/features/src/lib.rs:953][E: codex-rs/features/src/lib.rs:954][E: codex-rs/features/src/lib.rs:918] |
| 4 | `ViewImage` | `view_image` | Stable | `true` | [E: codex-rs/features/src/lib.rs:100][E: codex-rs/features/src/lib.rs:958][E: codex-rs/features/src/lib.rs:959][E: codex-rs/features/src/lib.rs:960][E: codex-rs/features/src/lib.rs:924] |
| 5 | `SleepTool` | `sleep_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:964][E: codex-rs/features/src/lib.rs:965][E: codex-rs/features/src/lib.rs:966][E: codex-rs/features/src/lib.rs:930] |
| 6 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:970][E: codex-rs/features/src/lib.rs:971][E: codex-rs/features/src/lib.rs:972][E: codex-rs/features/src/lib.rs:936] |
| 7 | `UnifiedExec` | `unified_exec` | Stable | `true` | [E: codex-rs/features/src/lib.rs:126][E: codex-rs/features/src/lib.rs:976][E: codex-rs/features/src/lib.rs:977][E: codex-rs/features/src/lib.rs:978][E: codex-rs/features/src/lib.rs:942] |
| 8 | `UnifiedExecTty` | `unified_exec_tty` | Stable | `true` | [E: codex-rs/features/src/lib.rs:128][E: codex-rs/features/src/lib.rs:982][E: codex-rs/features/src/lib.rs:946][E: codex-rs/features/src/lib.rs:947][E: codex-rs/features/src/lib.rs:948] |
| 9 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:130][E: codex-rs/features/src/lib.rs:988][E: codex-rs/features/src/lib.rs:989][E: codex-rs/features/src/lib.rs:990][E: codex-rs/features/src/lib.rs:954] |
| 10 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | Removed | `true` | [E: codex-rs/features/src/lib.rs:995][E: codex-rs/features/src/lib.rs:996][E: codex-rs/features/src/lib.rs:960] |
| 11 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1001][E: codex-rs/features/src/lib.rs:1002][E: codex-rs/features/src/lib.rs:966] |
| 12 | `PowerShellShellVersion` | `powershell_shell_version` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1007][E: codex-rs/features/src/lib.rs:1008][E: codex-rs/features/src/lib.rs:972] |
| 13 | `ShellSnapshotV2` | `shell_snapshot_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1013][E: codex-rs/features/src/lib.rs:1014][E: codex-rs/features/src/lib.rs:978] |
| 14 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1019][E: codex-rs/features/src/lib.rs:1020][E: codex-rs/features/src/lib.rs:984] |
| 15 | `CwdRelativeTurnDiffs` | `cwd_relative_turn_diffs` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1025][E: codex-rs/features/src/lib.rs:1026][E: codex-rs/features/src/lib.rs:990] |
| 16 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1031][E: codex-rs/features/src/lib.rs:1032][E: codex-rs/features/src/lib.rs:996] |
| 17 | `ContentItemKinds` | `content_item_kinds` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1037][E: codex-rs/features/src/lib.rs:1038][E: codex-rs/features/src/lib.rs:1002] |
| 18 | `ExecutedToolCallMetadata` | `executed_tool_call_metadata` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1043][E: codex-rs/features/src/lib.rs:1044][E: codex-rs/features/src/lib.rs:1008] |
| 19 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1049][E: codex-rs/features/src/lib.rs:1050][E: codex-rs/features/src/lib.rs:1014] |
| 20 | `CodeModeBufferedExec` | `code_mode_buffered_exec` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1055][E: codex-rs/features/src/lib.rs:1056][E: codex-rs/features/src/lib.rs:1020] |
| 21 | `CodeModeHost` | `code_mode_host` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1061][E: codex-rs/features/src/lib.rs:1062][E: codex-rs/features/src/lib.rs:1026] |
| 22 | `CodeModePrewarm` | `code_mode_prewarm` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1067][E: codex-rs/features/src/lib.rs:1068][E: codex-rs/features/src/lib.rs:1032] |
| 23 | `CodeModeInterrupt` | `code_mode_interrupt` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1073][E: codex-rs/features/src/lib.rs:1074][E: codex-rs/features/src/lib.rs:1038] |
| 24 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1079][E: codex-rs/features/src/lib.rs:1080][E: codex-rs/features/src/lib.rs:1044] |
| 25 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1085][E: codex-rs/features/src/lib.rs:1086][E: codex-rs/features/src/lib.rs:1050] |
| 26 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:1091][E: codex-rs/features/src/lib.rs:1092][E: codex-rs/features/src/lib.rs:1056] |
| 27 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:1097][E: codex-rs/features/src/lib.rs:1098][E: codex-rs/features/src/lib.rs:1062] |
| 28 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:1103][E: codex-rs/features/src/lib.rs:1104][E: codex-rs/features/src/lib.rs:1068] |
| 29 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1109][E: codex-rs/features/src/lib.rs:1110][E: codex-rs/features/src/lib.rs:1074] |
| 30 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1115][E: codex-rs/features/src/lib.rs:1116][E: codex-rs/features/src/lib.rs:1080] |
| 31 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1133][E: codex-rs/features/src/lib.rs:1122][E: codex-rs/features/src/lib.rs:1086] |
| 32 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1127][E: codex-rs/features/src/lib.rs:1128][E: codex-rs/features/src/lib.rs:1092] |
| 33 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:1133][E: codex-rs/features/src/lib.rs:1134][E: codex-rs/features/src/lib.rs:1098] |
| 34 | `MemoryTool` | `memories` | Stable | `false` | [E: codex-rs/features/src/lib.rs:1139][E: codex-rs/features/src/lib.rs:1140][E: codex-rs/features/src/lib.rs:1104] |
| 35 | `ExternalAgentMemoryImport` | `external_agent_memory_import` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1145][E: codex-rs/features/src/lib.rs:1146][E: codex-rs/features/src/lib.rs:1110] |
| 36 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1151][E: codex-rs/features/src/lib.rs:1152][E: codex-rs/features/src/lib.rs:1116] |
| 37 | `LocalThreadStoreSharedCompression` | `local_thread_store_shared_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1157][E: codex-rs/features/src/lib.rs:1158][E: codex-rs/features/src/lib.rs:1122] |
| 38 | `BackgroundPaginatedRolloutMigration` | `background_paginated_rollout_migration` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1163][E: codex-rs/features/src/lib.rs:1164][E: codex-rs/features/src/lib.rs:1128] |
| 39 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1169][E: codex-rs/features/src/lib.rs:1170][E: codex-rs/features/src/lib.rs:1134] |
| 40 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1175][E: codex-rs/features/src/lib.rs:1176][E: codex-rs/features/src/lib.rs:1140] |
| 41 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1181][E: codex-rs/features/src/lib.rs:1182][E: codex-rs/features/src/lib.rs:1146] |
| 42 | `ApplyPatchPreserveLineEndings` | `apply_patch_preserve_line_endings` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1187][E: codex-rs/features/src/lib.rs:1188][E: codex-rs/features/src/lib.rs:1152] |
| 43 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1193][E: codex-rs/features/src/lib.rs:1194][E: codex-rs/features/src/lib.rs:1158] |
| 44 | `WriteStdinApproval` | `write_stdin_approval` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1199][E: codex-rs/features/src/lib.rs:1200][E: codex-rs/features/src/lib.rs:1164] |
| 45 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1205][E: codex-rs/features/src/lib.rs:1206][E: codex-rs/features/src/lib.rs:1170] |
| 46 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1217][E: codex-rs/features/src/lib.rs:1218][E: codex-rs/features/src/lib.rs:1176] |
| 47 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1223][E: codex-rs/features/src/lib.rs:1224][E: codex-rs/features/src/lib.rs:1182] |
| 48 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:1229][E: codex-rs/features/src/lib.rs:1230][E: codex-rs/features/src/lib.rs:1188] |
| 49 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1235][E: codex-rs/features/src/lib.rs:1193][E: codex-rs/features/src/lib.rs:1194] |
| 50 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1198][E: codex-rs/features/src/lib.rs:1199][E: codex-rs/features/src/lib.rs:1253] |
| 51 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1204][E: codex-rs/features/src/lib.rs:1205][E: codex-rs/features/src/lib.rs:1259] |
| 52 | `WindowsSandboxService` | `windows_sandbox_service` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1210][E: codex-rs/features/src/lib.rs:1211][E: codex-rs/features/src/lib.rs:1265] |
| 53 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1216][E: codex-rs/features/src/lib.rs:1217][E: codex-rs/features/src/lib.rs:1271] |
| 54 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1222][E: codex-rs/features/src/lib.rs:1223][E: codex-rs/features/src/lib.rs:1277] |
| 55 | `UnboundedConnectionRetries` | `unbounded_connection_retries` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1228][E: codex-rs/features/src/lib.rs:1229][E: codex-rs/features/src/lib.rs:1283] |
| 56 | `NetworkProxy` | `network_proxy` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:1234][E: codex-rs/features/src/lib.rs:1235][E: codex-rs/features/src/lib.rs:1240] |
| 57 | `Worktrees` | `worktrees` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:1244][E: codex-rs/features/src/lib.rs:1245][E: codex-rs/features/src/lib.rs:1303] |
| 58 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1313][E: codex-rs/features/src/lib.rs:1314][E: codex-rs/features/src/lib.rs:1315] |
| 59 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1319][E: codex-rs/features/src/lib.rs:1320][E: codex-rs/features/src/lib.rs:1321] |
| 60 | `MultiAgentV2` | `multi_agent_v2` | Stable | `false` | [E: codex-rs/features/src/lib.rs:1325][E: codex-rs/features/src/lib.rs:1326][E: codex-rs/features/src/lib.rs:1327] |
| 61 | `MultiAgentMode` | `multi_agent_mode` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1331][E: codex-rs/features/src/lib.rs:1332][E: codex-rs/features/src/lib.rs:1333] |
| 62 | `SpawnCsv` | `enable_fanout` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1337][E: codex-rs/features/src/lib.rs:1338][E: codex-rs/features/src/lib.rs:1339] |
| 63 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1343][E: codex-rs/features/src/lib.rs:1344][E: codex-rs/features/src/lib.rs:1345] |
| 64 | `Psp` | `psp` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1349][E: codex-rs/features/src/lib.rs:1350][E: codex-rs/features/src/lib.rs:1351] |
| 65 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1355][E: codex-rs/features/src/lib.rs:1356][E: codex-rs/features/src/lib.rs:1357] |
| 66 | `Mcp20260728` | `mcp_2026_07_28` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1361][E: codex-rs/features/src/lib.rs:1362][E: codex-rs/features/src/lib.rs:1363] |
| 67 | `McpOAuthRefreshCoordination` | `mcp_oauth_refresh_coordination` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1308][E: codex-rs/features/src/lib.rs:1368][E: codex-rs/features/src/lib.rs:1369] |
| 68 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1373][E: codex-rs/features/src/lib.rs:1374][E: codex-rs/features/src/lib.rs:1375] |
| 69 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1379][E: codex-rs/features/src/lib.rs:1380][E: codex-rs/features/src/lib.rs:1381] |
| 70 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:1385][E: codex-rs/features/src/lib.rs:1386][E: codex-rs/features/src/lib.rs:1387] |
| 71 | `DeferredToolWorldState` | `deferred_tool_world_state` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1391][E: codex-rs/features/src/lib.rs:1392][E: codex-rs/features/src/lib.rs:1393] |
| 72 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1397][E: codex-rs/features/src/lib.rs:1398][E: codex-rs/features/src/lib.rs:1399] |
| 73 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1403][E: codex-rs/features/src/lib.rs:1404][E: codex-rs/features/src/lib.rs:1405] |
| 74 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1409][E: codex-rs/features/src/lib.rs:1410][E: codex-rs/features/src/lib.rs:1411] |
| 75 | `RecommendedPlugins` | `recommended_plugins` | Stable | `false` | [E: codex-rs/features/src/lib.rs:1415][E: codex-rs/features/src/lib.rs:1416][E: codex-rs/features/src/lib.rs:1417] |
| 76 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1421][E: codex-rs/features/src/lib.rs:1422][E: codex-rs/features/src/lib.rs:1423] |
| 77 | `ExecutorCapabilityDiscovery` | `executor_capability_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1427][E: codex-rs/features/src/lib.rs:1428][E: codex-rs/features/src/lib.rs:1429] |
| 78 | `SkipHostSkillDiscovery` | `skip_host_skill_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1433][E: codex-rs/features/src/lib.rs:1434][E: codex-rs/features/src/lib.rs:1435] |
| 79 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1439][E: codex-rs/features/src/lib.rs:1440][E: codex-rs/features/src/lib.rs:1441] |
| 80 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1445][E: codex-rs/features/src/lib.rs:1446][E: codex-rs/features/src/lib.rs:1447] |
| 81 | `InAppChat` | `in_app_chat` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1451][E: codex-rs/features/src/lib.rs:1452][E: codex-rs/features/src/lib.rs:1453] |
| 82 | `InAppDictation` | `in_app_dictation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1457][E: codex-rs/features/src/lib.rs:1458][E: codex-rs/features/src/lib.rs:1459] |
| 83 | `InAppLocalAutomation` | `in_app_local_automation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1463][E: codex-rs/features/src/lib.rs:1464][E: codex-rs/features/src/lib.rs:1465] |
| 84 | `InAppUpdates` | `in_app_updates` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1469][E: codex-rs/features/src/lib.rs:1470][E: codex-rs/features/src/lib.rs:1471] |
| 85 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1475][E: codex-rs/features/src/lib.rs:1476][E: codex-rs/features/src/lib.rs:1477] |
| 86 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1481][E: codex-rs/features/src/lib.rs:1482][E: codex-rs/features/src/lib.rs:1483] |
| 87 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1487][E: codex-rs/features/src/lib.rs:1488][E: codex-rs/features/src/lib.rs:1489] |
| 88 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1493][E: codex-rs/features/src/lib.rs:1494][E: codex-rs/features/src/lib.rs:1495] |
| 89 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1499][E: codex-rs/features/src/lib.rs:1500][E: codex-rs/features/src/lib.rs:1501] |
| 90 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1505][E: codex-rs/features/src/lib.rs:1506][E: codex-rs/features/src/lib.rs:1507] |
| 91 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1511][E: codex-rs/features/src/lib.rs:1512][E: codex-rs/features/src/lib.rs:1513] |
| 92 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1517][E: codex-rs/features/src/lib.rs:1518][E: codex-rs/features/src/lib.rs:1519] |
| 93 | `OmitAppServerNotificationMedia` | `omit_app_server_notification_media` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1523][E: codex-rs/features/src/lib.rs:1524][E: codex-rs/features/src/lib.rs:1525] |
| 94 | `ImageResizeNotice` | `image_resize_notice` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1529][E: codex-rs/features/src/lib.rs:1530][E: codex-rs/features/src/lib.rs:1531] |
| 95 | `UnifiedImageBudget` | `unified_image_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1535][E: codex-rs/features/src/lib.rs:1536][E: codex-rs/features/src/lib.rs:1537] |
| 96 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:1541][E: codex-rs/features/src/lib.rs:1542][E: codex-rs/features/src/lib.rs:1543] |
| 97 | `ItemIds` | `item_ids` | Removed | `true` | [E: codex-rs/features/src/lib.rs:1547][E: codex-rs/features/src/lib.rs:1548][E: codex-rs/features/src/lib.rs:1549] |
| 98 | `ConcurrentReasoningSummaries` | `concurrent_reasoning_summaries` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1559][E: codex-rs/features/src/lib.rs:1560][E: codex-rs/features/src/lib.rs:1561] |
| 99 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1565][E: codex-rs/features/src/lib.rs:1566][E: codex-rs/features/src/lib.rs:1567] |
| 100 | `SkillSearch` | `skill_search` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1571][E: codex-rs/features/src/lib.rs:1572][E: codex-rs/features/src/lib.rs:1573] |
| 101 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1577][E: codex-rs/features/src/lib.rs:1578][E: codex-rs/features/src/lib.rs:1579] |
| 102 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1583][E: codex-rs/features/src/lib.rs:1584][E: codex-rs/features/src/lib.rs:1585] |
| 103 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:1589][E: codex-rs/features/src/lib.rs:1590][E: codex-rs/features/src/lib.rs:1591] |
| 104 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1595][E: codex-rs/features/src/lib.rs:1596][E: codex-rs/features/src/lib.rs:1597] |
| 105 | `SendAsyncMessage` | `send_async_message` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1607][E: codex-rs/features/src/lib.rs:1608][E: codex-rs/features/src/lib.rs:1609] |
| 106 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1619][E: codex-rs/features/src/lib.rs:1620][E: codex-rs/features/src/lib.rs:1621] |
| 107 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1625][E: codex-rs/features/src/lib.rs:1626][E: codex-rs/features/src/lib.rs:1627] |
| 108 | `GuardianThreadContext` | `guardianv2.thread_context` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1554][E: codex-rs/features/src/lib.rs:1632][E: codex-rs/features/src/lib.rs:1633] |
| 109 | `GuardianReuseParentCompaction` | `guardian_reuse_parent_compaction` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1637][E: codex-rs/features/src/lib.rs:1638][E: codex-rs/features/src/lib.rs:1639] |
| 110 | `GuardianEnhancedNodeReplTranscripts` | `guardian_enhanced_node_repl_transcripts` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1643][E: codex-rs/features/src/lib.rs:1644][E: codex-rs/features/src/lib.rs:1645] |
| 111 | `GuardianNodeReplTranscriptImages` | `guardian_node_repl_transcript_images` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1649][E: codex-rs/features/src/lib.rs:1650][E: codex-rs/features/src/lib.rs:1651] |
| 112 | `GuardianV2` | `guardianv2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1655][E: codex-rs/features/src/lib.rs:1656][E: codex-rs/features/src/lib.rs:1657] |
| 113 | `GuardianExt` | `guardian_ext` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1661][E: codex-rs/features/src/lib.rs:1662][E: codex-rs/features/src/lib.rs:1663] |
| 114 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1667][E: codex-rs/features/src/lib.rs:1668][E: codex-rs/features/src/lib.rs:1669] |
| 115 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1673][E: codex-rs/features/src/lib.rs:1674][E: codex-rs/features/src/lib.rs:1621] |
| 116 | `ContextManagement` | `context_management` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1602][E: codex-rs/features/src/lib.rs:1680][E: codex-rs/features/src/lib.rs:1681] |
| 117 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1685][E: codex-rs/features/src/lib.rs:1686][E: codex-rs/features/src/lib.rs:1687] |
| 118 | `ReasoningEffortOverride` | `reasoning_effort_override` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1614][E: codex-rs/features/src/lib.rs:1692][E: codex-rs/features/src/lib.rs:1693] |
| 119 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1697][E: codex-rs/features/src/lib.rs:1698][E: codex-rs/features/src/lib.rs:1699] |
| 120 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:1703][E: codex-rs/features/src/lib.rs:1627][E: codex-rs/features/src/lib.rs:1628] |
| 121 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1632][E: codex-rs/features/src/lib.rs:1710][E: codex-rs/features/src/lib.rs:1634] |
| 122 | `AuthElicitation` | `auth_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1715][E: codex-rs/features/src/lib.rs:1716][E: codex-rs/features/src/lib.rs:1717] |
| 123 | `BedrockSetupWizard` | `bedrock_setup_wizard` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1721][E: codex-rs/features/src/lib.rs:1722][E: codex-rs/features/src/lib.rs:1723] |
| 124 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1727][E: codex-rs/features/src/lib.rs:1728][E: codex-rs/features/src/lib.rs:1729] |
| 125 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1733][E: codex-rs/features/src/lib.rs:1734][E: codex-rs/features/src/lib.rs:1735] |
| 126 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1739][E: codex-rs/features/src/lib.rs:1740][E: codex-rs/features/src/lib.rs:1741] |
| 127 | `StepModelSwitching` | `step_model_switching` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1745][E: codex-rs/features/src/lib.rs:1746][E: codex-rs/features/src/lib.rs:1747] |
| 128 | `RealtimeConversation` | `realtime_conversation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1751][E: codex-rs/features/src/lib.rs:1752][E: codex-rs/features/src/lib.rs:1753] |
| 129 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1757][E: codex-rs/features/src/lib.rs:1758][E: codex-rs/features/src/lib.rs:1759] |
| 130 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1686][E: codex-rs/features/src/lib.rs:1687][E: codex-rs/features/src/lib.rs:1688] |
| 131 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:1692][E: codex-rs/features/src/lib.rs:1693][E: codex-rs/features/src/lib.rs:1694] |
| 132 | `PreventIdleSleep` | `prevent_idle_sleep` | Experimental (macOS/Linux/Windows) / UnderDevelopment (else) | `false` | [E: codex-rs/features/src/lib.rs:1698][E: codex-rs/features/src/lib.rs:1699][E: codex-rs/features/src/lib.rs:1712] |
| 133 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1716][E: codex-rs/features/src/lib.rs:1717][E: codex-rs/features/src/lib.rs:1718] |
| 134 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1722][E: codex-rs/features/src/lib.rs:1723][E: codex-rs/features/src/lib.rs:1724] |
| 135 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:1728][E: codex-rs/features/src/lib.rs:1729][E: codex-rs/features/src/lib.rs:1730] |
| 136 | `RemoteCompactionV2` | `remote_compaction_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1734][E: codex-rs/features/src/lib.rs:1735][E: codex-rs/features/src/lib.rs:1736] |
| 137 | `CompactionImageBudget` | `compaction_image_budget` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1740][E: codex-rs/features/src/lib.rs:1741][E: codex-rs/features/src/lib.rs:1742] |
| 138 | `RetainClientDeveloperMessages` | `retain_client_developer_messages` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1746][E: codex-rs/features/src/lib.rs:1747][E: codex-rs/features/src/lib.rs:1748] |
| 139 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:1752][E: codex-rs/features/src/lib.rs:1753][E: codex-rs/features/src/lib.rs:1754] |
| 140 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:1758][E: codex-rs/features/src/lib.rs:1759][E: codex-rs/features/src/lib.rs:1760] |

## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
