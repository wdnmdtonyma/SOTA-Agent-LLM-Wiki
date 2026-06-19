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
updated: 5670360009
---

> `codex-rs/features/src/lib.rs` is the source of truth for Codex feature flags: it defines the lifecycle `Stage`, the `Feature` enum, the effective `Features` set, TOML inputs, and the `FEATURES` registry whose current table has 87 `FeatureSpec` entries.[E: codex-rs/features/src/lib.rs:30][E: codex-rs/features/src/lib.rs:79][E: codex-rs/features/src/lib.rs:310][E: codex-rs/features/src/lib.rs:617][E: codex-rs/features/src/lib.rs:748][E: codex-rs/features/src/lib.rs:757][E: codex-rs/features/src/lib.rs:1301]

## 能回答的问题

- Codex 当前有哪些 feature flags, and what are their config keys?
- 每个 feature flag 的 lifecycle stage 和 default state 是什么?
- `Features::with_defaults()` 如何把 registry default 转成 effective set?
- `Features::from_sources()` 如何合并 base/profile/override 输入?
- `FeaturesToml` 哪些字段是 structured config, 哪些是 flattened bool entries?
- feature dependency normalization 当前会自动补哪些依赖?

## Stage 与解析机制

`Stage` has five lifecycle forms: `UnderDevelopment`, `Experimental { name, menu_description, announcement }`, `Stable`, `Deprecated`, and `Removed`; experimental stages carry menu-facing fields exposed by `experimental_menu_name()`, `experimental_menu_description()`, and `experimental_announcement()`.[E: codex-rs/features/src/lib.rs:30][E: codex-rs/features/src/lib.rs:34][E: codex-rs/features/src/lib.rs:36][E: codex-rs/features/src/lib.rs:37][E: codex-rs/features/src/lib.rs:38][E: codex-rs/features/src/lib.rs:39][E: codex-rs/features/src/lib.rs:42][E: codex-rs/features/src/lib.rs:44][E: codex-rs/features/src/lib.rs:46][E: codex-rs/features/src/lib.rs:50][E: codex-rs/features/src/lib.rs:57][E: codex-rs/features/src/lib.rs:66]

`Feature` methods resolve metadata through `FEATURES`: `key()`, `stage()`, and `default_enabled()` all call `info()`, which finds the matching `FeatureSpec` by `id`.[E: codex-rs/features/src/lib.rs:281][E: codex-rs/features/src/lib.rs:282][E: codex-rs/features/src/lib.rs:283][E: codex-rs/features/src/lib.rs:286][E: codex-rs/features/src/lib.rs:287][E: codex-rs/features/src/lib.rs:290][E: codex-rs/features/src/lib.rs:291][E: codex-rs/features/src/lib.rs:294][E: codex-rs/features/src/lib.rs:295][E: codex-rs/features/src/lib.rs:297]

## Effective set 生成

`Features::with_defaults()` starts from an empty `BTreeSet`, walks every `FeatureSpec`, and inserts only specs whose `default_enabled` is true.[E: codex-rs/features/src/lib.rs:341][E: codex-rs/features/src/lib.rs:343][E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:345][E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:347][E: codex-rs/features/src/lib.rs:350]

`Features::from_sources()` starts with built-in defaults, applies legacy unified-exec toggles and TOML feature entries from base then profile sources, applies explicit overrides, and then calls `normalize_dependencies()`.[E: codex-rs/features/src/lib.rs:503][E: codex-rs/features/src/lib.rs:508][E: codex-rs/features/src/lib.rs:510][E: codex-rs/features/src/lib.rs:511][E: codex-rs/features/src/lib.rs:514][E: codex-rs/features/src/lib.rs:516][E: codex-rs/features/src/lib.rs:517][E: codex-rs/features/src/lib.rs:521][E: codex-rs/features/src/lib.rs:522]

`normalize_dependencies()` currently has two automatic adjustments: enabling `SpawnCsv` also enables `Collab`, and enabling `CodeModeOnly` also enables `CodeMode`.[E: codex-rs/features/src/lib.rs:531][E: codex-rs/features/src/lib.rs:532][E: codex-rs/features/src/lib.rs:533][E: codex-rs/features/src/lib.rs:535][E: codex-rs/features/src/lib.rs:536]

