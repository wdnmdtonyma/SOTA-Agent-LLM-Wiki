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
updated: 4d7a5c7c73
---

> 本页是 `FEATURES` registry 的全量 catalog：当前共 95 条，逐项列出 feature identity、canonical config key、lifecycle stage 与 default；合并、structured TOML、legacy alias 和 runtime normalization 的权威说明在 `subsys.config-auth.features-system`。[E: codex-rs/features/src/lib.rs:796][E: codex-rs/features/src/lib.rs:803][E: codex-rs/features/src/lib.rs:1386][E: codex-rs/features/src/lib.rs:1389][I]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?

## 职责边界

本页只维护可 grep 的 registry 快照，不重复解释 feature runtime 机制；关于 `Stage`、`Features`、`FeaturesToml`、legacy keys、合并顺序、dependency normalization、metrics 与 warning，请读 `subsys.config-auth.features-system`。

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:255][E: codex-rs/features/src/lib.rs:806][E: codex-rs/features/src/lib.rs:807][E: codex-rs/features/src/lib.rs:808][E: codex-rs/features/src/lib.rs:809] |
| 2 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:86][E: codex-rs/features/src/lib.rs:812][E: codex-rs/features/src/lib.rs:813][E: codex-rs/features/src/lib.rs:814][E: codex-rs/features/src/lib.rs:815] |
| 3 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:90][E: codex-rs/features/src/lib.rs:818][E: codex-rs/features/src/lib.rs:819][E: codex-rs/features/src/lib.rs:820][E: codex-rs/features/src/lib.rs:821] |
| 4 | `UnifiedExec` | `unified_exec` | Stable | `!cfg!(windows)` | [E: codex-rs/features/src/lib.rs:100][E: codex-rs/features/src/lib.rs:824][E: codex-rs/features/src/lib.rs:825][E: codex-rs/features/src/lib.rs:826][E: codex-rs/features/src/lib.rs:827] |
| 5 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:830][E: codex-rs/features/src/lib.rs:831][E: codex-rs/features/src/lib.rs:832][E: codex-rs/features/src/lib.rs:833] |
| 6 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:836][E: codex-rs/features/src/lib.rs:837][E: codex-rs/features/src/lib.rs:838][E: codex-rs/features/src/lib.rs:839] |
| 7 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:130][E: codex-rs/features/src/lib.rs:842][E: codex-rs/features/src/lib.rs:843][E: codex-rs/features/src/lib.rs:844][E: codex-rs/features/src/lib.rs:845] |
| 8 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:132][E: codex-rs/features/src/lib.rs:848][E: codex-rs/features/src/lib.rs:849][E: codex-rs/features/src/lib.rs:850][E: codex-rs/features/src/lib.rs:851] |
| 9 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:257][E: codex-rs/features/src/lib.rs:854][E: codex-rs/features/src/lib.rs:855][E: codex-rs/features/src/lib.rs:856][E: codex-rs/features/src/lib.rs:857] |
| 10 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:94][E: codex-rs/features/src/lib.rs:860][E: codex-rs/features/src/lib.rs:861][E: codex-rs/features/src/lib.rs:862][E: codex-rs/features/src/lib.rs:863] |
| 11 | `CodeModeHost` | `code_mode_host` | Stable | `true` | [E: codex-rs/features/src/lib.rs:96][E: codex-rs/features/src/lib.rs:866][E: codex-rs/features/src/lib.rs:867][E: codex-rs/features/src/lib.rs:868][E: codex-rs/features/src/lib.rs:869] |
| 12 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:98][E: codex-rs/features/src/lib.rs:872][E: codex-rs/features/src/lib.rs:873][E: codex-rs/features/src/lib.rs:874][E: codex-rs/features/src/lib.rs:875] |
| 13 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:259][E: codex-rs/features/src/lib.rs:878][E: codex-rs/features/src/lib.rs:879][E: codex-rs/features/src/lib.rs:880][E: codex-rs/features/src/lib.rs:881] |
| 14 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:110][E: codex-rs/features/src/lib.rs:884][E: codex-rs/features/src/lib.rs:885][E: codex-rs/features/src/lib.rs:886][E: codex-rs/features/src/lib.rs:887] |
| 15 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:120][E: codex-rs/features/src/lib.rs:890][E: codex-rs/features/src/lib.rs:891][E: codex-rs/features/src/lib.rs:892][E: codex-rs/features/src/lib.rs:893] |
| 16 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:123][E: codex-rs/features/src/lib.rs:896][E: codex-rs/features/src/lib.rs:897][E: codex-rs/features/src/lib.rs:898][E: codex-rs/features/src/lib.rs:899] |
| 17 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:125][E: codex-rs/features/src/lib.rs:902][E: codex-rs/features/src/lib.rs:903][E: codex-rs/features/src/lib.rs:904][E: codex-rs/features/src/lib.rs:905] |
| 18 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:261][E: codex-rs/features/src/lib.rs:908][E: codex-rs/features/src/lib.rs:909][E: codex-rs/features/src/lib.rs:910][E: codex-rs/features/src/lib.rs:911] |
| 19 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:274][E: codex-rs/features/src/lib.rs:914][E: codex-rs/features/src/lib.rs:915][E: codex-rs/features/src/lib.rs:916][E: codex-rs/features/src/lib.rs:917] |
| 20 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:134][E: codex-rs/features/src/lib.rs:920][E: codex-rs/features/src/lib.rs:921][E: codex-rs/features/src/lib.rs:922][E: codex-rs/features/src/lib.rs:923] |
| 21 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:276][E: codex-rs/features/src/lib.rs:926][E: codex-rs/features/src/lib.rs:927][E: codex-rs/features/src/lib.rs:928][E: codex-rs/features/src/lib.rs:929] |
| 22 | `MemoryTool` | `memories` | Stable | `false` | [E: codex-rs/features/src/lib.rs:136][E: codex-rs/features/src/lib.rs:932][E: codex-rs/features/src/lib.rs:933][E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:935] |
| 23 | `ExternalAgentMemoryImport` | `external_agent_memory_import` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:138][E: codex-rs/features/src/lib.rs:938][E: codex-rs/features/src/lib.rs:939][E: codex-rs/features/src/lib.rs:940][E: codex-rs/features/src/lib.rs:941] |
| 24 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:140][E: codex-rs/features/src/lib.rs:944][E: codex-rs/features/src/lib.rs:945][E: codex-rs/features/src/lib.rs:946][E: codex-rs/features/src/lib.rs:947] |
| 25 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:142][E: codex-rs/features/src/lib.rs:950][E: codex-rs/features/src/lib.rs:951][E: codex-rs/features/src/lib.rs:952][E: codex-rs/features/src/lib.rs:953] |
| 26 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:278][E: codex-rs/features/src/lib.rs:956][E: codex-rs/features/src/lib.rs:957][E: codex-rs/features/src/lib.rs:958][E: codex-rs/features/src/lib.rs:959] |
| 27 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:962][E: codex-rs/features/src/lib.rs:963][E: codex-rs/features/src/lib.rs:964][E: codex-rs/features/src/lib.rs:965] |
| 28 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/features/src/lib.rs:968][E: codex-rs/features/src/lib.rs:969][E: codex-rs/features/src/lib.rs:970][E: codex-rs/features/src/lib.rs:971] |
| 29 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:88][E: codex-rs/features/src/lib.rs:974][E: codex-rs/features/src/lib.rs:975][E: codex-rs/features/src/lib.rs:976][E: codex-rs/features/src/lib.rs:977] |
| 30 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:118][E: codex-rs/features/src/lib.rs:980][E: codex-rs/features/src/lib.rs:981][E: codex-rs/features/src/lib.rs:982][E: codex-rs/features/src/lib.rs:983] |
| 31 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:264][E: codex-rs/features/src/lib.rs:986][E: codex-rs/features/src/lib.rs:987][E: codex-rs/features/src/lib.rs:988][E: codex-rs/features/src/lib.rs:989] |
| 32 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:128][E: codex-rs/features/src/lib.rs:992][E: codex-rs/features/src/lib.rs:993][E: codex-rs/features/src/lib.rs:994][E: codex-rs/features/src/lib.rs:995] |
| 33 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:266][E: codex-rs/features/src/lib.rs:998][E: codex-rs/features/src/lib.rs:999][E: codex-rs/features/src/lib.rs:1000][E: codex-rs/features/src/lib.rs:1001] |
| 34 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:268][E: codex-rs/features/src/lib.rs:1004][E: codex-rs/features/src/lib.rs:1005][E: codex-rs/features/src/lib.rs:1006][E: codex-rs/features/src/lib.rs:1007] |
| 35 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:270][E: codex-rs/features/src/lib.rs:1010][E: codex-rs/features/src/lib.rs:1011][E: codex-rs/features/src/lib.rs:1012][E: codex-rs/features/src/lib.rs:1013] |
| 36 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:272][E: codex-rs/features/src/lib.rs:1016][E: codex-rs/features/src/lib.rs:1017][E: codex-rs/features/src/lib.rs:1018][E: codex-rs/features/src/lib.rs:1019] |
| 37 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:1022][E: codex-rs/features/src/lib.rs:1023][E: codex-rs/features/src/lib.rs:1024][E: codex-rs/features/src/lib.rs:1025] |
| 38 | `NetworkProxy` | `network_proxy` | Experimental: Network proxy | `false` | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:1028][E: codex-rs/features/src/lib.rs:1029][E: codex-rs/features/src/lib.rs:1030][E: codex-rs/features/src/lib.rs:1035] |
| 39 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:1038][E: codex-rs/features/src/lib.rs:1039][E: codex-rs/features/src/lib.rs:1040][E: codex-rs/features/src/lib.rs:1041] |
| 40 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:1044][E: codex-rs/features/src/lib.rs:1045][E: codex-rs/features/src/lib.rs:1046][E: codex-rs/features/src/lib.rs:1047] |
| 41 | `MultiAgentV2` | `multi_agent_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:1050][E: codex-rs/features/src/lib.rs:1051][E: codex-rs/features/src/lib.rs:1052][E: codex-rs/features/src/lib.rs:1053] |
| 42 | `MultiAgentMode` | `multi_agent_mode` | Removed | `false` | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:1056][E: codex-rs/features/src/lib.rs:1057][E: codex-rs/features/src/lib.rs:1058][E: codex-rs/features/src/lib.rs:1059] |
| 43 | `SpawnCsv` | `enable_fanout` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:156][E: codex-rs/features/src/lib.rs:1062][E: codex-rs/features/src/lib.rs:1063][E: codex-rs/features/src/lib.rs:1064][E: codex-rs/features/src/lib.rs:1065] |
| 44 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:158][E: codex-rs/features/src/lib.rs:1068][E: codex-rs/features/src/lib.rs:1069][E: codex-rs/features/src/lib.rs:1070][E: codex-rs/features/src/lib.rs:1071] |
| 45 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:160][E: codex-rs/features/src/lib.rs:1074][E: codex-rs/features/src/lib.rs:1075][E: codex-rs/features/src/lib.rs:1076][E: codex-rs/features/src/lib.rs:1077] |
| 46 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1080][E: codex-rs/features/src/lib.rs:1081][E: codex-rs/features/src/lib.rs:1082][E: codex-rs/features/src/lib.rs:1083] |
| 47 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:1086][E: codex-rs/features/src/lib.rs:1087][E: codex-rs/features/src/lib.rs:1088][E: codex-rs/features/src/lib.rs:1089] |
| 48 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:1092][E: codex-rs/features/src/lib.rs:1093][E: codex-rs/features/src/lib.rs:1094][E: codex-rs/features/src/lib.rs:1095] |
| 49 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:1098][E: codex-rs/features/src/lib.rs:1099][E: codex-rs/features/src/lib.rs:1100][E: codex-rs/features/src/lib.rs:1101] |
| 50 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:280][E: codex-rs/features/src/lib.rs:1104][E: codex-rs/features/src/lib.rs:1105][E: codex-rs/features/src/lib.rs:1106][E: codex-rs/features/src/lib.rs:1107] |
| 51 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:170][E: codex-rs/features/src/lib.rs:1110][E: codex-rs/features/src/lib.rs:1111][E: codex-rs/features/src/lib.rs:1112][E: codex-rs/features/src/lib.rs:1113] |
| 52 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:172][E: codex-rs/features/src/lib.rs:1116][E: codex-rs/features/src/lib.rs:1117][E: codex-rs/features/src/lib.rs:1118][E: codex-rs/features/src/lib.rs:1119] |
| 53 | `ExecutorCapabilityDiscovery` | `executor_capability_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:174][E: codex-rs/features/src/lib.rs:1122][E: codex-rs/features/src/lib.rs:1123][E: codex-rs/features/src/lib.rs:1124][E: codex-rs/features/src/lib.rs:1125] |
| 54 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:176][E: codex-rs/features/src/lib.rs:1128][E: codex-rs/features/src/lib.rs:1129][E: codex-rs/features/src/lib.rs:1130][E: codex-rs/features/src/lib.rs:1131] |
| 55 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:180][E: codex-rs/features/src/lib.rs:1134][E: codex-rs/features/src/lib.rs:1135][E: codex-rs/features/src/lib.rs:1136][E: codex-rs/features/src/lib.rs:1137] |
| 56 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:184][E: codex-rs/features/src/lib.rs:1140][E: codex-rs/features/src/lib.rs:1141][E: codex-rs/features/src/lib.rs:1142][E: codex-rs/features/src/lib.rs:1143] |
| 57 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:188][E: codex-rs/features/src/lib.rs:1146][E: codex-rs/features/src/lib.rs:1147][E: codex-rs/features/src/lib.rs:1148][E: codex-rs/features/src/lib.rs:1149] |
| 58 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:192][E: codex-rs/features/src/lib.rs:1152][E: codex-rs/features/src/lib.rs:1153][E: codex-rs/features/src/lib.rs:1154][E: codex-rs/features/src/lib.rs:1155] |
| 59 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:196][E: codex-rs/features/src/lib.rs:1158][E: codex-rs/features/src/lib.rs:1159][E: codex-rs/features/src/lib.rs:1160][E: codex-rs/features/src/lib.rs:1161] |
| 60 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:198][E: codex-rs/features/src/lib.rs:1164][E: codex-rs/features/src/lib.rs:1165][E: codex-rs/features/src/lib.rs:1166][E: codex-rs/features/src/lib.rs:1167] |
| 61 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1170][E: codex-rs/features/src/lib.rs:1171][E: codex-rs/features/src/lib.rs:1172][E: codex-rs/features/src/lib.rs:1173] |
| 62 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:202][E: codex-rs/features/src/lib.rs:1176][E: codex-rs/features/src/lib.rs:1177][E: codex-rs/features/src/lib.rs:1178][E: codex-rs/features/src/lib.rs:1179] |
| 63 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:1182][E: codex-rs/features/src/lib.rs:1183][E: codex-rs/features/src/lib.rs:1184][E: codex-rs/features/src/lib.rs:1185] |
| 64 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:206][E: codex-rs/features/src/lib.rs:1188][E: codex-rs/features/src/lib.rs:1189][E: codex-rs/features/src/lib.rs:1190][E: codex-rs/features/src/lib.rs:1191] |
| 65 | `ItemIds` | `item_ids` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:208][E: codex-rs/features/src/lib.rs:1194][E: codex-rs/features/src/lib.rs:1195][E: codex-rs/features/src/lib.rs:1196][E: codex-rs/features/src/lib.rs:1197] |
| 66 | `ConcurrentReasoningSummaries` | `concurrent_reasoning_summaries` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:210][E: codex-rs/features/src/lib.rs:1200][E: codex-rs/features/src/lib.rs:1201][E: codex-rs/features/src/lib.rs:1202][E: codex-rs/features/src/lib.rs:1203] |
| 67 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:212][E: codex-rs/features/src/lib.rs:1206][E: codex-rs/features/src/lib.rs:1207][E: codex-rs/features/src/lib.rs:1208][E: codex-rs/features/src/lib.rs:1209] |
| 68 | `SkillSearch` | `skill_search` | Stable | `true` | [E: codex-rs/features/src/lib.rs:214][E: codex-rs/features/src/lib.rs:1212][E: codex-rs/features/src/lib.rs:1213][E: codex-rs/features/src/lib.rs:1214][E: codex-rs/features/src/lib.rs:1215] |
| 69 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:216][E: codex-rs/features/src/lib.rs:1218][E: codex-rs/features/src/lib.rs:1219][E: codex-rs/features/src/lib.rs:1220][E: codex-rs/features/src/lib.rs:1221] |
| 70 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:218][E: codex-rs/features/src/lib.rs:1224][E: codex-rs/features/src/lib.rs:1225][E: codex-rs/features/src/lib.rs:1226][E: codex-rs/features/src/lib.rs:1227] |
| 71 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:283][E: codex-rs/features/src/lib.rs:1230][E: codex-rs/features/src/lib.rs:1231][E: codex-rs/features/src/lib.rs:1232][E: codex-rs/features/src/lib.rs:1233] |
| 72 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:220][E: codex-rs/features/src/lib.rs:1236][E: codex-rs/features/src/lib.rs:1237][E: codex-rs/features/src/lib.rs:1238][E: codex-rs/features/src/lib.rs:1239] |
| 73 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:112][E: codex-rs/features/src/lib.rs:1242][E: codex-rs/features/src/lib.rs:1243][E: codex-rs/features/src/lib.rs:1244][E: codex-rs/features/src/lib.rs:1245] |
| 74 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:222][E: codex-rs/features/src/lib.rs:1248][E: codex-rs/features/src/lib.rs:1249][E: codex-rs/features/src/lib.rs:1250][E: codex-rs/features/src/lib.rs:1251] |
| 75 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:224][E: codex-rs/features/src/lib.rs:1254][E: codex-rs/features/src/lib.rs:1255][E: codex-rs/features/src/lib.rs:1256][E: codex-rs/features/src/lib.rs:1257] |
| 76 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:226][E: codex-rs/features/src/lib.rs:1260][E: codex-rs/features/src/lib.rs:1261][E: codex-rs/features/src/lib.rs:1262][E: codex-rs/features/src/lib.rs:1263] |
| 77 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:228][E: codex-rs/features/src/lib.rs:1266][E: codex-rs/features/src/lib.rs:1267][E: codex-rs/features/src/lib.rs:1268][E: codex-rs/features/src/lib.rs:1269] |
| 78 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:230][E: codex-rs/features/src/lib.rs:1272][E: codex-rs/features/src/lib.rs:1273][E: codex-rs/features/src/lib.rs:1274][E: codex-rs/features/src/lib.rs:1275] |
| 79 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:286][E: codex-rs/features/src/lib.rs:1278][E: codex-rs/features/src/lib.rs:1279][E: codex-rs/features/src/lib.rs:1280][E: codex-rs/features/src/lib.rs:1281] |
| 80 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:232][E: codex-rs/features/src/lib.rs:1284][E: codex-rs/features/src/lib.rs:1285][E: codex-rs/features/src/lib.rs:1286][E: codex-rs/features/src/lib.rs:1287] |
| 81 | `AuthElicitation` | `auth_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:234][E: codex-rs/features/src/lib.rs:1290][E: codex-rs/features/src/lib.rs:1291][E: codex-rs/features/src/lib.rs:1292][E: codex-rs/features/src/lib.rs:1293] |
| 82 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:236][E: codex-rs/features/src/lib.rs:1296][E: codex-rs/features/src/lib.rs:1297][E: codex-rs/features/src/lib.rs:1298][E: codex-rs/features/src/lib.rs:1299] |
| 83 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:238][E: codex-rs/features/src/lib.rs:1302][E: codex-rs/features/src/lib.rs:1303][E: codex-rs/features/src/lib.rs:1304][E: codex-rs/features/src/lib.rs:1305] |
| 84 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:240][E: codex-rs/features/src/lib.rs:1308][E: codex-rs/features/src/lib.rs:1309][E: codex-rs/features/src/lib.rs:1310][E: codex-rs/features/src/lib.rs:1311] |
| 85 | `RealtimeConversation` | `realtime_conversation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:242][E: codex-rs/features/src/lib.rs:1314][E: codex-rs/features/src/lib.rs:1315][E: codex-rs/features/src/lib.rs:1316][E: codex-rs/features/src/lib.rs:1317] |
| 86 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:288][E: codex-rs/features/src/lib.rs:1320][E: codex-rs/features/src/lib.rs:1321][E: codex-rs/features/src/lib.rs:1322][E: codex-rs/features/src/lib.rs:1323] |
| 87 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:291][E: codex-rs/features/src/lib.rs:1326][E: codex-rs/features/src/lib.rs:1327][E: codex-rs/features/src/lib.rs:1328][E: codex-rs/features/src/lib.rs:1329] |
| 88 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:293][E: codex-rs/features/src/lib.rs:1332][E: codex-rs/features/src/lib.rs:1333][E: codex-rs/features/src/lib.rs:1334][E: codex-rs/features/src/lib.rs:1335] |
| 89 | `PreventIdleSleep` | `prevent_idle_sleep` | Unknown | `false` | [E: codex-rs/features/src/lib.rs:244][E: codex-rs/features/src/lib.rs:1338][E: codex-rs/features/src/lib.rs:1339][E: codex-rs/features/src/lib.rs:1340][E: codex-rs/features/src/lib.rs:1353] |
| 90 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:296][E: codex-rs/features/src/lib.rs:1356][E: codex-rs/features/src/lib.rs:1357][E: codex-rs/features/src/lib.rs:1358][E: codex-rs/features/src/lib.rs:1359] |
| 91 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:298][E: codex-rs/features/src/lib.rs:1362][E: codex-rs/features/src/lib.rs:1363][E: codex-rs/features/src/lib.rs:1364][E: codex-rs/features/src/lib.rs:1365] |
| 92 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:300][E: codex-rs/features/src/lib.rs:1368][E: codex-rs/features/src/lib.rs:1369][E: codex-rs/features/src/lib.rs:1370][E: codex-rs/features/src/lib.rs:1371] |
| 93 | `RemoteCompactionV2` | `remote_compaction_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:246][E: codex-rs/features/src/lib.rs:1374][E: codex-rs/features/src/lib.rs:1375][E: codex-rs/features/src/lib.rs:1376][E: codex-rs/features/src/lib.rs:1377] |
| 94 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:248][E: codex-rs/features/src/lib.rs:1380][E: codex-rs/features/src/lib.rs:1381][E: codex-rs/features/src/lib.rs:1382][E: codex-rs/features/src/lib.rs:1383] |
| 95 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:250][E: codex-rs/features/src/lib.rs:1386][E: codex-rs/features/src/lib.rs:1387][E: codex-rs/features/src/lib.rs:1388][E: codex-rs/features/src/lib.rs:1389] |

## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
