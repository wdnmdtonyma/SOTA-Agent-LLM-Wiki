---
id: ref.feature-flags
title: Feature flags 全量索引
kind: reference
tier: T3
source: [codex-rs/features/src/lib.rs]
symbols: [Stage, Feature, Features, FeatureConfigSource, FeaturesToml, FeatureToml, FeatureSpec, FEATURES]
related: [config.skills-plugins-features, ref.key-types, ref.crate-index, subsys.config-auth.features-system]
evidence: explicit
status: verified
updated: db887d03e1
---

> `codex-rs/features/src/lib.rs` is the source of truth for Codex feature flags: it defines the lifecycle `Stage`, the `Feature` enum, the effective `Features` set, TOML inputs, and the `FEATURES` registry whose current table has 92 `FeatureSpec` entries.[E: codex-rs/features/src/lib.rs:36][E: codex-rs/features/src/lib.rs:84][E: codex-rs/features/src/lib.rs:327][E: codex-rs/features/src/lib.rs:633][E: codex-rs/features/src/lib.rs:785][E: codex-rs/features/src/lib.rs:793][E: codex-rs/features/src/lib.rs:1367]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?
- `Features::with_defaults()` 如何把 registry default 转成 effective set?
- `Features::from_sources()` 如何合并 base/profile/override 输入?
- `FeaturesToml` 哪些字段是 structured config, 哪些是 flattened bool entries?
- feature dependency normalization 当前会自动补哪些依赖?

## Stage 与解析机制

`Stage` has five lifecycle forms: `UnderDevelopment`, `Experimental { name, menu_description, announcement }`, `Stable`, `Deprecated`, and `Removed`; experimental stages carry menu-facing fields exposed by `experimental_menu_name()`, `experimental_menu_description()`, and `experimental_announcement()`.[E: codex-rs/features/src/lib.rs:36][E: codex-rs/features/src/lib.rs:38][E: codex-rs/features/src/lib.rs:40][E: codex-rs/features/src/lib.rs:41][E: codex-rs/features/src/lib.rs:42][E: codex-rs/features/src/lib.rs:43][E: codex-rs/features/src/lib.rs:46][E: codex-rs/features/src/lib.rs:48][E: codex-rs/features/src/lib.rs:50][E: codex-rs/features/src/lib.rs:54][E: codex-rs/features/src/lib.rs:61][E: codex-rs/features/src/lib.rs:70]

`Feature` methods resolve metadata through `FEATURES`: `key()`, `stage()`, and `default_enabled()` all call `info()`, which finds the matching `FeatureSpec` by `id`.[E: codex-rs/features/src/lib.rs:298][E: codex-rs/features/src/lib.rs:299][E: codex-rs/features/src/lib.rs:300][E: codex-rs/features/src/lib.rs:303][E: codex-rs/features/src/lib.rs:304][E: codex-rs/features/src/lib.rs:307][E: codex-rs/features/src/lib.rs:308][E: codex-rs/features/src/lib.rs:311][E: codex-rs/features/src/lib.rs:312][E: codex-rs/features/src/lib.rs:314]

## Effective set 生成

`Features::with_defaults()` starts from an empty `BTreeSet`, walks every `FeatureSpec`, and inserts only specs whose `default_enabled` is true.[E: codex-rs/features/src/lib.rs:358][E: codex-rs/features/src/lib.rs:360][E: codex-rs/features/src/lib.rs:361][E: codex-rs/features/src/lib.rs:362][E: codex-rs/features/src/lib.rs:363][E: codex-rs/features/src/lib.rs:364][E: codex-rs/features/src/lib.rs:367]

`Features::from_sources()` starts with built-in defaults, applies legacy unified-exec toggles and TOML feature entries from base then profile sources, applies explicit overrides, and then calls `normalize_dependencies()`.[E: codex-rs/features/src/lib.rs:519][E: codex-rs/features/src/lib.rs:524][E: codex-rs/features/src/lib.rs:526][E: codex-rs/features/src/lib.rs:527][E: codex-rs/features/src/lib.rs:530][E: codex-rs/features/src/lib.rs:532][E: codex-rs/features/src/lib.rs:533][E: codex-rs/features/src/lib.rs:537][E: codex-rs/features/src/lib.rs:538]

