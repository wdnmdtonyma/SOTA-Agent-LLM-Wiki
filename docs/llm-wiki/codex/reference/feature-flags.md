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
updated: 37aadeaa13
---

> `codex-rs/features/src/lib.rs` 定义 feature flag 的 stage taxonomy、`Feature` enum、effective `Features` set、TOML input model 和 `FEATURES` registry；`FeatureSpec` 字段把 feature id、key、stage、default enabled 绑定在单一 registry 中。[E: codex-rs/features/src/lib.rs:25][E: codex-rs/features/src/lib.rs:72][E: codex-rs/features/src/lib.rs:239][E: codex-rs/features/src/lib.rs:533][E: codex-rs/features/src/lib.rs:593][E: codex-rs/features/src/lib.rs:594][E: codex-rs/features/src/lib.rs:595][E: codex-rs/features/src/lib.rs:596][E: codex-rs/features/src/lib.rs:597][E: codex-rs/features/src/lib.rs:600]

## 能回答的问题

- Codex 有哪些 feature flags,各自 key/stage/default 是什么?
- 哪些 feature 是 stable、experimental、under-development、deprecated、removed?
- feature defaults 如何从 registry 进入 effective `Features`?
- `[features]` TOML 和 legacy alias 如何解析?
- feature dependency normalization 做了哪些自动调整?

## Stage 与解析机制

`Stage` 有 `UnderDevelopment`、`Experimental { name, menu_description, announcement }`、`Stable`、`Deprecated`、`Removed` 五类；experimental stage 可提供 `/experimental` menu name、description、announcement。[E: codex-rs/features/src/lib.rs:25][E: codex-rs/features/src/lib.rs:27][E: codex-rs/features/src/lib.rs:28][E: codex-rs/features/src/lib.rs:29][E: codex-rs/features/src/lib.rs:30][E: codex-rs/features/src/lib.rs:31][E: codex-rs/features/src/lib.rs:32][E: codex-rs/features/src/lib.rs:35][E: codex-rs/features/src/lib.rs:37][E: codex-rs/features/src/lib.rs:39]

`Features::with_defaults()` 遍历 `FEATURES` 并把 `default_enabled` 为 true 的 feature 插入 enabled set；`Features::from_sources()` 从 built-in defaults 开始，依次应用 base/profile legacy toggles 与 TOML entries，再应用 overrides，最后执行 `normalize_dependencies()`。[E: codex-rs/features/src/lib.rs:278][E: codex-rs/features/src/lib.rs:280][E: codex-rs/features/src/lib.rs:281][E: codex-rs/features/src/lib.rs:282][E: codex-rs/features/src/lib.rs:411][E: codex-rs/features/src/lib.rs:416][E: codex-rs/features/src/lib.rs:418][E: codex-rs/features/src/lib.rs:424][E: codex-rs/features/src/lib.rs:426][E: codex-rs/features/src/lib.rs:427][E: codex-rs/features/src/lib.rs:431][E: codex-rs/features/src/lib.rs:432]

`normalize_dependencies()` 会自动启用 `Collab` 以满足 `SpawnCsv`，自动启用 `CodeMode` 以满足 `CodeModeOnly`，并在 `JsReplToolsOnly` 缺少 `JsRepl` 时禁用 `JsReplToolsOnly`。[E: codex-rs/features/src/lib.rs:441][E: codex-rs/features/src/lib.rs:442][E: codex-rs/features/src/lib.rs:443][E: codex-rs/features/src/lib.rs:445][E: codex-rs/features/src/lib.rs:446][E: codex-rs/features/src/lib.rs:448][E: codex-rs/features/src/lib.rs:450]

## Feature flags 全量表

