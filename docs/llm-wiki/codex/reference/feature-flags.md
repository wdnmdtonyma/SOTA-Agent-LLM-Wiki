---
id: ref.feature-flags
title: Feature flags 全量索引
kind: reference
tier: T3
source: [codex-rs/features/src/lib.rs, codex-rs/ext/agent-message-board/src/tools/spec.rs]
symbols: [FEATURES]
related: [config.skills-plugins-features, ref.key-types, ref.crate-index, subsys.config-auth.features-system]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> 本页是 `FEATURES` registry 的全量 catalog：当前共 **152** 条 `FeatureSpec`，与 `Feature` enum 变体一一对应。[E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:932] macOS/Linux/Windows 上是 Stable 47、UnderDevelopment 58、Experimental 3、Deprecated 4、Removed 40；其它平台是 Stable 47、UnderDevelopment 59、Experimental 2、Deprecated 4、Removed 40。差异来自 `PreventIdleSleep` 的条件 stage。[E: codex-rs/features/src/lib.rs:1803][E: codex-rs/features/src/lib.rs:1814][E: codex-rs/features/src/lib.rs:1816]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?

## 职责边界

本页只维护可 grep 的 registry 快照，不重复解释 feature runtime 机制；关于 `Stage`、`Features`、`FeaturesToml`、legacy keys、合并顺序、dependency normalization、metrics 与 warning，请读 `subsys.config-auth.features-system`。

相对上一轮 144 条 registry，本轮净增 8 条到 152。新增 key：`analytics_plan_history`（Experimental，默认关）、`daemon_auto_start`（Stable，默认开）、`instant_interrupt`、`agent_message_board`、`system_proxy_fallback`（Stable，默认开）、`defer_mailbox_preemption`、`prefer_mxc`、`nonfatal_clock_read_errors`。除 `analytics_plan_history` 外，其余新 key 在 UnderDevelopment 且默认关，除非上文标明 Stable 默认开。[E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:113][E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:215][E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:944][E: codex-rs/features/src/lib.rs:1321][E: codex-rs/features/src/lib.rs:1345]

`unified_exec_tty` 仍是 Stable / 默认开启。`worktrees` 现为 Stable / 默认开启。`network_proxy` 仍是 Experimental / 默认关闭。`realtime_conversation` 现为 Stable / 默认开启。`prevent_idle_sleep` 仍按平台切 Experimental / UnderDevelopment。[E: codex-rs/features/src/lib.rs:993][E: codex-rs/features/src/lib.rs:996][E: codex-rs/features/src/lib.rs:1310][E: codex-rs/features/src/lib.rs:1312][E: codex-rs/features/src/lib.rs:1300][E: codex-rs/features/src/lib.rs:1778][E: codex-rs/features/src/lib.rs:1803][E: codex-rs/features/src/lib.rs:1816]

`Feature::AgentMessageBoard` 默认关。`message_board_tools` 产出 9 个工具名（`create_channel` … `post`），不另建 tool 节点。[E: codex-rs/features/src/lib.rs:1345][E: codex-rs/features/src/lib.rs:1348][E: codex-rs/ext/agent-message-board/src/tools/spec.rs:10]

`Feature::Personality` 现为 **Removed** / 默认关，不再是 Stable 默认开。[E: codex-rs/features/src/lib.rs:1753][E: codex-rs/features/src/lib.rs:1755][E: codex-rs/features/src/lib.rs:1756]