`normalize_dependencies()` currently has two automatic adjustments: enabling `SpawnCsv` also enables `Collab`, and enabling `CodeModeOnly` also enables `CodeMode`.[E: codex-rs/features/src/lib.rs:547][E: codex-rs/features/src/lib.rs:548][E: codex-rs/features/src/lib.rs:549][E: codex-rs/features/src/lib.rs:551][E: codex-rs/features/src/lib.rs:552]

## TOML 与 legacy 兼容

`FeaturesToml` has structured optional config fields for `code_mode`, `multi_agent_v2`, `token_budget`, `rollout_budget`, `current_time_reminder`, a removed compatibility-only `apps_mcp_path_override`, and `network_proxy`; all remaining boolean toggles are captured by the flattened `entries: BTreeMap<String, bool>`.[E: codex-rs/features/src/lib.rs:635][E: codex-rs/features/src/lib.rs:637][E: codex-rs/features/src/lib.rs:639][E: codex-rs/features/src/lib.rs:641][E: codex-rs/features/src/lib.rs:643][E: codex-rs/features/src/lib.rs:645][E: codex-rs/features/src/lib.rs:646][E: codex-rs/features/src/lib.rs:649][E: codex-rs/features/src/lib.rs:652]

`FeaturesToml::entries()` clones flattened entries and materializes structured `code_mode`, `multi_agent_v2`, `token_budget`, `rollout_budget`, `current_time_reminder`, and `network_proxy` enabled states back under their canonical feature keys before `Features::apply_toml()` calls `apply_map()`.[E: codex-rs/features/src/lib.rs:656][E: codex-rs/features/src/lib.rs:657][E: codex-rs/features/src/lib.rs:658][E: codex-rs/features/src/lib.rs:670][E: codex-rs/features/src/lib.rs:671][E: codex-rs/features/src/lib.rs:672][E: codex-rs/features/src/lib.rs:675][E: codex-rs/features/src/lib.rs:678][E: codex-rs/features/src/lib.rs:681][E: codex-rs/features/src/lib.rs:684][E: codex-rs/features/src/lib.rs:691][E: codex-rs/features/src/lib.rs:692]

`feature_for_key()` first matches canonical keys from `FEATURES` and then delegates to the legacy key map; `apply_map()` warns on unknown feature keys rather than failing config parsing.[E: codex-rs/features/src/lib.rs:611][E: codex-rs/features/src/lib.rs:612][E: codex-rs/features/src/lib.rs:613][E: codex-rs/features/src/lib.rs:614][E: codex-rs/features/src/lib.rs:618][E: codex-rs/features/src/lib.rs:512][E: codex-rs/features/src/lib.rs:513]

