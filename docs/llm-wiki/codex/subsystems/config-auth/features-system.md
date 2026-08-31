---
id: subsys.config-auth.features-system
title: Feature 系统
kind: subsystem
tier: T2
source: [codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/features/src/legacy.rs, codex-rs/core/src/context/world_state/environment.rs, codex-rs/app-server/src/bespoke_event_handling.rs, codex-rs/app-server/src/notification_media.rs]
symbols: [Feature, Features, FeatureOverrides, FeatureConfigSource, FeaturesToml, FeatureSpec, MultiAgentV2ConfigToml, TokenBudgetConfigToml, RolloutBudgetConfigToml, Feature::TokenBudget, Feature::RolloutBudget, Feature::OmitAppServerNotificationMedia, Feature::PowerShellShellVersion]
related: [subsys.config-auth.config-loading, subsys.config-auth.profiles, subsys.core.tool-system, subsys.core.rollout-budget, subsys.core.token-budget, config.skills-plugins-features]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Codex feature 系统集中定义 `Feature` enum、`FEATURES` registry、structured `FeaturesToml`、legacy aliases 和 runtime `Features` enabled set；`Features::from_sources` 从 defaults 开始应用 base/profile sources、runtime overrides，再做 dependency normalization。[E: codex-rs/features/src/lib.rs:92][E: codex-rs/features/src/lib.rs:427][E: codex-rs/features/src/lib.rs:433][E: codex-rs/features/src/lib.rs:438][E: codex-rs/features/src/lib.rs:628][E: codex-rs/features/src/lib.rs:869]

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

`Stage` 有 `UnderDevelopment`、`Experimental`、`Stable`、`Deprecated` 和 `Removed`；helper 只对 experimental stage 暴露 menu name、description 和 announcement。[E: codex-rs/features/src/lib.rs:45][E: codex-rs/features/src/lib.rs:47][E: codex-rs/features/src/lib.rs:49][E: codex-rs/features/src/lib.rs:55][E: codex-rs/features/src/lib.rs:57][E: codex-rs/features/src/lib.rs:59][E: codex-rs/features/src/lib.rs:63][E: codex-rs/features/src/lib.rs:70]

`Feature` enum 是 feature identity；registry item `FeatureSpec` 保存 feature id、canonical key、stage 和 default_enabled，`FEATURES` 是单一可读 registry。[E: codex-rs/features/src/lib.rs:92][E: codex-rs/features/src/lib.rs:862][E: codex-rs/features/src/lib.rs:863][E: codex-rs/features/src/lib.rs:864][E: codex-rs/features/src/lib.rs:865][E: codex-rs/features/src/lib.rs:866][E: codex-rs/features/src/lib.rs:869]

`Features` 保存 enabled `BTreeSet<Feature>` 和 legacy usage set；`FeatureOverrides` 当前只包含 `web_search_request` override；`FeatureConfigSource` 包含 structured `FeaturesToml` 和 legacy `experimental_use_unified_exec_tool`。[E: codex-rs/features/src/lib.rs:427][E: codex-rs/features/src/lib.rs:428][E: codex-rs/features/src/lib.rs:429][E: codex-rs/features/src/lib.rs:433][E: codex-rs/features/src/lib.rs:434][E: codex-rs/features/src/lib.rs:438][E: codex-rs/features/src/lib.rs:439][E: codex-rs/features/src/lib.rs:440]

## TOML 与 structured config