表顺序跟随 `FEATURES` 数组，不是 `Feature` enum 声明顺序。[E: codex-rs/features/src/lib.rs:932]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `AnalyticsPlanHistory` | `analytics_plan_history` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:935][E: codex-rs/features/src/lib.rs:936][E: codex-rs/features/src/lib.rs:941] |
| 2 | `DaemonAutoStart` | `daemon_auto_start` | Stable | `true` | [E: codex-rs/features/src/lib.rs:113][E: codex-rs/features/src/lib.rs:945][E: codex-rs/features/src/lib.rs:946][E: codex-rs/features/src/lib.rs:947] |
| 3 | `TranscriptV2` | `transcript_v2` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:99][E: codex-rs/features/src/lib.rs:951][E: codex-rs/features/src/lib.rs:952][E: codex-rs/features/src/lib.rs:953] |
| 4 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:387][E: codex-rs/features/src/lib.rs:958][E: codex-rs/features/src/lib.rs:959][E: codex-rs/features/src/lib.rs:960] |
| 5 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:964][E: codex-rs/features/src/lib.rs:965][E: codex-rs/features/src/lib.rs:966] |
| 6 | `ViewImage` | `view_image` | Stable | `true` | [E: codex-rs/features/src/lib.rs:104][E: codex-rs/features/src/lib.rs:970][E: codex-rs/features/src/lib.rs:971][E: codex-rs/features/src/lib.rs:972] |
| 7 | `SleepTool` | `sleep_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:976][E: codex-rs/features/src/lib.rs:977][E: codex-rs/features/src/lib.rs:978] |
| 8 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:110][E: codex-rs/features/src/lib.rs:982][E: codex-rs/features/src/lib.rs:983][E: codex-rs/features/src/lib.rs:984] |
| 9 | `UnifiedExec` | `unified_exec` | Stable | `true` | [E: codex-rs/features/src/lib.rs:133][E: codex-rs/features/src/lib.rs:988][E: codex-rs/features/src/lib.rs:989][E: codex-rs/features/src/lib.rs:990] |
| 10 | `UnifiedExecTty` | `unified_exec_tty` | Stable | `true` | [E: codex-rs/features/src/lib.rs:135][E: codex-rs/features/src/lib.rs:994][E: codex-rs/features/src/lib.rs:995][E: codex-rs/features/src/lib.rs:996] |
| 11 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:137][E: codex-rs/features/src/lib.rs:1000][E: codex-rs/features/src/lib.rs:1001][E: codex-rs/features/src/lib.rs:1002] |
| 12 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | Removed | `true` | [E: codex-rs/features/src/lib.rs:143][E: codex-rs/features/src/lib.rs:1006][E: codex-rs/features/src/lib.rs:1007][E: codex-rs/features/src/lib.rs:1008] |
| 13 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:169][E: codex-rs/features/src/lib.rs:1012][E: codex-rs/features/src/lib.rs:1013][E: codex-rs/features/src/lib.rs:1014] |
| 14 | `PowerShellShellVersion` | `powershell_shell_version` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:171][E: codex-rs/features/src/lib.rs:1018][E: codex-rs/features/src/lib.rs:1019][E: codex-rs/features/src/lib.rs:1020] |
| 15 | `ShellSnapshotV2` | `shell_snapshot_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:173][E: codex-rs/features/src/lib.rs:1024][E: codex-rs/features/src/lib.rs:1025][E: codex-rs/features/src/lib.rs:1026] |
| 16 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:175][E: codex-rs/features/src/lib.rs:1030][E: codex-rs/features/src/lib.rs:1031][E: codex-rs/features/src/lib.rs:1032] |
| 17 | `CwdRelativeTurnDiffs` | `cwd_relative_turn_diffs` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:177][E: codex-rs/features/src/lib.rs:1036][E: codex-rs/features/src/lib.rs:1037][E: codex-rs/features/src/lib.rs:1038] |
| 18 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:389][E: codex-rs/features/src/lib.rs:1042][E: codex-rs/features/src/lib.rs:1043][E: codex-rs/features/src/lib.rs:1044] |
| 19 | `ContentItemKinds` | `content_item_kinds` | Stable | `true` | [E: codex-rs/features/src/lib.rs:117][E: codex-rs/features/src/lib.rs:1048][E: codex-rs/features/src/lib.rs:1049][E: codex-rs/features/src/lib.rs:1050] |
| 20 | `ExecutedToolCallMetadata` | `executed_tool_call_metadata` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:119][E: codex-rs/features/src/lib.rs:1054][E: codex-rs/features/src/lib.rs:1055][E: codex-rs/features/src/lib.rs:1056] |
| 21 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:121][E: codex-rs/features/src/lib.rs:1060][E: codex-rs/features/src/lib.rs:1061][E: codex-rs/features/src/lib.rs:1062] |
| 22 | `CodeModeBufferedExec` | `code_mode_buffered_exec` | Removed | `false` | [E: codex-rs/features/src/lib.rs:123][E: codex-rs/features/src/lib.rs:1066][E: codex-rs/features/src/lib.rs:1067][E: codex-rs/features/src/lib.rs:1068] |
| 23 | `CodeModeHost` | `code_mode_host` | Stable | `true` | [E: codex-rs/features/src/lib.rs:125][E: codex-rs/features/src/lib.rs:1072][E: codex-rs/features/src/lib.rs:1073][E: codex-rs/features/src/lib.rs:1074] |
| 24 | `CodeModePrewarm` | `code_mode_prewarm` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:127][E: codex-rs/features/src/lib.rs:1078][E: codex-rs/features/src/lib.rs:1079][E: codex-rs/features/src/lib.rs:1080] |
| 25 | `CodeModeInterrupt` | `code_mode_interrupt` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:129][E: codex-rs/features/src/lib.rs:1084][E: codex-rs/features/src/lib.rs:1085][E: codex-rs/features/src/lib.rs:1086] |
| 26 | `InstantInterrupt` | `instant_interrupt` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:213][E: codex-rs/features/src/lib.rs:1089][E: codex-rs/features/src/lib.rs:1091][E: codex-rs/features/src/lib.rs:1092] |
| 27 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:131][E: codex-rs/features/src/lib.rs:1096][E: codex-rs/features/src/lib.rs:1097][E: codex-rs/features/src/lib.rs:1098] |
| 28 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:391][E: codex-rs/features/src/lib.rs:1102][E: codex-rs/features/src/lib.rs:1103][E: codex-rs/features/src/lib.rs:1104] |
| 29 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:145][E: codex-rs/features/src/lib.rs:1108][E: codex-rs/features/src/lib.rs:1109][E: codex-rs/features/src/lib.rs:1110] |
| 30 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:159][E: codex-rs/features/src/lib.rs:1114][E: codex-rs/features/src/lib.rs:1115][E: codex-rs/features/src/lib.rs:1116] |
| 31 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1120][E: codex-rs/features/src/lib.rs:1121][E: codex-rs/features/src/lib.rs:1122] |
| 32 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:1126][E: codex-rs/features/src/lib.rs:1127][E: codex-rs/features/src/lib.rs:1128] |
| 33 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:393][E: codex-rs/features/src/lib.rs:1132][E: codex-rs/features/src/lib.rs:1133][E: codex-rs/features/src/lib.rs:1134] |
| 34 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:410][E: codex-rs/features/src/lib.rs:1138][E: codex-rs/features/src/lib.rs:1139][E: codex-rs/features/src/lib.rs:1140] |
| 35 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:179][E: codex-rs/features/src/lib.rs:1144][E: codex-rs/features/src/lib.rs:1145][E: codex-rs/features/src/lib.rs:1146] |
| 36 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:412][E: codex-rs/features/src/lib.rs:1150][E: codex-rs/features/src/lib.rs:1151][E: codex-rs/features/src/lib.rs:1152] |
| 37 | `MemoryTool` | `memories` | Stable | `false` | [E: codex-rs/features/src/lib.rs:181][E: codex-rs/features/src/lib.rs:1156][E: codex-rs/features/src/lib.rs:1157][E: codex-rs/features/src/lib.rs:1158] |
| 38 | `ExternalAgentMemoryImport` | `external_agent_memory_import` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:183][E: codex-rs/features/src/lib.rs:1162][E: codex-rs/features/src/lib.rs:1163][E: codex-rs/features/src/lib.rs:1164] |
| 39 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:186][E: codex-rs/features/src/lib.rs:1168][E: codex-rs/features/src/lib.rs:1169][E: codex-rs/features/src/lib.rs:1170] |
| 40 | `LocalThreadStoreSharedCompression` | `local_thread_store_shared_compression` | Removed | `false` | [E: codex-rs/features/src/lib.rs:188][E: codex-rs/features/src/lib.rs:1174][E: codex-rs/features/src/lib.rs:1175][E: codex-rs/features/src/lib.rs:1176] |
| 41 | `BackgroundPaginatedRolloutMigration` | `background_paginated_rollout_migration` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:190][E: codex-rs/features/src/lib.rs:1180][E: codex-rs/features/src/lib.rs:1181][E: codex-rs/features/src/lib.rs:1182] |
| 42 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:192][E: codex-rs/features/src/lib.rs:1186][E: codex-rs/features/src/lib.rs:1187][E: codex-rs/features/src/lib.rs:1188] |
| 43 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:414][E: codex-rs/features/src/lib.rs:1192][E: codex-rs/features/src/lib.rs:1193][E: codex-rs/features/src/lib.rs:1194] |
| 44 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:149][E: codex-rs/features/src/lib.rs:1198][E: codex-rs/features/src/lib.rs:1199][E: codex-rs/features/src/lib.rs:1200] |
| 45 | `ApplyPatchPreserveLineEndings` | `apply_patch_preserve_line_endings` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:151][E: codex-rs/features/src/lib.rs:1204][E: codex-rs/features/src/lib.rs:1205][E: codex-rs/features/src/lib.rs:1206] |
| 46 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:153][E: codex-rs/features/src/lib.rs:1210][E: codex-rs/features/src/lib.rs:1211][E: codex-rs/features/src/lib.rs:1212] |
| 47 | `WriteStdinApproval` | `write_stdin_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:155][E: codex-rs/features/src/lib.rs:1216][E: codex-rs/features/src/lib.rs:1217][E: codex-rs/features/src/lib.rs:1218] |
| 48 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:1222][E: codex-rs/features/src/lib.rs:1223][E: codex-rs/features/src/lib.rs:1224] |
| 49 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:157][E: codex-rs/features/src/lib.rs:1228][E: codex-rs/features/src/lib.rs:1229][E: codex-rs/features/src/lib.rs:1230] |
| 50 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:396][E: codex-rs/features/src/lib.rs:1234][E: codex-rs/features/src/lib.rs:1235][E: codex-rs/features/src/lib.rs:1236] |
| 51 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:167][E: codex-rs/features/src/lib.rs:1240][E: codex-rs/features/src/lib.rs:1241][E: codex-rs/features/src/lib.rs:1242] |
| 52 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:398][E: codex-rs/features/src/lib.rs:1246][E: codex-rs/features/src/lib.rs:1247][E: codex-rs/features/src/lib.rs:1248] |
| 53 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:400][E: codex-rs/features/src/lib.rs:1252][E: codex-rs/features/src/lib.rs:1253][E: codex-rs/features/src/lib.rs:1254] |
| 54 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:402][E: codex-rs/features/src/lib.rs:1258][E: codex-rs/features/src/lib.rs:1259][E: codex-rs/features/src/lib.rs:1260] |
| 55 | `WindowsSandboxService` | `windows_sandbox_service` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:404][E: codex-rs/features/src/lib.rs:1264][E: codex-rs/features/src/lib.rs:1265][E: codex-rs/features/src/lib.rs:1266] |
| 56 | `PreferMxc` | `prefer_mxc` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:406][E: codex-rs/features/src/lib.rs:1269][E: codex-rs/features/src/lib.rs:1270][E: codex-rs/features/src/lib.rs:1271] |
| 57 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:408][E: codex-rs/features/src/lib.rs:1276][E: codex-rs/features/src/lib.rs:1277][E: codex-rs/features/src/lib.rs:1278] |
| 58 | `ApiKeyModelDiscovery` | `api_key_model_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:97][E: codex-rs/features/src/lib.rs:1282][E: codex-rs/features/src/lib.rs:1283][E: codex-rs/features/src/lib.rs:1284] |
| 59 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:194][E: codex-rs/features/src/lib.rs:1288][E: codex-rs/features/src/lib.rs:1289][E: codex-rs/features/src/lib.rs:1290] |
| 60 | `UnboundedConnectionRetries` | `unbounded_connection_retries` | Stable | `true` | [E: codex-rs/features/src/lib.rs:196][E: codex-rs/features/src/lib.rs:1294][E: codex-rs/features/src/lib.rs:1295][E: codex-rs/features/src/lib.rs:1296] |
| 61 | `NetworkProxy` | `network_proxy` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:198][E: codex-rs/features/src/lib.rs:1300][E: codex-rs/features/src/lib.rs:1301][E: codex-rs/features/src/lib.rs:1306] |
| 62 | `Worktrees` | `worktrees` | Stable | `true` | [E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1310][E: codex-rs/features/src/lib.rs:1311][E: codex-rs/features/src/lib.rs:1312] |
| 63 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:202][E: codex-rs/features/src/lib.rs:1316][E: codex-rs/features/src/lib.rs:1317][E: codex-rs/features/src/lib.rs:1318] |
| 64 | `SystemProxyFallback` | `system_proxy_fallback` | Stable | `true` | [E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:1322][E: codex-rs/features/src/lib.rs:1323][E: codex-rs/features/src/lib.rs:1324] |
| 65 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:206][E: codex-rs/features/src/lib.rs:1328][E: codex-rs/features/src/lib.rs:1329][E: codex-rs/features/src/lib.rs:1330] |
| 66 | `MultiAgentV2` | `multi_agent_v2` | Stable | `false` | [E: codex-rs/features/src/lib.rs:208][E: codex-rs/features/src/lib.rs:1334][E: codex-rs/features/src/lib.rs:1335][E: codex-rs/features/src/lib.rs:1336] |
| 67 | `DeferMailboxPreemption` | `defer_mailbox_preemption` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:211][E: codex-rs/features/src/lib.rs:1340][E: codex-rs/features/src/lib.rs:1341][E: codex-rs/features/src/lib.rs:1342] |
| 68 | `AgentMessageBoard` | `agent_message_board` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:215][E: codex-rs/features/src/lib.rs:1346][E: codex-rs/features/src/lib.rs:1347][E: codex-rs/features/src/lib.rs:1348] |
| 69 | `MultiAgentMode` | `multi_agent_mode` | Removed | `false` | [E: codex-rs/features/src/lib.rs:217][E: codex-rs/features/src/lib.rs:1352][E: codex-rs/features/src/lib.rs:1353][E: codex-rs/features/src/lib.rs:1354] |
| 70 | `SpawnCsv` | `enable_fanout` | Removed | `false` | [E: codex-rs/features/src/lib.rs:219][E: codex-rs/features/src/lib.rs:1358][E: codex-rs/features/src/lib.rs:1359][E: codex-rs/features/src/lib.rs:1360] |
| 71 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:221][E: codex-rs/features/src/lib.rs:1364][E: codex-rs/features/src/lib.rs:1365][E: codex-rs/features/src/lib.rs:1366] |
| 72 | `Psp` | `psp` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:223][E: codex-rs/features/src/lib.rs:1370][E: codex-rs/features/src/lib.rs:1371][E: codex-rs/features/src/lib.rs:1372] |
| 73 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:225][E: codex-rs/features/src/lib.rs:1376][E: codex-rs/features/src/lib.rs:1377][E: codex-rs/features/src/lib.rs:1378] |
| 74 | `Mcp20260728` | `mcp_2026_07_28` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:227][E: codex-rs/features/src/lib.rs:1382][E: codex-rs/features/src/lib.rs:1383][E: codex-rs/features/src/lib.rs:1384] |
| 75 | `CodexAppsMcp20260728` | `codex_apps_mcp_2026_07_28` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:229][E: codex-rs/features/src/lib.rs:1388][E: codex-rs/features/src/lib.rs:1389][E: codex-rs/features/src/lib.rs:1390] |
| 76 | `McpOAuthRefreshCoordination` | `mcp_oauth_refresh_coordination` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:231][E: codex-rs/features/src/lib.rs:1394][E: codex-rs/features/src/lib.rs:1395][E: codex-rs/features/src/lib.rs:1396] |
| 77 | `UseXaa` | `use_xaa` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:233][E: codex-rs/features/src/lib.rs:1400][E: codex-rs/features/src/lib.rs:1401][E: codex-rs/features/src/lib.rs:1402] |
| 78 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:235][E: codex-rs/features/src/lib.rs:1406][E: codex-rs/features/src/lib.rs:1407][E: codex-rs/features/src/lib.rs:1408] |
| 79 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:237][E: codex-rs/features/src/lib.rs:1412][E: codex-rs/features/src/lib.rs:1413][E: codex-rs/features/src/lib.rs:1414] |
| 80 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:239][E: codex-rs/features/src/lib.rs:1418][E: codex-rs/features/src/lib.rs:1419][E: codex-rs/features/src/lib.rs:1420] |
| 81 | `DeferredToolWorldState` | `deferred_tool_world_state` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:241][E: codex-rs/features/src/lib.rs:1424][E: codex-rs/features/src/lib.rs:1425][E: codex-rs/features/src/lib.rs:1426] |
| 82 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:243][E: codex-rs/features/src/lib.rs:1430][E: codex-rs/features/src/lib.rs:1431][E: codex-rs/features/src/lib.rs:1432] |
| 83 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:416][E: codex-rs/features/src/lib.rs:1436][E: codex-rs/features/src/lib.rs:1437][E: codex-rs/features/src/lib.rs:1438] |
| 84 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:245][E: codex-rs/features/src/lib.rs:1442][E: codex-rs/features/src/lib.rs:1443][E: codex-rs/features/src/lib.rs:1444] |
| 85 | `RecommendedPlugins` | `recommended_plugins` | Stable | `false` | [E: codex-rs/features/src/lib.rs:247][E: codex-rs/features/src/lib.rs:1448][E: codex-rs/features/src/lib.rs:1449][E: codex-rs/features/src/lib.rs:1450] |
| 86 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:249][E: codex-rs/features/src/lib.rs:1454][E: codex-rs/features/src/lib.rs:1455][E: codex-rs/features/src/lib.rs:1456] |
| 87 | `ExecutorCapabilityDiscovery` | `executor_capability_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:251][E: codex-rs/features/src/lib.rs:1460][E: codex-rs/features/src/lib.rs:1461][E: codex-rs/features/src/lib.rs:1462] |
| 88 | `SkipHostSkillDiscovery` | `skip_host_skill_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:253][E: codex-rs/features/src/lib.rs:1466][E: codex-rs/features/src/lib.rs:1467][E: codex-rs/features/src/lib.rs:1468] |
| 89 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:255][E: codex-rs/features/src/lib.rs:1472][E: codex-rs/features/src/lib.rs:1473][E: codex-rs/features/src/lib.rs:1474] |
| 90 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:259][E: codex-rs/features/src/lib.rs:1478][E: codex-rs/features/src/lib.rs:1479][E: codex-rs/features/src/lib.rs:1480] |
| 91 | `InAppChat` | `in_app_chat` | Stable | `true` | [E: codex-rs/features/src/lib.rs:263][E: codex-rs/features/src/lib.rs:1484][E: codex-rs/features/src/lib.rs:1485][E: codex-rs/features/src/lib.rs:1486] |
| 92 | `InAppDictation` | `in_app_dictation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:267][E: codex-rs/features/src/lib.rs:1490][E: codex-rs/features/src/lib.rs:1491][E: codex-rs/features/src/lib.rs:1492] |
| 93 | `InAppLocalAutomation` | `in_app_local_automation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:271][E: codex-rs/features/src/lib.rs:1496][E: codex-rs/features/src/lib.rs:1497][E: codex-rs/features/src/lib.rs:1498] |
| 94 | `InAppUpdates` | `in_app_updates` | Stable | `true` | [E: codex-rs/features/src/lib.rs:275][E: codex-rs/features/src/lib.rs:1502][E: codex-rs/features/src/lib.rs:1503][E: codex-rs/features/src/lib.rs:1504] |
| 95 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:279][E: codex-rs/features/src/lib.rs:1508][E: codex-rs/features/src/lib.rs:1509][E: codex-rs/features/src/lib.rs:1510] |
| 96 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:283][E: codex-rs/features/src/lib.rs:1514][E: codex-rs/features/src/lib.rs:1515][E: codex-rs/features/src/lib.rs:1516] |
| 97 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:287][E: codex-rs/features/src/lib.rs:1520][E: codex-rs/features/src/lib.rs:1521][E: codex-rs/features/src/lib.rs:1522] |
| 98 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:291][E: codex-rs/features/src/lib.rs:1526][E: codex-rs/features/src/lib.rs:1527][E: codex-rs/features/src/lib.rs:1528] |
| 99 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:293][E: codex-rs/features/src/lib.rs:1532][E: codex-rs/features/src/lib.rs:1533][E: codex-rs/features/src/lib.rs:1534] |
| 100 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:295][E: codex-rs/features/src/lib.rs:1538][E: codex-rs/features/src/lib.rs:1539][E: codex-rs/features/src/lib.rs:1540] |
| 101 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:297][E: codex-rs/features/src/lib.rs:1544][E: codex-rs/features/src/lib.rs:1545][E: codex-rs/features/src/lib.rs:1546] |
| 102 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:299][E: codex-rs/features/src/lib.rs:1550][E: codex-rs/features/src/lib.rs:1551][E: codex-rs/features/src/lib.rs:1552] |
| 103 | `OmitAppServerNotificationMedia` | `omit_app_server_notification_media` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:301][E: codex-rs/features/src/lib.rs:1556][E: codex-rs/features/src/lib.rs:1557][E: codex-rs/features/src/lib.rs:1558] |
| 104 | `ImageResizeNotice` | `image_resize_notice` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:303][E: codex-rs/features/src/lib.rs:1562][E: codex-rs/features/src/lib.rs:1563][E: codex-rs/features/src/lib.rs:1564] |
| 105 | `UnifiedImageBudget` | `unified_image_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:305][E: codex-rs/features/src/lib.rs:1568][E: codex-rs/features/src/lib.rs:1569][E: codex-rs/features/src/lib.rs:1570] |
| 106 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:307][E: codex-rs/features/src/lib.rs:1574][E: codex-rs/features/src/lib.rs:1575][E: codex-rs/features/src/lib.rs:1576] |
| 107 | `ItemIds` | `item_ids` | Removed | `true` | [E: codex-rs/features/src/lib.rs:309][E: codex-rs/features/src/lib.rs:1580][E: codex-rs/features/src/lib.rs:1581][E: codex-rs/features/src/lib.rs:1582] |
| 108 | `ConcurrentReasoningSummaries` | `concurrent_reasoning_summaries` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:311][E: codex-rs/features/src/lib.rs:1586][E: codex-rs/features/src/lib.rs:1587][E: codex-rs/features/src/lib.rs:1588] |
| 109 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:313][E: codex-rs/features/src/lib.rs:1592][E: codex-rs/features/src/lib.rs:1593][E: codex-rs/features/src/lib.rs:1594] |
| 110 | `SkillSearch` | `skill_search` | Stable | `true` | [E: codex-rs/features/src/lib.rs:315][E: codex-rs/features/src/lib.rs:1598][E: codex-rs/features/src/lib.rs:1599][E: codex-rs/features/src/lib.rs:1600] |
| 111 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:317][E: codex-rs/features/src/lib.rs:1604][E: codex-rs/features/src/lib.rs:1605][E: codex-rs/features/src/lib.rs:1606] |
| 112 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:319][E: codex-rs/features/src/lib.rs:1610][E: codex-rs/features/src/lib.rs:1611][E: codex-rs/features/src/lib.rs:1612] |
| 113 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:419][E: codex-rs/features/src/lib.rs:1616][E: codex-rs/features/src/lib.rs:1617][E: codex-rs/features/src/lib.rs:1618] |
| 114 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:321][E: codex-rs/features/src/lib.rs:1622][E: codex-rs/features/src/lib.rs:1623][E: codex-rs/features/src/lib.rs:1624] |
| 115 | `SendAsyncMessage` | `send_async_message` | Removed | `false` | [E: codex-rs/features/src/lib.rs:323][E: codex-rs/features/src/lib.rs:1628][E: codex-rs/features/src/lib.rs:1629][E: codex-rs/features/src/lib.rs:1630] |
| 116 | `SendMessageToUserAsync` | `send_message_to_user_async` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:325][E: codex-rs/features/src/lib.rs:1634][E: codex-rs/features/src/lib.rs:1635][E: codex-rs/features/src/lib.rs:1636] |
| 117 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:147][E: codex-rs/features/src/lib.rs:1640][E: codex-rs/features/src/lib.rs:1641][E: codex-rs/features/src/lib.rs:1642] |
| 118 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:327][E: codex-rs/features/src/lib.rs:1646][E: codex-rs/features/src/lib.rs:1647][E: codex-rs/features/src/lib.rs:1648] |
| 119 | `GuardianThreadContext` | `guardianv2.thread_context` | Removed | `false` | [E: codex-rs/features/src/lib.rs:329][E: codex-rs/features/src/lib.rs:1652][E: codex-rs/features/src/lib.rs:1653][E: codex-rs/features/src/lib.rs:1654] |
| 120 | `GuardianReuseParentCompaction` | `guardian_reuse_parent_compaction` | Stable | `true` | [E: codex-rs/features/src/lib.rs:332][E: codex-rs/features/src/lib.rs:1658][E: codex-rs/features/src/lib.rs:1659][E: codex-rs/features/src/lib.rs:1660] |
| 121 | `GuardianEnhancedNodeReplTranscripts` | `guardian_enhanced_node_repl_transcripts` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:334][E: codex-rs/features/src/lib.rs:1664][E: codex-rs/features/src/lib.rs:1665][E: codex-rs/features/src/lib.rs:1666] |
| 122 | `GuardianNodeReplTranscriptImages` | `guardian_node_repl_transcript_images` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:336][E: codex-rs/features/src/lib.rs:1670][E: codex-rs/features/src/lib.rs:1671][E: codex-rs/features/src/lib.rs:1672] |
| 123 | `GuardianV2` | `guardianv2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:338][E: codex-rs/features/src/lib.rs:1676][E: codex-rs/features/src/lib.rs:1677][E: codex-rs/features/src/lib.rs:1678] |
| 124 | `GuardianExt` | `guardian_ext` | Removed | `false` | [E: codex-rs/features/src/lib.rs:340][E: codex-rs/features/src/lib.rs:1682][E: codex-rs/features/src/lib.rs:1683][E: codex-rs/features/src/lib.rs:1684] |
| 125 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:342][E: codex-rs/features/src/lib.rs:1688][E: codex-rs/features/src/lib.rs:1689][E: codex-rs/features/src/lib.rs:1690] |
| 126 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:1694][E: codex-rs/features/src/lib.rs:1695][E: codex-rs/features/src/lib.rs:1696] |
| 127 | `ContextManagement` | `context_management` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:1700][E: codex-rs/features/src/lib.rs:1701][E: codex-rs/features/src/lib.rs:1702] |
| 128 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:348][E: codex-rs/features/src/lib.rs:1706][E: codex-rs/features/src/lib.rs:1707][E: codex-rs/features/src/lib.rs:1708] |
| 129 | `ReasoningEffortOverride` | `reasoning_effort_override` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:350][E: codex-rs/features/src/lib.rs:1712][E: codex-rs/features/src/lib.rs:1713][E: codex-rs/features/src/lib.rs:1714] |
| 130 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:352][E: codex-rs/features/src/lib.rs:1718][E: codex-rs/features/src/lib.rs:1719][E: codex-rs/features/src/lib.rs:1720] |
| 131 | `NonfatalClockReadErrors` | `nonfatal_clock_read_errors` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:354][E: codex-rs/features/src/lib.rs:1724][E: codex-rs/features/src/lib.rs:1725][E: codex-rs/features/src/lib.rs:1726] |
| 132 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:422][E: codex-rs/features/src/lib.rs:1730][E: codex-rs/features/src/lib.rs:1731][E: codex-rs/features/src/lib.rs:1732] |
| 133 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:356][E: codex-rs/features/src/lib.rs:1736][E: codex-rs/features/src/lib.rs:1737][E: codex-rs/features/src/lib.rs:1738] |
| 134 | `AuthElicitation` | `auth_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:358][E: codex-rs/features/src/lib.rs:1742][E: codex-rs/features/src/lib.rs:1743][E: codex-rs/features/src/lib.rs:1744] |
| 135 | `BedrockSetupWizard` | `bedrock_setup_wizard` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:360][E: codex-rs/features/src/lib.rs:1748][E: codex-rs/features/src/lib.rs:1749][E: codex-rs/features/src/lib.rs:1750] |
| 136 | `Personality` | `personality` | Removed | `false` | [E: codex-rs/features/src/lib.rs:362][E: codex-rs/features/src/lib.rs:1754][E: codex-rs/features/src/lib.rs:1755][E: codex-rs/features/src/lib.rs:1756] |
| 137 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:364][E: codex-rs/features/src/lib.rs:1760][E: codex-rs/features/src/lib.rs:1761][E: codex-rs/features/src/lib.rs:1762] |
| 138 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:366][E: codex-rs/features/src/lib.rs:1766][E: codex-rs/features/src/lib.rs:1767][E: codex-rs/features/src/lib.rs:1768] |
| 139 | `StepModelSwitching` | `step_model_switching` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:368][E: codex-rs/features/src/lib.rs:1772][E: codex-rs/features/src/lib.rs:1773][E: codex-rs/features/src/lib.rs:1774] |
| 140 | `RealtimeConversation` | `realtime_conversation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:370][E: codex-rs/features/src/lib.rs:1778][E: codex-rs/features/src/lib.rs:1779][E: codex-rs/features/src/lib.rs:1780] |
| 141 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:424][E: codex-rs/features/src/lib.rs:1784][E: codex-rs/features/src/lib.rs:1785][E: codex-rs/features/src/lib.rs:1786] |
| 142 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:427][E: codex-rs/features/src/lib.rs:1790][E: codex-rs/features/src/lib.rs:1791][E: codex-rs/features/src/lib.rs:1792] |
| 143 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:429][E: codex-rs/features/src/lib.rs:1796][E: codex-rs/features/src/lib.rs:1797][E: codex-rs/features/src/lib.rs:1798] |
| 144 | `PreventIdleSleep` | `prevent_idle_sleep` | Experimental (macOS/Linux/Windows) / UnderDevelopment (else) | `false` | [E: codex-rs/features/src/lib.rs:372][E: codex-rs/features/src/lib.rs:1801][E: codex-rs/features/src/lib.rs:1803][E: codex-rs/features/src/lib.rs:1814][E: codex-rs/features/src/lib.rs:1816] |
| 145 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:432][E: codex-rs/features/src/lib.rs:1820][E: codex-rs/features/src/lib.rs:1821][E: codex-rs/features/src/lib.rs:1822] |
| 146 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:434][E: codex-rs/features/src/lib.rs:1826][E: codex-rs/features/src/lib.rs:1827][E: codex-rs/features/src/lib.rs:1828] |
| 147 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:436][E: codex-rs/features/src/lib.rs:1832][E: codex-rs/features/src/lib.rs:1833][E: codex-rs/features/src/lib.rs:1834] |
| 148 | `RemoteCompactionV2` | `remote_compaction_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:374][E: codex-rs/features/src/lib.rs:1838][E: codex-rs/features/src/lib.rs:1839][E: codex-rs/features/src/lib.rs:1840] |
| 149 | `CompactionImageBudget` | `compaction_image_budget` | Stable | `true` | [E: codex-rs/features/src/lib.rs:376][E: codex-rs/features/src/lib.rs:1844][E: codex-rs/features/src/lib.rs:1845][E: codex-rs/features/src/lib.rs:1846] |
| 150 | `RetainClientDeveloperMessages` | `retain_client_developer_messages` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:378][E: codex-rs/features/src/lib.rs:1850][E: codex-rs/features/src/lib.rs:1851][E: codex-rs/features/src/lib.rs:1852] |
| 151 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:380][E: codex-rs/features/src/lib.rs:1856][E: codex-rs/features/src/lib.rs:1857][E: codex-rs/features/src/lib.rs:1858] |
| 152 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:382][E: codex-rs/features/src/lib.rs:1862][E: codex-rs/features/src/lib.rs:1863][E: codex-rs/features/src/lib.rs:1864] |

## Sources

- `codex-rs/features/src/lib.rs`
- `codex-rs/ext/agent-message-board/src/tools/spec.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
