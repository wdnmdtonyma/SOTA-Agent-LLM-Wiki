---
id: config.agents-memory
title: agents 与 memory 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/profile_toml.rs, codex-rs/config/src/types.rs]
symbols: [ConfigToml, ConfigProfile, AgentsToml, AgentRoleToml, MemoriesToml, MemoriesConfig, ProjectConfig, ThreadStoreToml]
related: [command.session-thread, command.realtime-debug, config.skills-plugins-features, subsys.core.memory, subsys.core.thread-store]
evidence: explicit
status: verified
updated: db887d03e1
---

> agents 与 memory 设置 catalog 覆盖 ConfigToml 中 instructions/developer blocks、profile selection、project docs、agent concurrency, memory behavior, project trust and experimental thread config/store keys。

## 能回答的问题

- instructions、developer_instructions 和 include_* instruction flags 当前有哪些？
- profile/profiles、project docs、projects 的 top-level fields 是什么？
- agents 和 memories nested sections 在 ConfigToml 中如何声明？
- thread config/store 相关 experimental/removed keys 当前是什么状态？

## Catalog 边界

当前 `ConfigToml` 有 97 个顶层 `pub` 字段；本节点覆盖其中 19 个字段。[E: codex-rs/config/src/config_toml.rs:154][E: codex-rs/config/src/config_toml.rs:518]

`MemoriesToml` includes generation/use toggles, dedicated tools, retention limits, rate-limit threshold, and model overrides; memory defaults set `max_rollouts_per_startup` to 2 and `max_rollout_age_days` to 10.[E: codex-rs/config/src/types.rs:283][E: codex-rs/config/src/types.rs:288][E: codex-rs/config/src/types.rs:290][E: codex-rs/config/src/types.rs:292][E: codex-rs/config/src/types.rs:302][E: codex-rs/config/src/types.rs:307][E: codex-rs/config/src/types.rs:309][E: codex-rs/config/src/types.rs:311][E: codex-rs/config/src/types.rs:48][E: codex-rs/config/src/types.rs:49][E: codex-rs/config/src/types.rs:340][E: codex-rs/config/src/types.rs:341]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `instructions` | `Option<String>` | none | System instruction override field. | [E: codex-rs/config/src/config_toml.rs:219] |
| `developer_instructions` | `Option<String>` | `#[serde(default)]` | Developer instruction override field. | [E: codex-rs/config/src/config_toml.rs:222][E: codex-rs/config/src/config_toml.rs:223] |
| `include_permissions_instructions` | `Option<bool>` | none | Toggle for the permissions developer block. | [E: codex-rs/config/src/config_toml.rs:226] |
| `include_apps_instructions` | `Option<bool>` | none | Toggle for the apps developer block. | [E: codex-rs/config/src/config_toml.rs:229] |
| `include_collaboration_mode_instructions` | `Option<bool>` | none | Toggle for the collaboration-mode developer block. | [E: codex-rs/config/src/config_toml.rs:232] |
| `include_environment_context` | `Option<bool>` | none | Toggle for injecting environment context. | [E: codex-rs/config/src/config_toml.rs:235] |
| `model_instructions_file` | `Option<AbsolutePathBuf>` | none | Optional model-instructions file path field. | [E: codex-rs/config/src/config_toml.rs:241] |
| `compact_prompt` | `Option<String>` | none | Compact prompt override field. | [E: codex-rs/config/src/config_toml.rs:244] |
| `project_doc_max_bytes` | `Option<usize>` | `#[serde(default = "default_project_doc_max_bytes")]` | Project-doc byte limit field. | [E: codex-rs/config/src/config_toml.rs:291][E: codex-rs/config/src/config_toml.rs:292] |
| `project_doc_fallback_filenames` | `Option<Vec<String>>` | `#[serde(default = "default_project_doc_fallback_filenames")]` | Project-doc fallback filename list. | [E: codex-rs/config/src/config_toml.rs:295][E: codex-rs/config/src/config_toml.rs:296] |
| `profile` | `Option<String>` | none | Selected profile name. | [E: codex-rs/config/src/config_toml.rs:314] |
| `profiles` | `HashMap<String, ConfigProfile>` | `#[serde(default)]` | Named profile map. | [E: codex-rs/config/src/config_toml.rs:317][E: codex-rs/config/src/config_toml.rs:318] |
| `agents` | `Option<AgentsToml>` | none | Agent-related settings section. | [E: codex-rs/config/src/config_toml.rs:440] |
| `memories` | `Option<MemoriesToml>` | none | Memories subsystem settings section. | [E: codex-rs/config/src/config_toml.rs:443] |
| `projects` | `Option<HashMap<String, ProjectConfig>>` | none | Project trust/settings map. | [E: codex-rs/config/src/config_toml.rs:428] |
| `experimental_thread_config_endpoint` | `Option<String>` | none | Experimental thread-scoped config endpoint. | [E: codex-rs/config/src/config_toml.rs:419] |
| `experimental_thread_store_endpoint` | `Option<String>` | `#[schemars(skip)]` | Removed thread-store endpoint compatibility field. | [E: codex-rs/config/src/config_toml.rs:423][E: codex-rs/config/src/config_toml.rs:424] |
| `experimental_thread_store` | `Option<ThreadStoreToml>` | none | Experimental thread-store implementation selector. | [E: codex-rs/config/src/config_toml.rs:427] |
| `experimental_compact_prompt_file` | `Option<AbsolutePathBuf>` | none | Experimental compact-prompt file path. | [E: codex-rs/config/src/config_toml.rs:515] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/types.rs`

## 相关

- `command.session-thread`
- `command.realtime-debug`
- `config.skills-plugins-features`
- `subsys.core.memory`
- `subsys.core.thread-store`
