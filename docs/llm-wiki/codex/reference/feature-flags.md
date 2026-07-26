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
updated: 61a44880a8
---

> 本页是 `FEATURES` registry 的全量 catalog：当前共 99 条（Stable 32、UnderDevelopment 30、Experimental 1、Deprecated 3、Removed 32、平台条件 stage 1），逐项列出 identity、canonical config key、lifecycle stage 与 default。[E: codex-rs/features/src/lib.rs:823][E: codex-rs/features/src/lib.rs:830][E: codex-rs/features/src/lib.rs:1440][I]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?

## 职责边界

本页只维护可 grep 的 registry 快照，不重复解释 feature runtime 机制；关于 `Stage`、`Features`、`FeaturesToml`、legacy keys、合并顺序、dependency normalization、metrics 与 warning，请读 `subsys.config-auth.features-system`。

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:265][E: codex-rs/features/src/lib.rs:834][E: codex-rs/features/src/lib.rs:835][E: codex-rs/features/src/lib.rs:836] |
| 2 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:88][E: codex-rs/features/src/lib.rs:840][E: codex-rs/features/src/lib.rs:841][E: codex-rs/features/src/lib.rs:842] |
| 3 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:92][E: codex-rs/features/src/lib.rs:846][E: codex-rs/features/src/lib.rs:847][E: codex-rs/features/src/lib.rs:848] |
| 4 | `UnifiedExec` | `unified_exec` | Stable | `!cfg!(windows)` | [E: codex-rs/features/src/lib.rs:104][E: codex-rs/features/src/lib.rs:852][E: codex-rs/features/src/lib.rs:853][E: codex-rs/features/src/lib.rs:854] |
| 5 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:858][E: codex-rs/features/src/lib.rs:859][E: codex-rs/features/src/lib.rs:860] |
| 6 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:112][E: codex-rs/features/src/lib.rs:864][E: codex-rs/features/src/lib.rs:865][E: codex-rs/features/src/lib.rs:866] |
| 7 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:134][E: codex-rs/features/src/lib.rs:870][E: codex-rs/features/src/lib.rs:871][E: codex-rs/features/src/lib.rs:872] |
| 8 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:136][E: codex-rs/features/src/lib.rs:876][E: codex-rs/features/src/lib.rs:877][E: codex-rs/features/src/lib.rs:878] |
| 9 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:267][E: codex-rs/features/src/lib.rs:882][E: codex-rs/features/src/lib.rs:883][E: codex-rs/features/src/lib.rs:884] |
| 10 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:96][E: codex-rs/features/src/lib.rs:888][E: codex-rs/features/src/lib.rs:889][E: codex-rs/features/src/lib.rs:890] |
| 11 | `CodeModeBufferedExec` | `code_mode_buffered_exec` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:98][E: codex-rs/features/src/lib.rs:894][E: codex-rs/features/src/lib.rs:895][E: codex-rs/features/src/lib.rs:896] |
| 12 | `CodeModeHost` | `code_mode_host` | Stable | `true` | [E: codex-rs/features/src/lib.rs:100][E: codex-rs/features/src/lib.rs:900][E: codex-rs/features/src/lib.rs:901][E: codex-rs/features/src/lib.rs:902] |
| 13 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:906][E: codex-rs/features/src/lib.rs:907][E: codex-rs/features/src/lib.rs:908] |
| 14 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:269][E: codex-rs/features/src/lib.rs:912][E: codex-rs/features/src/lib.rs:913][E: codex-rs/features/src/lib.rs:914] |
| 15 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:918][E: codex-rs/features/src/lib.rs:919][E: codex-rs/features/src/lib.rs:920] |
| 16 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:124][E: codex-rs/features/src/lib.rs:924][E: codex-rs/features/src/lib.rs:925][E: codex-rs/features/src/lib.rs:926] |
| 17 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:127][E: codex-rs/features/src/lib.rs:930][E: codex-rs/features/src/lib.rs:931][E: codex-rs/features/src/lib.rs:932] |
| 18 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:129][E: codex-rs/features/src/lib.rs:936][E: codex-rs/features/src/lib.rs:937][E: codex-rs/features/src/lib.rs:938] |
| 19 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:271][E: codex-rs/features/src/lib.rs:942][E: codex-rs/features/src/lib.rs:943][E: codex-rs/features/src/lib.rs:944] |
| 20 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:284][E: codex-rs/features/src/lib.rs:948][E: codex-rs/features/src/lib.rs:949][E: codex-rs/features/src/lib.rs:950] |
| 21 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:138][E: codex-rs/features/src/lib.rs:954][E: codex-rs/features/src/lib.rs:955][E: codex-rs/features/src/lib.rs:956] |
| 22 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:286][E: codex-rs/features/src/lib.rs:960][E: codex-rs/features/src/lib.rs:961][E: codex-rs/features/src/lib.rs:962] |
| 23 | `MemoryTool` | `memories` | Stable | `false` | [E: codex-rs/features/src/lib.rs:140][E: codex-rs/features/src/lib.rs:966][E: codex-rs/features/src/lib.rs:967][E: codex-rs/features/src/lib.rs:968] |
| 24 | `ExternalAgentMemoryImport` | `external_agent_memory_import` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:142][E: codex-rs/features/src/lib.rs:972][E: codex-rs/features/src/lib.rs:973][E: codex-rs/features/src/lib.rs:974] |
| 25 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:978][E: codex-rs/features/src/lib.rs:979][E: codex-rs/features/src/lib.rs:980] |
| 26 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:984][E: codex-rs/features/src/lib.rs:985][E: codex-rs/features/src/lib.rs:986] |
| 27 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:288][E: codex-rs/features/src/lib.rs:990][E: codex-rs/features/src/lib.rs:991][E: codex-rs/features/src/lib.rs:992] |
| 28 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:118][E: codex-rs/features/src/lib.rs:996][E: codex-rs/features/src/lib.rs:997][E: codex-rs/features/src/lib.rs:998] |
| 29 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:120][E: codex-rs/features/src/lib.rs:1002][E: codex-rs/features/src/lib.rs:1003][E: codex-rs/features/src/lib.rs:1004] |
| 30 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:90][E: codex-rs/features/src/lib.rs:1008][E: codex-rs/features/src/lib.rs:1009][E: codex-rs/features/src/lib.rs:1010] |
| 31 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:122][E: codex-rs/features/src/lib.rs:1014][E: codex-rs/features/src/lib.rs:1015][E: codex-rs/features/src/lib.rs:1016] |
| 32 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:274][E: codex-rs/features/src/lib.rs:1020][E: codex-rs/features/src/lib.rs:1021][E: codex-rs/features/src/lib.rs:1022] |
| 33 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:132][E: codex-rs/features/src/lib.rs:1026][E: codex-rs/features/src/lib.rs:1027][E: codex-rs/features/src/lib.rs:1028] |
| 34 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:276][E: codex-rs/features/src/lib.rs:1032][E: codex-rs/features/src/lib.rs:1033][E: codex-rs/features/src/lib.rs:1034] |
| 35 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:278][E: codex-rs/features/src/lib.rs:1038][E: codex-rs/features/src/lib.rs:1039][E: codex-rs/features/src/lib.rs:1040] |
| 36 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:280][E: codex-rs/features/src/lib.rs:1044][E: codex-rs/features/src/lib.rs:1045][E: codex-rs/features/src/lib.rs:1046] |
| 37 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:282][E: codex-rs/features/src/lib.rs:1050][E: codex-rs/features/src/lib.rs:1051][E: codex-rs/features/src/lib.rs:1052] |
| 38 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:1056][E: codex-rs/features/src/lib.rs:1057][E: codex-rs/features/src/lib.rs:1058] |
| 39 | `NetworkProxy` | `network_proxy` | Experimental | `false` | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:1062][E: codex-rs/features/src/lib.rs:1063][E: codex-rs/features/src/lib.rs:1068] |
| 40 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:1072][E: codex-rs/features/src/lib.rs:1073][E: codex-rs/features/src/lib.rs:1074] |
| 41 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:1078][E: codex-rs/features/src/lib.rs:1079][E: codex-rs/features/src/lib.rs:1080] |
| 42 | `MultiAgentV2` | `multi_agent_v2` | Stable | `false` | [E: codex-rs/features/src/lib.rs:156][E: codex-rs/features/src/lib.rs:1084][E: codex-rs/features/src/lib.rs:1085][E: codex-rs/features/src/lib.rs:1086] |
| 43 | `MultiAgentMode` | `multi_agent_mode` | Removed | `false` | [E: codex-rs/features/src/lib.rs:158][E: codex-rs/features/src/lib.rs:1090][E: codex-rs/features/src/lib.rs:1091][E: codex-rs/features/src/lib.rs:1092] |
| 44 | `SpawnCsv` | `enable_fanout` | Removed | `false` | [E: codex-rs/features/src/lib.rs:160][E: codex-rs/features/src/lib.rs:1096][E: codex-rs/features/src/lib.rs:1097][E: codex-rs/features/src/lib.rs:1098] |
| 45 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1102][E: codex-rs/features/src/lib.rs:1103][E: codex-rs/features/src/lib.rs:1104] |
| 46 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:1108][E: codex-rs/features/src/lib.rs:1109][E: codex-rs/features/src/lib.rs:1110] |
| 47 | `Mcp20260728` | `mcp_2026_07_28` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:1114][E: codex-rs/features/src/lib.rs:1115][E: codex-rs/features/src/lib.rs:1116] |
| 48 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:1120][E: codex-rs/features/src/lib.rs:1121][E: codex-rs/features/src/lib.rs:1122] |
| 49 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:170][E: codex-rs/features/src/lib.rs:1126][E: codex-rs/features/src/lib.rs:1127][E: codex-rs/features/src/lib.rs:1128] |
| 50 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:172][E: codex-rs/features/src/lib.rs:1132][E: codex-rs/features/src/lib.rs:1133][E: codex-rs/features/src/lib.rs:1134] |
| 51 | `DeferredToolWorldState` | `deferred_tool_world_state` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:174][E: codex-rs/features/src/lib.rs:1138][E: codex-rs/features/src/lib.rs:1139][E: codex-rs/features/src/lib.rs:1140] |
| 52 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:176][E: codex-rs/features/src/lib.rs:1144][E: codex-rs/features/src/lib.rs:1145][E: codex-rs/features/src/lib.rs:1146] |
| 53 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:290][E: codex-rs/features/src/lib.rs:1150][E: codex-rs/features/src/lib.rs:1151][E: codex-rs/features/src/lib.rs:1152] |
| 54 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:178][E: codex-rs/features/src/lib.rs:1156][E: codex-rs/features/src/lib.rs:1157][E: codex-rs/features/src/lib.rs:1158] |
| 55 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:180][E: codex-rs/features/src/lib.rs:1162][E: codex-rs/features/src/lib.rs:1163][E: codex-rs/features/src/lib.rs:1164] |
| 56 | `ExecutorCapabilityDiscovery` | `executor_capability_discovery` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:182][E: codex-rs/features/src/lib.rs:1168][E: codex-rs/features/src/lib.rs:1169][E: codex-rs/features/src/lib.rs:1170] |
| 57 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:184][E: codex-rs/features/src/lib.rs:1174][E: codex-rs/features/src/lib.rs:1175][E: codex-rs/features/src/lib.rs:1176] |
| 58 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:188][E: codex-rs/features/src/lib.rs:1180][E: codex-rs/features/src/lib.rs:1181][E: codex-rs/features/src/lib.rs:1182] |
| 59 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:192][E: codex-rs/features/src/lib.rs:1186][E: codex-rs/features/src/lib.rs:1187][E: codex-rs/features/src/lib.rs:1188] |
| 60 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:196][E: codex-rs/features/src/lib.rs:1192][E: codex-rs/features/src/lib.rs:1193][E: codex-rs/features/src/lib.rs:1194] |
| 61 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1198][E: codex-rs/features/src/lib.rs:1199][E: codex-rs/features/src/lib.rs:1200] |
| 62 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:1204][E: codex-rs/features/src/lib.rs:1205][E: codex-rs/features/src/lib.rs:1206] |
| 63 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:206][E: codex-rs/features/src/lib.rs:1210][E: codex-rs/features/src/lib.rs:1211][E: codex-rs/features/src/lib.rs:1212] |
| 64 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:208][E: codex-rs/features/src/lib.rs:1216][E: codex-rs/features/src/lib.rs:1217][E: codex-rs/features/src/lib.rs:1218] |
| 65 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:210][E: codex-rs/features/src/lib.rs:1222][E: codex-rs/features/src/lib.rs:1223][E: codex-rs/features/src/lib.rs:1224] |
| 66 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:212][E: codex-rs/features/src/lib.rs:1228][E: codex-rs/features/src/lib.rs:1229][E: codex-rs/features/src/lib.rs:1230] |
| 67 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:214][E: codex-rs/features/src/lib.rs:1234][E: codex-rs/features/src/lib.rs:1235][E: codex-rs/features/src/lib.rs:1236] |
| 68 | `ItemIds` | `item_ids` | Removed | `true` | [E: codex-rs/features/src/lib.rs:216][E: codex-rs/features/src/lib.rs:1240][E: codex-rs/features/src/lib.rs:1241][E: codex-rs/features/src/lib.rs:1242] |
| 69 | `ConcurrentReasoningSummaries` | `concurrent_reasoning_summaries` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:218][E: codex-rs/features/src/lib.rs:1246][E: codex-rs/features/src/lib.rs:1247][E: codex-rs/features/src/lib.rs:1248] |
| 70 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:220][E: codex-rs/features/src/lib.rs:1252][E: codex-rs/features/src/lib.rs:1253][E: codex-rs/features/src/lib.rs:1254] |
| 71 | `SkillSearch` | `skill_search` | Stable | `true` | [E: codex-rs/features/src/lib.rs:222][E: codex-rs/features/src/lib.rs:1258][E: codex-rs/features/src/lib.rs:1259][E: codex-rs/features/src/lib.rs:1260] |
| 72 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:224][E: codex-rs/features/src/lib.rs:1264][E: codex-rs/features/src/lib.rs:1265][E: codex-rs/features/src/lib.rs:1266] |
| 73 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:226][E: codex-rs/features/src/lib.rs:1270][E: codex-rs/features/src/lib.rs:1271][E: codex-rs/features/src/lib.rs:1272] |
| 74 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:293][E: codex-rs/features/src/lib.rs:1276][E: codex-rs/features/src/lib.rs:1277][E: codex-rs/features/src/lib.rs:1278] |
| 75 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:228][E: codex-rs/features/src/lib.rs:1282][E: codex-rs/features/src/lib.rs:1283][E: codex-rs/features/src/lib.rs:1284] |
| 76 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/features/src/lib.rs:1288][E: codex-rs/features/src/lib.rs:1289][E: codex-rs/features/src/lib.rs:1290] |
| 77 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:230][E: codex-rs/features/src/lib.rs:1294][E: codex-rs/features/src/lib.rs:1295][E: codex-rs/features/src/lib.rs:1296] |
| 78 | `GuardianV2` | `guardianv2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:232][E: codex-rs/features/src/lib.rs:1300][E: codex-rs/features/src/lib.rs:1301][E: codex-rs/features/src/lib.rs:1302] |
| 79 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:234][E: codex-rs/features/src/lib.rs:1306][E: codex-rs/features/src/lib.rs:1307][E: codex-rs/features/src/lib.rs:1308] |
| 80 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:236][E: codex-rs/features/src/lib.rs:1312][E: codex-rs/features/src/lib.rs:1313][E: codex-rs/features/src/lib.rs:1314] |
| 81 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:238][E: codex-rs/features/src/lib.rs:1318][E: codex-rs/features/src/lib.rs:1319][E: codex-rs/features/src/lib.rs:1320] |
| 82 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:240][E: codex-rs/features/src/lib.rs:1324][E: codex-rs/features/src/lib.rs:1325][E: codex-rs/features/src/lib.rs:1326] |
| 83 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:296][E: codex-rs/features/src/lib.rs:1330][E: codex-rs/features/src/lib.rs:1331][E: codex-rs/features/src/lib.rs:1332] |
| 84 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:242][E: codex-rs/features/src/lib.rs:1336][E: codex-rs/features/src/lib.rs:1337][E: codex-rs/features/src/lib.rs:1338] |
| 85 | `AuthElicitation` | `auth_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:244][E: codex-rs/features/src/lib.rs:1342][E: codex-rs/features/src/lib.rs:1343][E: codex-rs/features/src/lib.rs:1344] |
| 86 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:246][E: codex-rs/features/src/lib.rs:1348][E: codex-rs/features/src/lib.rs:1349][E: codex-rs/features/src/lib.rs:1350] |
| 87 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:248][E: codex-rs/features/src/lib.rs:1354][E: codex-rs/features/src/lib.rs:1355][E: codex-rs/features/src/lib.rs:1356] |
| 88 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:250][E: codex-rs/features/src/lib.rs:1360][E: codex-rs/features/src/lib.rs:1361][E: codex-rs/features/src/lib.rs:1362] |
| 89 | `RealtimeConversation` | `realtime_conversation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:252][E: codex-rs/features/src/lib.rs:1366][E: codex-rs/features/src/lib.rs:1367][E: codex-rs/features/src/lib.rs:1368] |
| 90 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:298][E: codex-rs/features/src/lib.rs:1372][E: codex-rs/features/src/lib.rs:1373][E: codex-rs/features/src/lib.rs:1374] |
| 91 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:301][E: codex-rs/features/src/lib.rs:1378][E: codex-rs/features/src/lib.rs:1379][E: codex-rs/features/src/lib.rs:1380] |
| 92 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:303][E: codex-rs/features/src/lib.rs:1384][E: codex-rs/features/src/lib.rs:1385][E: codex-rs/features/src/lib.rs:1386] |
| 93 | `PreventIdleSleep` | `prevent_idle_sleep` | Platform-dependent | `false` | [E: codex-rs/features/src/lib.rs:254][E: codex-rs/features/src/lib.rs:1390][E: codex-rs/features/src/lib.rs:1391][E: codex-rs/features/src/lib.rs:1404] |
| 94 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:306][E: codex-rs/features/src/lib.rs:1408][E: codex-rs/features/src/lib.rs:1409][E: codex-rs/features/src/lib.rs:1410] |
| 95 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:308][E: codex-rs/features/src/lib.rs:1414][E: codex-rs/features/src/lib.rs:1415][E: codex-rs/features/src/lib.rs:1416] |
| 96 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:310][E: codex-rs/features/src/lib.rs:1420][E: codex-rs/features/src/lib.rs:1421][E: codex-rs/features/src/lib.rs:1422] |
| 97 | `RemoteCompactionV2` | `remote_compaction_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:256][E: codex-rs/features/src/lib.rs:1426][E: codex-rs/features/src/lib.rs:1427][E: codex-rs/features/src/lib.rs:1428] |
| 98 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:258][E: codex-rs/features/src/lib.rs:1432][E: codex-rs/features/src/lib.rs:1433][E: codex-rs/features/src/lib.rs:1434] |
| 99 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:260][E: codex-rs/features/src/lib.rs:1438][E: codex-rs/features/src/lib.rs:1439][E: codex-rs/features/src/lib.rs:1440] |
## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