| # | Feature variant | Config key | Stage | Default | 定义/registry |
|---:|---|---|---|---|---|
| 1 | `GhostCommit` | `undo` | Stable | false | [E: codex-rs/features/src/lib.rs:75][E: codex-rs/features/src/lib.rs:603][E: codex-rs/features/src/lib.rs:604][E: codex-rs/features/src/lib.rs:605][E: codex-rs/features/src/lib.rs:606] |
| 2 | `ShellTool` | `shell_tool` | Stable | true | [E: codex-rs/features/src/lib.rs:77][E: codex-rs/features/src/lib.rs:609][E: codex-rs/features/src/lib.rs:610][E: codex-rs/features/src/lib.rs:611][E: codex-rs/features/src/lib.rs:612] |
| 3 | `UnifiedExec` | `unified_exec` | Stable | `!cfg!(windows)` | [E: codex-rs/features/src/lib.rs:89][E: codex-rs/features/src/lib.rs:615][E: codex-rs/features/src/lib.rs:616][E: codex-rs/features/src/lib.rs:617][E: codex-rs/features/src/lib.rs:618] |
| 4 | `ShellZshFork` | `shell_zsh_fork` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:91][E: codex-rs/features/src/lib.rs:621][E: codex-rs/features/src/lib.rs:622][E: codex-rs/features/src/lib.rs:623][E: codex-rs/features/src/lib.rs:624] |
| 5 | `ShellSnapshot` | `shell_snapshot` | Stable | true | [E: codex-rs/features/src/lib.rs:124][E: codex-rs/features/src/lib.rs:627][E: codex-rs/features/src/lib.rs:628][E: codex-rs/features/src/lib.rs:629][E: codex-rs/features/src/lib.rs:630] |
| 6 | `JsRepl` | `js_repl` | Experimental: `JavaScript REPL` | false | [E: codex-rs/features/src/lib.rs:81][E: codex-rs/features/src/lib.rs:633][E: codex-rs/features/src/lib.rs:634][E: codex-rs/features/src/lib.rs:635][E: codex-rs/features/src/lib.rs:636][E: codex-rs/features/src/lib.rs:640] |
| 7 | `CodeMode` | `code_mode` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:83][E: codex-rs/features/src/lib.rs:643][E: codex-rs/features/src/lib.rs:644][E: codex-rs/features/src/lib.rs:645][E: codex-rs/features/src/lib.rs:646] |
| 8 | `CodeModeOnly` | `code_mode_only` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:649][E: codex-rs/features/src/lib.rs:650][E: codex-rs/features/src/lib.rs:651][E: codex-rs/features/src/lib.rs:652] |
| 9 | `JsReplToolsOnly` | `js_repl_tools_only` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:87][E: codex-rs/features/src/lib.rs:655][E: codex-rs/features/src/lib.rs:656][E: codex-rs/features/src/lib.rs:657][E: codex-rs/features/src/lib.rs:658] |
| 10 | `WebSearchRequest` | `web_search_request` | Deprecated | false | [E: codex-rs/features/src/lib.rs:103][E: codex-rs/features/src/lib.rs:661][E: codex-rs/features/src/lib.rs:662][E: codex-rs/features/src/lib.rs:663][E: codex-rs/features/src/lib.rs:664] |
| 11 | `WebSearchCached` | `web_search_cached` | Deprecated | false | [E: codex-rs/features/src/lib.rs:106][E: codex-rs/features/src/lib.rs:667][E: codex-rs/features/src/lib.rs:668][E: codex-rs/features/src/lib.rs:669][E: codex-rs/features/src/lib.rs:670] |
| 12 | `SearchTool` | `search_tool` | Removed | false | [E: codex-rs/features/src/lib.rs:108][E: codex-rs/features/src/lib.rs:673][E: codex-rs/features/src/lib.rs:674][E: codex-rs/features/src/lib.rs:675][E: codex-rs/features/src/lib.rs:676] |
| 13 | `CodexGitCommit` | `codex_git_commit` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:126][E: codex-rs/features/src/lib.rs:680][E: codex-rs/features/src/lib.rs:681][E: codex-rs/features/src/lib.rs:682][E: codex-rs/features/src/lib.rs:683] |
| 14 | `RuntimeMetrics` | `runtime_metrics` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:128][E: codex-rs/features/src/lib.rs:686][E: codex-rs/features/src/lib.rs:687][E: codex-rs/features/src/lib.rs:688][E: codex-rs/features/src/lib.rs:689] |
| 15 | `GeneralAnalytics` | `general_analytics` | Stable | true | [E: codex-rs/features/src/lib.rs:130][E: codex-rs/features/src/lib.rs:692][E: codex-rs/features/src/lib.rs:693][E: codex-rs/features/src/lib.rs:694][E: codex-rs/features/src/lib.rs:695] |
| 16 | `Sqlite` | `sqlite` | Removed | true | [E: codex-rs/features/src/lib.rs:132][E: codex-rs/features/src/lib.rs:698][E: codex-rs/features/src/lib.rs:699][E: codex-rs/features/src/lib.rs:700][E: codex-rs/features/src/lib.rs:701] |
| 17 | `MemoryTool` | `memories` | Experimental: `Memories` | false | [E: codex-rs/features/src/lib.rs:134][E: codex-rs/features/src/lib.rs:704][E: codex-rs/features/src/lib.rs:705][E: codex-rs/features/src/lib.rs:706][E: codex-rs/features/src/lib.rs:707][E: codex-rs/features/src/lib.rs:711] |
| 18 | `Chronicle` | `chronicle` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:136][E: codex-rs/features/src/lib.rs:714][E: codex-rs/features/src/lib.rs:715][E: codex-rs/features/src/lib.rs:716][E: codex-rs/features/src/lib.rs:717] |
| 19 | `ChildAgentsMd` | `child_agents_md` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:138][E: codex-rs/features/src/lib.rs:720][E: codex-rs/features/src/lib.rs:721][E: codex-rs/features/src/lib.rs:722][E: codex-rs/features/src/lib.rs:723] |
| 20 | `ApplyPatchFreeform` | `apply_patch_freeform` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:726][E: codex-rs/features/src/lib.rs:727][E: codex-rs/features/src/lib.rs:728][E: codex-rs/features/src/lib.rs:729] |
| 21 | `ApplyPatchStreamingEvents` | `apply_patch_streaming_events` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:732][E: codex-rs/features/src/lib.rs:733][E: codex-rs/features/src/lib.rs:734][E: codex-rs/features/src/lib.rs:735] |
| 22 | `ExecPermissionApprovals` | `exec_permission_approvals` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:97][E: codex-rs/features/src/lib.rs:738][E: codex-rs/features/src/lib.rs:739][E: codex-rs/features/src/lib.rs:740][E: codex-rs/features/src/lib.rs:741] |
| 23 | `CodexHooks` | `codex_hooks` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:99][E: codex-rs/features/src/lib.rs:744][E: codex-rs/features/src/lib.rs:745][E: codex-rs/features/src/lib.rs:746][E: codex-rs/features/src/lib.rs:747] |
| 24 | `RequestPermissionsTool` | `request_permissions_tool` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:101][E: codex-rs/features/src/lib.rs:750][E: codex-rs/features/src/lib.rs:751][E: codex-rs/features/src/lib.rs:752][E: codex-rs/features/src/lib.rs:753] |
| 25 | `UseLinuxSandboxBwrap` | `use_linux_sandbox_bwrap` | Removed | false | [E: codex-rs/features/src/lib.rs:111][E: codex-rs/features/src/lib.rs:756][E: codex-rs/features/src/lib.rs:757][E: codex-rs/features/src/lib.rs:758][E: codex-rs/features/src/lib.rs:759] |
| 26 | `UseLegacyLandlock` | `use_legacy_landlock` | Deprecated | false | [E: codex-rs/features/src/lib.rs:114][E: codex-rs/features/src/lib.rs:762][E: codex-rs/features/src/lib.rs:763][E: codex-rs/features/src/lib.rs:764][E: codex-rs/features/src/lib.rs:765] |
| 27 | `RequestRule` | `request_rule` | Removed | false | [E: codex-rs/features/src/lib.rs:116][E: codex-rs/features/src/lib.rs:768][E: codex-rs/features/src/lib.rs:769][E: codex-rs/features/src/lib.rs:770][E: codex-rs/features/src/lib.rs:771] |
| 28 | `WindowsSandbox` | `experimental_windows_sandbox` | Removed | false | [E: codex-rs/features/src/lib.rs:118][E: codex-rs/features/src/lib.rs:774][E: codex-rs/features/src/lib.rs:775][E: codex-rs/features/src/lib.rs:776][E: codex-rs/features/src/lib.rs:777] |
| 29 | `WindowsSandboxElevated` | `elevated_windows_sandbox` | Removed | false | [E: codex-rs/features/src/lib.rs:120][E: codex-rs/features/src/lib.rs:780][E: codex-rs/features/src/lib.rs:781][E: codex-rs/features/src/lib.rs:782][E: codex-rs/features/src/lib.rs:783] |
| 30 | `RemoteModels` | `remote_models` | Removed | false | [E: codex-rs/features/src/lib.rs:122][E: codex-rs/features/src/lib.rs:786][E: codex-rs/features/src/lib.rs:787][E: codex-rs/features/src/lib.rs:788][E: codex-rs/features/src/lib.rs:789] |
| 31 | `EnableRequestCompression` | `enable_request_compression` | Stable | true | [E: codex-rs/features/src/lib.rs:140][E: codex-rs/features/src/lib.rs:792][E: codex-rs/features/src/lib.rs:793][E: codex-rs/features/src/lib.rs:794][E: codex-rs/features/src/lib.rs:795] |
| 32 | `Collab` | `multi_agent` | Stable | true | [E: codex-rs/features/src/lib.rs:142][E: codex-rs/features/src/lib.rs:798][E: codex-rs/features/src/lib.rs:799][E: codex-rs/features/src/lib.rs:800][E: codex-rs/features/src/lib.rs:801] |
| 33 | `MultiAgentV2` | `multi_agent_v2` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:144][E: codex-rs/features/src/lib.rs:804][E: codex-rs/features/src/lib.rs:805][E: codex-rs/features/src/lib.rs:806][E: codex-rs/features/src/lib.rs:807] |
| 34 | `SpawnCsv` | `enable_fanout` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:146][E: codex-rs/features/src/lib.rs:810][E: codex-rs/features/src/lib.rs:811][E: codex-rs/features/src/lib.rs:812][E: codex-rs/features/src/lib.rs:813] |
| 35 | `Apps` | `apps` | Stable | true | [E: codex-rs/features/src/lib.rs:148][E: codex-rs/features/src/lib.rs:816][E: codex-rs/features/src/lib.rs:817][E: codex-rs/features/src/lib.rs:818][E: codex-rs/features/src/lib.rs:819] |
| 36 | `ToolSearch` | `tool_search` | Stable | true | [E: codex-rs/features/src/lib.rs:150][E: codex-rs/features/src/lib.rs:822][E: codex-rs/features/src/lib.rs:823][E: codex-rs/features/src/lib.rs:824][E: codex-rs/features/src/lib.rs:825] |
| 37 | `ToolSearchAlwaysDeferMcpTools` | `tool_search_always_defer_mcp_tools` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:152][E: codex-rs/features/src/lib.rs:828][E: codex-rs/features/src/lib.rs:829][E: codex-rs/features/src/lib.rs:830][E: codex-rs/features/src/lib.rs:831] |
| 38 | `UnavailableDummyTools` | `unavailable_dummy_tools` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:154][E: codex-rs/features/src/lib.rs:834][E: codex-rs/features/src/lib.rs:835][E: codex-rs/features/src/lib.rs:836][E: codex-rs/features/src/lib.rs:837] |
| 39 | `ToolSuggest` | `tool_suggest` | Stable | true | [E: codex-rs/features/src/lib.rs:156][E: codex-rs/features/src/lib.rs:840][E: codex-rs/features/src/lib.rs:841][E: codex-rs/features/src/lib.rs:842][E: codex-rs/features/src/lib.rs:843] |
| 40 | `Plugins` | `plugins` | Stable | true | [E: codex-rs/features/src/lib.rs:158][E: codex-rs/features/src/lib.rs:846][E: codex-rs/features/src/lib.rs:847][E: codex-rs/features/src/lib.rs:848][E: codex-rs/features/src/lib.rs:849] |
| 41 | `RemotePlugin` | `remote_plugin` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:160][E: codex-rs/features/src/lib.rs:852][E: codex-rs/features/src/lib.rs:853][E: codex-rs/features/src/lib.rs:854][E: codex-rs/features/src/lib.rs:855] |
| 42 | `ExternalMigration` | `external_migration` | Experimental: `External migration` | false | [E: codex-rs/features/src/lib.rs:162][E: codex-rs/features/src/lib.rs:858][E: codex-rs/features/src/lib.rs:859][E: codex-rs/features/src/lib.rs:860][E: codex-rs/features/src/lib.rs:861][E: codex-rs/features/src/lib.rs:865] |
| 43 | `ImageGeneration` | `image_generation` | Stable | true | [E: codex-rs/features/src/lib.rs:164][E: codex-rs/features/src/lib.rs:868][E: codex-rs/features/src/lib.rs:869][E: codex-rs/features/src/lib.rs:870][E: codex-rs/features/src/lib.rs:871] |
| 44 | `SkillMcpDependencyInstall` | `skill_mcp_dependency_install` | Stable | true | [E: codex-rs/features/src/lib.rs:166][E: codex-rs/features/src/lib.rs:874][E: codex-rs/features/src/lib.rs:875][E: codex-rs/features/src/lib.rs:876][E: codex-rs/features/src/lib.rs:877] |
| 45 | `SkillEnvVarDependencyPrompt` | `skill_env_var_dependency_prompt` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:168][E: codex-rs/features/src/lib.rs:880][E: codex-rs/features/src/lib.rs:881][E: codex-rs/features/src/lib.rs:882][E: codex-rs/features/src/lib.rs:883] |
| 46 | `Steer` | `steer` | Removed | true | [E: codex-rs/features/src/lib.rs:171][E: codex-rs/features/src/lib.rs:886][E: codex-rs/features/src/lib.rs:887][E: codex-rs/features/src/lib.rs:888][E: codex-rs/features/src/lib.rs:889] |
| 47 | `DefaultModeRequestUserInput` | `default_mode_request_user_input` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:173][E: codex-rs/features/src/lib.rs:892][E: codex-rs/features/src/lib.rs:893][E: codex-rs/features/src/lib.rs:894][E: codex-rs/features/src/lib.rs:895] |
| 48 | `GuardianApproval` | `guardian_approval` | Experimental: `Auto-review` | false | [E: codex-rs/features/src/lib.rs:175][E: codex-rs/features/src/lib.rs:898][E: codex-rs/features/src/lib.rs:899][E: codex-rs/features/src/lib.rs:900][E: codex-rs/features/src/lib.rs:901][E: codex-rs/features/src/lib.rs:905] |
| 49 | `CollaborationModes` | `collaboration_modes` | Removed | true | [E: codex-rs/features/src/lib.rs:178][E: codex-rs/features/src/lib.rs:908][E: codex-rs/features/src/lib.rs:909][E: codex-rs/features/src/lib.rs:910][E: codex-rs/features/src/lib.rs:911] |
| 50 | `ToolCallMcpElicitation` | `tool_call_mcp_elicitation` | Stable | true | [E: codex-rs/features/src/lib.rs:180][E: codex-rs/features/src/lib.rs:914][E: codex-rs/features/src/lib.rs:915][E: codex-rs/features/src/lib.rs:916][E: codex-rs/features/src/lib.rs:917] |
| 51 | `Personality` | `personality` | Stable | true | [E: codex-rs/features/src/lib.rs:182][E: codex-rs/features/src/lib.rs:920][E: codex-rs/features/src/lib.rs:921][E: codex-rs/features/src/lib.rs:922][E: codex-rs/features/src/lib.rs:923] |
| 52 | `Artifact` | `artifact` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:184][E: codex-rs/features/src/lib.rs:926][E: codex-rs/features/src/lib.rs:927][E: codex-rs/features/src/lib.rs:928][E: codex-rs/features/src/lib.rs:929] |
| 53 | `FastMode` | `fast_mode` | Stable | true | [E: codex-rs/features/src/lib.rs:186][E: codex-rs/features/src/lib.rs:932][E: codex-rs/features/src/lib.rs:933][E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:935] |
| 54 | `RealtimeConversation` | `realtime_conversation` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:188][E: codex-rs/features/src/lib.rs:938][E: codex-rs/features/src/lib.rs:939][E: codex-rs/features/src/lib.rs:940][E: codex-rs/features/src/lib.rs:941] |
| 55 | `RemoteControl` | `remote_control` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:190][E: codex-rs/features/src/lib.rs:944][E: codex-rs/features/src/lib.rs:945][E: codex-rs/features/src/lib.rs:946][E: codex-rs/features/src/lib.rs:947] |
| 56 | `ImageDetailOriginal` | `image_detail_original` | Removed | false | [E: codex-rs/features/src/lib.rs:193][E: codex-rs/features/src/lib.rs:950][E: codex-rs/features/src/lib.rs:951][E: codex-rs/features/src/lib.rs:952][E: codex-rs/features/src/lib.rs:953] |
| 57 | `TuiAppServer` | `tui_app_server` | Removed | true | [E: codex-rs/features/src/lib.rs:195][E: codex-rs/features/src/lib.rs:956][E: codex-rs/features/src/lib.rs:957][E: codex-rs/features/src/lib.rs:958][E: codex-rs/features/src/lib.rs:959] |
| 58 | `PreventIdleSleep` | `prevent_idle_sleep` | Conditional: Experimental on macOS/Linux/Windows, otherwise UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:197][E: codex-rs/features/src/lib.rs:962][E: codex-rs/features/src/lib.rs:963][E: codex-rs/features/src/lib.rs:964][E: codex-rs/features/src/lib.rs:965][E: codex-rs/features/src/lib.rs:966][E: codex-rs/features/src/lib.rs:967][E: codex-rs/features/src/lib.rs:968][E: codex-rs/features/src/lib.rs:969][E: codex-rs/features/src/lib.rs:975][E: codex-rs/features/src/lib.rs:977] |
| 59 | `WorkspaceOwnerUsageNudge` | `workspace_owner_usage_nudge` | UnderDevelopment | false | [E: codex-rs/features/src/lib.rs:199][E: codex-rs/features/src/lib.rs:980][E: codex-rs/features/src/lib.rs:981][E: codex-rs/features/src/lib.rs:982][E: codex-rs/features/src/lib.rs:983] |
| 60 | `ResponsesWebsockets` | `responses_websockets` | Removed | false | [E: codex-rs/features/src/lib.rs:201][E: codex-rs/features/src/lib.rs:986][E: codex-rs/features/src/lib.rs:987][E: codex-rs/features/src/lib.rs:988][E: codex-rs/features/src/lib.rs:989] |
| 61 | `ResponsesWebsocketsV2` | `responses_websockets_v2` | Removed | false | [E: codex-rs/features/src/lib.rs:203][E: codex-rs/features/src/lib.rs:992][E: codex-rs/features/src/lib.rs:993][E: codex-rs/features/src/lib.rs:994][E: codex-rs/features/src/lib.rs:995] |
| 62 | `WorkspaceDependencies` | `workspace_dependencies` | Stable | true | [E: codex-rs/features/src/lib.rs:205][E: codex-rs/features/src/lib.rs:998][E: codex-rs/features/src/lib.rs:999][E: codex-rs/features/src/lib.rs:1000][E: codex-rs/features/src/lib.rs:1001] |

