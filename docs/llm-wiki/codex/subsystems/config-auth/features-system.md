---
id: subsys.config-auth.features-system
title: Feature 系统
kind: subsystem
tier: T2
source: [codex-rs/features/src/lib.rs, codex-rs/features/src/feature_configs.rs, codex-rs/features/src/legacy.rs, codex-rs/core/src/context/world_state/environment.rs, codex-rs/app-server/src/bespoke_event_handling.rs, codex-rs/app-server/src/notification_media.rs]
symbols: [Feature, Features, FeatureOverrides, FeatureConfigSource, FeaturesToml, FeatureSpec, MultiAgentV2ConfigToml, TokenBudgetConfigToml, RolloutBudgetConfigToml, Feature::TokenBudget, Feature::RolloutBudget, Feature::OmitAppServerNotificationMedia, Feature::PowerShellShellVersion, Feature::ApiKeyModelDiscovery, Feature::CodexAppsMcp20260728, Feature::UseXaa, Feature::SendMessageToUserAsync, Feature::DaemonAutoStart, Feature::SystemProxyFallback, Feature::AnalyticsPlanHistory, Feature::AgentMessageBoard]
related: [subsys.config-auth.config-loading, subsys.config-auth.profiles, subsys.core.tool-system, subsys.core.rollout-budget, subsys.core.token-budget, config.skills-plugins-features]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> Codex feature 系统集中定义 `Feature` enum、`FEATURES` registry、structured `FeaturesToml`、legacy aliases 和 runtime `Features` enabled set；`Features::from_sources` 从 defaults 开始应用 base/profile sources、runtime overrides，再做 dependency normalization。[E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:470][E: codex-rs/features/src/lib.rs:476][E: codex-rs/features/src/lib.rs:481][E: codex-rs/features/src/lib.rs:669][E: codex-rs/features/src/lib.rs:932]

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

`Stage` 有 `UnderDevelopment`、`Experimental`、`Stable`、`Deprecated` 和 `Removed`；helper 只对 experimental stage 暴露 menu name、description 和 announcement。[E: codex-rs/features/src/lib.rs:46][E: codex-rs/features/src/lib.rs:48][E: codex-rs/features/src/lib.rs:50][E: codex-rs/features/src/lib.rs:56][E: codex-rs/features/src/lib.rs:58][E: codex-rs/features/src/lib.rs:60][E: codex-rs/features/src/lib.rs:64]

`Feature` enum 是 feature identity；registry item `FeatureSpec` 保存 feature id、canonical key、stage 和 default_enabled，`FEATURES` 是单一可读 registry。[E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:929][E: codex-rs/features/src/lib.rs:926][E: codex-rs/features/src/lib.rs:927][E: codex-rs/features/src/lib.rs:932][E: codex-rs/features/src/lib.rs:929][E: codex-rs/features/src/lib.rs:932]

`Features` 保存 enabled `BTreeSet<Feature>` 和 legacy usage set；`FeatureOverrides` 当前只包含 `web_search_request` override；`FeatureConfigSource` 包含 structured `FeaturesToml` 和 legacy `experimental_use_unified_exec_tool`。[E: codex-rs/features/src/lib.rs:470][E: codex-rs/features/src/lib.rs:471][E: codex-rs/features/src/lib.rs:476][E: codex-rs/features/src/lib.rs:476][E: codex-rs/features/src/lib.rs:481][E: codex-rs/features/src/lib.rs:481][E: codex-rs/features/src/lib.rs:482][E: codex-rs/features/src/lib.rs:483]

## TOML 与 structured config

`FeaturesToml` 同时保存 structured `code_mode`、`code_mode_host`、`non_prefixed_mcp_tool_names`、`guardianv2`、`multi_agent_v2`、`token_budget`、`context_management`、`rollout_budget`、`current_time_reminder`、`network_proxy`、`sleep_tool`、`tool_registry` 和 flatten bool entries。`entries()` 把 structured config 的 enabled 状态物化为 canonical feature key（含 `network_proxy` insert）；`tool_registry` 留在 struct 上但不进入该 map，`is_known_feature_key` 仍认这个 key。[E: codex-rs/features/src/lib.rs:790][E: codex-rs/features/src/lib.rs:834][E: codex-rs/features/src/lib.rs:880][E: codex-rs/features/src/lib.rs:886][E: codex-rs/features/src/lib.rs:784]

