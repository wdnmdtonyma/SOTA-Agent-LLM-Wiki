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
updated: 37aadeaa13
---

> Codex feature 系统用 `Feature` enum、`FeatureSpec` registry、`FeaturesToml` 和 `FeatureOverrides` 把多来源 feature toggles 合并成 runtime `Features` enabled set，并处理 legacy key、依赖归一化和 under-development warning。[E: codex-rs/features/src/lib.rs:72][E: codex-rs/features/src/lib.rs:239][E: codex-rs/features/src/lib.rs:240][E: codex-rs/features/src/lib.rs:414][E: codex-rs/features/src/lib.rs:431][E: codex-rs/features/src/lib.rs:441][E: codex-rs/features/src/lib.rs:1005]

## 能回答的问题

- feature stage、default 和 key 从哪里定义？
- base config、profile config、CLI override 怎样合并 feature flags？
- legacy feature key 怎样映射到 canonical feature？
- `apps_enabled_for_auth` 为什么同时依赖 feature flag 与 ChatGPT auth indicator？
- feature dependency normalize 会自动打开或关闭哪些功能？

## 职责边界

features-system 节点解释 feature flag registry、合并和 runtime query，不逐项解释每个 feature 对工具或 UI 的影响。工具门控由 `subsys.core.tool-system` 和各 tool 节点用 `build_tool_registry_plan` 说明。

## 数据模型

`Stage` 有 `UnderDevelopment`、`Experimental`、`Stable`、`Deprecated` 和 `Removed` 五种；helper 方法只暴露 experimental menu name、description 和 announcement。[E: codex-rs/features/src/lib.rs:25][E: codex-rs/features/src/lib.rs:27][E: codex-rs/features/src/lib.rs:29][E: codex-rs/features/src/lib.rs:35][E: codex-rs/features/src/lib.rs:37][E: codex-rs/features/src/lib.rs:39][E: codex-rs/features/src/lib.rs:43][E: codex-rs/features/src/lib.rs:50][E: codex-rs/features/src/lib.rs:59] `Feature` enum 定义 feature identity，key、stage 和 default_enabled 由 `FeatureSpec` registry 通过 `Feature::key`、`Feature::stage`、`Feature::default_enabled` 暴露。[E: codex-rs/features/src/lib.rs:72][E: codex-rs/features/src/lib.rs:209][E: codex-rs/features/src/lib.rs:213][E: codex-rs/features/src/lib.rs:217][E: codex-rs/features/src/lib.rs:593][E: codex-rs/features/src/lib.rs:597][E: codex-rs/features/src/lib.rs:600]

`Features` 内部保存 enabled `BTreeSet<Feature>` 和 `legacy_usages`；`FeatureOverrides` 目前只包含 `include_apply_patch_tool` 与 `web_search_request` 两个 optional override；`FeatureConfigSource` 聚合 `[features]` TOML 与几个 legacy top-level booleans。[E: codex-rs/features/src/lib.rs:239][E: codex-rs/features/src/lib.rs:240][E: codex-rs/features/src/lib.rs:241][E: codex-rs/features/src/lib.rs:245][E: codex-rs/features/src/lib.rs:246][E: codex-rs/features/src/lib.rs:247][E: codex-rs/features/src/lib.rs:251][E: codex-rs/features/src/lib.rs:252][E: codex-rs/features/src/lib.rs:255] `MultiAgentV2ConfigToml` 是一个 structured feature config，包含 `enabled`、`usage_hint_enabled`、`usage_hint_text` 和 `hide_spawn_agent_metadata`。[E: codex-rs/features/src/feature_configs.rs:8][E: codex-rs/features/src/feature_configs.rs:10][E: codex-rs/features/src/feature_configs.rs:12][E: codex-rs/features/src/feature_configs.rs:14][E: codex-rs/features/src/feature_configs.rs:16]