`FeaturesToml` 同时保存 structured `code_mode`、`code_mode_host`、`non_prefixed_mcp_tool_names`、`guardianv2`、`multi_agent_v2`、`token_budget`、`rollout_budget`、`current_time_reminder`、`network_proxy`、`sleep_tool`、`tool_registry` 和 flatten bool entries。`entries()` 只把前一组 structured config 的 enabled 状态物化为 canonical feature key；`tool_registry` 不进入该 map，但 `is_known_feature_key` 仍认这个 key。[E: codex-rs/features/src/lib.rs:741][E: codex-rs/features/src/lib.rs:743][E: codex-rs/features/src/lib.rs:745][E: codex-rs/features/src/lib.rs:749][E: codex-rs/features/src/lib.rs:755][E: codex-rs/features/src/lib.rs:757][E: codex-rs/features/src/lib.rs:759][E: codex-rs/features/src/lib.rs:761][E: codex-rs/features/src/lib.rs:763][E: codex-rs/features/src/lib.rs:769][E: codex-rs/features/src/lib.rs:765][E: codex-rs/features/src/lib.rs:771][E: codex-rs/features/src/lib.rs:783][E: codex-rs/features/src/lib.rs:735]

Structured feature config 由 untagged `FeatureToml<T>` 表达，可以是 `Enabled(bool)` 或 `Config(T)`；`FeatureConfig` trait 只要求 structured config 能读 enabled state。[E: codex-rs/features/src/lib.rs:840][E: codex-rs/features/src/lib.rs:841][E: codex-rs/features/src/lib.rs:842][E: codex-rs/features/src/lib.rs:856][E: codex-rs/features/src/lib.rs:857]

`MultiAgentV2ConfigToml` 是 current structured feature config 之一，除 enabled、并发/等待 timeout、usage hint、tool namespace、metadata hiding 和 non-code-mode-only 外，还新增 `multi_agent_mode_hint_text` 与 `expose_spawn_agent_model_overrides`；后者控制 spawn tool 是否暴露 model/reasoning override。[E: codex-rs/features/src/feature_configs.rs:245][E: codex-rs/features/src/feature_configs.rs:247][E: codex-rs/features/src/feature_configs.rs:250][E: codex-rs/features/src/feature_configs.rs:273][E: codex-rs/features/src/feature_configs.rs:276][E: codex-rs/features/src/feature_configs.rs:282][E: codex-rs/features/src/feature_configs.rs:287]

`TokenBudgetConfigToml` 包含 enabled、reminder threshold/template、guidance、auto-compact fallback prompt 与 buffer；schema 要求 threshold/buffer 为正，三类 message 分别限制非空或 2,000 length 上限。[E: codex-rs/features/src/feature_configs.rs:298][E: codex-rs/features/src/feature_configs.rs:300][E: codex-rs/features/src/feature_configs.rs:306][E: codex-rs/features/src/feature_configs.rs:311][E: codex-rs/features/src/feature_configs.rs:315][E: codex-rs/features/src/feature_configs.rs:320][E: codex-rs/features/src/feature_configs.rs:324]

`RolloutBudgetConfigToml` 是独立 structured feature config：除 enabled 外要求/允许 root-tree limit、remaining-token reminder thresholds、sampling/prefill weights；它与 per-model context-window token budget 的来源和失败语义不同。[E: codex-rs/features/src/feature_configs.rs:335][E: codex-rs/features/src/feature_configs.rs:337][E: codex-rs/features/src/feature_configs.rs:340][E: codex-rs/features/src/feature_configs.rs:343][E: codex-rs/features/src/feature_configs.rs:346][E: codex-rs/features/src/feature_configs.rs:349]

## 合并控制流

`Features::with_defaults()` 遍历 `FEATURES`，只插入 `default_enabled` 为 true 的 feature。[E: codex-rs/features/src/lib.rs:458][E: codex-rs/features/src/lib.rs:460][E: codex-rs/features/src/lib.rs:461][E: codex-rs/features/src/lib.rs:462]

`Features::from_sources(base, profile, overrides)` 从 defaults 开始，对 base 和 profile 两个 source 依次应用 legacy toggles 和 `FeaturesToml`，再应用 runtime overrides 并调用 `normalize_dependencies()`。[E: codex-rs/features/src/lib.rs:628][E: codex-rs/features/src/lib.rs:633][E: codex-rs/features/src/lib.rs:635][E: codex-rs/features/src/lib.rs:656]

