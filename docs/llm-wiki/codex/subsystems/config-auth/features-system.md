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
updated: db887d03e1
---

> Codex feature 系统集中定义 `Feature` enum、`FEATURES` registry、structured `FeaturesToml`、legacy aliases 和 runtime `Features` enabled set；`Features::from_sources` 从 defaults 开始应用 base/profile sources、runtime overrides，再做 dependency normalization。[E: codex-rs/features/src/lib.rs:83][E: codex-rs/features/src/lib.rs:83][E: codex-rs/features/src/lib.rs:328][E: codex-rs/features/src/lib.rs:334][E: codex-rs/features/src/lib.rs:339][E: codex-rs/features/src/lib.rs:519][E: codex-rs/features/src/lib.rs:793]

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

`Stage` 有 `UnderDevelopment`、`Experimental`、`Stable`、`Deprecated` 和 `Removed`；helper 只对 experimental stage 暴露 menu name、description 和 announcement。[E: codex-rs/features/src/lib.rs:36][E: codex-rs/features/src/lib.rs:36][E: codex-rs/features/src/lib.rs:38][E: codex-rs/features/src/lib.rs:40][E: codex-rs/features/src/lib.rs:46][E: codex-rs/features/src/lib.rs:48][E: codex-rs/features/src/lib.rs:50][E: codex-rs/features/src/lib.rs:54][E: codex-rs/features/src/lib.rs:61][E: codex-rs/features/src/lib.rs:70]

`Feature` enum 是 feature identity；registry item `FeatureSpec` 保存 feature id、canonical key、stage 和 default_enabled，`FEATURES` 是单一可读 registry。[E: codex-rs/features/src/lib.rs:83][E: codex-rs/features/src/lib.rs:83][E: codex-rs/features/src/lib.rs:786][E: codex-rs/features/src/lib.rs:787][E: codex-rs/features/src/lib.rs:788][E: codex-rs/features/src/lib.rs:789][E: codex-rs/features/src/lib.rs:790][E: codex-rs/features/src/lib.rs:793]

`Features` 保存 enabled `BTreeSet<Feature>` 和 legacy usage set；`FeatureOverrides` 当前只包含 `web_search_request` override；`FeatureConfigSource` 包含 structured `FeaturesToml` 和 legacy `experimental_use_unified_exec_tool`。[E: codex-rs/features/src/lib.rs:328][E: codex-rs/features/src/lib.rs:328][E: codex-rs/features/src/lib.rs:329][E: codex-rs/features/src/lib.rs:330][E: codex-rs/features/src/lib.rs:334][E: codex-rs/features/src/lib.rs:334][E: codex-rs/features/src/lib.rs:339][E: codex-rs/features/src/lib.rs:340][E: codex-rs/features/src/lib.rs:341]

## TOML 与 structured config

`FeaturesToml` 同时保存 structured `code_mode`、`multi_agent_v2`、`token_budget`、`rollout_budget`、`current_time_reminder`、`network_proxy` 和 flatten bool entries；`entries()` 会把 structured config 的 enabled 状态物化为 canonical feature key。[E: codex-rs/features/src/lib.rs:635][E: codex-rs/features/src/lib.rs:635][E: codex-rs/features/src/lib.rs:637][E: codex-rs/features/src/lib.rs:639][E: codex-rs/features/src/lib.rs:641][E: codex-rs/features/src/lib.rs:643][E: codex-rs/features/src/lib.rs:645][E: codex-rs/features/src/lib.rs:649][E: codex-rs/features/src/lib.rs:652][E: codex-rs/features/src/lib.rs:670][E: codex-rs/features/src/lib.rs:672][E: codex-rs/features/src/lib.rs:675][E: codex-rs/features/src/lib.rs:678][E: codex-rs/features/src/lib.rs:681][E: codex-rs/features/src/lib.rs:684][E: codex-rs/features/src/lib.rs:691]