Structured feature config 由 untagged `FeatureToml<T>` 表达，可以是 `Enabled(bool)` 或 `Config(T)`；`FeatureConfig` trait 只要求 structured config 能读 enabled state。[E: codex-rs/features/src/lib.rs:903][E: codex-rs/features/src/lib.rs:904][E: codex-rs/features/src/lib.rs:905][E: codex-rs/features/src/lib.rs:919][E: codex-rs/features/src/lib.rs:920]

`MultiAgentV2ConfigToml` 是 current structured feature config 之一，除 enabled、并发/等待 timeout、usage hint、tool namespace、metadata hiding 和 non-code-mode-only 外，还包含 `multi_agent_mode_hint_text` 与 `expose_spawn_agent_model_overrides`；后者控制 spawn tool 是否暴露 model/reasoning override。[E: codex-rs/features/src/feature_configs.rs:259][E: codex-rs/features/src/feature_configs.rs:261][E: codex-rs/features/src/feature_configs.rs:264][E: codex-rs/features/src/feature_configs.rs:287][E: codex-rs/features/src/feature_configs.rs:290][E: codex-rs/features/src/feature_configs.rs:296][E: codex-rs/features/src/feature_configs.rs:307]

`TokenBudgetConfigToml` 包含 enabled、reminder threshold/template、guidance、auto-compact fallback prompt 与 buffer；schema 要求 threshold/buffer 为正，三类 message 分别限制非空或 2,000 length 上限。[E: codex-rs/features/src/feature_configs.rs:332]

`RolloutBudgetConfigToml` 是独立 structured feature config：除 enabled 外要求/允许 root-tree limit、remaining-token reminder thresholds、sampling/prefill weights；它与 per-model context-window token budget 的来源和失败语义不同。[E: codex-rs/features/src/feature_configs.rs:369]

## 合并控制流

`Features::with_defaults()` 遍历 `FEATURES`，只插入 `default_enabled` 为 true 的 feature。[E: codex-rs/features/src/lib.rs:505][E: codex-rs/features/src/lib.rs:503][E: codex-rs/features/src/lib.rs:504][E: codex-rs/features/src/lib.rs:505]

`Features::from_sources(base, profile, overrides)` 从 defaults 开始，对 base 和 profile 两个 source 依次应用 legacy toggles 和 `FeaturesToml`，再应用 runtime overrides 并调用 `normalize_dependencies()`。[E: codex-rs/features/src/lib.rs:669][E: codex-rs/features/src/lib.rs:674][E: codex-rs/features/src/lib.rs:687][E: codex-rs/features/src/lib.rs:688][E: codex-rs/features/src/lib.rs:697]

`apply_map` 对 `[features]` bool map 逐项处理；deprecated/removed compatibility keys 会被忽略或记录 legacy usage，unknown key 只 warn，不阻断 config 加载。[E: codex-rs/features/src/lib.rs:577][E: codex-rs/features/src/lib.rs:663]

`normalize_dependencies` 当前只做一个 enable dependency：`CodeModeOnly` 自动启用 `CodeMode`。`SpawnCsv` 已是 Removed，不再参与依赖归一化。[E: codex-rs/features/src/lib.rs:697][E: codex-rs/features/src/lib.rs:698][E: codex-rs/features/src/lib.rs:219]

## Runtime query、metrics 与 warning

`Features::enabled` 查询单个 feature；`apps_enabled_for_auth` 要求 `Feature::Apps` enabled 且 `has_chatgpt_auth` 为 true。[E: codex-rs/features/src/lib.rs:523][E: codex-rs/features/src/lib.rs:523][E: codex-rs/features/src/lib.rs:524]

`emit_metrics` 跳过 `Stage::Removed`，且只导出与 registry default 不同的 feature state。[E: codex-rs/features/src/lib.rs:555][E: codex-rs/features/src/lib.rs:555][E: codex-rs/features/src/lib.rs:558]