`emit_metrics()` skips removed features and emits `codex.feature.state` only when the effective enabled state differs from the registry default.[E: codex-rs/features/src/lib.rs:424][E: codex-rs/features/src/lib.rs:425][E: codex-rs/features/src/lib.rs:426][E: codex-rs/features/src/lib.rs:429][E: codex-rs/features/src/lib.rs:430][E: codex-rs/features/src/lib.rs:431][E: codex-rs/features/src/lib.rs:434][E: codex-rs/features/src/lib.rs:435]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:249][E: codex-rs/features/src/lib.rs:797][E: codex-rs/features/src/lib.rs:798][E: codex-rs/features/src/lib.rs:799] |
| 2 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:86][E: codex-rs/features/src/lib.rs:803][E: codex-rs/features/src/lib.rs:804][E: codex-rs/features/src/lib.rs:805] |
| 3 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:90][E: codex-rs/features/src/lib.rs:809][E: codex-rs/features/src/lib.rs:810][E: codex-rs/features/src/lib.rs:811] |
| 4 | `UnifiedExec` | `unified_exec` | Stable | `!cfg!(windows)` | [E: codex-rs/features/src/lib.rs:100][E: codex-rs/features/src/lib.rs:815][E: codex-rs/features/src/lib.rs:816][E: codex-rs/features/src/lib.rs:817] |
| 5 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:821][E: codex-rs/features/src/lib.rs:822][E: codex-rs/features/src/lib.rs:823] |
| 6 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:827][E: codex-rs/features/src/lib.rs:828][E: codex-rs/features/src/lib.rs:829] |
| 7 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:130][E: codex-rs/features/src/lib.rs:833][E: codex-rs/features/src/lib.rs:834][E: codex-rs/features/src/lib.rs:835] |
| 8 | `DeferredExecutor` | `deferred_executor` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:132][E: codex-rs/features/src/lib.rs:839][E: codex-rs/features/src/lib.rs:840][E: codex-rs/features/src/lib.rs:841] |
| 9 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:251][E: codex-rs/features/src/lib.rs:845][E: codex-rs/features/src/lib.rs:846][E: codex-rs/features/src/lib.rs:847] |
| 10 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:94][E: codex-rs/features/src/lib.rs:851][E: codex-rs/features/src/lib.rs:852][E: codex-rs/features/src/lib.rs:853] |
| 11 | `CodeModeHost` | `code_mode_host` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:96][E: codex-rs/features/src/lib.rs:857][E: codex-rs/features/src/lib.rs:858][E: codex-rs/features/src/lib.rs:859] |
| 12 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:98][E: codex-rs/features/src/lib.rs:863][E: codex-rs/features/src/lib.rs:864][E: codex-rs/features/src/lib.rs:865] |
| 13 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:253][E: codex-rs/features/src/lib.rs:869][E: codex-rs/features/src/lib.rs:870][E: codex-rs/features/src/lib.rs:871] |
| 14 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:110][E: codex-rs/features/src/lib.rs:875][E: codex-rs/features/src/lib.rs:876][E: codex-rs/features/src/lib.rs:877] |
| 15 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:120][E: codex-rs/features/src/lib.rs:881][E: codex-rs/features/src/lib.rs:882][E: codex-rs/features/src/lib.rs:883] |
| 16 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:123][E: codex-rs/features/src/lib.rs:887][E: codex-rs/features/src/lib.rs:888][E: codex-rs/features/src/lib.rs:889] |
| 17 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:125][E: codex-rs/features/src/lib.rs:893][E: codex-rs/features/src/lib.rs:894][E: codex-rs/features/src/lib.rs:895] |
| 18 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:255][E: codex-rs/features/src/lib.rs:899][E: codex-rs/features/src/lib.rs:900][E: codex-rs/features/src/lib.rs:901] |
| 19 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:268][E: codex-rs/features/src/lib.rs:905][E: codex-rs/features/src/lib.rs:906][E: codex-rs/features/src/lib.rs:907] |
| 20 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:134][E: codex-rs/features/src/lib.rs:911][E: codex-rs/features/src/lib.rs:912][E: codex-rs/features/src/lib.rs:913] |
| 21 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:270][E: codex-rs/features/src/lib.rs:917][E: codex-rs/features/src/lib.rs:918][E: codex-rs/features/src/lib.rs:919] |
| 22 | `MemoryTool` | `memories` | Experimental: Memories | `false` | [E: codex-rs/features/src/lib.rs:136][E: codex-rs/features/src/lib.rs:923][E: codex-rs/features/src/lib.rs:924][E: codex-rs/features/src/lib.rs:925][E: codex-rs/features/src/lib.rs:929] |
| 23 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:138][E: codex-rs/features/src/lib.rs:933][E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:935] |
| 24 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:140][E: codex-rs/features/src/lib.rs:939][E: codex-rs/features/src/lib.rs:940][E: codex-rs/features/src/lib.rs:941] |
| 25 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:272][E: codex-rs/features/src/lib.rs:945][E: codex-rs/features/src/lib.rs:946][E: codex-rs/features/src/lib.rs:947] |
| 26 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:951][E: codex-rs/features/src/lib.rs:952][E: codex-rs/features/src/lib.rs:953] |
| 27 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/features/src/lib.rs:957][E: codex-rs/features/src/lib.rs:958][E: codex-rs/features/src/lib.rs:959] |
| 28 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:88][E: codex-rs/features/src/lib.rs:963][E: codex-rs/features/src/lib.rs:964][E: codex-rs/features/src/lib.rs:965] |
| 29 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:118][E: codex-rs/features/src/lib.rs:969][E: codex-rs/features/src/lib.rs:970][E: codex-rs/features/src/lib.rs:971] |
| 30 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:258][E: codex-rs/features/src/lib.rs:975][E: codex-rs/features/src/lib.rs:976][E: codex-rs/features/src/lib.rs:977] |
| 31 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:128][E: codex-rs/features/src/lib.rs:981][E: codex-rs/features/src/lib.rs:982][E: codex-rs/features/src/lib.rs:983] |
| 32 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:260][E: codex-rs/features/src/lib.rs:987][E: codex-rs/features/src/lib.rs:988][E: codex-rs/features/src/lib.rs:989] |
| 33 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:262][E: codex-rs/features/src/lib.rs:993][E: codex-rs/features/src/lib.rs:994][E: codex-rs/features/src/lib.rs:995] |
| 34 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:264][E: codex-rs/features/src/lib.rs:999][E: codex-rs/features/src/lib.rs:1000][E: codex-rs/features/src/lib.rs:1001] |
| 35 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:266][E: codex-rs/features/src/lib.rs:1005][E: codex-rs/features/src/lib.rs:1006][E: codex-rs/features/src/lib.rs:1007] |
| 36 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:142][E: codex-rs/features/src/lib.rs:1011][E: codex-rs/features/src/lib.rs:1012][E: codex-rs/features/src/lib.rs:1013] |
| 37 | `NetworkProxy` | `network_proxy` | Experimental: Network proxy | `false` | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:1017][E: codex-rs/features/src/lib.rs:1018][E: codex-rs/features/src/lib.rs:1019][E: codex-rs/features/src/lib.rs:1023] |
| 38 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:1027][E: codex-rs/features/src/lib.rs:1028][E: codex-rs/features/src/lib.rs:1029] |
| 39 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:1033][E: codex-rs/features/src/lib.rs:1034][E: codex-rs/features/src/lib.rs:1035] |
| 40 | `MultiAgentV2` | `multi_agent_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:1039][E: codex-rs/features/src/lib.rs:1040][E: codex-rs/features/src/lib.rs:1041] |
| 41 | `MultiAgentMode` | `multi_agent_mode` | Removed | `false` | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:1045][E: codex-rs/features/src/lib.rs:1046][E: codex-rs/features/src/lib.rs:1047] |
| 42 | `SpawnCsv` | `enable_fanout` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:1051][E: codex-rs/features/src/lib.rs:1052][E: codex-rs/features/src/lib.rs:1053] |
| 43 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:156][E: codex-rs/features/src/lib.rs:1057][E: codex-rs/features/src/lib.rs:1058][E: codex-rs/features/src/lib.rs:1059] |
| 44 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:158][E: codex-rs/features/src/lib.rs:1063][E: codex-rs/features/src/lib.rs:1064][E: codex-rs/features/src/lib.rs:1065] |
| 45 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:160][E: codex-rs/features/src/lib.rs:1069][E: codex-rs/features/src/lib.rs:1070][E: codex-rs/features/src/lib.rs:1071] |
| 46 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1075][E: codex-rs/features/src/lib.rs:1076][E: codex-rs/features/src/lib.rs:1077] |
| 47 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | Removed | `true` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:1081][E: codex-rs/features/src/lib.rs:1082][E: codex-rs/features/src/lib.rs:1083] |
| 48 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:1087][E: codex-rs/features/src/lib.rs:1088][E: codex-rs/features/src/lib.rs:1089] |
| 49 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:274][E: codex-rs/features/src/lib.rs:1093][E: codex-rs/features/src/lib.rs:1094][E: codex-rs/features/src/lib.rs:1095] |
| 50 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:1099][E: codex-rs/features/src/lib.rs:1100][E: codex-rs/features/src/lib.rs:1101] |
| 51 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:170][E: codex-rs/features/src/lib.rs:1105][E: codex-rs/features/src/lib.rs:1106][E: codex-rs/features/src/lib.rs:1107] |
| 52 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:172][E: codex-rs/features/src/lib.rs:1111][E: codex-rs/features/src/lib.rs:1112][E: codex-rs/features/src/lib.rs:1113] |
| 53 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:176][E: codex-rs/features/src/lib.rs:1117][E: codex-rs/features/src/lib.rs:1118][E: codex-rs/features/src/lib.rs:1119] |
| 54 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:180][E: codex-rs/features/src/lib.rs:1123][E: codex-rs/features/src/lib.rs:1124][E: codex-rs/features/src/lib.rs:1125] |
| 55 | `BrowserUseFullCdpAccess` | `browser_use_full_cdp_access` | Stable | `true` | [E: codex-rs/features/src/lib.rs:184][E: codex-rs/features/src/lib.rs:1129][E: codex-rs/features/src/lib.rs:1130][E: codex-rs/features/src/lib.rs:1131] |
| 56 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:188][E: codex-rs/features/src/lib.rs:1135][E: codex-rs/features/src/lib.rs:1136][E: codex-rs/features/src/lib.rs:1137] |
| 57 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:192][E: codex-rs/features/src/lib.rs:1141][E: codex-rs/features/src/lib.rs:1142][E: codex-rs/features/src/lib.rs:1143] |
| 58 | `RemotePlugin` | `remote_plugin` | Stable | `true` | [E: codex-rs/features/src/lib.rs:194][E: codex-rs/features/src/lib.rs:1147][E: codex-rs/features/src/lib.rs:1148][E: codex-rs/features/src/lib.rs:1149] |
| 59 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:196][E: codex-rs/features/src/lib.rs:1153][E: codex-rs/features/src/lib.rs:1154][E: codex-rs/features/src/lib.rs:1155] |
| 60 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:198][E: codex-rs/features/src/lib.rs:1159][E: codex-rs/features/src/lib.rs:1160][E: codex-rs/features/src/lib.rs:1161] |
| 61 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1165][E: codex-rs/features/src/lib.rs:1166][E: codex-rs/features/src/lib.rs:1167] |
| 62 | `ImageGenExt` | `imagegenext` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:202][E: codex-rs/features/src/lib.rs:1171][E: codex-rs/features/src/lib.rs:1172][E: codex-rs/features/src/lib.rs:1173] |
| 63 | `ResizeAllImages` | `resize_all_images` | Removed | `true` | [E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:1177][E: codex-rs/features/src/lib.rs:1178][E: codex-rs/features/src/lib.rs:1179] |
| 64 | `ItemIds` | `item_ids` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:206][E: codex-rs/features/src/lib.rs:1183][E: codex-rs/features/src/lib.rs:1184][E: codex-rs/features/src/lib.rs:1185] |
| 65 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:208][E: codex-rs/features/src/lib.rs:1189][E: codex-rs/features/src/lib.rs:1190][E: codex-rs/features/src/lib.rs:1191] |
| 66 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:210][E: codex-rs/features/src/lib.rs:1195][E: codex-rs/features/src/lib.rs:1196][E: codex-rs/features/src/lib.rs:1197] |
| 67 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:212][E: codex-rs/features/src/lib.rs:1201][E: codex-rs/features/src/lib.rs:1202][E: codex-rs/features/src/lib.rs:1203] |
| 68 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:277][E: codex-rs/features/src/lib.rs:1207][E: codex-rs/features/src/lib.rs:1208][E: codex-rs/features/src/lib.rs:1209] |
| 69 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:214][E: codex-rs/features/src/lib.rs:1213][E: codex-rs/features/src/lib.rs:1214][E: codex-rs/features/src/lib.rs:1215] |
| 70 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:112][E: codex-rs/features/src/lib.rs:1219][E: codex-rs/features/src/lib.rs:1220][E: codex-rs/features/src/lib.rs:1221] |
| 71 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:216][E: codex-rs/features/src/lib.rs:1225][E: codex-rs/features/src/lib.rs:1226][E: codex-rs/features/src/lib.rs:1227] |
| 72 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:218][E: codex-rs/features/src/lib.rs:1231][E: codex-rs/features/src/lib.rs:1232][E: codex-rs/features/src/lib.rs:1233] |
| 73 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:220][E: codex-rs/features/src/lib.rs:1237][E: codex-rs/features/src/lib.rs:1238][E: codex-rs/features/src/lib.rs:1239] |
| 74 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:222][E: codex-rs/features/src/lib.rs:1243][E: codex-rs/features/src/lib.rs:1244][E: codex-rs/features/src/lib.rs:1245] |
| 75 | `CurrentTimeReminder` | `current_time_reminder` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:224][E: codex-rs/features/src/lib.rs:1249][E: codex-rs/features/src/lib.rs:1250][E: codex-rs/features/src/lib.rs:1251] |
| 76 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:280][E: codex-rs/features/src/lib.rs:1255][E: codex-rs/features/src/lib.rs:1256][E: codex-rs/features/src/lib.rs:1257] |
| 77 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:226][E: codex-rs/features/src/lib.rs:1261][E: codex-rs/features/src/lib.rs:1262][E: codex-rs/features/src/lib.rs:1263] |
| 78 | `AuthElicitation` | `auth_elicitation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:228][E: codex-rs/features/src/lib.rs:1267][E: codex-rs/features/src/lib.rs:1268][E: codex-rs/features/src/lib.rs:1269] |
| 79 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:230][E: codex-rs/features/src/lib.rs:1273][E: codex-rs/features/src/lib.rs:1274][E: codex-rs/features/src/lib.rs:1275] |
| 80 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:232][E: codex-rs/features/src/lib.rs:1279][E: codex-rs/features/src/lib.rs:1280][E: codex-rs/features/src/lib.rs:1281] |
| 81 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:234][E: codex-rs/features/src/lib.rs:1285][E: codex-rs/features/src/lib.rs:1286][E: codex-rs/features/src/lib.rs:1287] |
| 82 | `RealtimeConversation` | `realtime_conversation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:236][E: codex-rs/features/src/lib.rs:1291][E: codex-rs/features/src/lib.rs:1292][E: codex-rs/features/src/lib.rs:1293] |
| 83 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:282][E: codex-rs/features/src/lib.rs:1297][E: codex-rs/features/src/lib.rs:1298][E: codex-rs/features/src/lib.rs:1299] |
| 84 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:285][E: codex-rs/features/src/lib.rs:1303][E: codex-rs/features/src/lib.rs:1304][E: codex-rs/features/src/lib.rs:1305] |
| 85 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:287][E: codex-rs/features/src/lib.rs:1309][E: codex-rs/features/src/lib.rs:1310][E: codex-rs/features/src/lib.rs:1311] |
| 86 | `PreventIdleSleep` | `prevent_idle_sleep` | Conditional experimental on macOS/Linux/Windows; otherwise UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:238][E: codex-rs/features/src/lib.rs:1315][E: codex-rs/features/src/lib.rs:1316][E: codex-rs/features/src/lib.rs:1321][E: codex-rs/features/src/lib.rs:1327][E: codex-rs/features/src/lib.rs:1329] |
| 87 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:290][E: codex-rs/features/src/lib.rs:1333][E: codex-rs/features/src/lib.rs:1334][E: codex-rs/features/src/lib.rs:1335] |
| 88 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:292][E: codex-rs/features/src/lib.rs:1339][E: codex-rs/features/src/lib.rs:1340][E: codex-rs/features/src/lib.rs:1341] |
| 89 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:294][E: codex-rs/features/src/lib.rs:1345][E: codex-rs/features/src/lib.rs:1346][E: codex-rs/features/src/lib.rs:1347] |
| 90 | `RemoteCompactionV2` | `remote_compaction_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:240][E: codex-rs/features/src/lib.rs:1351][E: codex-rs/features/src/lib.rs:1352][E: codex-rs/features/src/lib.rs:1353] |
| 91 | `UseAgentIdentity` | `use_agent_identity` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:242][E: codex-rs/features/src/lib.rs:1357][E: codex-rs/features/src/lib.rs:1358][E: codex-rs/features/src/lib.rs:1359] |
| 92 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:244][E: codex-rs/features/src/lib.rs:1363][E: codex-rs/features/src/lib.rs:1364][E: codex-rs/features/src/lib.rs:1365] |

## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