`apply_map` 对 `[features]` bool map 逐项处理；deprecated/removed compatibility keys 会被忽略或记录 legacy usage，unknown key 只 warn，不阻断 config 加载。[E: codex-rs/features/src/lib.rs:547][E: codex-rs/features/src/lib.rs:621]

`normalize_dependencies` 当前只做一个 enable dependency：`CodeModeOnly` 自动启用 `CodeMode`。`SpawnCsv` 已是 Removed，不再参与依赖归一化。[E: codex-rs/features/src/lib.rs:656][E: codex-rs/features/src/lib.rs:657][E: codex-rs/features/src/lib.rs:1224][E: codex-rs/features/src/lib.rs:1226]

## Runtime query、metrics 与 warning

`Features::enabled` 查询单个 feature；`apps_enabled_for_auth` 要求 `Feature::Apps` enabled 且 `has_chatgpt_auth` 为 true。[E: codex-rs/features/src/lib.rs:471][E: codex-rs/features/src/lib.rs:475][E: codex-rs/features/src/lib.rs:476]

`emit_metrics` 跳过 `Stage::Removed`，且只导出与 registry default 不同的 feature state。[E: codex-rs/features/src/lib.rs:528][E: codex-rs/features/src/lib.rs:530][E: codex-rs/features/src/lib.rs:533]

`unstable_features_warning_event` 在未 suppress 时扫描 effective `[features]` table，找出显式 enabled、仍 runtime-enabled、且 stage 为 `UnderDevelopment` 的 feature keys，生成 warning event。[E: codex-rs/features/src/lib.rs:1687][E: codex-rs/features/src/lib.rs:1693][E: codex-rs/features/src/lib.rs:1697]

当前 `Feature` enum 与 `FEATURES` registry 均为 **133** 项，一一对应。[E: codex-rs/features/src/lib.rs:92][E: codex-rs/features/src/lib.rs:869] 相对上一轮 verified `9ded177ce7` 新增 19 个 key：`transcript_v2`、`sleep_tool`、`powershell_shell_version`、`shell_snapshot_v2`、`cwd_relative_turn_diffs`、`content_item_kinds`、`code_mode_prewarm`、`local_thread_store_shared_compression`、`write_stdin_approval`、`skip_host_skill_discovery`、`in_app_chat`、`in_app_dictation`、`in_app_local_automation`、`omit_app_server_notification_media`、`send_async_message`、`guardian_ext`、`bedrock_setup_wizard`、`step_model_switching`、`compaction_image_budget`。无 key 从 registry 删除。逐项 stage/default 以 `ref.feature-flags` 的目标快照为准。

`Feature::PowerShellShellVersion`（key `powershell_shell_version`）是 UnderDevelopment、默认关闭：打开后，单本地 PowerShell 环境会把 `$PSVersionTable.PSVersion` 的 major.minor 写进 model-visible `<shell_version>`；结果按 shell path 缓存，探测 2 秒超时、stdout ≤ 64 bytes。[E: codex-rs/features/src/lib.rs:161][E: codex-rs/features/src/lib.rs:931][E: codex-rs/features/src/lib.rs:933][E: codex-rs/features/src/lib.rs:935][E: codex-rs/core/src/context/world_state/environment.rs:45][E: codex-rs/core/src/context/world_state/environment.rs:53][E: codex-rs/core/src/context/world_state/environment.rs:288][E: codex-rs/core/src/context/world_state/environment.rs:394][E: codex-rs/core/src/context/world_state/environment.rs:416][E: codex-rs/core/src/context/world_state/environment.rs:420]

