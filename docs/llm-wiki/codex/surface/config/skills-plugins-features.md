---
id: config.skills-plugins-features
title: skills/plugins/features 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/skills_config.rs, codex-rs/config/src/hook_config.rs, codex-rs/features/src/lib.rs, codex-rs/ext/agent-message-board/src/tools/spec.rs]
symbols: [SkillsConfig, HooksToml, PluginConfig, MarketplaceConfig, CloudToml]
related: [config.mcp-tools, config.agents-memory, subsys.config-auth.skills, subsys.config-auth.plugins, ref.feature-flags]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> skills/plugins/features 设置 catalog 覆盖 ConfigToml 中 user-level skills config、hooks、plugins、marketplaces、orchestrator-owned skills/MCP switches、centralized feature flags 和 unstable-feature warning suppression 的顶层键。

## 能回答的问题

- skills、hooks、plugins、marketplaces 在 ConfigToml 中是什么类型？
- features 使用哪个 schema helper？
- suppress_unstable_features_warning 的字段位置是什么？
- orchestrator-owned skills/MCP switches 使用什么嵌套结构？
- skills/plugins/features 与 app connector settings 的边界是什么？

## Catalog 边界

当前 `ConfigToml` 有 **104** 个顶层 `pub` 字段；本节点覆盖其中 **8** 个。8 个 surface/config catalog 节点合计覆盖全部 104 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:165][E: codex-rs/config/src/config_toml.rs:557]

`features` is an optional `FeaturesToml` field with the `features_schema` helper, while `plugins` and `marketplaces` are defaulted top-level maps keyed by name。[E: codex-rs/config/src/config_toml.rs:494][E: codex-rs/config/src/config_toml.rs:498][E: codex-rs/config/src/config_toml.rs:504]

`cloud` 是独立顶层表 `CloudToml`，目前只有 `skills: Option<FeatureToggleToml>`（cloud skills 默认允许，host 必须提供 cloud provider）。`orchestrator.skills` 是兼容 no-op，应改用 `cloud.skills`。[E: codex-rs/config/src/config_toml.rs:150][E: codex-rs/config/src/config_toml.rs:152][E: codex-rs/config/src/config_toml.rs:143][E: codex-rs/config/src/config_toml.rs:421]

`Feature::AgentMessageBoard`（key `agent_message_board`）是 UnderDevelopment、默认关。开启后 `message_board_tools` 产出 9 个工具名：`create_channel`、`get_channels`、`list_threads`、`search_posts`、`read_thread`、`read_post`、`subscribe`、`unsubscribe`、`post`。这些不是 core wire 工具，不为它们建 `surface/tools` 节点。[E: codex-rs/features/src/lib.rs:215][E: codex-rs/features/src/lib.rs:1345][E: codex-rs/features/src/lib.rs:1346][E: codex-rs/features/src/lib.rs:1347][E: codex-rs/features/src/lib.rs:1348][E: codex-rs/ext/agent-message-board/src/tools/spec.rs:10]

本轮相关 feature 状态：`plugins`、`remote_plugin`、`plugin_sharing`、`skill_search` 都是 stable 且 default-on；`recommended_plugins` stable 但 default-off；`mcp_2026_07_28` 仍 under-development/default-off；`external_migration` 已 removed/no-op。它们属于 `[features]`，不是 `plugins`/`marketplaces` map 的成员。[E: codex-rs/features/src/lib.rs:1453][E: codex-rs/features/src/lib.rs:1456][E: codex-rs/features/src/lib.rs:1531][E: codex-rs/features/src/lib.rs:1534][E: codex-rs/features/src/lib.rs:1537][E: codex-rs/features/src/lib.rs:1540][E: codex-rs/features/src/lib.rs:1597][E: codex-rs/features/src/lib.rs:1600][E: codex-rs/features/src/lib.rs:1447][E: codex-rs/features/src/lib.rs:1450][E: codex-rs/features/src/lib.rs:1381][E: codex-rs/features/src/lib.rs:1384][E: codex-rs/features/src/lib.rs:1543][E: codex-rs/features/src/lib.rs:1545]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `skills` | `Option<SkillsConfig>` | none | User-level skill config entries keyed by SKILL.md path. | [E: codex-rs/config/src/config_toml.rs:487] |
| `hooks` | `Option<HooksToml>` | none | Lifecycle hooks configured inline in TOML plus user-level overrides. | [E: codex-rs/config/src/config_toml.rs:490] |
| `plugins` | `HashMap<String, PluginConfig>` | `#[serde(default)]` | User-level plugin config entries keyed by plugin name. | [E: codex-rs/config/src/config_toml.rs:494] |
| `marketplaces` | `HashMap<String, MarketplaceConfig>` | `#[serde(default)]` | User-level marketplace entries keyed by marketplace name. | [E: codex-rs/config/src/config_toml.rs:498] |
| `orchestrator` | `Option<OrchestratorToml>` | none | Orchestrator-owned switches。`mcp` 仍是 optional `FeatureToggleToml`；`skills` 是兼容 no-op，请用 `cloud.skills`。 | [E: codex-rs/config/src/config_toml.rs:418][E: codex-rs/config/src/config_toml.rs:143] |
| `cloud` | `Option<CloudToml>` | none | Cloud-owned feature settings；当前字段只有 `skills`。 | [E: codex-rs/config/src/config_toml.rs:421] |
| `features` | `Option<FeaturesToml>` | `#[serde(default)]`<br>`#[schemars(schema_with = "crate::schema::features_schema")]` | Centralized feature flags (new). Prefer this over individual toggles. | [E: codex-rs/config/src/config_toml.rs:504] |
| `suppress_unstable_features_warning` | `Option<bool>` | none | Suppress warnings about unstable (under development) features. | [E: codex-rs/config/src/config_toml.rs:507] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/skills_config.rs`
- `codex-rs/config/src/hook_config.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/ext/agent-message-board/src/tools/spec.rs`

## 相关

- `config.mcp-tools`
- `config.agents-memory`
- `subsys.config-auth.skills`
- `subsys.config-auth.plugins`
- `ref.feature-flags`