`unstable_features_warning_event` 在未 suppress 时扫描 effective `[features]` table，找出显式 enabled、仍 runtime-enabled、且 stage 为 `UnderDevelopment` 的 feature keys，生成 warning event。[E: codex-rs/features/src/lib.rs:1868][E: codex-rs/features/src/lib.rs:1874][E: codex-rs/features/src/lib.rs:1878]

当前 `Feature` enum 与 `FEATURES` registry 均为 **152** 项，一一对应（`FEATURES` 从 `FeatureSpec { id: Feature::` 条目计数）。[E: codex-rs/features/src/lib.rs:93][E: codex-rs/features/src/lib.rs:932] 相对旧 144 新增 8 个 key（含 `analytics_plan_history`、`daemon_auto_start`、`system_proxy_fallback`、`agent_message_board`）。无 key 从 registry 删除。逐项 stage/default 以 `ref.feature-flags` 的目标快照为准。

`Feature::UseXaa`（key `use_xaa`）打开 enterprise refresh-token authorization（XAA），UnderDevelopment、默认关闭。[E: codex-rs/features/src/lib.rs:233][E: codex-rs/features/src/lib.rs:1399][E: codex-rs/features/src/lib.rs:1400][E: codex-rs/features/src/lib.rs:1401][E: codex-rs/features/src/lib.rs:1402]

`Feature::SendMessageToUserAsync`（key `send_message_to_user_async`）允许 root agent 在没有 model catalog 名的情况下发送 async user messages，UnderDevelopment、默认关闭。旧 key `send_async_message` 仍是 `Stage::Removed`。[E: codex-rs/features/src/lib.rs:325][E: codex-rs/features/src/lib.rs:1628][E: codex-rs/features/src/lib.rs:1633][E: codex-rs/features/src/lib.rs:1634][E: codex-rs/features/src/lib.rs:1635][E: codex-rs/features/src/lib.rs:1636]

`Feature::Worktrees`（key `worktrees`）现为 Stable、默认开启。[E: codex-rs/features/src/lib.rs:200][E: codex-rs/features/src/lib.rs:1309][E: codex-rs/features/src/lib.rs:1310][E: codex-rs/features/src/lib.rs:1311][E: codex-rs/features/src/lib.rs:1312]

`Feature::DaemonAutoStart`（key `daemon_auto_start`）是 Stable、默认开启。[E: codex-rs/features/src/lib.rs:113][E: codex-rs/features/src/lib.rs:944][E: codex-rs/features/src/lib.rs:945][E: codex-rs/features/src/lib.rs:946][E: codex-rs/features/src/lib.rs:947]

`Feature::SystemProxyFallback`（key `system_proxy_fallback`）是 Stable、默认开启：在未打开 `respect_system_proxy` 时允许 bootstrap 请求失败后经 system proxy 重试。[E: codex-rs/features/src/lib.rs:204][E: codex-rs/features/src/lib.rs:1321][E: codex-rs/features/src/lib.rs:1322][E: codex-rs/features/src/lib.rs:1323][E: codex-rs/features/src/lib.rs:1324]

`Feature::AnalyticsPlanHistory`（key `analytics_plan_history`）是 Experimental、默认关闭，门控 TUI `/analytics` 的 allowance history，不是 `codex_analytics` HTTP 管道本身。[E: codex-rs/features/src/lib.rs:95][E: codex-rs/features/src/lib.rs:934][E: codex-rs/features/src/lib.rs:935][E: codex-rs/features/src/lib.rs:941]

`Feature::AgentMessageBoard`（key `agent_message_board`）是 UnderDevelopment、默认关闭；打开后 extension 才产出 9 个 message-board 工具名，不新增独立 tool 节点。[E: codex-rs/features/src/lib.rs:215][E: codex-rs/features/src/lib.rs:1345][E: codex-rs/features/src/lib.rs:1346][E: codex-rs/features/src/lib.rs:1347][E: codex-rs/features/src/lib.rs:1348]

`Feature::ApiKeyModelDiscovery`（key `api_key_model_discovery`）是 OpenAI API key 的 opt-in model discovery，UnderDevelopment、默认关闭。[E: codex-rs/features/src/lib.rs:97][E: codex-rs/features/src/lib.rs:1282][E: codex-rs/features/src/lib.rs:1283][E: codex-rs/features/src/lib.rs:1284]

