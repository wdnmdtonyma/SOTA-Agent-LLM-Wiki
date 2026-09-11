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
updated: 02a8f038b8
---

> 本页是 `FEATURES` registry 的全量 catalog：当前共 **142** 条 `FeatureSpec`，与 `Feature` enum 变体一一对应。[E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:904] macOS/Linux/Windows 上是 Stable 42、UnderDevelopment 56、Experimental 4、Deprecated 3、Removed 37；其它平台是 Stable 42、UnderDevelopment 57、Experimental 3、Deprecated 3、Removed 37。差异来自 `PreventIdleSleep` 的条件 stage。[E: codex-rs/features/src/lib.rs:1719][E: codex-rs/features/src/lib.rs:1724][E: codex-rs/features/src/lib.rs:1730][E: codex-rs/features/src/lib.rs:1732]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?

## 职责边界

本页只维护可 grep 的 registry 快照，不重复解释 feature runtime 机制；关于 `Stage`、`Features`、`FeaturesToml`、legacy keys、合并顺序、dependency normalization、metrics 与 warning，请读 `subsys.config-auth.features-system`。

相对上一轮 verified `121f91fd5d` 的 140 条 registry，本轮净增 2 条到 142，无 key 从 registry 删除。新增 key：`api_key_model_discovery`（OpenAI API key 的 opt-in model discovery）与 `codex_apps_mcp_2026_07_28`；两者都是 UnderDevelopment、默认关闭。[E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:1226][E: codex-rs/features/src/lib.rs:1227][E: codex-rs/features/src/lib.rs:1228][E: codex-rs/features/src/lib.rs:215][E: codex-rs/features/src/lib.rs:1318][E: codex-rs/features/src/lib.rs:1319][E: codex-rs/features/src/lib.rs:1320]

同轮 stage 变化：`local_thread_store_shared_compression` 与 `remote_compaction_v2` 现为 Removed；`realtime_conversation` 现为 Experimental（Voice conversations）。[E: codex-rs/features/src/lib.rs:1125][E: codex-rs/features/src/lib.rs:1126][E: codex-rs/features/src/lib.rs:1754][E: codex-rs/features/src/lib.rs:1755][E: codex-rs/features/src/lib.rs:1690][E: codex-rs/features/src/lib.rs:1691]

