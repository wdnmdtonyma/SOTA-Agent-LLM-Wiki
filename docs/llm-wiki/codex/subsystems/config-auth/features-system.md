---
id: subsys.config-auth.features-system
title: Feature 系统
kind: subsystem
tier: T2
source: [codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/features/src/legacy.rs]
symbols: [Feature, Features, FeatureOverrides, FeatureConfigSource, FeaturesToml, FeatureSpec, MultiAgentV2ConfigToml, TokenBudgetConfigToml, RolloutBudgetConfigToml, Feature::TokenBudget, Feature::RolloutBudget]
related: [subsys.config-auth.config-loading, subsys.config-auth.profiles, subsys.core.tool-system, subsys.core.rollout-budget, subsys.core.token-budget, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 7750465934
---

> Codex feature 系统集中定义 `Feature` enum、`FEATURES` registry、structured `FeaturesToml`、legacy aliases 和 runtime `Features` enabled set；`Features::from_sources` 从 defaults 开始应用 base/profile sources、runtime overrides，再做 dependency normalization。[E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:352][E: codex-rs/features/src/lib.rs:358][E: codex-rs/features/src/lib.rs:363][E: codex-rs/features/src/lib.rs:547][E: codex-rs/features/src/lib.rs:838]

## 能回答的问题

- feature identity、key、stage 和 default 从哪里定义？
- `[features]` TOML、legacy toggles 和 runtime overrides 怎样合并？
- structured feature config 如何表示不只是 bool 的 feature？
- legacy feature key 如何映射到 canonical feature？
- `apps_enabled_for_auth` 为什么同时依赖 feature flag 与 auth state？
- dependency normalization 当前会自动打开哪些 feature？

## 职责边界

features-system 节点解释 feature registry、TOML parsing、合并、legacy compatibility、runtime query 与 warning/metrics。具体某个 feature 对工具或 UI 的影响由对应 subsystem 节点解释；当前工具 plan ground truth 由 `subsys.core.tool-system` 按 `spec_plan.rs` 覆盖，而不是本节点重复维护。

## 数据模型

`Stage` 有 `UnderDevelopment`、`Experimental`、`Stable`、`Deprecated` 和 `Removed`；helper 只对 experimental stage 暴露 menu name、description 和 announcement。[E: codex-rs/features/src/lib.rs:38][E: codex-rs/features/src/lib.rs:38][E: codex-rs/features/src/lib.rs:40][E: codex-rs/features/src/lib.rs:42][E: codex-rs/features/src/lib.rs:48][E: codex-rs/features/src/lib.rs:50][E: codex-rs/features/src/lib.rs:52][E: codex-rs/features/src/lib.rs:56][E: codex-rs/features/src/lib.rs:63][E: codex-rs/features/src/lib.rs:72]

`Feature` enum 是 feature identity；registry item `FeatureSpec` 保存 feature id、canonical key、stage 和 default_enabled，`FEATURES` 是单一可读 registry。[E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:831][E: codex-rs/features/src/lib.rs:832][E: codex-rs/features/src/lib.rs:833][E: codex-rs/features/src/lib.rs:834][E: codex-rs/features/src/lib.rs:835][E: codex-rs/features/src/lib.rs:838]

`Features` 保存 enabled `BTreeSet<Feature>` 和 legacy usage set；`FeatureOverrides` 当前只包含 `web_search_request` override；`FeatureConfigSource` 包含 structured `FeaturesToml` 和 legacy `experimental_use_unified_exec_tool`。[E: codex-rs/features/src/lib.rs:352][E: codex-rs/features/src/lib.rs:352][E: codex-rs/features/src/lib.rs:353][E: codex-rs/features/src/lib.rs:354][E: codex-rs/features/src/lib.rs:358][E: codex-rs/features/src/lib.rs:358][E: codex-rs/features/src/lib.rs:363][E: codex-rs/features/src/lib.rs:364][E: codex-rs/features/src/lib.rs:365]

## TOML 与 structured config

`FeaturesToml` 同时保存 structured `code_mode`、`multi_agent_v2`、`token_budget`、`rollout_budget`、`current_time_reminder`、`network_proxy` 和 flatten bool entries；`entries()` 会把 structured config 的 enabled 状态物化为 canonical feature key。[E: codex-rs/features/src/lib.rs:660][E: codex-rs/features/src/lib.rs:660][E: codex-rs/features/src/lib.rs:662][E: codex-rs/features/src/lib.rs:668][E: codex-rs/features/src/lib.rs:670][E: codex-rs/features/src/lib.rs:672][E: codex-rs/features/src/lib.rs:674][E: codex-rs/features/src/lib.rs:678][E: codex-rs/features/src/lib.rs:681][E: codex-rs/features/src/lib.rs:699][E: codex-rs/features/src/lib.rs:701][E: codex-rs/features/src/lib.rs:714][E: codex-rs/features/src/lib.rs:717][E: codex-rs/features/src/lib.rs:720][E: codex-rs/features/src/lib.rs:723][E: codex-rs/features/src/lib.rs:730]

Structured feature config 由 untagged `FeatureToml<T>` 表达，可以是 `Enabled(bool)` 或 `Config(T)`；`FeatureConfig` trait 要求 structured config 能读写 enabled state。[E: codex-rs/features/src/lib.rs:801][E: codex-rs/features/src/lib.rs:801][E: codex-rs/features/src/lib.rs:802][E: codex-rs/features/src/lib.rs:803][E: codex-rs/features/src/lib.rs:824][E: codex-rs/features/src/lib.rs:824]

`MultiAgentV2ConfigToml` 是 current structured feature config 之一，除 enabled、并发/等待 timeout、usage hint、tool namespace、metadata hiding 和 non-code-mode-only 外，还新增 `multi_agent_mode_hint_text` 与 `expose_spawn_agent_model_overrides`；后者控制 spawn tool 是否暴露 model/reasoning override。[E: codex-rs/features/src/feature_configs.rs:74][E: codex-rs/features/src/feature_configs.rs:79][E: codex-rs/features/src/feature_configs.rs:82][E: codex-rs/features/src/feature_configs.rs:102][E: codex-rs/features/src/feature_configs.rs:105][E: codex-rs/features/src/feature_configs.rs:111]

`TokenBudgetConfigToml` 包含 enabled、reminder threshold/template、guidance、auto-compact fallback prompt 与 buffer；schema 要求 threshold/buffer 为正，三类 message 分别限制非空或 2,000 length 上限。[E: codex-rs/features/src/feature_configs.rs:129][E: codex-rs/features/src/feature_configs.rs:131][E: codex-rs/features/src/feature_configs.rs:137][E: codex-rs/features/src/feature_configs.rs:141][E: codex-rs/features/src/feature_configs.rs:142][E: codex-rs/features/src/feature_configs.rs:145][E: codex-rs/features/src/feature_configs.rs:146][E: codex-rs/features/src/feature_configs.rs:149][E: codex-rs/features/src/feature_configs.rs:150][E: codex-rs/features/src/feature_configs.rs:154]

`RolloutBudgetConfigToml` 是独立 structured feature config：除 enabled 外要求/允许 root-tree limit、remaining-token reminder thresholds、sampling/prefill weights；它与 per-model context-window token budget 的来源和失败语义不同。[E: codex-rs/features/src/feature_configs.rs:167][E: codex-rs/features/src/feature_configs.rs:169][E: codex-rs/features/src/feature_configs.rs:174][E: codex-rs/features/src/feature_configs.rs:177][E: codex-rs/features/src/feature_configs.rs:180][E: codex-rs/features/src/feature_configs.rs:183]

## 合并控制流

`Features::with_defaults()` 遍历 `FEATURES`，只插入 `default_enabled` 为 true 的 feature。[E: codex-rs/features/src/lib.rs:381][E: codex-rs/features/src/lib.rs:383][E: codex-rs/features/src/lib.rs:385][E: codex-rs/features/src/lib.rs:386][E: codex-rs/features/src/lib.rs:387]

`Features::from_sources(base, profile, overrides)` 从 defaults 开始，对 base 和 profile 两个 source 依次应用 legacy toggles 和 `FeaturesToml`，再应用 runtime overrides 并调用 `normalize_dependencies()`。[E: codex-rs/features/src/lib.rs:547][E: codex-rs/features/src/lib.rs:552][E: codex-rs/features/src/lib.rs:554][E: codex-rs/features/src/lib.rs:555][E: codex-rs/features/src/lib.rs:560][E: codex-rs/features/src/lib.rs:565][E: codex-rs/features/src/lib.rs:566]

`apply_map` 对 `[features]` bool map 逐项处理；deprecated/removed compatibility keys 会被忽略或记录 legacy usage，unknown key 只 warn，不阻断 config 加载。[E: codex-rs/features/src/lib.rs:466][E: codex-rs/features/src/lib.rs:466][E: codex-rs/features/src/lib.rs:469][E: codex-rs/features/src/lib.rs:481][E: codex-rs/features/src/lib.rs:499][E: codex-rs/features/src/lib.rs:514][E: codex-rs/features/src/lib.rs:526][E: codex-rs/features/src/lib.rs:540]

`normalize_dependencies` 当前只做一个 enable dependency：`CodeModeOnly` 自动启用 `CodeMode`。`SpawnCsv` 已是 Removed，不再参与依赖归一化。[E: codex-rs/features/src/lib.rs:575][E: codex-rs/features/src/lib.rs:577][E: codex-rs/features/src/lib.rs:1109][E: codex-rs/features/src/lib.rs:1112]

## Runtime query、metrics 与 warning

`Features::enabled` 查询单个 feature；`apps_enabled_for_auth` 要求 `Feature::Apps` enabled 且 `has_chatgpt_auth` 为 true。[E: codex-rs/features/src/lib.rs:396][E: codex-rs/features/src/lib.rs:400][E: codex-rs/features/src/lib.rs:401]

`emit_metrics` 跳过 `Stage::Removed`，且只导出与 registry default 不同的 feature state。[E: codex-rs/features/src/lib.rs:447][E: codex-rs/features/src/lib.rs:448][E: codex-rs/features/src/lib.rs:449][E: codex-rs/features/src/lib.rs:452]

`unstable_features_warning_event` 在未 suppress 时扫描 effective `[features]` table，找出显式 enabled、仍 runtime-enabled、且 stage 为 `UnderDevelopment` 的 feature keys，生成 warning event。[E: codex-rs/features/src/lib.rs:1470][E: codex-rs/features/src/lib.rs:1476][E: codex-rs/features/src/lib.rs:1480][E: codex-rs/features/src/lib.rs:1482][E: codex-rs/features/src/lib.rs:1492][E: codex-rs/features/src/lib.rs:1495][E: codex-rs/features/src/lib.rs:1498][E: codex-rs/features/src/lib.rs:1510]

当前 registry 共 102 项；相对本轮 base 新增 `executed_tool_call_metadata`、`recommended_plugins` 与 requirements-only `in_app_updates`。catalog 还包含 `code_mode_buffered_exec`、`mcp_2026_07_28`、`deferred_tool_world_state`、`guardianv2`；`MultiAgentV2` 已标 Stable，而 `SpawnCsv` 与 `ItemIds` 已标 Removed。逐项 stage/default 以 `ref.feature-flags` 的目标快照为准。[E: codex-rs/features/src/lib.rs:895][E: codex-rs/features/src/lib.rs:1175][E: codex-rs/features/src/lib.rs:1205][E: codex-rs/features/src/lib.rs:906][E: codex-rs/features/src/lib.rs:1127][E: codex-rs/features/src/lib.rs:1151][E: codex-rs/features/src/lib.rs:1325][E: codex-rs/features/src/lib.rs:1097][E: codex-rs/features/src/lib.rs:1109][E: codex-rs/features/src/lib.rs:1265]

## Legacy 兼容

`legacy.rs` 定义 legacy aliases，例如 `connectors -> Apps`、`experimental_use_unified_exec_tool -> UnifiedExec`、`web_search -> WebSearchRequest`、`imagegenext -> ImageGeneration`、`codex_hooks -> CodexHooks`；legacy toggles 会写 runtime feature 并记录 legacy usage。[E: codex-rs/features/src/legacy.rs:11][E: codex-rs/features/src/legacy.rs:21][E: codex-rs/features/src/legacy.rs:29][E: codex-rs/features/src/legacy.rs:33][E: codex-rs/features/src/legacy.rs:49][E: codex-rs/features/src/legacy.rs:68]

`feature_for_key` 先查 canonical registry，再 fallback 到 legacy alias；`canonical_feature_for_key` 只查 canonical registry；`is_known_feature_key` 因调用 `feature_for_key` 而接受 legacy aliases。[E: codex-rs/features/src/lib.rs:637][E: codex-rs/features/src/lib.rs:637][E: codex-rs/features/src/lib.rs:638][E: codex-rs/features/src/lib.rs:643][E: codex-rs/features/src/lib.rs:646][E: codex-rs/features/src/lib.rs:654][E: codex-rs/features/src/lib.rs:655]

`legacy_usage_notice` 把 alias/feature 生成 summary/details；web search 相关 legacy keys 会提示使用 top-level `web_search` 字段，而不是继续放在 `[features]`。[E: codex-rs/features/src/lib.rs:582][E: codex-rs/features/src/lib.rs:585][E: codex-rs/features/src/lib.rs:596][E: codex-rs/features/src/lib.rs:632]

## Gotchas

- `FeatureOverrides` 不再包含旧文档里的 `include_apply_patch_tool`；当前只有 `web_search_request`。[E: codex-rs/features/src/lib.rs:358][E: codex-rs/features/src/lib.rs:359]
- `normalize_dependencies` 当前没有关闭 removed flags 的反向规则；只做 CodeModeOnly→CodeMode。[E: codex-rs/features/src/lib.rs:575][E: codex-rs/features/src/lib.rs:577]
- `FeaturesToml` 仍能反序列化旧 `apps_mcp_path_override` 输入，但字段是 private removed compatibility storage；materialize/resolved path 会清掉它和同名 flatten entry，它不是新的可用 feature config。[E: codex-rs/features/src/lib.rs:677][E: codex-rs/features/src/lib.rs:677][E: codex-rs/features/src/lib.rs:694][E: codex-rs/features/src/lib.rs:695][E: codex-rs/features/src/lib.rs:696][E: codex-rs/features/src/lib.rs:736][E: codex-rs/features/src/lib.rs:737]
- feature default 以每个 `FeatureSpec::default_enabled` 为准，不能只按 stage 推断；例如 `ShellTool` default true，而 `AppsMcpPathOverride` removed 且 default false。[E: codex-rs/features/src/lib.rs:847][E: codex-rs/features/src/lib.rs:849][E: codex-rs/features/src/lib.rs:850][E: codex-rs/features/src/lib.rs:1133][E: codex-rs/features/src/lib.rs:1135][E: codex-rs/features/src/lib.rs:1136]
- `imagegenext` 现在只是 `image_generation` 的 legacy alias；若两者同时出现，canonical key 胜出，不能再把它当成独立 registry feature。[E: codex-rs/features/src/lib.rs:522][E: codex-rs/features/src/lib.rs:526][E: codex-rs/features/src/legacy.rs:33]

## Sources

- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/features/src/legacy.rs`

## 相关

- `subsys.config-auth.config-loading`: feature TOML 如何进入 effective config。
- `subsys.config-auth.profiles`: profile-v2 layer 如何影响 effective `features`。
- `subsys.core.tool-system`: features 如何参与工具 plan/spec gating。