`Feature::OmitAppServerNotificationMedia`（key `omit_app_server_notification_media`）是 UnderDevelopment、默认关闭：打开后，app-server 在发出 `ItemStarted` / `ItemCompleted` / `RawResponseItemCompleted` 前剥离 inline image/audio。[E: codex-rs/features/src/lib.rs:273][E: codex-rs/features/src/lib.rs:1403][E: codex-rs/features/src/lib.rs:1405][E: codex-rs/features/src/lib.rs:1407][E: codex-rs/app-server/src/bespoke_event_handling.rs:1078][E: codex-rs/app-server/src/notification_media.rs:10]

## Legacy 兼容

`legacy.rs` 定义 legacy aliases，例如 `connectors -> Apps`、`experimental_use_unified_exec_tool -> UnifiedExec`、`web_search -> WebSearchRequest`、`imagegenext -> ImageGeneration`、`codex_hooks -> CodexHooks`；legacy toggles 会写 runtime feature 并记录 legacy usage。[E: codex-rs/features/src/legacy.rs:11][E: codex-rs/features/src/legacy.rs:21][E: codex-rs/features/src/legacy.rs:29][E: codex-rs/features/src/legacy.rs:33][E: codex-rs/features/src/legacy.rs:49][E: codex-rs/features/src/legacy.rs:68]

`feature_for_key` 先查 canonical registry，再 fallback 到 legacy alias；`canonical_feature_for_key` 只查 canonical registry；`is_known_feature_key` 额外接受 `tool_registry`，并因调用 `feature_for_key` 而接受 legacy aliases。[E: codex-rs/features/src/lib.rs:718][E: codex-rs/features/src/lib.rs:724][E: codex-rs/features/src/lib.rs:727][E: codex-rs/features/src/lib.rs:735]

`legacy_usage_notice` 把 alias/feature 生成 summary/details；web search 相关 legacy keys 会提示使用 top-level `web_search` 字段，而不是继续放在 `[features]`。[E: codex-rs/features/src/lib.rs:663][E: codex-rs/features/src/lib.rs:666]

## Gotchas

- `FeatureOverrides` 不再包含旧文档里的 `include_apply_patch_tool`；当前只有 `web_search_request`。[E: codex-rs/features/src/lib.rs:433][E: codex-rs/features/src/lib.rs:434]
- `normalize_dependencies` 当前没有关闭 removed flags 的反向规则；只做 CodeModeOnly→CodeMode。[E: codex-rs/features/src/lib.rs:656][E: codex-rs/features/src/lib.rs:657]
- `FeaturesToml` 仍能反序列化旧 `apps_mcp_path_override` 输入，但字段是 private removed compatibility storage；它不是新的可用 feature config。[E: codex-rs/features/src/lib.rs:766][E: codex-rs/features/src/lib.rs:768]
- feature default 以每个 `FeatureSpec::default_enabled` 为准，不能只按 stage 推断；例如 `ShellTool` default true，而 `AppsMcpPathOverride` removed 且 default false。[E: codex-rs/features/src/lib.rs:884][E: codex-rs/features/src/lib.rs:887][E: codex-rs/features/src/lib.rs:1254][E: codex-rs/features/src/lib.rs:1256][E: codex-rs/features/src/lib.rs:1257]
- `imagegenext` 现在只是 `image_generation` 的 legacy alias；若两者同时出现，canonical key 胜出，不能再把它当成独立 registry feature。[E: codex-rs/features/src/lib.rs:603][E: codex-rs/features/src/legacy.rs:33]

## Sources

- `codex-rs/features/src/lib.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/features/src/legacy.rs`
- `codex-rs/core/src/context/world_state/environment.rs`
- `codex-rs/app-server/src/bespoke_event_handling.rs`
- `codex-rs/app-server/src/notification_media.rs`

## 相关

- `subsys.config-auth.config-loading`: feature TOML 如何进入 effective config。
- `subsys.config-auth.profiles`: profile-v2 layer 如何影响 effective `features`。
- `subsys.core.tool-system`: features 如何参与工具 plan/spec gating。