Structured feature config 由 untagged `FeatureToml<T>` 表达，可以是 `Enabled(bool)` 或 `Config(T)`；`FeatureConfig` trait 要求 structured config 能读写 enabled state。[E: codex-rs/features/src/lib.rs:756][E: codex-rs/features/src/lib.rs:756][E: codex-rs/features/src/lib.rs:757][E: codex-rs/features/src/lib.rs:758][E: codex-rs/features/src/lib.rs:779][E: codex-rs/features/src/lib.rs:779]

`MultiAgentV2ConfigToml` 是 current structured feature config 之一，包含 enabled、并发/等待 timeout、usage hint、tool namespace、metadata hiding 和 non-code-mode-only 等 fields。[E: codex-rs/features/src/feature_configs.rs:34][E: codex-rs/features/src/feature_configs.rs:34][E: codex-rs/features/src/feature_configs.rs:36][E: codex-rs/features/src/feature_configs.rs:39][E: codex-rs/features/src/feature_configs.rs:42][E: codex-rs/features/src/feature_configs.rs:48][E: codex-rs/features/src/feature_configs.rs:51][E: codex-rs/features/src/feature_configs.rs:60][E: codex-rs/features/src/feature_configs.rs:62][E: codex-rs/features/src/feature_configs.rs:64]

## 合并控制流

`Features::with_defaults()` 遍历 `FEATURES`，只插入 `default_enabled` 为 true 的 feature。[E: codex-rs/features/src/lib.rs:357][E: codex-rs/features/src/lib.rs:359][E: codex-rs/features/src/lib.rs:361][E: codex-rs/features/src/lib.rs:362][E: codex-rs/features/src/lib.rs:363]

`Features::from_sources(base, profile, overrides)` 从 defaults 开始，对 base 和 profile 两个 source 依次应用 legacy toggles 和 `FeaturesToml`，再应用 runtime overrides 并调用 `normalize_dependencies()`。[E: codex-rs/features/src/lib.rs:519][E: codex-rs/features/src/lib.rs:524][E: codex-rs/features/src/lib.rs:526][E: codex-rs/features/src/lib.rs:527][E: codex-rs/features/src/lib.rs:532][E: codex-rs/features/src/lib.rs:537][E: codex-rs/features/src/lib.rs:538]

`apply_map` 对 `[features]` bool map 逐项处理；deprecated/removed compatibility keys 会被忽略或记录 legacy usage，unknown key 只 warn，不阻断 config 加载。[E: codex-rs/features/src/lib.rs:442][E: codex-rs/features/src/lib.rs:442][E: codex-rs/features/src/lib.rs:445][E: codex-rs/features/src/lib.rs:457][E: codex-rs/features/src/lib.rs:475][E: codex-rs/features/src/lib.rs:490][E: codex-rs/features/src/lib.rs:498][E: codex-rs/features/src/lib.rs:512]

`normalize_dependencies` 当前只做两个 enable dependency：`SpawnCsv` 自动启用 `Collab`，`CodeModeOnly` 自动启用 `CodeMode`。[E: codex-rs/features/src/lib.rs:547][E: codex-rs/features/src/lib.rs:548][E: codex-rs/features/src/lib.rs:549][E: codex-rs/features/src/lib.rs:551][E: codex-rs/features/src/lib.rs:552]

## Runtime query、metrics 与 warning

`Features::enabled` 查询单个 feature；`apps_enabled_for_auth` 要求 `Feature::Apps` enabled 且 `has_chatgpt_auth` 为 true。[E: codex-rs/features/src/lib.rs:372][E: codex-rs/features/src/lib.rs:376][E: codex-rs/features/src/lib.rs:377]

`emit_metrics` 跳过 `Stage::Removed`，且只导出与 registry default 不同的 feature state。[E: codex-rs/features/src/lib.rs:423][E: codex-rs/features/src/lib.rs:424][E: codex-rs/features/src/lib.rs:425][E: codex-rs/features/src/lib.rs:428]

