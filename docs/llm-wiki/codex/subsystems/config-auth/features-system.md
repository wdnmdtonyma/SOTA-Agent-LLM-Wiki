---
id: subsys.config-auth.features-system
title: Feature 系统
kind: subsystem
tier: T2
source: [codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/features/src/legacy.rs]
symbols: [Feature, Features, FeatureOverrides, FeatureConfigSource, FeaturesToml, FeatureSpec, MultiAgentV2ConfigToml]
related: [subsys.config-auth.config-loading, subsys.config-auth.profiles, subsys.core.tool-system, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 5670360009
---

> Codex feature 系统集中定义 `Feature` enum、`FEATURES` registry、structured `FeaturesToml`、legacy aliases 和 runtime `Features` enabled set；`Features::from_sources` 从 defaults 开始应用 base/profile sources、runtime overrides，再做 dependency normalization。[E: codex-rs/features/src/lib.rs:77][E: codex-rs/features/src/lib.rs:79][E: codex-rs/features/src/lib.rs:312][E: codex-rs/features/src/lib.rs:318][E: codex-rs/features/src/lib.rs:323][E: codex-rs/features/src/lib.rs:503][E: codex-rs/features/src/lib.rs:757]

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

`Stage` 有 `UnderDevelopment`、`Experimental`、`Stable`、`Deprecated` 和 `Removed`；helper 只对 experimental stage 暴露 menu name、description 和 announcement。[E: codex-rs/features/src/lib.rs:30][E: codex-rs/features/src/lib.rs:32][E: codex-rs/features/src/lib.rs:34][E: codex-rs/features/src/lib.rs:36][E: codex-rs/features/src/lib.rs:42][E: codex-rs/features/src/lib.rs:44][E: codex-rs/features/src/lib.rs:46][E: codex-rs/features/src/lib.rs:50][E: codex-rs/features/src/lib.rs:57][E: codex-rs/features/src/lib.rs:66]

`Feature` enum 是 feature identity；registry item `FeatureSpec` 保存 feature id、canonical key、stage 和 default_enabled，`FEATURES` 是单一可读 registry。[E: codex-rs/features/src/lib.rs:77][E: codex-rs/features/src/lib.rs:79][E: codex-rs/features/src/lib.rs:750][E: codex-rs/features/src/lib.rs:751][E: codex-rs/features/src/lib.rs:752][E: codex-rs/features/src/lib.rs:753][E: codex-rs/features/src/lib.rs:754][E: codex-rs/features/src/lib.rs:757]

`Features` 保存 enabled `BTreeSet<Feature>` 和 legacy usage set；`FeatureOverrides` 当前只包含 `web_search_request` override；`FeatureConfigSource` 包含 structured `FeaturesToml` 和 legacy `experimental_use_unified_exec_tool`。[E: codex-rs/features/src/lib.rs:310][E: codex-rs/features/src/lib.rs:312][E: codex-rs/features/src/lib.rs:313][E: codex-rs/features/src/lib.rs:314][E: codex-rs/features/src/lib.rs:317][E: codex-rs/features/src/lib.rs:318][E: codex-rs/features/src/lib.rs:323][E: codex-rs/features/src/lib.rs:324][E: codex-rs/features/src/lib.rs:325]

## TOML 与 structured config

`FeaturesToml` 同时保存 structured `code_mode`、`multi_agent_v2`、`rollout_budget`、`network_proxy` 和 flatten bool entries；`entries()` 会把 structured config 的 enabled 状态物化为 canonical feature key。[E: codex-rs/features/src/lib.rs:617][E: codex-rs/features/src/lib.rs:619][E: codex-rs/features/src/lib.rs:621][E: codex-rs/features/src/lib.rs:623][E: codex-rs/features/src/lib.rs:625][E: codex-rs/features/src/lib.rs:629][E: codex-rs/features/src/lib.rs:632][E: codex-rs/features/src/lib.rs:650][E: codex-rs/features/src/lib.rs:652][E: codex-rs/features/src/lib.rs:655][E: codex-rs/features/src/lib.rs:658][E: codex-rs/features/src/lib.rs:661]

Structured feature config 由 untagged `FeatureToml<T>` 表达，可以是 `Enabled(bool)` 或 `Config(T)`；`FeatureConfig` trait 要求 structured config 能读写 enabled state。[E: codex-rs/features/src/lib.rs:716][E: codex-rs/features/src/lib.rs:720][E: codex-rs/features/src/lib.rs:721][E: codex-rs/features/src/lib.rs:722][E: codex-rs/features/src/lib.rs:741][E: codex-rs/features/src/lib.rs:743]

`MultiAgentV2ConfigToml` 是 current structured feature config 之一，包含 enabled、并发/等待 timeout、usage hint、tool namespace、metadata hiding 和 non-code-mode-only 等 fields。[E: codex-rs/features/src/feature_configs.rs:32][E: codex-rs/features/src/feature_configs.rs:34][E: codex-rs/features/src/feature_configs.rs:36][E: codex-rs/features/src/feature_configs.rs:39][E: codex-rs/features/src/feature_configs.rs:42][E: codex-rs/features/src/feature_configs.rs:48][E: codex-rs/features/src/feature_configs.rs:50][E: codex-rs/features/src/feature_configs.rs:59][E: codex-rs/features/src/feature_configs.rs:61][E: codex-rs/features/src/feature_configs.rs:63]

## 合并控制流

`Features::with_defaults()` 遍历 `FEATURES`，只插入 `default_enabled` 为 true 的 feature。[E: codex-rs/features/src/lib.rs:341][E: codex-rs/features/src/lib.rs:343][E: codex-rs/features/src/lib.rs:345][E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:347]

`Features::from_sources(base, profile, overrides)` 从 defaults 开始，对 base 和 profile 两个 source 依次应用 legacy toggles 和 `FeaturesToml`，再应用 runtime overrides 并调用 `normalize_dependencies()`。[E: codex-rs/features/src/lib.rs:503][E: codex-rs/features/src/lib.rs:508][E: codex-rs/features/src/lib.rs:510][E: codex-rs/features/src/lib.rs:511][E: codex-rs/features/src/lib.rs:516][E: codex-rs/features/src/lib.rs:521][E: codex-rs/features/src/lib.rs:522]

`apply_map` 对 `[features]` bool map 逐项处理；deprecated/removed compatibility keys 会被忽略或记录 legacy usage，unknown key 只 warn，不阻断 config 加载。[E: codex-rs/features/src/lib.rs:425][E: codex-rs/features/src/lib.rs:426][E: codex-rs/features/src/lib.rs:429][E: codex-rs/features/src/lib.rs:459][E: codex-rs/features/src/lib.rs:474][E: codex-rs/features/src/lib.rs:482][E: codex-rs/features/src/lib.rs:496]

`normalize_dependencies` 当前只做两个 enable dependency：`SpawnCsv` 自动启用 `Collab`，`CodeModeOnly` 自动启用 `CodeMode`。[E: codex-rs/features/src/lib.rs:531][E: codex-rs/features/src/lib.rs:532][E: codex-rs/features/src/lib.rs:533][E: codex-rs/features/src/lib.rs:535][E: codex-rs/features/src/lib.rs:536]

## Runtime query、metrics 与 warning

`Features::enabled` 查询单个 feature；`apps_enabled_for_auth` 要求 `Feature::Apps` enabled 且 `has_chatgpt_auth` 为 true。[E: codex-rs/features/src/lib.rs:356][E: codex-rs/features/src/lib.rs:360][E: codex-rs/features/src/lib.rs:361]

`emit_metrics` 跳过 `Stage::Removed`，且只导出与 registry default 不同的 feature state。[E: codex-rs/features/src/lib.rs:407][E: codex-rs/features/src/lib.rs:408][E: codex-rs/features/src/lib.rs:409][E: codex-rs/features/src/lib.rs:412]

`unstable_features_warning_event` 在未 suppress 时扫描 effective `[features]` table，找出显式 enabled、仍 runtime-enabled、且 stage 为 `UnderDevelopment` 的 feature keys，生成 warning event。[E: codex-rs/features/src/lib.rs:1303][E: codex-rs/features/src/lib.rs:1309][E: codex-rs/features/src/lib.rs:1313][E: codex-rs/features/src/lib.rs:1315][E: codex-rs/features/src/lib.rs:1325][E: codex-rs/features/src/lib.rs:1328][E: codex-rs/features/src/lib.rs:1331][E: codex-rs/features/src/lib.rs:1343]

## Legacy 兼容

`legacy.rs` 定义 legacy aliases，例如 `connectors -> Apps`、`experimental_use_unified_exec_tool -> UnifiedExec`、`web_search -> WebSearchRequest`、`codex_hooks -> CodexHooks`；legacy toggles 会写 runtime feature 并记录 legacy usage。[E: codex-rs/features/src/legacy.rs:11][E: codex-rs/features/src/legacy.rs:13][E: codex-rs/features/src/legacy.rs:21][E: codex-rs/features/src/legacy.rs:29][E: codex-rs/features/src/legacy.rs:45][E: codex-rs/features/src/legacy.rs:65][E: codex-rs/features/src/legacy.rs:70][E: codex-rs/features/src/legacy.rs:86]

`feature_for_key` 先查 canonical registry，再 fallback 到 legacy alias；`canonical_feature_for_key` 只查 canonical registry；`is_known_feature_key` 因调用 `feature_for_key` 而接受 legacy aliases。[E: codex-rs/features/src/lib.rs:595][E: codex-rs/features/src/lib.rs:596][E: codex-rs/features/src/lib.rs:597][E: codex-rs/features/src/lib.rs:602][E: codex-rs/features/src/lib.rs:605][E: codex-rs/features/src/lib.rs:613][E: codex-rs/features/src/lib.rs:614]

`legacy_usage_notice` 把 alias/feature 生成 summary/details；web search 相关 legacy keys 会提示使用 top-level `web_search` 字段，而不是继续放在 `[features]`。[E: codex-rs/features/src/lib.rs:541][E: codex-rs/features/src/lib.rs:544][E: codex-rs/features/src/lib.rs:555][E: codex-rs/features/src/lib.rs:591]

## Gotchas

- `FeatureOverrides` 不再包含旧文档里的 `include_apply_patch_tool`；当前只有 `web_search_request`。[E: codex-rs/features/src/lib.rs:317][E: codex-rs/features/src/lib.rs:319]
- `normalize_dependencies` 当前没有关闭 `JsReplToolsOnly` 之类的反向规则；只做 SpawnCsv->Collab 和 CodeModeOnly->CodeMode。[E: codex-rs/features/src/lib.rs:531][E: codex-rs/features/src/lib.rs:538]
- `FeaturesToml` 仍能反序列化旧 `apps_mcp_path_override` 输入，但字段是 private removed compatibility storage；materialize/resolved path 会清掉它和同名 flatten entry，它不是新的可用 feature config。[E: codex-rs/features/src/lib.rs:626][E: codex-rs/features/src/lib.rs:628][E: codex-rs/features/src/lib.rs:642][E: codex-rs/features/src/lib.rs:645][E: codex-rs/features/src/lib.rs:646][E: codex-rs/features/src/lib.rs:647][E: codex-rs/features/src/lib.rs:667][E: codex-rs/features/src/lib.rs:668]
- feature default 以每个 `FeatureSpec::default_enabled` 为准，不能只按 stage 推断；例如 `ShellTool` default true，而 `AppsMcpPathOverride` removed 且 default false。[E: codex-rs/features/src/lib.rs:765][E: codex-rs/features/src/lib.rs:769][E: codex-rs/features/src/lib.rs:1020][E: codex-rs/features/src/lib.rs:1023]

## Sources

- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/features/src/legacy.rs`

## 相关

- `subsys.config-auth.config-loading`: feature TOML 如何进入 effective config。
- `subsys.config-auth.profiles`: profile-v2 layer 如何影响 effective `features`。
- `subsys.core.tool-system`: features 如何参与工具 plan/spec gating。
