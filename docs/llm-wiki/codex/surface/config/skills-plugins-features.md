---
id: config.skills-plugins-features
title: skills/plugins/features 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/skills_config.rs, codex-rs/config/src/hook_config.rs, codex-rs/features/src/lib.rs]
symbols: [SkillsConfig, HooksToml, PluginConfig, MarketplaceConfig]
related: [config.mcp-tools, config.agents-memory, subsys.config-auth.skills, subsys.config-auth.plugins, ref.feature-flags]
evidence: explicit
status: verified
updated: 3abbf9fe2c
---

> skills/plugins/features 设置 catalog 覆盖 ConfigToml 中 user-level skills config、hooks、plugins、marketplaces、orchestrator-owned skills/MCP switches、centralized feature flags 和 unstable-feature warning suppression 的顶层键。

## 能回答的问题

- skills、hooks、plugins、marketplaces 在 ConfigToml 中是什么类型？
- features 使用哪个 schema helper？
- suppress_unstable_features_warning 的字段位置是什么？
- orchestrator-owned skills/MCP switches 使用什么嵌套结构？
- skills/plugins/features 与 app connector settings 的边界是什么？

## Catalog 边界

当前 `ConfigToml` 有 101 个顶层 `pub` 字段；本节点覆盖其中 7 个。8 个 surface/config catalog 节点合计覆盖全部 101 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:156][E: codex-rs/config/src/config_toml.rs:539]

`features` is an optional `FeaturesToml` field with the `features_schema` helper, while `plugins` and `marketplaces` are defaulted top-level maps keyed by name.[E: codex-rs/config/src/config_toml.rs:476][E: codex-rs/config/src/config_toml.rs:480][E: codex-rs/config/src/config_toml.rs:486]

本轮相关 feature 状态：`plugins`、`remote_plugin`、`plugin_sharing`、`skill_search` 都是 stable 且 default-on；`recommended_plugins` stable 但 default-off；`mcp_2026_07_28` 仍 under-development/default-off；`external_migration` 已 removed/no-op。它们属于 `[features]`，不是 `plugins`/`marketplaces` map 的成员。[E: codex-rs/features/src/lib.rs:1383][E: codex-rs/features/src/lib.rs:1386][E: codex-rs/features/src/lib.rs:1461][E: codex-rs/features/src/lib.rs:1464][E: codex-rs/features/src/lib.rs:1467][E: codex-rs/features/src/lib.rs:1470][E: codex-rs/features/src/lib.rs:1527][E: codex-rs/features/src/lib.rs:1530][E: codex-rs/features/src/lib.rs:1377][E: codex-rs/features/src/lib.rs:1380][E: codex-rs/features/src/lib.rs:1311][E: codex-rs/features/src/lib.rs:1314][E: codex-rs/features/src/lib.rs:1473][E: codex-rs/features/src/lib.rs:1475]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `skills` | `Option<SkillsConfig>` | none | User-level skill config entries keyed by SKILL.md path. | [E: codex-rs/config/src/config_toml.rs:469] |
| `hooks` | `Option<HooksToml>` | none | Lifecycle hooks configured inline in TOML plus user-level overrides. | [E: codex-rs/config/src/config_toml.rs:472] |
| `plugins` | `HashMap<String, PluginConfig>` | `#[serde(default)]` | User-level plugin config entries keyed by plugin name. | [E: codex-rs/config/src/config_toml.rs:476] |
| `marketplaces` | `HashMap<String, MarketplaceConfig>` | `#[serde(default)]` | User-level marketplace entries keyed by marketplace name. | [E: codex-rs/config/src/config_toml.rs:480] |
| `orchestrator` | `Option<OrchestratorToml>` | none | Orchestrator-owned switches；`skills` 与 `mcp` 各自使用只含 optional `enabled` 的 `OrchestratorFeatureToml`。 | [E: codex-rs/config/src/config_toml.rs:403] |
| `features` | `Option<FeaturesToml>` | `#[serde(default)]`<br>`#[schemars(schema_with = "crate::schema::features_schema")]` | Centralized feature flags (new). Prefer this over individual toggles. | [E: codex-rs/config/src/config_toml.rs:486] |
| `suppress_unstable_features_warning` | `Option<bool>` | none | Suppress warnings about unstable (under development) features. | [E: codex-rs/config/src/config_toml.rs:489] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/skills_config.rs`
- `codex-rs/config/src/hook_config.rs`
- `codex-rs/features/src/lib.rs`

## 相关

- `config.mcp-tools`
- `config.agents-memory`
- `subsys.config-auth.skills`
- `subsys.config-auth.plugins`
- `ref.feature-flags`
