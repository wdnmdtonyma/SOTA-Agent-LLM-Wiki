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
updated: 3abbf9fe2c
---

> 本页是 `FEATURES` registry 的全量 catalog：当前共 **144** 条 `FeatureSpec`，与 `Feature` enum 变体一一对应。[E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:908] macOS/Linux/Windows 上是 Stable 44、UnderDevelopment 58、Experimental 2、Deprecated 3、Removed 37；其它平台是 Stable 44、UnderDevelopment 59、Experimental 1、Deprecated 3、Removed 37。差异来自 `PreventIdleSleep` 的条件 stage。[E: codex-rs/features/src/lib.rs:1727][E: codex-rs/features/src/lib.rs:1732][E: codex-rs/features/src/lib.rs:1738][E: codex-rs/features/src/lib.rs:1740]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?

## 职责边界

本页只维护可 grep 的 registry 快照，不重复解释 feature runtime 机制；关于 `Stage`、`Features`、`FeaturesToml`、legacy keys、合并顺序、dependency normalization、metrics 与 warning，请读 `subsys.config-auth.features-system`。

相对上一轮 verified 的 142 条 registry，本轮净增 2 条到 144，无 key 从 registry 删除。新增 key：`use_xaa`（enterprise refresh-token / XAA）与 `send_message_to_user_async`；两者都是 UnderDevelopment、默认关闭。[E: codex-rs/features/src/lib.rs:219][E: codex-rs/features/src/lib.rs:1330][E: codex-rs/features/src/lib.rs:1331][E: codex-rs/features/src/lib.rs:1332][E: codex-rs/features/src/lib.rs:311][E: codex-rs/features/src/lib.rs:1564][E: codex-rs/features/src/lib.rs:1565][E: codex-rs/features/src/lib.rs:1566]