## TOML 与 legacy 兼容

`FeaturesToml` 有一个 special `multi_agent_v2` 字段，其他 boolean feature toggles 通过 flattened `entries: BTreeMap<String, bool>` 接收；`entries()` 会把 `multi_agent_v2` 的 enabled 状态写回 canonical key。[E: codex-rs/features/src/lib.rs:533][E: codex-rs/features/src/lib.rs:535][E: codex-rs/features/src/lib.rs:537][E: codex-rs/features/src/lib.rs:538][E: codex-rs/features/src/lib.rs:549][E: codex-rs/features/src/lib.rs:551][E: codex-rs/features/src/lib.rs:552]

`feature_for_key()` 先匹配 `FEATURES` 的 canonical key，再 fallback 到 legacy feature key mapping；unknown key 在 `apply_map()` 中只 warning，不 panic。[E: codex-rs/features/src/lib.rs:510][E: codex-rs/features/src/lib.rs:512][E: codex-rs/features/src/lib.rs:516][E: codex-rs/features/src/lib.rs:404][E: codex-rs/features/src/lib.rs:405]

`emit_metrics()` 跳过 `Stage::Removed`，只在 effective enabled state 与 default 不一致时发送 `codex.feature.state` metric。[E: codex-rs/features/src/lib.rs:342][E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:345][E: codex-rs/features/src/lib.rs:347][E: codex-rs/features/src/lib.rs:348][E: codex-rs/features/src/lib.rs:349]

## Sources

- `codex-rs/features/src/lib.rs`

## 相关

- [config.skills-plugins-features](../surface/config/skills-plugins-features.md)
- [ref.key-types](key-types.md)
- [ref.crate-index](crate-index.md)
- [subsys.config-auth.features-system](../subsystems/config-auth/features-system.md)