## TOML 与 legacy 兼容

`FeaturesToml` has structured optional config fields for `code_mode`, `multi_agent_v2`, `rollout_budget`, a removed compatibility-only `apps_mcp_path_override`, and `network_proxy`; all remaining boolean toggles are captured by the flattened `entries: BTreeMap<String, bool>`.[E: codex-rs/features/src/lib.rs:617][E: codex-rs/features/src/lib.rs:619][E: codex-rs/features/src/lib.rs:621][E: codex-rs/features/src/lib.rs:623][E: codex-rs/features/src/lib.rs:625][E: codex-rs/features/src/lib.rs:626][E: codex-rs/features/src/lib.rs:629][E: codex-rs/features/src/lib.rs:630][E: codex-rs/features/src/lib.rs:632]

`FeaturesToml::entries()` clones flattened entries and materializes structured `code_mode`, `multi_agent_v2`, `rollout_budget`, and `network_proxy` enabled states back under their canonical feature keys before `Features::apply_toml()` calls `apply_map()`.[E: codex-rs/features/src/lib.rs:635][E: codex-rs/features/src/lib.rs:636][E: codex-rs/features/src/lib.rs:637][E: codex-rs/features/src/lib.rs:638][E: codex-rs/features/src/lib.rs:650][E: codex-rs/features/src/lib.rs:651][E: codex-rs/features/src/lib.rs:652][E: codex-rs/features/src/lib.rs:653][E: codex-rs/features/src/lib.rs:655][E: codex-rs/features/src/lib.rs:656][E: codex-rs/features/src/lib.rs:658][E: codex-rs/features/src/lib.rs:659][E: codex-rs/features/src/lib.rs:661][E: codex-rs/features/src/lib.rs:662]

`feature_for_key()` first matches canonical keys from `FEATURES` and then delegates to the legacy key map; `apply_map()` warns on unknown feature keys rather than failing config parsing.[E: codex-rs/features/src/lib.rs:595][E: codex-rs/features/src/lib.rs:596][E: codex-rs/features/src/lib.rs:597][E: codex-rs/features/src/lib.rs:598][E: codex-rs/features/src/lib.rs:602][E: codex-rs/features/src/lib.rs:496][E: codex-rs/features/src/lib.rs:497]