`Feature::CodexAppsMcp20260728`（key `codex_apps_mcp_2026_07_28`）给 host-owned Codex Apps server 打开 MCP protocol 2026-07-28，UnderDevelopment、默认关闭。[E: codex-rs/features/src/lib.rs:229][E: codex-rs/features/src/lib.rs:1388][E: codex-rs/features/src/lib.rs:1389][E: codex-rs/features/src/lib.rs:1390]

`Feature::PowerShellShellVersion`（key `powershell_shell_version`）是 UnderDevelopment、默认关闭。[E: codex-rs/features/src/lib.rs:171][E: codex-rs/features/src/lib.rs:1017][E: codex-rs/features/src/lib.rs:1018][E: codex-rs/features/src/lib.rs:1019][E: codex-rs/features/src/lib.rs:1020]

`Feature::OmitAppServerNotificationMedia`（key `omit_app_server_notification_media`）是 UnderDevelopment、默认关闭。[E: codex-rs/features/src/lib.rs:301][E: codex-rs/features/src/lib.rs:1555][E: codex-rs/features/src/lib.rs:1556][E: codex-rs/features/src/lib.rs:1557][E: codex-rs/features/src/lib.rs:1558]

## Legacy 兼容

`legacy.rs` 定义 legacy aliases，例如 `connectors -> Apps`、`experimental_use_unified_exec_tool -> UnifiedExec`、`web_search -> WebSearchRequest`、`imagegenext -> ImageGeneration`、`codex_hooks -> CodexHooks`；legacy toggles 会写 runtime feature 并记录 legacy usage。[E: codex-rs/features/src/legacy.rs:11][E: codex-rs/features/src/legacy.rs:21][E: codex-rs/features/src/legacy.rs:29][E: codex-rs/features/src/legacy.rs:33][E: codex-rs/features/src/legacy.rs:49][E: codex-rs/features/src/legacy.rs:69]

`feature_for_key` 先查 canonical registry，再 fallback 到 legacy alias；`canonical_feature_for_key` 只查 canonical registry；`is_known_feature_key` 额外接受 `tool_registry`，并因调用 `feature_for_key` 而接受 legacy aliases。[E: codex-rs/features/src/lib.rs:767][E: codex-rs/features/src/lib.rs:773][E: codex-rs/features/src/lib.rs:776][E: codex-rs/features/src/lib.rs:784]

`legacy_usage_notice` 把 alias/feature 生成 summary/details；web search 相关 legacy keys 会提示使用 top-level `web_search` 字段，而不是继续放在 `[features]`。[E: codex-rs/features/src/lib.rs:704][E: codex-rs/features/src/lib.rs:715]

## Gotchas

- `FeatureOverrides` 不再包含旧文档里的 `include_apply_patch_tool`；当前只有 `web_search_request`。[E: codex-rs/features/src/lib.rs:476][E: codex-rs/features/src/lib.rs:481]
- `normalize_dependencies` 当前没有关闭 removed flags 的反向规则；只做 CodeModeOnly→CodeMode。[E: codex-rs/features/src/lib.rs:697][E: codex-rs/features/src/lib.rs:698]
- `FeaturesToml` 仍能反序列化旧 `apps_mcp_path_override` 输入，但字段是 private removed compatibility storage；它不是新的可用 feature config。[E: codex-rs/features/src/lib.rs:820]
- feature default 以每个 `FeatureSpec::default_enabled` 为准，不能只按 stage 推断；例如 `ShellTool` default true，而 `AppsMcpPathOverride` removed 且 default false。[E: codex-rs/features/src/lib.rs:963][E: codex-rs/features/src/lib.rs:966][E: codex-rs/features/src/lib.rs:1405][E: codex-rs/features/src/lib.rs:1408]
- `imagegenext` 现在只是 `image_generation` 的 legacy alias；若两者同时出现，canonical key 胜出，不能再把它当成独立 registry feature。[E: codex-rs/features/src/legacy.rs:33]

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