`FeaturesToml` 同时保存 structured `multi_agent_v2` 和 flatten bool entries；`FeaturesToml::entries` 返回 `BTreeMap<String, bool>`，并把 `multi_agent_v2` 的 enabled 状态归一为 `Feature::MultiAgentV2` 的 bool entry。[E: codex-rs/features/src/lib.rs:533][E: codex-rs/features/src/lib.rs:535][E: codex-rs/features/src/lib.rs:538][E: codex-rs/features/src/lib.rs:549][E: codex-rs/features/src/lib.rs:552] structured feature config 由 untagged `FeatureToml<T>` 的 `Enabled(bool)` 或 `Config(T)` 表达。[E: codex-rs/features/src/lib.rs:570][E: codex-rs/features/src/lib.rs:572][E: codex-rs/features/src/lib.rs:573]

## 控制流

1. `Features::with_defaults()` 遍历 `FEATURES`，只把 `default_enabled` 为 true 的 feature 插入 enabled set。[E: codex-rs/features/src/lib.rs:278][E: codex-rs/features/src/lib.rs:280][E: codex-rs/features/src/lib.rs:281][E: codex-rs/features/src/lib.rs:286]
2. `Features::from_sources` 从 defaults 开始，依次应用 base/profile 的 legacy toggles 与 `FeaturesToml`，再应用 overrides 并 normalize dependencies。[E: codex-rs/features/src/lib.rs:411][E: codex-rs/features/src/lib.rs:416][E: codex-rs/features/src/lib.rs:418][E: codex-rs/features/src/lib.rs:424][E: codex-rs/features/src/lib.rs:426][E: codex-rs/features/src/lib.rs:431][E: codex-rs/features/src/lib.rs:432]
3. `apply_map` 会把 TOML key 映射到 feature；unknown key 会 `tracing::warn!`，若 key 是 legacy alias 或特定 deprecated `[features]` key，则记录 legacy usage。[E: codex-rs/features/src/lib.rs:361][E: codex-rs/features/src/lib.rs:364][E: codex-rs/features/src/lib.rs:386][E: codex-rs/features/src/lib.rs:390][E: codex-rs/features/src/lib.rs:395][E: codex-rs/features/src/lib.rs:396][E: codex-rs/features/src/lib.rs:404][E: codex-rs/features/src/lib.rs:405]
4. `normalize_dependencies` 会把 `Feature::SpawnCsv` 推导到 `Feature::Collab`，把 `Feature::CodeModeOnly` 推导到 `Feature::CodeMode`，并在 `Feature::JsReplToolsOnly` 没有 `Feature::JsRepl` 时关闭它。[E: codex-rs/features/src/lib.rs:441][E: codex-rs/features/src/lib.rs:442][E: codex-rs/features/src/lib.rs:443][E: codex-rs/features/src/lib.rs:445][E: codex-rs/features/src/lib.rs:446][E: codex-rs/features/src/lib.rs:448][E: codex-rs/features/src/lib.rs:450]
5. `feature_for_key` 先查 canonical registry 再 fallback 到 legacy alias；`canonical_feature_for_key` 只查 canonical registry；`is_known_feature_key` 因调用 `feature_for_key` 而接受 legacy alias。[E: codex-rs/features/src/lib.rs:510][E: codex-rs/features/src/lib.rs:511][E: codex-rs/features/src/lib.rs:516][E: codex-rs/features/src/lib.rs:519][E: codex-rs/features/src/lib.rs:527][E: codex-rs/features/src/lib.rs:528]

## Runtime query 与 metrics

`Features::enabled` 查询单个 feature 是否 enabled；`apps_enabled_for_auth` 要求 `Feature::Apps` enabled 且 `has_chatgpt_auth` 为 true。[E: codex-rs/features/src/lib.rs:291][E: codex-rs/features/src/lib.rs:295][E: codex-rs/features/src/lib.rs:296] `emit_metrics` 跳过 `Stage::Removed`，并只导出与 default_enabled 不同的 feature 状态。[E: codex-rs/features/src/lib.rs:342][E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:347][E: codex-rs/features/src/lib.rs:352]