`unified_exec_tty` 仍是 Stable / 默认开启。`worktrees` 与 `network_proxy` 仍是 Experimental / 默认关闭；`prevent_idle_sleep` 仍按平台切 Experimental / UnderDevelopment。[E: codex-rs/features/src/lib.rs:950][E: codex-rs/features/src/lib.rs:951][E: codex-rs/features/src/lib.rs:952][E: codex-rs/features/src/lib.rs:1244][E: codex-rs/features/src/lib.rs:1245][E: codex-rs/features/src/lib.rs:1254][E: codex-rs/features/src/lib.rs:1260][E: codex-rs/features/src/lib.rs:1719][E: codex-rs/features/src/lib.rs:1732]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `TranscriptV2` | `transcript_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:97][E: codex-rs/features/src/lib.rs:907][E: codex-rs/features/src/lib.rs:908][E: codex-rs/features/src/lib.rs:909] |
| 2 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:367][E: codex-rs/features/src/lib.rs:914][E: codex-rs/features/src/lib.rs:915][E: codex-rs/features/src/lib.rs:916] |
| 3 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:100][E: codex-rs/features/src/lib.rs:920][E: codex-rs/features/src/lib.rs:921][E: codex-rs/features/src/lib.rs:922] |
| 4 | `ViewImage` | `view_image` | Stable | `true` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:926][E: codex-rs/features/src/lib.rs:927][E: codex-rs/features/src/lib.rs:928] |
| 5 | `SleepTool` | `sleep_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:104][E: codex-rs/features/src/lib.rs:932][E: codex-rs/features/src/lib.rs:933][E: codex-rs/features/src/lib.rs:934] |
| 6 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:938][E: codex-rs/features/src/lib.rs:939][E: codex-rs/features/src/lib.rs:940] |
| 7 | `UnifiedExec` | `unified_exec` | Stable | `true` | [E: codex-rs/features/src/lib.rs:128][E: codex-rs/features/src/lib.rs:944][E: codex-rs/features/src/lib.rs:945][E: codex-rs/features/src/lib.rs:946] |
| 8 | `UnifiedExecTty` | `unified_exec_tty` | Stable | `true` | [E: codex-rs/features/src/lib.rs:130][E: codex-rs/features/src/lib.rs:950][E: codex-rs/features/src/lib.rs:951][E: codex-rs/features/src/lib.rs:952] |
| 9 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:132][E: codex-rs/features/src/lib.rs:956][E: codex-rs/features/src/lib.rs:957][E: codex-rs/features/src/lib.rs:958] |
| 10 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | Removed | `true` | [E: codex-rs/features/src/lib.rs:138][E: codex-rs/features/src/lib.rs:962][E: codex-rs/features/src/lib.rs:963][E: codex-rs/features/src/lib.rs:964] |
| 11 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:968][E: codex-rs/features/src/lib.rs:969][E: codex-rs/features/src/lib.rs:970] |
| 12 | `PowerShellShellVersion` | `powershell_shell_version` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:974][E: codex-rs/features/src/lib.rs:975][E: codex-rs/features/src/lib.rs:976] |
| 13 | `ShellSnapshotV2` | `shell_snapshot_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:980][E: codex-rs/features/src/lib.rs:981][E: codex-rs/features/src/lib.rs:982] |
| 14 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:170][E: codex-rs/features/src/lib.rs:986][E: codex-rs/features/src/lib.rs:987][E: codex-rs/features/src/lib.rs:988] |
| 15 | `CwdRelativeTurnDiffs` | `cwd_relative_turn_diffs` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:172][E: codex-rs/features/src/lib.rs:992][E: codex-rs/features/src/lib.rs:993][E: codex-rs/features/src/lib.rs:994] |
| 16 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:369][E: codex-rs/features/src/lib.rs:998][E: codex-rs/features/src/lib.rs:999][E: codex-rs/features/src/lib.rs:1000] |
| 17 | `ContentItemKinds` | `content_item_kinds` | Stable | `true` | [E: codex-rs/features/src/lib.rs:112][E: codex-rs/features/src/lib.rs:1004][E: codex-rs/features/src/lib.rs:1005][E: codex-rs/features/src/lib.rs:1006] |
| 18 | `ExecutedToolCallMetadata` | `executed_tool_call_metadata` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:1010][E: codex-rs/features/src/lib.rs:1011][E: codex-rs/features/src/lib.rs:1012] |
| 19 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/features/src/lib.rs:1016][E: codex-rs/features/src/lib.rs:1017][E: codex-rs/features/src/lib.rs:1018] |
| 20 | `CodeModeBufferedExec` | `code_mode_buffered_exec` | Removed | `false` | [E: codex-rs/features/src/lib.rs:118][E: codex-rs/features/src/lib.rs:1022][E: codex-rs/features/src/lib.rs:1023][E: codex-rs/features/src/lib.rs:1024] |
| 21 | `CodeModeHost` | `code_mode_host` | Stable | `true` | [E: codex-rs/features/src/lib.rs:120][E: codex-rs/features/src/lib.rs:1028][E: codex-rs/features/src/lib.rs:1029][E: codex-rs/features/src/lib.rs:1030] |
| 22 | `CodeModePrewarm` | `code_mode_prewarm` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:122][E: codex-rs/features/src/lib.rs:1034][E: codex-rs/features/src/lib.rs:1035][E: codex-rs/features/src/lib.rs:1036] |
| 23 | `CodeModeInterrupt` | `code_mode_interrupt` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:124][E: codex-rs/features/src/lib.rs:1040][E: codex-rs/features/src/lib.rs:1041][E: codex-rs/features/src/lib.rs:1042] |
| 24 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:126][E: codex-rs/features/src/lib.rs:1046][E: codex-rs/features/src/lib.rs:1047][E: codex-rs/features/src/lib.rs:1048] |
| 25 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:371][E: codex-rs/features/src/lib.rs:1052][E: codex-rs/features/src/lib.rs:1053][E: codex-rs/features/src/lib.rs:1054] |
| 26 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:140][E: codex-rs/features/src/lib.rs:1058][E: codex-rs/features/src/lib.rs:1059][E: codex-rs/features/src/lib.rs:1060] |
| 27 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:1064][E: codex-rs/features/src/lib.rs:1065][E: codex-rs/features/src/lib.rs:1066] |
| 28 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:157][E: codex-rs/features/src/lib.rs:1070][E: codex-rs/features/src/lib.rs:1071][E: codex-rs/features/src/lib.rs:1072] |
| 29 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:159][E: codex-rs/features/src/lib.rs:1076][E: codex-rs/features/src/lib.rs:1077][E: codex-rs/features/src/lib.rs:1078] |
| 30 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:373][E: codex-rs/features/src/lib.rs:1082][E: codex-rs/features/src/lib.rs:1083][E: codex-rs/features/src/lib.rs:1084] |
| 31 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:388][E: codex-rs/features/src/lib.rs:1088][E: codex-rs/features/src/lib.rs:1089][E: codex-rs/features/src/lib.rs:1090] |
| 32 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:174][E: codex-rs/features/src/lib.rs:1094][E: codex-rs/features/src/lib.rs:1095][E: codex-rs/features/src/lib.rs:1096] |
| 33 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:390][E: codex-rs/features/src/lib.rs:1100][E: codex-rs/features/src/lib.rs:1101][E: codex-rs/features/src/lib.rs:1102] |
| 34 | `MemoryTool` | `memories` | Stable | `false` | [E: codex-rs/features/src/lib.rs:176][E: codex-rs/features/src/lib.rs:1106][E: codex-rs/features/src/lib.rs:1107][E: codex-rs/features/src/lib.rs:1108] |
| 35 | `ExternalAgentMemoryImport` | `external_agent_memory_import` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:178][E: codex-rs/features/src/lib.rs:1112][E: codex-rs/features/src/lib.rs:1113][E: codex-rs/features/src/lib.rs:1114] |
| 36 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:181][E: codex-rs/features/src/lib.rs:1118][E: codex-rs/features/src/lib.rs:1119][E: codex-rs/features/src/lib.rs:1120] |
| 37 | `LocalThreadStoreSharedCompression` | `local_thread_store_shared_compression` | Removed | `false` | [E: codex-rs/features/src/lib.rs:183][E: codex-rs/features/src/lib.rs:1124][E: codex-rs/features/src/lib.rs:1125][E: codex-rs/features/src/lib.rs:1126] |
| 38 | `BackgroundPaginatedRolloutMigration` | `background_paginated_rollout_migration` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:185][E: codex-rs/features/src/lib.rs:1130][E: codex-rs/features/src/lib.rs:1131][E: codex-rs/features/src/lib.rs:1132] |
| 39 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:187][E: codex-rs/features/src/lib.rs:1136][E: codex-rs/features/src/lib.rs:1137][E: codex-rs/features/src/lib.rs:1138] |
| 40 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:392][E: codex-rs/features/src/lib.rs:1142][E: codex-rs/features/src/lib.rs:1143][E: codex-rs/features/src/lib.rs:1144] |
| 41 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:1148][E: codex-rs/features/src/lib.rs:1149][E: codex-rs/features/src/lib.rs:1150] |
| 42 | `ApplyPatchPreserveLineEndings` | `apply_patch_preserve_line_endings` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:1154][E: codex-rs/features/src/lib.rs:1155][E: codex-rs/features/src/lib.rs:1156] |
| 43 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:1160][E: codex-rs/features/src/lib.rs:1161][E: codex-rs/features/src/lib.rs:1162] |
| 44 | `WriteStdinApproval` | `write_stdin_approval` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:1166][E: codex-rs/features/src/lib.rs:1167][E: codex-rs/features/src/lib.rs:1168] |
| 45 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:1172][E: codex-rs/features/src/lib.rs:1173][E: codex-rs/features/src/lib.rs:1174] |
| 46 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:1178][E: codex-rs/features/src/lib.rs:1179][E: codex-rs/features/src/lib.rs:1180] |
| 47 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:376][E: codex-rs/features/src/lib.rs:1184][E: codex-rs/features/src/lib.rs:1185][E: codex-rs/features/src/lib.rs:1186] |
| 48 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1190][E: codex-rs/features/src/lib.rs:1191][E: codex-rs/features/src/lib.rs:1192] |
| 49 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:378][E: codex-rs/features/src/lib.rs:1196][E: codex-rs/features/src/lib.rs:1197][E: codex-rs/features/src/lib.rs:1198] |
| 50 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:380][E: codex-rs/features/src/lib.rs:1202][E: codex-rs/features/src/lib.rs:1203][E: codex-rs/features/src/lib.rs:1204] |
| 51 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:382][E: codex-rs/features/src/lib.rs:1208][E: codex-rs/features/src/lib.rs:1209][E: codex-rs/features/src/lib.rs:1210] |
| 52 | `WindowsSandboxService` | `windows_sandbox_service` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:384][E: codex-rs/features/src/lib.rs:1214][E: codex-rs/features/src/lib.rs:1215][E: codex-rs/features/src/lib.rs:1216] |
| 53 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:386][E: codex-rs/features/src/lib.rs:1220][E: codex-rs/features/src/lib.rs:1221][E: codex-rs/features/src/lib.rs:1222] |
| 54 | `ApiKeyModelDiscovery` | `api_key_model_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:1226][E: codex-rs/features/src/lib.rs:1227][E: codex-rs/features/src/lib.rs:1228] |
| 55 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:189][E: codex-rs/features/src/lib.rs:1232][E: codex-rs/features/src/lib.rs:1233][E: codex-rs/features/src/lib.rs:1234] |
| 56 | `UnboundedConnectionRetries` | `unbounded_connection_retries` | Stable | `true` | [E: codex-rs/features/src/lib.rs:191][E: codex-rs/features/src/lib.rs:1238][E: codex-rs/features/src/lib.rs:1239][E: codex-rs/features/src/lib.rs:1240] |
| 57 | `NetworkProxy` | `network_proxy` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:193][E: codex-rs/features/src/lib.rs:1244][E: codex-rs/features/src/lib.rs:1245][E: codex-rs/features/src/lib.rs:1250] |
| 58 | `Worktrees` | `worktrees` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:195][E: codex-rs/features/src/lib.rs:1254][E: codex-rs/features/src/lib.rs:1255][E: codex-rs/features/src/lib.rs:1260] |
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
| 70 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:219][E: codex-rs/features/src/lib.rs:1330][E: codex-rs/features/src/lib.rs:1331][E: codex-rs/features/src/lib.rs:1332] |
| 71 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:221][E: codex-rs/features/src/lib.rs:1336][E: codex-rs/features/src/lib.rs:1337][E: codex-rs/features/src/lib.rs:1338] |
| 72 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:223][E: codex-rs/features/src/lib.rs:1342][E: codex-rs/features/src/lib.rs:1343][E: codex-rs/features/src/lib.rs:1344] |
| 73 | `DeferredToolWorldState` | `deferred_tool_world_state` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:225][E: codex-rs/features/src/lib.rs:1348][E: codex-rs/features/src/lib.rs:1349][E: codex-rs/features/src/lib.rs:1350] |
| 74 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:227][E: codex-rs/features/src/lib.rs:1354][E: codex-rs/features/src/lib.rs:1355][E: codex-rs/features/src/lib.rs:1356] |
| 75 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:394][E: codex-rs/features/src/lib.rs:1360][E: codex-rs/features/src/lib.rs:1361][E: codex-rs/features/src/lib.rs:1362] |
| 76 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:229][E: codex-rs/features/src/lib.rs:1366][E: codex-rs/features/src/lib.rs:1367][E: codex-rs/features/src/lib.rs:1368] |
| 77 | `RecommendedPlugins` | `recommended_plugins` | Stable | `false` | [E: codex-rs/features/src/lib.rs:231][E: codex-rs/features/src/lib.rs:1372][E: codex-rs/features/src/lib.rs:1373][E: codex-rs/features/src/lib.rs:1374] |
| 78 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:233][E: codex-rs/features/src/lib.rs:1378][E: codex-rs/features/src/lib.rs:1379][E: codex-rs/features/src/lib.rs:1380] |
| 79 | `ExecutorCapabilityDiscovery` | `executor_capability_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:235][E: codex-rs/features/src/lib.rs:1384][E: codex-rs/features/src/lib.rs:1385][E: codex-rs/features/src/lib.rs:1386] |
| 80 | `SkipHostSkillDiscovery` | `skip_host_skill_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:237][E: codex-rs/features/src/lib.rs:1390][E: codex-rs/features/src/lib.rs:1391][E: codex-rs/features/src/lib.rs:1392] |
| 81 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:239][E: codex-rs/features/src/lib.rs:1396][E: codex-rs/features/src/lib.rs:1397][E: codex-rs/features/src/lib.rs:1398] |
| 82 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:243][E: codex-rs/features/src/lib.rs:1402][E: codex-rs/features/src/lib.rs:1403][E: codex-rs/features/src/lib.rs:1404] |
| 83 | `InAppChat` | `in_app_chat` | Stable | `true` | [E: codex-rs/features/src/lib.rs:247][E: codex-rs/features/src/lib.rs:1408][E: codex-rs/features/src/lib.rs:1409][E: codex-rs/features/src/lib.rs:1410] |
| 84 | `InAppDictation` | `in_app_dictation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:251][E: codex-rs/features/src/lib.rs:1414][E: codex-rs/features/src/lib.rs:1415][E: codex-rs/features/src/lib.rs:1416] |
| 85 | `InAppLocalAutomation` | `in_app_local_automation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:255][E: codex-rs/features/src/lib.rs:1420][E: codex-rs/features/src/lib.rs:1421][E: codex-rs/features/src/lib.rs:1422] |
| 86 | `InAppUpdates` | `in_app_updates` | Stable | `true` | [E: codex-rs/features/src/lib.rs:259][E: codex-rs/features/src/lib.rs:1426][E: codex-rs/features/src/lib.rs:1427][E: codex-rs/features/src/lib.rs:1428] |
| 87 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:263][E: codex-rs/features/src/lib.rs:1432][E: codex-rs/features/src/lib.rs:1433][E: codex-rs/features/src/lib.rs:1434] |
| 88 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:267][E: codex-rs/features/src/lib.rs:1438][E: codex-rs/features/src/lib.rs:1439][E: codex-rs/features/src/lib.rs:1440] |
| 89 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:271][E: codex-rs/features/src/lib.rs:1444][E: codex-rs/features/src/lib.rs:1445][E: codex-rs/features/src/lib.rs:1446] |
| 90 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:275][E: codex-rs/features/src/lib.rs:1450][E: codex-rs/features/src/lib.rs:1451][E: codex-rs/features/src/lib.rs:1452] |
| 91 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:277][E: codex-rs/features/src/lib.rs:1456][E: codex-rs/features/src/lib.rs:1457][E: codex-rs/features/src/lib.rs:1458] |
| 92 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:279][E: codex-rs/features/src/lib.rs:1462][E: codex-rs/features/src/lib.rs:1463][E: codex-rs/features/src/lib.rs:1464] |
| 93 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:281][E: codex-rs/features/src/lib.rs:1468][E: codex-rs/features/src/lib.rs:1469][E: codex-rs/features/src/lib.rs:1470] |
| 94 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:283][E: codex-rs/features/src/lib.rs:1474][E: codex-rs/features/src/lib.rs:1475][E: codex-rs/features/src/lib.rs:1476] |
| 95 | `OmitAppServerNotificationMedia` | `omit_app_server_notification_media` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:285][E: codex-rs/features/src/lib.rs:1480][E: codex-rs/features/src/lib.rs:1481][E: codex-rs/features/src/lib.rs:1482] |
| 96 | `ImageResizeNotice` | `image_resize_notice` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:287][E: codex-rs/features/src/lib.rs:1486][E: codex-rs/features/src/lib.rs:1487][E: codex-rs/features/src/lib.rs:1488] |
| 97 | `UnifiedImageBudget` | `unified_image_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:289][E: codex-rs/features/src/lib.rs:1492][E: codex-rs/features/src/lib.rs:1493][E: codex-rs/features/src/lib.rs:1494] |
| 98 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:291][E: codex-rs/features/src/lib.rs:1498][E: codex-rs/features/src/lib.rs:1499][E: codex-rs/features/src/lib.rs:1500] |
| 99 | `ItemIds` | `item_ids` | Removed | `true` | [E: codex-rs/features/src/lib.rs:293][E: codex-rs/features/src/lib.rs:1504][E: codex-rs/features/src/lib.rs:1505][E: codex-rs/features/src/lib.rs:1506] |
| 100 | `ConcurrentReasoningSummaries` | `concurrent_reasoning_summaries` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:295][E: codex-rs/features/src/lib.rs:1510][E: codex-rs/features/src/lib.rs:1511][E: codex-rs/features/src/lib.rs:1512] |
| 101 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:297][E: codex-rs/features/src/lib.rs:1516][E: codex-rs/features/src/lib.rs:1517][E: codex-rs/features/src/lib.rs:1518] |
| 102 | `SkillSearch` | `skill_search` | Stable | `true` | [E: codex-rs/features/src/lib.rs:299][E: codex-rs/features/src/lib.rs:1522][E: codex-rs/features/src/lib.rs:1523][E: codex-rs/features/src/lib.rs:1524] |
| 103 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:301][E: codex-rs/features/src/lib.rs:1528][E: codex-rs/features/src/lib.rs:1529][E: codex-rs/features/src/lib.rs:1530] |
| 104 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:303][E: codex-rs/features/src/lib.rs:1534][E: codex-rs/features/src/lib.rs:1535][E: codex-rs/features/src/lib.rs:1536] |
| 105 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:397][E: codex-rs/features/src/lib.rs:1540][E: codex-rs/features/src/lib.rs:1541][E: codex-rs/features/src/lib.rs:1542] |
| 106 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:305][E: codex-rs/features/src/lib.rs:1546][E: codex-rs/features/src/lib.rs:1547][E: codex-rs/features/src/lib.rs:1548] |
| 107 | `SendAsyncMessage` | `send_async_message` | Removed | `false` | [E: codex-rs/features/src/lib.rs:307][E: codex-rs/features/src/lib.rs:1552][E: codex-rs/features/src/lib.rs:1553][E: codex-rs/features/src/lib.rs:1554] |
| 108 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:142][E: codex-rs/features/src/lib.rs:1558][E: codex-rs/features/src/lib.rs:1559][E: codex-rs/features/src/lib.rs:1560] |
| 109 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:309][E: codex-rs/features/src/lib.rs:1564][E: codex-rs/features/src/lib.rs:1565][E: codex-rs/features/src/lib.rs:1566] |
| 110 | `GuardianThreadContext` | `guardianv2.thread_context` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:312][E: codex-rs/features/src/lib.rs:1570][E: codex-rs/features/src/lib.rs:1571][E: codex-rs/features/src/lib.rs:1572] |
| 111 | `GuardianReuseParentCompaction` | `guardian_reuse_parent_compaction` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:314][E: codex-rs/features/src/lib.rs:1576][E: codex-rs/features/src/lib.rs:1577][E: codex-rs/features/src/lib.rs:1578] |
| 112 | `GuardianEnhancedNodeReplTranscripts` | `guardian_enhanced_node_repl_transcripts` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:316][E: codex-rs/features/src/lib.rs:1582][E: codex-rs/features/src/lib.rs:1583][E: codex-rs/features/src/lib.rs:1584] |
| 113 | `GuardianNodeReplTranscriptImages` | `guardian_node_repl_transcript_images` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:318][E: codex-rs/features/src/lib.rs:1588][E: codex-rs/features/src/lib.rs:1589][E: codex-rs/features/src/lib.rs:1590] |
| 114 | `GuardianV2` | `guardianv2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:320][E: codex-rs/features/src/lib.rs:1594][E: codex-rs/features/src/lib.rs:1595][E: codex-rs/features/src/lib.rs:1596] |
| 115 | `GuardianExt` | `guardian_ext` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:322][E: codex-rs/features/src/lib.rs:1600][E: codex-rs/features/src/lib.rs:1601][E: codex-rs/features/src/lib.rs:1602] |
| 116 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:324][E: codex-rs/features/src/lib.rs:1606][E: codex-rs/features/src/lib.rs:1607][E: codex-rs/features/src/lib.rs:1608] |
| 117 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:326][E: codex-rs/features/src/lib.rs:1612][E: codex-rs/features/src/lib.rs:1613][E: codex-rs/features/src/lib.rs:1614] |
| 118 | `ContextManagement` | `context_management` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:328][E: codex-rs/features/src/lib.rs:1618][E: codex-rs/features/src/lib.rs:1619][E: codex-rs/features/src/lib.rs:1620] |
| 119 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:330][E: codex-rs/features/src/lib.rs:1624][E: codex-rs/features/src/lib.rs:1625][E: codex-rs/features/src/lib.rs:1626] |
| 120 | `ReasoningEffortOverride` | `reasoning_effort_override` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:332][E: codex-rs/features/src/lib.rs:1630][E: codex-rs/features/src/lib.rs:1631][E: codex-rs/features/src/lib.rs:1632] |
| 121 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:334][E: codex-rs/features/src/lib.rs:1636][E: codex-rs/features/src/lib.rs:1637][E: codex-rs/features/src/lib.rs:1638] |
| 122 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:400][E: codex-rs/features/src/lib.rs:1642][E: codex-rs/features/src/lib.rs:1643][E: codex-rs/features/src/lib.rs:1644] |
| 123 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:336][E: codex-rs/features/src/lib.rs:1648][E: codex-rs/features/src/lib.rs:1649][E: codex-rs/features/src/lib.rs:1650] |
| 124 | `AuthElicitation` | `auth_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:338][E: codex-rs/features/src/lib.rs:1654][E: codex-rs/features/src/lib.rs:1655][E: codex-rs/features/src/lib.rs:1656] |
| 125 | `BedrockSetupWizard` | `bedrock_setup_wizard` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:340][E: codex-rs/features/src/lib.rs:1660][E: codex-rs/features/src/lib.rs:1661][E: codex-rs/features/src/lib.rs:1662] |
| 126 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:342][E: codex-rs/features/src/lib.rs:1666][E: codex-rs/features/src/lib.rs:1667][E: codex-rs/features/src/lib.rs:1668] |
| 127 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:1672][E: codex-rs/features/src/lib.rs:1673][E: codex-rs/features/src/lib.rs:1674] |
| 128 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:1678][E: codex-rs/features/src/lib.rs:1679][E: codex-rs/features/src/lib.rs:1680] |
| 129 | `StepModelSwitching` | `step_model_switching` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:348][E: codex-rs/features/src/lib.rs:1684][E: codex-rs/features/src/lib.rs:1685][E: codex-rs/features/src/lib.rs:1686] |
| 130 | `RealtimeConversation` | `realtime_conversation` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:350][E: codex-rs/features/src/lib.rs:1690][E: codex-rs/features/src/lib.rs:1691][E: codex-rs/features/src/lib.rs:1696] |
| 131 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:402][E: codex-rs/features/src/lib.rs:1700][E: codex-rs/features/src/lib.rs:1701][E: codex-rs/features/src/lib.rs:1702] |
| 132 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:405][E: codex-rs/features/src/lib.rs:1706][E: codex-rs/features/src/lib.rs:1707][E: codex-rs/features/src/lib.rs:1708] |
| 133 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:407][E: codex-rs/features/src/lib.rs:1712][E: codex-rs/features/src/lib.rs:1713][E: codex-rs/features/src/lib.rs:1714] |
| 134 | `PreventIdleSleep` | `prevent_idle_sleep` | Experimental (macOS/Linux/Windows) / UnderDevelopment (else) | `false` | [E: codex-rs/features/src/lib.rs:352][E: codex-rs/features/src/lib.rs:1718][E: codex-rs/features/src/lib.rs:1724][E: codex-rs/features/src/lib.rs:1730][E: codex-rs/features/src/lib.rs:1732] |
| 135 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:410][E: codex-rs/features/src/lib.rs:1736][E: codex-rs/features/src/lib.rs:1737][E: codex-rs/features/src/lib.rs:1738] |
| 136 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:412][E: codex-rs/features/src/lib.rs:1742][E: codex-rs/features/src/lib.rs:1743][E: codex-rs/features/src/lib.rs:1744] |
| 137 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:414][E: codex-rs/features/src/lib.rs:1748][E: codex-rs/features/src/lib.rs:1749][E: codex-rs/features/src/lib.rs:1750] |
| 138 | `RemoteCompactionV2` | `remote_compaction_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:354][E: codex-rs/features/src/lib.rs:1754][E: codex-rs/features/src/lib.rs:1755][E: codex-rs/features/src/lib.rs:1756] |
| 139 | `CompactionImageBudget` | `compaction_image_budget` | Stable | `true` | [E: codex-rs/features/src/lib.rs:356][E: codex-rs/features/src/lib.rs:1760][E: codex-rs/features/src/lib.rs:1761][E: codex-rs/features/src/lib.rs:1762] |
| 140 | `RetainClientDeveloperMessages` | `retain_client_developer_messages` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:358][E: codex-rs/features/src/lib.rs:1766][E: codex-rs/features/src/lib.rs:1767][E: codex-rs/features/src/lib.rs:1768] |
| 141 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:360][E: codex-rs/features/src/lib.rs:1772][E: codex-rs/features/src/lib.rs:1773][E: codex-rs/features/src/lib.rs:1774] |
| 142 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:362][E: codex-rs/features/src/lib.rs:1778][E: codex-rs/features/src/lib.rs:1779][E: codex-rs/features/src/lib.rs:1780] |

## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