`unified_exec_tty` 仍是 Stable / 默认开启。`worktrees` 现为 Stable / 默认开启。`network_proxy` 仍是 Experimental / 默认关闭。`realtime_conversation` 现为 Stable / 默认开启。`prevent_idle_sleep` 仍按平台切 Experimental / UnderDevelopment。[E: codex-rs/features/src/lib.rs:954][E: codex-rs/features/src/lib.rs:955][E: codex-rs/features/src/lib.rs:956][E: codex-rs/features/src/lib.rs:1258][E: codex-rs/features/src/lib.rs:1259][E: codex-rs/features/src/lib.rs:1260][E: codex-rs/features/src/lib.rs:1248][E: codex-rs/features/src/lib.rs:1249][E: codex-rs/features/src/lib.rs:1254][E: codex-rs/features/src/lib.rs:1702][E: codex-rs/features/src/lib.rs:1703][E: codex-rs/features/src/lib.rs:1704][E: codex-rs/features/src/lib.rs:1727][E: codex-rs/features/src/lib.rs:1740]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `TranscriptV2` | `transcript_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:97][E: codex-rs/features/src/lib.rs:911][E: codex-rs/features/src/lib.rs:912][E: codex-rs/features/src/lib.rs:913] |
| 2 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:371][E: codex-rs/features/src/lib.rs:918][E: codex-rs/features/src/lib.rs:919][E: codex-rs/features/src/lib.rs:920] |
| 3 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:100][E: codex-rs/features/src/lib.rs:924][E: codex-rs/features/src/lib.rs:925][E: codex-rs/features/src/lib.rs:926] |
| 4 | `ViewImage` | `view_image` | Stable | `true` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:930][E: codex-rs/features/src/lib.rs:931][E: codex-rs/features/src/lib.rs:932] |
| 5 | `SleepTool` | `sleep_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:104][E: codex-rs/features/src/lib.rs:936][E: codex-rs/features/src/lib.rs:937][E: codex-rs/features/src/lib.rs:938] |
| 6 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:942][E: codex-rs/features/src/lib.rs:943][E: codex-rs/features/src/lib.rs:944] |
| 7 | `UnifiedExec` | `unified_exec` | Stable | `true` | [E: codex-rs/features/src/lib.rs:128][E: codex-rs/features/src/lib.rs:948][E: codex-rs/features/src/lib.rs:949][E: codex-rs/features/src/lib.rs:950] |
| 8 | `UnifiedExecTty` | `unified_exec_tty` | Stable | `true` | [E: codex-rs/features/src/lib.rs:130][E: codex-rs/features/src/lib.rs:954][E: codex-rs/features/src/lib.rs:955][E: codex-rs/features/src/lib.rs:956] |
| 9 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:132][E: codex-rs/features/src/lib.rs:960][E: codex-rs/features/src/lib.rs:961][E: codex-rs/features/src/lib.rs:962] |
| 10 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | Removed | `true` | [E: codex-rs/features/src/lib.rs:138][E: codex-rs/features/src/lib.rs:966][E: codex-rs/features/src/lib.rs:967][E: codex-rs/features/src/lib.rs:968] |
| 11 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:972][E: codex-rs/features/src/lib.rs:973][E: codex-rs/features/src/lib.rs:974] |
| 12 | `PowerShellShellVersion` | `powershell_shell_version` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:978][E: codex-rs/features/src/lib.rs:979][E: codex-rs/features/src/lib.rs:980] |
| 13 | `ShellSnapshotV2` | `shell_snapshot_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:984][E: codex-rs/features/src/lib.rs:985][E: codex-rs/features/src/lib.rs:986] |
| 14 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:170][E: codex-rs/features/src/lib.rs:990][E: codex-rs/features/src/lib.rs:991][E: codex-rs/features/src/lib.rs:992] |
| 15 | `CwdRelativeTurnDiffs` | `cwd_relative_turn_diffs` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:172][E: codex-rs/features/src/lib.rs:996][E: codex-rs/features/src/lib.rs:997][E: codex-rs/features/src/lib.rs:998] |
| 16 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:373][E: codex-rs/features/src/lib.rs:1002][E: codex-rs/features/src/lib.rs:1003][E: codex-rs/features/src/lib.rs:1004] |
| 17 | `ContentItemKinds` | `content_item_kinds` | Stable | `true` | [E: codex-rs/features/src/lib.rs:112][E: codex-rs/features/src/lib.rs:1008][E: codex-rs/features/src/lib.rs:1009][E: codex-rs/features/src/lib.rs:1010] |
| 18 | `ExecutedToolCallMetadata` | `executed_tool_call_metadata` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:1014][E: codex-rs/features/src/lib.rs:1015][E: codex-rs/features/src/lib.rs:1016] |
| 19 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/features/src/lib.rs:1020][E: codex-rs/features/src/lib.rs:1021][E: codex-rs/features/src/lib.rs:1022] |
| 20 | `CodeModeBufferedExec` | `code_mode_buffered_exec` | Removed | `false` | [E: codex-rs/features/src/lib.rs:118][E: codex-rs/features/src/lib.rs:1026][E: codex-rs/features/src/lib.rs:1027][E: codex-rs/features/src/lib.rs:1028] |
| 21 | `CodeModeHost` | `code_mode_host` | Stable | `true` | [E: codex-rs/features/src/lib.rs:120][E: codex-rs/features/src/lib.rs:1032][E: codex-rs/features/src/lib.rs:1033][E: codex-rs/features/src/lib.rs:1034] |
| 22 | `CodeModePrewarm` | `code_mode_prewarm` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:122][E: codex-rs/features/src/lib.rs:1038][E: codex-rs/features/src/lib.rs:1039][E: codex-rs/features/src/lib.rs:1040] |
| 23 | `CodeModeInterrupt` | `code_mode_interrupt` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:124][E: codex-rs/features/src/lib.rs:1044][E: codex-rs/features/src/lib.rs:1045][E: codex-rs/features/src/lib.rs:1046] |
| 24 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:126][E: codex-rs/features/src/lib.rs:1050][E: codex-rs/features/src/lib.rs:1051][E: codex-rs/features/src/lib.rs:1052] |
| 25 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:375][E: codex-rs/features/src/lib.rs:1056][E: codex-rs/features/src/lib.rs:1057][E: codex-rs/features/src/lib.rs:1058] |
| 26 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:140][E: codex-rs/features/src/lib.rs:1062][E: codex-rs/features/src/lib.rs:1063][E: codex-rs/features/src/lib.rs:1064] |
| 27 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:1068][E: codex-rs/features/src/lib.rs:1069][E: codex-rs/features/src/lib.rs:1070] |
| 28 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:157][E: codex-rs/features/src/lib.rs:1074][E: codex-rs/features/src/lib.rs:1075][E: codex-rs/features/src/lib.rs:1076] |
| 29 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:159][E: codex-rs/features/src/lib.rs:1080][E: codex-rs/features/src/lib.rs:1081][E: codex-rs/features/src/lib.rs:1082] |
| 30 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:377][E: codex-rs/features/src/lib.rs:1086][E: codex-rs/features/src/lib.rs:1087][E: codex-rs/features/src/lib.rs:1088] |
| 31 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:392][E: codex-rs/features/src/lib.rs:1092][E: codex-rs/features/src/lib.rs:1093][E: codex-rs/features/src/lib.rs:1094] |
| 32 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:174][E: codex-rs/features/src/lib.rs:1098][E: codex-rs/features/src/lib.rs:1099][E: codex-rs/features/src/lib.rs:1100] |
| 33 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:394][E: codex-rs/features/src/lib.rs:1104][E: codex-rs/features/src/lib.rs:1105][E: codex-rs/features/src/lib.rs:1106] |
| 34 | `MemoryTool` | `memories` | Stable | `false` | [E: codex-rs/features/src/lib.rs:176][E: codex-rs/features/src/lib.rs:1110][E: codex-rs/features/src/lib.rs:1111][E: codex-rs/features/src/lib.rs:1112] |
| 35 | `ExternalAgentMemoryImport` | `external_agent_memory_import` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:178][E: codex-rs/features/src/lib.rs:1116][E: codex-rs/features/src/lib.rs:1117][E: codex-rs/features/src/lib.rs:1118] |
| 36 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:181][E: codex-rs/features/src/lib.rs:1122][E: codex-rs/features/src/lib.rs:1123][E: codex-rs/features/src/lib.rs:1124] |
| 37 | `LocalThreadStoreSharedCompression` | `local_thread_store_shared_compression` | Removed | `false` | [E: codex-rs/features/src/lib.rs:183][E: codex-rs/features/src/lib.rs:1128][E: codex-rs/features/src/lib.rs:1129][E: codex-rs/features/src/lib.rs:1130] |
| 38 | `BackgroundPaginatedRolloutMigration` | `background_paginated_rollout_migration` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:185][E: codex-rs/features/src/lib.rs:1134][E: codex-rs/features/src/lib.rs:1135][E: codex-rs/features/src/lib.rs:1136] |
| 39 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:187][E: codex-rs/features/src/lib.rs:1140][E: codex-rs/features/src/lib.rs:1141][E: codex-rs/features/src/lib.rs:1142] |
| 40 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:396][E: codex-rs/features/src/lib.rs:1146][E: codex-rs/features/src/lib.rs:1147][E: codex-rs/features/src/lib.rs:1148] |
| 41 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:1152][E: codex-rs/features/src/lib.rs:1153][E: codex-rs/features/src/lib.rs:1154] |
| 42 | `ApplyPatchPreserveLineEndings` | `apply_patch_preserve_line_endings` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:1158][E: codex-rs/features/src/lib.rs:1159][E: codex-rs/features/src/lib.rs:1160] |
| 43 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:1164][E: codex-rs/features/src/lib.rs:1165][E: codex-rs/features/src/lib.rs:1166] |
| 44 | `WriteStdinApproval` | `write_stdin_approval` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:1170][E: codex-rs/features/src/lib.rs:1171][E: codex-rs/features/src/lib.rs:1172] |
| 45 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:1176][E: codex-rs/features/src/lib.rs:1177][E: codex-rs/features/src/lib.rs:1178] |
| 46 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:1182][E: codex-rs/features/src/lib.rs:1183][E: codex-rs/features/src/lib.rs:1184] |
| 47 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:380][E: codex-rs/features/src/lib.rs:1188][E: codex-rs/features/src/lib.rs:1189][E: codex-rs/features/src/lib.rs:1190] |
| 48 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1194][E: codex-rs/features/src/lib.rs:1195][E: codex-rs/features/src/lib.rs:1196] |
| 49 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:382][E: codex-rs/features/src/lib.rs:1200][E: codex-rs/features/src/lib.rs:1201][E: codex-rs/features/src/lib.rs:1202] |
| 50 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:384][E: codex-rs/features/src/lib.rs:1206][E: codex-rs/features/src/lib.rs:1207][E: codex-rs/features/src/lib.rs:1208] |
| 51 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:386][E: codex-rs/features/src/lib.rs:1212][E: codex-rs/features/src/lib.rs:1213][E: codex-rs/features/src/lib.rs:1214] |
| 52 | `WindowsSandboxService` | `windows_sandbox_service` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:388][E: codex-rs/features/src/lib.rs:1218][E: codex-rs/features/src/lib.rs:1219][E: codex-rs/features/src/lib.rs:1220] |
| 53 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:390][E: codex-rs/features/src/lib.rs:1224][E: codex-rs/features/src/lib.rs:1225][E: codex-rs/features/src/lib.rs:1226] |
| 54 | `ApiKeyModelDiscovery` | `api_key_model_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:1230][E: codex-rs/features/src/lib.rs:1231][E: codex-rs/features/src/lib.rs:1232] |
| 55 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:189][E: codex-rs/features/src/lib.rs:1236][E: codex-rs/features/src/lib.rs:1237][E: codex-rs/features/src/lib.rs:1238] |
| 56 | `UnboundedConnectionRetries` | `unbounded_connection_retries` | Stable | `true` | [E: codex-rs/features/src/lib.rs:191][E: codex-rs/features/src/lib.rs:1242][E: codex-rs/features/src/lib.rs:1243][E: codex-rs/features/src/lib.rs:1244] |
| 57 | `NetworkProxy` | `network_proxy` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:193][E: codex-rs/features/src/lib.rs:1248][E: codex-rs/features/src/lib.rs:1249][E: codex-rs/features/src/lib.rs:1254] |
| 58 | `Worktrees` | `worktrees` | Stable | `true` | [E: codex-rs/features/src/lib.rs:195][E: codex-rs/features/src/lib.rs:1258][E: codex-rs/features/src/lib.rs:1259][E: codex-rs/features/src/lib.rs:1260] |
| 59 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:197][E: codex-rs/features/src/lib.rs:1264][E: codex-rs/features/src/lib.rs:1265][E: codex-rs/features/src/lib.rs:1266] |
| 60 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:199][E: codex-rs/features/src/lib.rs:1270][E: codex-rs/features/src/lib.rs:1271][E: codex-rs/features/src/lib.rs:1272] |
| 61 | `MultiAgentV2` | `multi_agent_v2` | Stable | `false` | [E: codex-rs/features/src/lib.rs:201][E: codex-rs/features/src/lib.rs:1276][E: codex-rs/features/src/lib.rs:1277][E: codex-rs/features/src/lib.rs:1278] |
| 62 | `MultiAgentMode` | `multi_agent_mode` | Removed | `false` | [E: codex-rs/features/src/lib.rs:203][E: codex-rs/features/src/lib.rs:1282][E: codex-rs/features/src/lib.rs:1283][E: codex-rs/features/src/lib.rs:1284] |
| 63 | `SpawnCsv` | `enable_fanout` | Removed | `false` | [E: codex-rs/features/src/lib.rs:205][E: codex-rs/features/src/lib.rs:1288][E: codex-rs/features/src/lib.rs:1289][E: codex-rs/features/src/lib.rs:1290] |
| 64 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:207][E: codex-rs/features/src/lib.rs:1294][E: codex-rs/features/src/lib.rs:1295][E: codex-rs/features/src/lib.rs:1296] |
| 65 | `Psp` | `psp` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:209][E: codex-rs/features/src/lib.rs:1300][E: codex-rs/features/src/lib.rs:1301][E: codex-rs/features/src/lib.rs:1302] |
| 66 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:211][E: codex-rs/features/src/lib.rs:1306][E: codex-rs/features/src/lib.rs:1307][E: codex-rs/features/src/lib.rs:1308] |
| 67 | `Mcp20260728` | `mcp_2026_07_28` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:213][E: codex-rs/features/src/lib.rs:1312][E: codex-rs/features/src/lib.rs:1313][E: codex-rs/features/src/lib.rs:1314] |
| 68 | `CodexAppsMcp20260728` | `codex_apps_mcp_2026_07_28` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:215][E: codex-rs/features/src/lib.rs:1318][E: codex-rs/features/src/lib.rs:1319][E: codex-rs/features/src/lib.rs:1320] |
| 69 | `McpOAuthRefreshCoordination` | `mcp_oauth_refresh_coordination` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:217][E: codex-rs/features/src/lib.rs:1324][E: codex-rs/features/src/lib.rs:1325][E: codex-rs/features/src/lib.rs:1326] |
| 70 | `UseXaa` | `use_xaa` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:219][E: codex-rs/features/src/lib.rs:1330][E: codex-rs/features/src/lib.rs:1331][E: codex-rs/features/src/lib.rs:1332] |
| 71 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:221][E: codex-rs/features/src/lib.rs:1336][E: codex-rs/features/src/lib.rs:1337][E: codex-rs/features/src/lib.rs:1338] |
| 72 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:223][E: codex-rs/features/src/lib.rs:1342][E: codex-rs/features/src/lib.rs:1343][E: codex-rs/features/src/lib.rs:1344] |
| 73 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:225][E: codex-rs/features/src/lib.rs:1348][E: codex-rs/features/src/lib.rs:1349][E: codex-rs/features/src/lib.rs:1350] |
| 74 | `DeferredToolWorldState` | `deferred_tool_world_state` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:227][E: codex-rs/features/src/lib.rs:1354][E: codex-rs/features/src/lib.rs:1355][E: codex-rs/features/src/lib.rs:1356] |
| 75 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:229][E: codex-rs/features/src/lib.rs:1360][E: codex-rs/features/src/lib.rs:1361][E: codex-rs/features/src/lib.rs:1362] |
| 76 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:398][E: codex-rs/features/src/lib.rs:1366][E: codex-rs/features/src/lib.rs:1367][E: codex-rs/features/src/lib.rs:1368] |
| 77 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:231][E: codex-rs/features/src/lib.rs:1372][E: codex-rs/features/src/lib.rs:1373][E: codex-rs/features/src/lib.rs:1374] |
| 78 | `RecommendedPlugins` | `recommended_plugins` | Stable | `false` | [E: codex-rs/features/src/lib.rs:233][E: codex-rs/features/src/lib.rs:1378][E: codex-rs/features/src/lib.rs:1379][E: codex-rs/features/src/lib.rs:1380] |
| 79 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:235][E: codex-rs/features/src/lib.rs:1384][E: codex-rs/features/src/lib.rs:1385][E: codex-rs/features/src/lib.rs:1386] |
| 80 | `ExecutorCapabilityDiscovery` | `executor_capability_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:237][E: codex-rs/features/src/lib.rs:1390][E: codex-rs/features/src/lib.rs:1391][E: codex-rs/features/src/lib.rs:1392] |
| 81 | `SkipHostSkillDiscovery` | `skip_host_skill_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:239][E: codex-rs/features/src/lib.rs:1396][E: codex-rs/features/src/lib.rs:1397][E: codex-rs/features/src/lib.rs:1398] |
| 82 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:241][E: codex-rs/features/src/lib.rs:1402][E: codex-rs/features/src/lib.rs:1403][E: codex-rs/features/src/lib.rs:1404] |
| 83 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:245][E: codex-rs/features/src/lib.rs:1408][E: codex-rs/features/src/lib.rs:1409][E: codex-rs/features/src/lib.rs:1410] |
| 84 | `InAppChat` | `in_app_chat` | Stable | `true` | [E: codex-rs/features/src/lib.rs:249][E: codex-rs/features/src/lib.rs:1414][E: codex-rs/features/src/lib.rs:1415][E: codex-rs/features/src/lib.rs:1416] |
| 85 | `InAppDictation` | `in_app_dictation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:253][E: codex-rs/features/src/lib.rs:1420][E: codex-rs/features/src/lib.rs:1421][E: codex-rs/features/src/lib.rs:1422] |
| 86 | `InAppLocalAutomation` | `in_app_local_automation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:257][E: codex-rs/features/src/lib.rs:1426][E: codex-rs/features/src/lib.rs:1427][E: codex-rs/features/src/lib.rs:1428] |
| 87 | `InAppUpdates` | `in_app_updates` | Stable | `true` | [E: codex-rs/features/src/lib.rs:261][E: codex-rs/features/src/lib.rs:1432][E: codex-rs/features/src/lib.rs:1433][E: codex-rs/features/src/lib.rs:1434] |
| 88 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:265][E: codex-rs/features/src/lib.rs:1438][E: codex-rs/features/src/lib.rs:1439][E: codex-rs/features/src/lib.rs:1440] |
| 89 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:269][E: codex-rs/features/src/lib.rs:1444][E: codex-rs/features/src/lib.rs:1445][E: codex-rs/features/src/lib.rs:1446] |
| 90 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:273][E: codex-rs/features/src/lib.rs:1450][E: codex-rs/features/src/lib.rs:1451][E: codex-rs/features/src/lib.rs:1452] |
| 91 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:277][E: codex-rs/features/src/lib.rs:1456][E: codex-rs/features/src/lib.rs:1457][E: codex-rs/features/src/lib.rs:1458] |
| 92 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:279][E: codex-rs/features/src/lib.rs:1462][E: codex-rs/features/src/lib.rs:1463][E: codex-rs/features/src/lib.rs:1464] |
| 93 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:281][E: codex-rs/features/src/lib.rs:1468][E: codex-rs/features/src/lib.rs:1469][E: codex-rs/features/src/lib.rs:1470] |
| 94 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:283][E: codex-rs/features/src/lib.rs:1474][E: codex-rs/features/src/lib.rs:1475][E: codex-rs/features/src/lib.rs:1476] |
| 95 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:285][E: codex-rs/features/src/lib.rs:1480][E: codex-rs/features/src/lib.rs:1481][E: codex-rs/features/src/lib.rs:1482] |
| 96 | `OmitAppServerNotificationMedia` | `omit_app_server_notification_media` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:287][E: codex-rs/features/src/lib.rs:1486][E: codex-rs/features/src/lib.rs:1487][E: codex-rs/features/src/lib.rs:1488] |
| 97 | `ImageResizeNotice` | `image_resize_notice` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:289][E: codex-rs/features/src/lib.rs:1492][E: codex-rs/features/src/lib.rs:1493][E: codex-rs/features/src/lib.rs:1494] |
| 98 | `UnifiedImageBudget` | `unified_image_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:291][E: codex-rs/features/src/lib.rs:1498][E: codex-rs/features/src/lib.rs:1499][E: codex-rs/features/src/lib.rs:1500] |
| 99 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:293][E: codex-rs/features/src/lib.rs:1504][E: codex-rs/features/src/lib.rs:1505][E: codex-rs/features/src/lib.rs:1506] |
| 100 | `ItemIds` | `item_ids` | Removed | `true` | [E: codex-rs/features/src/lib.rs:295][E: codex-rs/features/src/lib.rs:1510][E: codex-rs/features/src/lib.rs:1511][E: codex-rs/features/src/lib.rs:1512] |
| 101 | `ConcurrentReasoningSummaries` | `concurrent_reasoning_summaries` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:297][E: codex-rs/features/src/lib.rs:1516][E: codex-rs/features/src/lib.rs:1517][E: codex-rs/features/src/lib.rs:1518] |
| 102 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:299][E: codex-rs/features/src/lib.rs:1522][E: codex-rs/features/src/lib.rs:1523][E: codex-rs/features/src/lib.rs:1524] |
| 103 | `SkillSearch` | `skill_search` | Stable | `true` | [E: codex-rs/features/src/lib.rs:301][E: codex-rs/features/src/lib.rs:1528][E: codex-rs/features/src/lib.rs:1529][E: codex-rs/features/src/lib.rs:1530] |
| 104 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:303][E: codex-rs/features/src/lib.rs:1534][E: codex-rs/features/src/lib.rs:1535][E: codex-rs/features/src/lib.rs:1536] |
| 105 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:305][E: codex-rs/features/src/lib.rs:1540][E: codex-rs/features/src/lib.rs:1541][E: codex-rs/features/src/lib.rs:1542] |
| 106 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:401][E: codex-rs/features/src/lib.rs:1546][E: codex-rs/features/src/lib.rs:1547][E: codex-rs/features/src/lib.rs:1548] |
| 107 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:307][E: codex-rs/features/src/lib.rs:1552][E: codex-rs/features/src/lib.rs:1553][E: codex-rs/features/src/lib.rs:1554] |
| 108 | `SendAsyncMessage` | `send_async_message` | Removed | `false` | [E: codex-rs/features/src/lib.rs:309][E: codex-rs/features/src/lib.rs:1558][E: codex-rs/features/src/lib.rs:1559][E: codex-rs/features/src/lib.rs:1560] |
| 109 | `SendMessageToUserAsync` | `send_message_to_user_async` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:311][E: codex-rs/features/src/lib.rs:1564][E: codex-rs/features/src/lib.rs:1565][E: codex-rs/features/src/lib.rs:1566] |
| 110 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:142][E: codex-rs/features/src/lib.rs:1570][E: codex-rs/features/src/lib.rs:1571][E: codex-rs/features/src/lib.rs:1572] |
| 111 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:313][E: codex-rs/features/src/lib.rs:1576][E: codex-rs/features/src/lib.rs:1577][E: codex-rs/features/src/lib.rs:1578] |
| 112 | `GuardianThreadContext` | `guardianv2.thread_context` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:316][E: codex-rs/features/src/lib.rs:1582][E: codex-rs/features/src/lib.rs:1583][E: codex-rs/features/src/lib.rs:1584] |
| 113 | `GuardianReuseParentCompaction` | `guardian_reuse_parent_compaction` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:318][E: codex-rs/features/src/lib.rs:1588][E: codex-rs/features/src/lib.rs:1589][E: codex-rs/features/src/lib.rs:1590] |
| 114 | `GuardianEnhancedNodeReplTranscripts` | `guardian_enhanced_node_repl_transcripts` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:320][E: codex-rs/features/src/lib.rs:1594][E: codex-rs/features/src/lib.rs:1595][E: codex-rs/features/src/lib.rs:1596] |
| 115 | `GuardianNodeReplTranscriptImages` | `guardian_node_repl_transcript_images` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:322][E: codex-rs/features/src/lib.rs:1600][E: codex-rs/features/src/lib.rs:1601][E: codex-rs/features/src/lib.rs:1602] |
| 116 | `GuardianV2` | `guardianv2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:324][E: codex-rs/features/src/lib.rs:1606][E: codex-rs/features/src/lib.rs:1607][E: codex-rs/features/src/lib.rs:1608] |
| 117 | `GuardianExt` | `guardian_ext` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:326][E: codex-rs/features/src/lib.rs:1612][E: codex-rs/features/src/lib.rs:1613][E: codex-rs/features/src/lib.rs:1614] |
| 118 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:328][E: codex-rs/features/src/lib.rs:1618][E: codex-rs/features/src/lib.rs:1619][E: codex-rs/features/src/lib.rs:1620] |
| 119 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:330][E: codex-rs/features/src/lib.rs:1624][E: codex-rs/features/src/lib.rs:1625][E: codex-rs/features/src/lib.rs:1626] |
| 120 | `ContextManagement` | `context_management` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:332][E: codex-rs/features/src/lib.rs:1630][E: codex-rs/features/src/lib.rs:1631][E: codex-rs/features/src/lib.rs:1632] |
| 121 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:334][E: codex-rs/features/src/lib.rs:1636][E: codex-rs/features/src/lib.rs:1637][E: codex-rs/features/src/lib.rs:1638] |
| 122 | `ReasoningEffortOverride` | `reasoning_effort_override` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:336][E: codex-rs/features/src/lib.rs:1642][E: codex-rs/features/src/lib.rs:1643][E: codex-rs/features/src/lib.rs:1644] |
| 123 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:338][E: codex-rs/features/src/lib.rs:1648][E: codex-rs/features/src/lib.rs:1649][E: codex-rs/features/src/lib.rs:1650] |
| 124 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:404][E: codex-rs/features/src/lib.rs:1654][E: codex-rs/features/src/lib.rs:1655][E: codex-rs/features/src/lib.rs:1656] |
| 125 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:340][E: codex-rs/features/src/lib.rs:1660][E: codex-rs/features/src/lib.rs:1661][E: codex-rs/features/src/lib.rs:1662] |
| 126 | `AuthElicitation` | `auth_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:342][E: codex-rs/features/src/lib.rs:1666][E: codex-rs/features/src/lib.rs:1667][E: codex-rs/features/src/lib.rs:1668] |
| 127 | `BedrockSetupWizard` | `bedrock_setup_wizard` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:1672][E: codex-rs/features/src/lib.rs:1673][E: codex-rs/features/src/lib.rs:1674] |
| 128 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:1678][E: codex-rs/features/src/lib.rs:1679][E: codex-rs/features/src/lib.rs:1680] |
| 129 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:348][E: codex-rs/features/src/lib.rs:1684][E: codex-rs/features/src/lib.rs:1685][E: codex-rs/features/src/lib.rs:1686] |
| 130 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:350][E: codex-rs/features/src/lib.rs:1690][E: codex-rs/features/src/lib.rs:1691][E: codex-rs/features/src/lib.rs:1692] |
| 131 | `StepModelSwitching` | `step_model_switching` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:352][E: codex-rs/features/src/lib.rs:1696][E: codex-rs/features/src/lib.rs:1697][E: codex-rs/features/src/lib.rs:1698] |
| 132 | `RealtimeConversation` | `realtime_conversation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:354][E: codex-rs/features/src/lib.rs:1702][E: codex-rs/features/src/lib.rs:1703][E: codex-rs/features/src/lib.rs:1704] |
| 133 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:406][E: codex-rs/features/src/lib.rs:1708][E: codex-rs/features/src/lib.rs:1709][E: codex-rs/features/src/lib.rs:1710] |
| 134 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:409][E: codex-rs/features/src/lib.rs:1714][E: codex-rs/features/src/lib.rs:1715][E: codex-rs/features/src/lib.rs:1716] |
| 135 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:411][E: codex-rs/features/src/lib.rs:1720][E: codex-rs/features/src/lib.rs:1721][E: codex-rs/features/src/lib.rs:1722] |
| 136 | `PreventIdleSleep` | `prevent_idle_sleep` | Experimental (macOS/Linux/Windows) / UnderDevelopment (else) | `false` | [E: codex-rs/features/src/lib.rs:356][E: codex-rs/features/src/lib.rs:1725][E: codex-rs/features/src/lib.rs:1727][E: codex-rs/features/src/lib.rs:1738][E: codex-rs/features/src/lib.rs:1740] |
| 137 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:414][E: codex-rs/features/src/lib.rs:1744][E: codex-rs/features/src/lib.rs:1745][E: codex-rs/features/src/lib.rs:1746] |
| 138 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:416][E: codex-rs/features/src/lib.rs:1750][E: codex-rs/features/src/lib.rs:1751][E: codex-rs/features/src/lib.rs:1752] |
| 139 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:418][E: codex-rs/features/src/lib.rs:1756][E: codex-rs/features/src/lib.rs:1757][E: codex-rs/features/src/lib.rs:1758] |
| 140 | `RemoteCompactionV2` | `remote_compaction_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:358][E: codex-rs/features/src/lib.rs:1762][E: codex-rs/features/src/lib.rs:1763][E: codex-rs/features/src/lib.rs:1764] |
| 141 | `CompactionImageBudget` | `compaction_image_budget` | Stable | `true` | [E: codex-rs/features/src/lib.rs:360][E: codex-rs/features/src/lib.rs:1768][E: codex-rs/features/src/lib.rs:1769][E: codex-rs/features/src/lib.rs:1770] |
| 142 | `RetainClientDeveloperMessages` | `retain_client_developer_messages` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:362][E: codex-rs/features/src/lib.rs:1774][E: codex-rs/features/src/lib.rs:1775][E: codex-rs/features/src/lib.rs:1776] |
| 143 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:364][E: codex-rs/features/src/lib.rs:1780][E: codex-rs/features/src/lib.rs:1781][E: codex-rs/features/src/lib.rs:1782] |
| 144 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:366][E: codex-rs/features/src/lib.rs:1786][E: codex-rs/features/src/lib.rs:1787][E: codex-rs/features/src/lib.rs:1788] |

## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