`unstable_features_warning_event` 会在未 suppress 时扫描 effective `[features]` table，把显式置 true 且仍 enabled 的 `Stage::UnderDevelopment` keys 收集进 warning event。[E: codex-rs/features/src/lib.rs:1005][E: codex-rs/features/src/lib.rs:1011][E: codex-rs/features/src/lib.rs:1016][E: codex-rs/features/src/lib.rs:1018][E: codex-rs/features/src/lib.rs:1024][E: codex-rs/features/src/lib.rs:1027][E: codex-rs/features/src/lib.rs:1037][E: codex-rs/features/src/lib.rs:1043]

## Legacy 兼容

`legacy.rs` 定义 alias 映射和 legacy toggle apply；`LegacyFeatureUsage` 字段为 alias、feature、summary 和 details。[E: codex-rs/features/src/legacy.rs:11][E: codex-rs/features/src/legacy.rs:54][E: codex-rs/features/src/legacy.rs:58][E: codex-rs/features/src/legacy.rs:68][E: codex-rs/features/src/legacy.rs:76][E: codex-rs/features/src/lib.rs:230][E: codex-rs/features/src/lib.rs:231][E: codex-rs/features/src/lib.rs:234] `legacy_usage_notice` 负责把 alias/feature 转成 summary/details，`record_legacy_usage_force` 把结果写入 `legacy_usages` set。[E: codex-rs/features/src/lib.rs:322][E: codex-rs/features/src/lib.rs:323][E: codex-rs/features/src/lib.rs:455][E: codex-rs/features/src/lib.rs:469][E: codex-rs/features/src/lib.rs:492]

## 设计动机与权衡

features 使用 registry + canonical key，而不是在各 subsystem 直接解析字符串，是为了让 config/profile/CLI override、legacy alias、metrics 和 warnings 共享同一套 feature identity。[I] 该设计由 `FeatureSpec` registry、`canonical_feature_for_key`、`feature_for_key` 和 `FeatureOverrides::apply` 共同体现。[E: codex-rs/features/src/lib.rs:593][E: codex-rs/features/src/lib.rs:600][E: codex-rs/features/src/lib.rs:519][E: codex-rs/features/src/lib.rs:510][E: codex-rs/features/src/lib.rs:258]

structured feature config 允许某些 feature 不只是 bool，例如 `multi_agent_v2` 同时承载 enabled、usage hint 和 metadata-hiding 配置。[I] 这由 `FeatureToml::Config(T)` 与 `MultiAgentV2ConfigToml` 支撑。[E: codex-rs/features/src/lib.rs:571][E: codex-rs/features/src/lib.rs:573][E: codex-rs/features/src/feature_configs.rs:10][E: codex-rs/features/src/feature_configs.rs:16]

## Gotchas

- feature 的最终默认值以每个 `FeatureSpec::default_enabled` 为准；同为 `Stage::Stable` 的 `GhostCommit` 默认 false，而 `ShellTool` 默认 true，说明不能只按 stage 推断默认值。[E: codex-rs/features/src/lib.rs:597][E: codex-rs/features/src/lib.rs:603][E: codex-rs/features/src/lib.rs:606][E: codex-rs/features/src/lib.rs:609][E: codex-rs/features/src/lib.rs:612]
- `apps_enabled_for_auth` 不是单纯 feature flag；`has_chatgpt_auth` 为 false 时即使 `Feature::Apps` enabled 也会返回 false。[E: codex-rs/features/src/lib.rs:295][E: codex-rs/features/src/lib.rs:296]
- removed feature 不进入 metrics；被识别为 legacy/deprecated alias 的 usage 会生成 notice 文案。[E: codex-rs/features/src/lib.rs:342][E: codex-rs/features/src/lib.rs:344][E: codex-rs/features/src/lib.rs:322][E: codex-rs/features/src/lib.rs:323][E: codex-rs/features/src/lib.rs:469]

## Sources

- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/features/src/legacy.rs`

## 相关

- `subsys.config-auth.config-loading`: feature TOML 如何进入 effective config。
- `subsys.config-auth.profiles`: profile feature overrides 如何参与合并。
- `subsys.core.tool-system`: features 如何门控工具 plan。