`unstable_features_warning_event` 在未 suppress 时扫描 effective `[features]` table，找出显式 enabled、仍 runtime-enabled、且 stage 为 `UnderDevelopment` 的 feature keys，生成 warning event。[E: codex-rs/features/src/lib.rs:1369][E: codex-rs/features/src/lib.rs:1375][E: codex-rs/features/src/lib.rs:1379][E: codex-rs/features/src/lib.rs:1381][E: codex-rs/features/src/lib.rs:1391][E: codex-rs/features/src/lib.rs:1394][E: codex-rs/features/src/lib.rs:1397][E: codex-rs/features/src/lib.rs:1409]

## Legacy 兼容

`legacy.rs` 定义 legacy aliases，例如 `connectors -> Apps`、`experimental_use_unified_exec_tool -> UnifiedExec`、`web_search -> WebSearchRequest`、`codex_hooks -> CodexHooks`；legacy toggles 会写 runtime feature 并记录 legacy usage。[E: codex-rs/features/src/legacy.rs:11][E: codex-rs/features/src/legacy.rs:13][E: codex-rs/features/src/legacy.rs:21][E: codex-rs/features/src/legacy.rs:29][E: codex-rs/features/src/legacy.rs:45][E: codex-rs/features/src/legacy.rs:65][E: codex-rs/features/src/legacy.rs:70][E: codex-rs/features/src/legacy.rs:86]

`feature_for_key` 先查 canonical registry，再 fallback 到 legacy alias；`canonical_feature_for_key` 只查 canonical registry；`is_known_feature_key` 因调用 `feature_for_key` 而接受 legacy aliases。[E: codex-rs/features/src/lib.rs:612][E: codex-rs/features/src/lib.rs:612][E: codex-rs/features/src/lib.rs:613][E: codex-rs/features/src/lib.rs:618][E: codex-rs/features/src/lib.rs:621][E: codex-rs/features/src/lib.rs:629][E: codex-rs/features/src/lib.rs:630]

`legacy_usage_notice` 把 alias/feature 生成 summary/details；web search 相关 legacy keys 会提示使用 top-level `web_search` 字段，而不是继续放在 `[features]`。[E: codex-rs/features/src/lib.rs:557][E: codex-rs/features/src/lib.rs:560][E: codex-rs/features/src/lib.rs:571][E: codex-rs/features/src/lib.rs:607]

## Gotchas

- `FeatureOverrides` 不再包含旧文档里的 `include_apply_patch_tool`；当前只有 `web_search_request`。[E: codex-rs/features/src/lib.rs:334][E: codex-rs/features/src/lib.rs:335]
- `normalize_dependencies` 当前没有关闭 `JsReplToolsOnly` 之类的反向规则；只做 SpawnCsv->Collab 和 CodeModeOnly->CodeMode。[E: codex-rs/features/src/lib.rs:547][E: codex-rs/features/src/lib.rs:548][E: codex-rs/features/src/lib.rs:551][E: codex-rs/features/src/lib.rs:554]
- `FeaturesToml` 仍能反序列化旧 `apps_mcp_path_override` 输入，但字段是 private removed compatibility storage；materialize/resolved path 会清掉它和同名 flatten entry，它不是新的可用 feature config。[E: codex-rs/features/src/lib.rs:648][E: codex-rs/features/src/lib.rs:648][E: codex-rs/features/src/lib.rs:665][E: codex-rs/features/src/lib.rs:666][E: codex-rs/features/src/lib.rs:667][E: codex-rs/features/src/lib.rs:697][E: codex-rs/features/src/lib.rs:698]
- feature default 以每个 `FeatureSpec::default_enabled` 为准，不能只按 stage 推断；例如 `ShellTool` default true，而 `AppsMcpPathOverride` removed 且 default false。[E: codex-rs/features/src/lib.rs:802][E: codex-rs/features/src/lib.rs:804][E: codex-rs/features/src/lib.rs:805][E: codex-rs/features/src/lib.rs:1068][E: codex-rs/features/src/lib.rs:1070][E: codex-rs/features/src/lib.rs:1071]

## Sources

- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/features/src/legacy.rs`

## 相关

- `subsys.config-auth.config-loading`: feature TOML 如何进入 effective config。
- `subsys.config-auth.profiles`: profile-v2 layer 如何影响 effective `features`。
- `subsys.core.tool-system`: features 如何参与工具 plan/spec gating。