`emit_metrics()` skips removed features and emits `codex.feature.state` only when the effective enabled state differs from the registry default.[E: codex-rs/features/src/lib.rs:407][E: codex-rs/features/src/lib.rs:408][E: codex-rs/features/src/lib.rs:409][E: codex-rs/features/src/lib.rs:412][E: codex-rs/features/src/lib.rs:413][E: codex-rs/features/src/lib.rs:414][E: codex-rs/features/src/lib.rs:417][E: codex-rs/features/src/lib.rs:418]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `GhostCommit` | `undo` | Removed | `false` | [E: codex-rs/features/src/lib.rs:233][E: codex-rs/features/src/lib.rs:760][E: codex-rs/features/src/lib.rs:761][E: codex-rs/features/src/lib.rs:762][E: codex-rs/features/src/lib.rs:763] |
| 2 | `ShellTool` | `shell_tool` | Stable | `true` | [E: codex-rs/features/src/lib.rs:82][E: codex-rs/features/src/lib.rs:766][E: codex-rs/features/src/lib.rs:767][E: codex-rs/features/src/lib.rs:768][E: codex-rs/features/src/lib.rs:769] |
| 3 | `SecretAuthStorage` | `secret_auth_storage` | Stable | `cfg!(windows)` | [E: codex-rs/features/src/lib.rs:86][E: codex-rs/features/src/lib.rs:772][E: codex-rs/features/src/lib.rs:773][E: codex-rs/features/src/lib.rs:774][E: codex-rs/features/src/lib.rs:775] |
| 4 | `UnifiedExec` | `unified_exec` | Stable | `!cfg!(windows)` | [E: codex-rs/features/src/lib.rs:94][E: codex-rs/features/src/lib.rs:778][E: codex-rs/features/src/lib.rs:779][E: codex-rs/features/src/lib.rs:780][E: codex-rs/features/src/lib.rs:781] |
| 5 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:96][E: codex-rs/features/src/lib.rs:784][E: codex-rs/features/src/lib.rs:785][E: codex-rs/features/src/lib.rs:786][E: codex-rs/features/src/lib.rs:787] |
| 6 | `UnifiedExecZshFork` | `unified_exec_zsh_fork` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:102][E: codex-rs/features/src/lib.rs:790][E: codex-rs/features/src/lib.rs:791][E: codex-rs/features/src/lib.rs:792][E: codex-rs/features/src/lib.rs:793] |
| 7 | `ShellSnapshot` | `shell_snapshot` | Stable | `true` | [E: codex-rs/features/src/lib.rs:124][E: codex-rs/features/src/lib.rs:796][E: codex-rs/features/src/lib.rs:797][E: codex-rs/features/src/lib.rs:798][E: codex-rs/features/src/lib.rs:799] |
| 8 | `JsRepl` | `js_repl` | Removed | `false` | [E: codex-rs/features/src/lib.rs:235][E: codex-rs/features/src/lib.rs:802][E: codex-rs/features/src/lib.rs:803][E: codex-rs/features/src/lib.rs:804][E: codex-rs/features/src/lib.rs:805] |
| 9 | `CodeMode` | `code_mode` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:90][E: codex-rs/features/src/lib.rs:808][E: codex-rs/features/src/lib.rs:809][E: codex-rs/features/src/lib.rs:810][E: codex-rs/features/src/lib.rs:811] |
| 10 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:92][E: codex-rs/features/src/lib.rs:814][E: codex-rs/features/src/lib.rs:815][E: codex-rs/features/src/lib.rs:816][E: codex-rs/features/src/lib.rs:817] |
| 11 | `JsReplToolsOnly` | `js_repl_tools_only` | Removed | `false` | [E: codex-rs/features/src/lib.rs:237][E: codex-rs/features/src/lib.rs:820][E: codex-rs/features/src/lib.rs:821][E: codex-rs/features/src/lib.rs:822][E: codex-rs/features/src/lib.rs:823] |
| 12 | `TerminalResizeReflow` | `terminal_resize_reflow` | Removed | `true` | [E: codex-rs/features/src/lib.rs:104][E: codex-rs/features/src/lib.rs:826][E: codex-rs/features/src/lib.rs:827][E: codex-rs/features/src/lib.rs:828][E: codex-rs/features/src/lib.rs:829] |
| 13 | `WebSearchRequest` | `web_search_request` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:832][E: codex-rs/features/src/lib.rs:833][E: codex-rs/features/src/lib.rs:834][E: codex-rs/features/src/lib.rs:835] |
| 14 | `WebSearchCached` | `web_search_cached` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:117][E: codex-rs/features/src/lib.rs:838][E: codex-rs/features/src/lib.rs:839][E: codex-rs/features/src/lib.rs:840][E: codex-rs/features/src/lib.rs:841] |
| 15 | `StandaloneWebSearch` | `standalone_web_search` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:119][E: codex-rs/features/src/lib.rs:844][E: codex-rs/features/src/lib.rs:845][E: codex-rs/features/src/lib.rs:846][E: codex-rs/features/src/lib.rs:847] |
| 16 | `SearchTool` | `search_tool` | Removed | `false` | [E: codex-rs/features/src/lib.rs:239][E: codex-rs/features/src/lib.rs:850][E: codex-rs/features/src/lib.rs:851][E: codex-rs/features/src/lib.rs:852][E: codex-rs/features/src/lib.rs:853] |
| 17 | `CodexGitCommit` | `codex_git_commit` | Removed | `false` | [E: codex-rs/features/src/lib.rs:252][E: codex-rs/features/src/lib.rs:856][E: codex-rs/features/src/lib.rs:857][E: codex-rs/features/src/lib.rs:858][E: codex-rs/features/src/lib.rs:859] |
| 18 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:126][E: codex-rs/features/src/lib.rs:862][E: codex-rs/features/src/lib.rs:863][E: codex-rs/features/src/lib.rs:864][E: codex-rs/features/src/lib.rs:865] |
| 19 | `Sqlite` | `sqlite` | Removed | `true` | [E: codex-rs/features/src/lib.rs:254][E: codex-rs/features/src/lib.rs:868][E: codex-rs/features/src/lib.rs:869][E: codex-rs/features/src/lib.rs:870][E: codex-rs/features/src/lib.rs:871] |
| 20 | `MemoryTool` | `memories` | Experimental: Memories | `false` | [E: codex-rs/features/src/lib.rs:128][E: codex-rs/features/src/lib.rs:874][E: codex-rs/features/src/lib.rs:875][E: codex-rs/features/src/lib.rs:876][E: codex-rs/features/src/lib.rs:877][E: codex-rs/features/src/lib.rs:881] |
| 21 | `LocalThreadStoreCompression` | `local_thread_store_compression` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:130][E: codex-rs/features/src/lib.rs:884][E: codex-rs/features/src/lib.rs:885][E: codex-rs/features/src/lib.rs:886][E: codex-rs/features/src/lib.rs:887] |
| 22 | `Chronicle` | `chronicle` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:132][E: codex-rs/features/src/lib.rs:890][E: codex-rs/features/src/lib.rs:891][E: codex-rs/features/src/lib.rs:892][E: codex-rs/features/src/lib.rs:893] |
| 23 | `ChildAgentsMd` | `child_agents_md` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:134][E: codex-rs/features/src/lib.rs:896][E: codex-rs/features/src/lib.rs:897][E: codex-rs/features/src/lib.rs:898][E: codex-rs/features/src/lib.rs:899] |
| 24 | `ApplyPatchFreeform` | `apply_patch_freeform` | Removed | `false` | [E: codex-rs/features/src/lib.rs:256][E: codex-rs/features/src/lib.rs:902][E: codex-rs/features/src/lib.rs:903][E: codex-rs/features/src/lib.rs:904][E: codex-rs/features/src/lib.rs:905] |
| 25 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:908][E: codex-rs/features/src/lib.rs:909][E: codex-rs/features/src/lib.rs:910][E: codex-rs/features/src/lib.rs:911] |
| 26 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:110][E: codex-rs/features/src/lib.rs:914][E: codex-rs/features/src/lib.rs:915][E: codex-rs/features/src/lib.rs:916][E: codex-rs/features/src/lib.rs:917] |
| 27 | `CodexHooks` | `hooks` | Stable | `true` | [E: codex-rs/features/src/lib.rs:84][E: codex-rs/features/src/lib.rs:920][E: codex-rs/features/src/lib.rs:921][E: codex-rs/features/src/lib.rs:922][E: codex-rs/features/src/lib.rs:923] |
| 28 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:112][E: codex-rs/features/src/lib.rs:926][E: codex-rs/features/src/lib.rs:927][E: codex-rs/features/src/lib.rs:928][E: codex-rs/features/src/lib.rs:929] |
| 29 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | `false` | [E: codex-rs/features/src/lib.rs:242][E: codex-rs/features/src/lib.rs:932][E: codex-rs/features/src/lib.rs:933][E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:935] |
| 30 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | `false` | [E: codex-rs/features/src/lib.rs:122][E: codex-rs/features/src/lib.rs:938][E: codex-rs/features/src/lib.rs:939][E: codex-rs/features/src/lib.rs:940][E: codex-rs/features/src/lib.rs:941] |
| 31 | `RequestRule` | `request_rule` | Removed | `false` | [E: codex-rs/features/src/lib.rs:244][E: codex-rs/features/src/lib.rs:944][E: codex-rs/features/src/lib.rs:945][E: codex-rs/features/src/lib.rs:946][E: codex-rs/features/src/lib.rs:947] |
| 32 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:246][E: codex-rs/features/src/lib.rs:950][E: codex-rs/features/src/lib.rs:951][E: codex-rs/features/src/lib.rs:952][E: codex-rs/features/src/lib.rs:953] |
| 33 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | `false` | [E: codex-rs/features/src/lib.rs:248][E: codex-rs/features/src/lib.rs:956][E: codex-rs/features/src/lib.rs:957][E: codex-rs/features/src/lib.rs:958][E: codex-rs/features/src/lib.rs:959] |
| 34 | `RemoteModels` | `remote_models` | Removed | `false` | [E: codex-rs/features/src/lib.rs:250][E: codex-rs/features/src/lib.rs:962][E: codex-rs/features/src/lib.rs:963][E: codex-rs/features/src/lib.rs:964][E: codex-rs/features/src/lib.rs:965] |
| 35 | `EnableRequestCompression` | `enable_request_compression` | Stable | `true` | [E: codex-rs/features/src/lib.rs:136][E: codex-rs/features/src/lib.rs:968][E: codex-rs/features/src/lib.rs:969][E: codex-rs/features/src/lib.rs:970][E: codex-rs/features/src/lib.rs:971] |
| 36 | `NetworkProxy` | `network_proxy` | Experimental: Network proxy | `false` | [E: codex-rs/features/src/lib.rs:138][E: codex-rs/features/src/lib.rs:974][E: codex-rs/features/src/lib.rs:975][E: codex-rs/features/src/lib.rs:976][E: codex-rs/features/src/lib.rs:977][E: codex-rs/features/src/lib.rs:981] |
| 37 | `RespectSystemProxy` | `respect_system_proxy` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:140][E: codex-rs/features/src/lib.rs:984][E: codex-rs/features/src/lib.rs:985][E: codex-rs/features/src/lib.rs:986][E: codex-rs/features/src/lib.rs:987] |
| 38 | `Collab` | `multi_agent` | Stable | `true` | [E: codex-rs/features/src/lib.rs:142][E: codex-rs/features/src/lib.rs:990][E: codex-rs/features/src/lib.rs:991][E: codex-rs/features/src/lib.rs:992][E: codex-rs/features/src/lib.rs:993] |
| 39 | `MultiAgentV2` | `multi_agent_v2` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:996][E: codex-rs/features/src/lib.rs:997][E: codex-rs/features/src/lib.rs:998][E: codex-rs/features/src/lib.rs:999] |
| 40 | `SpawnCsv` | `enable_fanout` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:1002][E: codex-rs/features/src/lib.rs:1003][E: codex-rs/features/src/lib.rs:1004][E: codex-rs/features/src/lib.rs:1005] |
| 41 | `Apps` | `apps` | Stable | `true` | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:1008][E: codex-rs/features/src/lib.rs:1009][E: codex-rs/features/src/lib.rs:1010][E: codex-rs/features/src/lib.rs:1011] |
| 42 | `EnableMcpApps` | `enable_mcp_apps` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:1014][E: codex-rs/features/src/lib.rs:1015][E: codex-rs/features/src/lib.rs:1016][E: codex-rs/features/src/lib.rs:1017] |
| 43 | `AppsMcpPathOverride` | `apps_mcp_path_override` | Removed | `false` | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:1020][E: codex-rs/features/src/lib.rs:1021][E: codex-rs/features/src/lib.rs:1022][E: codex-rs/features/src/lib.rs:1023] |
| 44 | `ToolSearch` | `tool_search` | Removed | `false` | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:1026][E: codex-rs/features/src/lib.rs:1027][E: codex-rs/features/src/lib.rs:1028][E: codex-rs/features/src/lib.rs:1029] |
| 45 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:156][E: codex-rs/features/src/lib.rs:1032][E: codex-rs/features/src/lib.rs:1033][E: codex-rs/features/src/lib.rs:1034][E: codex-rs/features/src/lib.rs:1035] |
| 46 | `NonPrefixedMcpToolNames` | `non_prefixed_mcp_tool_names` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:158][E: codex-rs/features/src/lib.rs:1038][E: codex-rs/features/src/lib.rs:1039][E: codex-rs/features/src/lib.rs:1040][E: codex-rs/features/src/lib.rs:1041] |
| 47 | `UnavailableDummyTools` | `unavailable_dummy_tools` | Removed | `false` | [E: codex-rs/features/src/lib.rs:258][E: codex-rs/features/src/lib.rs:1044][E: codex-rs/features/src/lib.rs:1045][E: codex-rs/features/src/lib.rs:1046][E: codex-rs/features/src/lib.rs:1047] |
| 48 | `ToolSuggest` | `tool_suggest` | Stable | `true` | [E: codex-rs/features/src/lib.rs:160][E: codex-rs/features/src/lib.rs:1050][E: codex-rs/features/src/lib.rs:1051][E: codex-rs/features/src/lib.rs:1052][E: codex-rs/features/src/lib.rs:1053] |
| 49 | `Plugins` | `plugins` | Stable | `true` | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:1056][E: codex-rs/features/src/lib.rs:1057][E: codex-rs/features/src/lib.rs:1058][E: codex-rs/features/src/lib.rs:1059] |
| 50 | `PluginHooks` | `plugin_hooks` | Removed | `false` | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:1062][E: codex-rs/features/src/lib.rs:1063][E: codex-rs/features/src/lib.rs:1064][E: codex-rs/features/src/lib.rs:1065] |
| 51 | `InAppBrowser` | `in_app_browser` | Stable | `true` | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:1068][E: codex-rs/features/src/lib.rs:1069][E: codex-rs/features/src/lib.rs:1070][E: codex-rs/features/src/lib.rs:1071] |
| 52 | `BrowserUse` | `browser_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:172][E: codex-rs/features/src/lib.rs:1074][E: codex-rs/features/src/lib.rs:1075][E: codex-rs/features/src/lib.rs:1076][E: codex-rs/features/src/lib.rs:1077] |
| 53 | `BrowserUseExternal` | `browser_use_external` | Stable | `true` | [E: codex-rs/features/src/lib.rs:176][E: codex-rs/features/src/lib.rs:1080][E: codex-rs/features/src/lib.rs:1081][E: codex-rs/features/src/lib.rs:1082][E: codex-rs/features/src/lib.rs:1083] |
| 54 | `ComputerUse` | `computer_use` | Stable | `true` | [E: codex-rs/features/src/lib.rs:180][E: codex-rs/features/src/lib.rs:1086][E: codex-rs/features/src/lib.rs:1087][E: codex-rs/features/src/lib.rs:1088][E: codex-rs/features/src/lib.rs:1089] |
| 55 | `RemotePlugin` | `remote_plugin` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:182][E: codex-rs/features/src/lib.rs:1092][E: codex-rs/features/src/lib.rs:1093][E: codex-rs/features/src/lib.rs:1094][E: codex-rs/features/src/lib.rs:1095] |
| 56 | `PluginSharing` | `plugin_sharing` | Stable | `true` | [E: codex-rs/features/src/lib.rs:184][E: codex-rs/features/src/lib.rs:1098][E: codex-rs/features/src/lib.rs:1099][E: codex-rs/features/src/lib.rs:1100][E: codex-rs/features/src/lib.rs:1101] |
| 57 | `ExternalMigration` | `external_migration` | Removed | `false` | [E: codex-rs/features/src/lib.rs:186][E: codex-rs/features/src/lib.rs:1104][E: codex-rs/features/src/lib.rs:1105][E: codex-rs/features/src/lib.rs:1106][E: codex-rs/features/src/lib.rs:1107] |
| 58 | `ImageGeneration` | `image_generation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:188][E: codex-rs/features/src/lib.rs:1110][E: codex-rs/features/src/lib.rs:1111][E: codex-rs/features/src/lib.rs:1112][E: codex-rs/features/src/lib.rs:1113] |
| 59 | `ImageGenExt` | `imagegenext` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:190][E: codex-rs/features/src/lib.rs:1116][E: codex-rs/features/src/lib.rs:1117][E: codex-rs/features/src/lib.rs:1118][E: codex-rs/features/src/lib.rs:1119] |
| 60 | `ResizeAllImages` | `resize_all_images` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:192][E: codex-rs/features/src/lib.rs:1122][E: codex-rs/features/src/lib.rs:1123][E: codex-rs/features/src/lib.rs:1124][E: codex-rs/features/src/lib.rs:1125] |
| 61 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | `true` | [E: codex-rs/features/src/lib.rs:194][E: codex-rs/features/src/lib.rs:1128][E: codex-rs/features/src/lib.rs:1129][E: codex-rs/features/src/lib.rs:1130][E: codex-rs/features/src/lib.rs:1131] |
| 62 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | Removed | `false` | [E: codex-rs/features/src/lib.rs:196][E: codex-rs/features/src/lib.rs:1134][E: codex-rs/features/src/lib.rs:1135][E: codex-rs/features/src/lib.rs:1136][E: codex-rs/features/src/lib.rs:1137] |
| 63 | `MentionsV2` | `mentions_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:198][E: codex-rs/features/src/lib.rs:1140][E: codex-rs/features/src/lib.rs:1141][E: codex-rs/features/src/lib.rs:1142][E: codex-rs/features/src/lib.rs:1143] |
| 64 | `Steer` | `steer` | Removed | `true` | [E: codex-rs/features/src/lib.rs:261][E: codex-rs/features/src/lib.rs:1146][E: codex-rs/features/src/lib.rs:1147][E: codex-rs/features/src/lib.rs:1148][E: codex-rs/features/src/lib.rs:1149] |
| 65 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1152][E: codex-rs/features/src/lib.rs:1153][E: codex-rs/features/src/lib.rs:1154][E: codex-rs/features/src/lib.rs:1155] |
| 66 | `TerminalVisualizationInstructions` | `terminal_visualization_instructions` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:1158][E: codex-rs/features/src/lib.rs:1159][E: codex-rs/features/src/lib.rs:1160][E: codex-rs/features/src/lib.rs:1161] |
| 67 | `GuardianApproval` | `guardian_approval` | Stable | `true` | [E: codex-rs/features/src/lib.rs:202][E: codex-rs/features/src/lib.rs:1164][E: codex-rs/features/src/lib.rs:1165][E: codex-rs/features/src/lib.rs:1166][E: codex-rs/features/src/lib.rs:1167] |
| 68 | `Goals` | `goals` | Stable | `true` | [E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:1170][E: codex-rs/features/src/lib.rs:1171][E: codex-rs/features/src/lib.rs:1172][E: codex-rs/features/src/lib.rs:1173] |
| 69 | `TokenBudget` | `token_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:206][E: codex-rs/features/src/lib.rs:1176][E: codex-rs/features/src/lib.rs:1177][E: codex-rs/features/src/lib.rs:1178][E: codex-rs/features/src/lib.rs:1179] |
| 70 | `RolloutBudget` | `rollout_budget` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:208][E: codex-rs/features/src/lib.rs:1182][E: codex-rs/features/src/lib.rs:1183][E: codex-rs/features/src/lib.rs:1184][E: codex-rs/features/src/lib.rs:1185] |
| 71 | `SleepTool` | `sleep_tool` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:210][E: codex-rs/features/src/lib.rs:1188][E: codex-rs/features/src/lib.rs:1189][E: codex-rs/features/src/lib.rs:1190][E: codex-rs/features/src/lib.rs:1191] |
| 72 | `CollaborationModes` | `collaboration_modes` | Removed | `true` | [E: codex-rs/features/src/lib.rs:264][E: codex-rs/features/src/lib.rs:1194][E: codex-rs/features/src/lib.rs:1195][E: codex-rs/features/src/lib.rs:1196][E: codex-rs/features/src/lib.rs:1197] |
| 73 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | `true` | [E: codex-rs/features/src/lib.rs:212][E: codex-rs/features/src/lib.rs:1200][E: codex-rs/features/src/lib.rs:1201][E: codex-rs/features/src/lib.rs:1202][E: codex-rs/features/src/lib.rs:1203] |
| 74 | `AuthElicitation` | `auth_elicitation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:214][E: codex-rs/features/src/lib.rs:1206][E: codex-rs/features/src/lib.rs:1207][E: codex-rs/features/src/lib.rs:1208][E: codex-rs/features/src/lib.rs:1209] |
| 75 | `Personality` | `personality` | Stable | `true` | [E: codex-rs/features/src/lib.rs:216][E: codex-rs/features/src/lib.rs:1212][E: codex-rs/features/src/lib.rs:1213][E: codex-rs/features/src/lib.rs:1214][E: codex-rs/features/src/lib.rs:1215] |
| 76 | `Artifact` | `artifact` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:218][E: codex-rs/features/src/lib.rs:1218][E: codex-rs/features/src/lib.rs:1219][E: codex-rs/features/src/lib.rs:1220][E: codex-rs/features/src/lib.rs:1221] |
| 77 | `FastMode` | `fast_mode` | Stable | `true` | [E: codex-rs/features/src/lib.rs:220][E: codex-rs/features/src/lib.rs:1224][E: codex-rs/features/src/lib.rs:1225][E: codex-rs/features/src/lib.rs:1226][E: codex-rs/features/src/lib.rs:1227] |
| 78 | `RealtimeConversation` | `realtime_conversation` | UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:222][E: codex-rs/features/src/lib.rs:1230][E: codex-rs/features/src/lib.rs:1231][E: codex-rs/features/src/lib.rs:1232][E: codex-rs/features/src/lib.rs:1233] |
| 79 | `RemoteControl` | `remote_control` | Removed | `false` | [E: codex-rs/features/src/lib.rs:266][E: codex-rs/features/src/lib.rs:1236][E: codex-rs/features/src/lib.rs:1237][E: codex-rs/features/src/lib.rs:1238][E: codex-rs/features/src/lib.rs:1239] |
| 80 | `ImageDetailOriginal` | `image_detail_original` | Removed | `false` | [E: codex-rs/features/src/lib.rs:269][E: codex-rs/features/src/lib.rs:1242][E: codex-rs/features/src/lib.rs:1243][E: codex-rs/features/src/lib.rs:1244][E: codex-rs/features/src/lib.rs:1245] |
| 81 | `TuiAppServer` | `tui_app_server` | Removed | `true` | [E: codex-rs/features/src/lib.rs:271][E: codex-rs/features/src/lib.rs:1248][E: codex-rs/features/src/lib.rs:1249][E: codex-rs/features/src/lib.rs:1250][E: codex-rs/features/src/lib.rs:1251] |
| 82 | `PreventIdleSleep` | `prevent_idle_sleep` | Conditional experimental on macOS/Linux/Windows; otherwise UnderDevelopment | `false` | [E: codex-rs/features/src/lib.rs:224][E: codex-rs/features/src/lib.rs:1254][E: codex-rs/features/src/lib.rs:1255][E: codex-rs/features/src/lib.rs:1256][E: codex-rs/features/src/lib.rs:1257][E: codex-rs/features/src/lib.rs:1258][E: codex-rs/features/src/lib.rs:1259][E: codex-rs/features/src/lib.rs:1261][E: codex-rs/features/src/lib.rs:1267][E: codex-rs/features/src/lib.rs:1262][E: codex-rs/features/src/lib.rs:1269] |
| 83 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | Removed | `false` | [E: codex-rs/features/src/lib.rs:274][E: codex-rs/features/src/lib.rs:1272][E: codex-rs/features/src/lib.rs:1273][E: codex-rs/features/src/lib.rs:1274][E: codex-rs/features/src/lib.rs:1275] |
| 84 | `ResponsesWebsockets` | `responses_websockets` | Removed | `false` | [E: codex-rs/features/src/lib.rs:276][E: codex-rs/features/src/lib.rs:1278][E: codex-rs/features/src/lib.rs:1279][E: codex-rs/features/src/lib.rs:1280][E: codex-rs/features/src/lib.rs:1281] |
| 85 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | `false` | [E: codex-rs/features/src/lib.rs:278][E: codex-rs/features/src/lib.rs:1284][E: codex-rs/features/src/lib.rs:1285][E: codex-rs/features/src/lib.rs:1286][E: codex-rs/features/src/lib.rs:1287] |
| 86 | `RemoteCompactionV2` | `remote_compaction_v2` | Stable | `true` | [E: codex-rs/features/src/lib.rs:226][E: codex-rs/features/src/lib.rs:1290][E: codex-rs/features/src/lib.rs:1291][E: codex-rs/features/src/lib.rs:1292][E: codex-rs/features/src/lib.rs:1293] |
| 87 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | `true` | [E: codex-rs/features/src/lib.rs:228][E: codex-rs/features/src/lib.rs:1296][E: codex-rs/features/src/lib.rs:1297][E: codex-rs/features/src/lib.rs:1298][E: codex-rs/features/src/lib.rs:1299] |

## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
