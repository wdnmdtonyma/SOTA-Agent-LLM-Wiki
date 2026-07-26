---
id: subsys.config-auth.features-system
title: Feature 系统
kind: subsystem
tier: T2
source: [codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/features/src/legacy.rs]
symbols: [Feature, Features, FeatureOverrides, FeatureConfigSource, FeaturesToml, FeatureSpec, MultiAgentV2ConfigToml, TokenBudgetConfigToml, Feature::TokenBudget]
related: [subsys.config-auth.config-loading, subsys.config-auth.profiles, subsys.core.tool-system, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 61a44880a8
---

> Codex feature 系统集中定义 `Feature` enum、`FEATURES` registry、structured `FeaturesToml`、legacy aliases 和 runtime `Features` enabled set；`Features::from_sources` 从 defaults 开始应用 base/profile sources、runtime overrides，再做 dependency normalization。[E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:350][E: codex-rs/features/src/lib.rs:355][E: codex-rs/features/src/lib.rs:539][E: codex-rs/features/src/lib.rs:830]

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

`Feature` enum 是 feature identity；registry item `FeatureSpec` 保存 feature id、canonical key、stage 和 default_enabled，`FEATURES` 是单一可读 registry。[E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:85][E: codex-rs/features/src/lib.rs:823][E: codex-rs/features/src/lib.rs:824][E: codex-rs/features/src/lib.rs:825][E: codex-rs/features/src/lib.rs:826][E: codex-rs/features/src/lib.rs:827][E: codex-rs/features/src/lib.rs:830]

`Features` 保存 enabled `BTreeSet<Feature>` 和 legacy usage set；`FeatureOverrides` 当前只包含 `web_search_request` override；`FeatureConfigSource` 包含 structured `FeaturesToml` 和 legacy `experimental_use_unified_exec_tool`。[E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:345][E: codex-rs/features/src/lib.rs:346][E: codex-rs/features/src/lib.rs:350][E: codex-rs/features/src/lib.rs:350][E: codex-rs/features/src/lib.rs:355][E: codex-rs/features/src/lib.rs:356][E: codex-rs/features/src/lib.rs:357]

## TOML 与 structured config

`FeaturesToml` 同时保存 structured `code_mode`、`multi_agent_v2`、`token_budget`、`rollout_budget`、`current_time_reminder`、`network_proxy` 和 flatten bool entries；`entries()` 会把 structured config 的 enabled 状态物化为 canonical feature key。[E: codex-rs/features/src/lib.rs:652][E: codex-rs/features/src/lib.rs:652][E: codex-rs/features/src/lib.rs:654][E: codex-rs/features/src/lib.rs:660][E: codex-rs/features/src/lib.rs:662][E: codex-rs/features/src/lib.rs:664][E: codex-rs/features/src/lib.rs:666][E: codex-rs/features/src/lib.rs:670][E: codex-rs/features/src/lib.rs:673][E: codex-rs/features/src/lib.rs:691][E: codex-rs/features/src/lib.rs:693][E: codex-rs/features/src/lib.rs:706][E: codex-rs/features/src/lib.rs:709][E: codex-rs/features/src/lib.rs:712][E: codex-rs/features/src/lib.rs:715][E: codex-rs/features/src/lib.rs:722]

Structured feature config 由 untagged `FeatureToml<T>` 表达，可以是 `Enabled(bool)` 或 `Config(T)`；`FeatureConfig` trait 要求 structured config 能读写 enabled state。[E: codex-rs/features/src/lib.rs:793][E: codex-rs/features/src/lib.rs:793][E: codex-rs/features/src/lib.rs:794][E: codex-rs/features/src/lib.rs:795][E: codex-rs/features/src/lib.rs:816][E: codex-rs/features/src/lib.rs:816]

`MultiAgentV2ConfigToml` 是 current structured feature config 之一，除 enabled、并发/等待 timeout、usage hint、tool namespace、metadata hiding 和 non-code-mode-only 外，还新增 `multi_agent_mode_hint_text` 与 `expose_spawn_agent_model_overrides`；后者控制 spawn tool 是否暴露 model/reasoning override。[E: codex-rs/features/src/feature_configs.rs:74][E: codex-rs/features/src/feature_configs.rs:79][E: codex-rs/features/src/feature_configs.rs:82][E: codex-rs/features/src/feature_configs.rs:99][E: codex-rs/features/src/feature_configs.rs:102][E: codex-rs/features/src/feature_configs.rs:108]

`TokenBudgetConfigToml` 新增 `auto_compact_fallback_prompt` 和 `auto_compact_fallback_buffer_tokens`：前者是在自动 context rollover 前采样的 developer message，后者为 fallback note-taking 预留 compaction threshold 之后的额外 token buffer。[E: codex-rs/features/src/feature_configs.rs:128][E: codex-rs/features/src/feature_configs.rs:147][E: codex-rs/features/src/feature_configs.rs:151]

## 合并控制流

`Features::with_defaults()` 遍历 `FEATURES`，只插入 `default_enabled` 为 true 的 feature。[E: codex-rs/features/src/lib.rs:373][E: codex-rs/features/src/lib.rs:375][E: codex-rs/features/src/lib.rs:377][E: codex-rs/features/src/lib.rs:378][E: codex-rs/features/src/lib.rs:379]

`Features::from_sources(base, profile, overrides)` 从 defaults 开始，对 base 和 profile 两个 source 依次应用 legacy toggles 和 `FeaturesToml`，再应用 runtime overrides 并调用 `normalize_dependencies()`。[E: codex-rs/features/src/lib.rs:539][E: codex-rs/features/src/lib.rs:544][E: codex-rs/features/src/lib.rs:546][E: codex-rs/features/src/lib.rs:547][E: codex-rs/features/src/lib.rs:552][E: codex-rs/features/src/lib.rs:557][E: codex-rs/features/src/lib.rs:558]

`apply_map` 对 `[features]` bool map 逐项处理；deprecated/removed compatibility keys 会被忽略或记录 legacy usage，unknown key 只 warn，不阻断 config 加载。[E: codex-rs/features/src/lib.rs:458][E: codex-rs/features/src/lib.rs:458][E: codex-rs/features/src/lib.rs:461][E: codex-rs/features/src/lib.rs:473][E: codex-rs/features/src/lib.rs:491][E: codex-rs/features/src/lib.rs:506][E: codex-rs/features/src/lib.rs:518][E: codex-rs/features/src/lib.rs:532]

`normalize_dependencies` 当前只做一个 enable dependency：`CodeModeOnly` 自动启用 `CodeMode`。`SpawnCsv` 已是 Removed，不再参与依赖归一化。[E: codex-rs/features/src/lib.rs:567][E: codex-rs/features/src/lib.rs:569][E: codex-rs/features/src/lib.rs:1095][E: codex-rs/features/src/lib.rs:1098]

## Runtime query、metrics 与 warning

`Features::enabled` 查询单个 feature；`apps_enabled_for_auth` 要求 `Feature::Apps` enabled 且 `has_chatgpt_auth` 为 true。[E: codex-rs/features/src/lib.rs:388][E: codex-rs/features/src/lib.rs:392][E: codex-rs/features/src/lib.rs:393]

`emit_metrics` 跳过 `Stage::Removed`，且只导出与 registry default 不同的 feature state。[E: codex-rs/features/src/lib.rs:439][E: codex-rs/features/src/lib.rs:440][E: codex-rs/features/src/lib.rs:441][E: codex-rs/features/src/lib.rs:444]

`unstable_features_warning_event` 在未 suppress 时扫描 effective `[features]` table，找出显式 enabled、仍 runtime-enabled、且 stage 为 `UnderDevelopment` 的 feature keys，生成 warning event。[E: codex-rs/features/src/lib.rs:1444][E: codex-rs/features/src/lib.rs:1450][E: codex-rs/features/src/lib.rs:1454][E: codex-rs/features/src/lib.rs:1456][E: codex-rs/features/src/lib.rs:1466][E: codex-rs/features/src/lib.rs:1469][E: codex-rs/features/src/lib.rs:1472][E: codex-rs/features/src/lib.rs:1484]

当前 registry 共 99 项；新增/重分级项包括 `code_mode_buffered_exec`、`mcp_2026_07_28`、`deferred_tool_world_state`、`guardianv2`，`MultiAgentV2` 已标 Stable，而 `SpawnCsv` 与 `ItemIds` 已标 Removed。逐项 stage/default 以 `ref.feature-flags` 的目标快照为准。[E: codex-rs/features/src/lib.rs:892][E: codex-rs/features/src/lib.rs:1113][E: codex-rs/features/src/lib.rs:1137][E: codex-rs/features/src/lib.rs:1299][E: codex-rs/features/src/lib.rs:1083][E: codex-rs/features/src/lib.rs:1095][E: codex-rs/features/src/lib.rs:1239]

## Legacy 兼容

`legacy.rs` 定义 legacy aliases，例如 `connectors -> Apps`、`experimental_use_unified_exec_tool -> UnifiedExec`、`web_search -> WebSearchRequest`、`imagegenext -> ImageGeneration`、`codex_hooks -> CodexHooks`；legacy toggles 会写 runtime feature 并记录 legacy usage。[E: codex-rs/features/src/legacy.rs:11][E: codex-rs/features/src/legacy.rs:21][E: codex-rs/features/src/legacy.rs:29][E: codex-rs/features/src/legacy.rs:33][E: codex-rs/features/src/legacy.rs:49][E: codex-rs/features/src/legacy.rs:68]

`feature_for_key` 先查 canonical registry，再 fallback 到 legacy alias；`canonical_feature_for_key` 只查 canonical registry；`is_known_feature_key` 因调用 `feature_for_key` 而接受 legacy aliases。[E: codex-rs/features/src/lib.rs:629][E: codex-rs/features/src/lib.rs:629][E: codex-rs/features/src/lib.rs:630][E: codex-rs/features/src/lib.rs:635][E: codex-rs/features/src/lib.rs:638][E: codex-rs/features/src/lib.rs:646][E: codex-rs/features/src/lib.rs:647]

`legacy_usage_notice` 把 alias/feature 生成 summary/details；web search 相关 legacy keys 会提示使用 top-level `web_search` 字段，而不是继续放在 `[features]`。[E: codex-rs/features/src/lib.rs:574][E: codex-rs/features/src/lib.rs:577][E: codex-rs/features/src/lib.rs:588][E: codex-rs/features/src/lib.rs:624]

## Gotchas

- `FeatureOverrides` 不再包含旧文档里的 `include_apply_patch_tool`；当前只有 `web_search_request`。[E: codex-rs/features/src/lib.rs:350][E: codex-rs/features/src/lib.rs:351]
- `normalize_dependencies` 当前没有关闭 removed flags 的反向规则；只做 CodeModeOnly→CodeMode。[E: codex-rs/features/src/lib.rs:567][E: codex-rs/features/src/lib.rs:569]
- `FeaturesToml` 仍能反序列化旧 `apps_mcp_path_override` 输入，但字段是 private removed compatibility storage；materialize/resolved path 会清掉它和同名 flatten entry，它不是新的可用 feature config。[E: codex-rs/features/src/lib.rs:669][E: codex-rs/features/src/lib.rs:669][E: codex-rs/features/src/lib.rs:686][E: codex-rs/features/src/lib.rs:687][E: codex-rs/features/src/lib.rs:688][E: codex-rs/features/src/lib.rs:728][E: codex-rs/features/src/lib.rs:729]
- feature default 以每个 `FeatureSpec::default_enabled` 为准，不能只按 stage 推断；例如 `ShellTool` default true，而 `AppsMcpPathOverride` removed 且 default false。[E: codex-rs/features/src/lib.rs:839][E: codex-rs/features/src/lib.rs:841][E: codex-rs/features/src/lib.rs:842][E: codex-rs/features/src/lib.rs:1119][E: codex-rs/features/src/lib.rs:1121][E: codex-rs/features/src/lib.rs:1122]
- `imagegenext` 现在只是 `image_generation` 的 legacy alias；若两者同时出现，canonical key 胜出，不能再把它当成独立 registry feature。[E: codex-rs/features/src/lib.rs:514][E: codex-rs/features/src/lib.rs:518][E: codex-rs/features/src/legacy.rs:33]

## Sources

- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/features/src/legacy.rs`

## 相关

- `subsys.config-auth.config-loading`: feature TOML 如何进入 effective config。
- `subsys.config-auth.profiles`: profile-v2 layer 如何影响 effective `features`。
- `subsys.core.tool-system`: features 如何参与工具 plan/spec gating。
