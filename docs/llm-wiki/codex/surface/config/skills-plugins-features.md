---
id: config.skills-plugins-features
title: skills/plugins/features 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/skills_config.rs, codex-rs/config/src/hook_config.rs, codex-rs/features/src/lib.rs]
symbols: [ConfigToml, SkillsConfig, HooksToml, PluginConfig, MarketplaceConfig, FeaturesToml]
related: [config.mcp-tools, config.agents-memory, subsys.config-auth.skills, subsys.config-auth.plugins, ref.feature-flags]
evidence: explicit
status: verified
updated: db887d03e1
---

> skills/plugins/features 设置 catalog 覆盖 ConfigToml 中 user-level skills config、hooks、plugins、marketplaces、centralized feature flags and unstable-feature warning suppression 的顶层键。

## 能回答的问题

- skills、hooks、plugins、marketplaces 在 ConfigToml 中是什么类型？
- features 使用哪个 schema helper？
- suppress_unstable_features_warning 的字段位置是什么？
- skills/plugins/features 与 app connector settings 的边界是什么？

## Catalog 边界

当前 `ConfigToml` 有 97 个顶层 `pub` 字段；本节点覆盖其中 6 个。8 个 surface/config catalog 节点合计覆盖全部 97 个字段且不重复。[I]

`features` is an optional `FeaturesToml` field with the `features_schema` helper, while `plugins` and `marketplaces` are defaulted top-level maps keyed by name.[E: codex-rs/config/src/config_toml.rs:452][E: codex-rs/config/src/config_toml.rs:453][E: codex-rs/config/src/config_toml.rs:456][E: codex-rs/config/src/config_toml.rs:457][E: codex-rs/config/src/config_toml.rs:462][E: codex-rs/config/src/config_toml.rs:463]

## 字段 catalog

| key | Rust type | serde/schema attrs | 源码注释摘要 | Evidence |
|---|---|---|---|---|
| `skills` | `Option<SkillsConfig>` | none | User-level skill config entries keyed by SKILL.md path. | [E: codex-rs/config/src/config_toml.rs:445][E: codex-rs/config/src/config_toml.rs:446] |
| `hooks` | `Option<HooksToml>` | none | Lifecycle hooks configured inline in TOML plus user-level overrides. | [E: codex-rs/config/src/config_toml.rs:448][E: codex-rs/config/src/config_toml.rs:449] |
| `plugins` | `HashMap<String, PluginConfig>` | `#[serde(default)]` | User-level plugin config entries keyed by plugin name. | [E: codex-rs/config/src/config_toml.rs:451][E: codex-rs/config/src/config_toml.rs:452][E: codex-rs/config/src/config_toml.rs:453] |
| `marketplaces` | `HashMap<String, MarketplaceConfig>` | `#[serde(default)]` | User-level marketplace entries keyed by marketplace name. | [E: codex-rs/config/src/config_toml.rs:455][E: codex-rs/config/src/config_toml.rs:456][E: codex-rs/config/src/config_toml.rs:457] |
| `features` | `Option<FeaturesToml>` | `#[serde(default)]`<br>`#[schemars(schema_with = "crate::schema::features_schema")]` | Centralized feature flags (new). Prefer this over individual toggles. | [E: codex-rs/config/src/config_toml.rs:459][E: codex-rs/config/src/config_toml.rs:460][E: codex-rs/config/src/config_toml.rs:463] |
| `suppress_unstable_features_warning` | `Option<bool>` | none | Suppress warnings about unstable (under development) features. | [E: codex-rs/config/src/config_toml.rs:465][E: codex-rs/config/src/config_toml.rs:466] |

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
