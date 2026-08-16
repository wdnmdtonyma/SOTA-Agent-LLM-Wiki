---
id: config.agents-memory
title: agents 与 memory 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/profile_toml.rs, codex-rs/config/src/types.rs, codex-rs/features/src/feature_configs.rs, codex-rs/config/src/merge.rs]
symbols: [AgentsToml, AgentRoleToml, MemoriesToml, ThreadStoreToml]
related: [command.session-thread, command.realtime-debug, config.skills-plugins-features, subsys.core.memory, subsys.core.thread-store]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> agents 与 memory 设置 catalog 覆盖 ConfigToml 中 instructions/developer blocks、profile selection、project docs、agent enablement/concurrency/default model, memory behavior, project trust and experimental thread config/store keys。

## 能回答的问题

- instructions、developer_instructions 和 include_* instruction flags 当前有哪些？
- profile/profiles、project docs、projects 的 top-level fields 是什么？
- agents 和 memories nested sections 在 ConfigToml 中如何声明？
- thread config/store 相关 experimental/removed keys 当前是什么状态？

## Catalog 边界

当前 `ConfigToml` 有 97 个顶层 `pub` 字段；本节点覆盖其中 19 个字段。[E: codex-rs/config/src/config_toml.rs:153][E: codex-rs/config/src/config_toml.rs:217]

`AgentsToml` exposes `enabled`、per-session `max_concurrent_threads_per_session`（`max_threads` alias）、V1-only `max_depth`、默认 subagent model/reasoning effort、interrupt-message policy 与 flattened role declarations。`job_max_runtime_seconds` 只为旧配置可解析而保留，是 schema-hidden no-op；当前没有 agent-job runtime。[E: codex-rs/config/src/config_toml.rs:664][E: codex-rs/config/src/config_toml.rs:667][E: codex-rs/config/src/config_toml.rs:670][E: codex-rs/config/src/config_toml.rs:674][E: codex-rs/config/src/config_toml.rs:681][E: codex-rs/config/src/config_toml.rs:696]

`MemoriesToml` includes generation/use toggles, dedicated tools, retention limits, rate-limit threshold, and model overrides; memory defaults set `max_rollouts_per_startup` to 2 and `max_rollout_age_days` to 10.[E: codex-rs/config/src/types.rs:290][E: codex-rs/config/src/types.rs:295][E: codex-rs/config/src/types.rs:297][E: codex-rs/config/src/types.rs:299][E: codex-rs/config/src/types.rs:306][E: codex-rs/config/src/types.rs:309][E: codex-rs/config/src/types.rs:314][E: codex-rs/config/src/types.rs:316][E: codex-rs/config/src/types.rs:46][E: codex-rs/config/src/types.rs:47][E: codex-rs/config/src/types.rs:347][E: codex-rs/config/src/types.rs:348]

multi-agent v2 的配置不增加 ConfigToml 顶层字段，而是扩展 `features.multi_agent_v2` table：`subagent_developer_instructions` 可覆盖没有 role-specific instructions 的 subagent developer instructions。layer merge 对该 feature 特判 bool/table 兼容：低层 bool 遇高层 table 会提升为 `{ enabled = ... }`，低层 table 遇高层 bool 则只覆盖其 `enabled`，避免丢掉 table 内的其余 knobs。[E: codex-rs/features/src/feature_configs.rs:237][E: codex-rs/config/src/merge.rs:61][E: codex-rs/config/src/merge.rs:78]

## 字段 catalog

| key | Rust type | serde/schema attrs | 字段说明 | Evidence |
|---|---|---|---|---|
| `instructions` | `Option<String>` | none | System instruction override field. | [E: codex-rs/config/src/config_toml.rs:217] |
| `developer_instructions` | `Option<String>` | `#[serde(default)]` | Developer instruction override field. | [E: codex-rs/config/src/config_toml.rs:220][E: codex-rs/config/src/config_toml.rs:221] |
| `include_permissions_instructions` | `Option<bool>` | none | Toggle for the permissions developer block. | [E: codex-rs/config/src/config_toml.rs:224] |
| `include_apps_instructions` | `Option<bool>` | none | Toggle for the apps developer block. | [E: codex-rs/config/src/config_toml.rs:227] |
| `include_collaboration_mode_instructions` | `Option<bool>` | none | Toggle for the collaboration-mode developer block. | [E: codex-rs/config/src/config_toml.rs:230] |
| `include_environment_context` | `Option<bool>` | none | Toggle for injecting environment context. | [E: codex-rs/config/src/config_toml.rs:233] |
| `model_instructions_file` | `Option<AbsolutePathBuf>` | none | Optional model-instructions file path field. | [E: codex-rs/config/src/config_toml.rs:239] |
| `compact_prompt` | `Option<String>` | none | Compact prompt override field. | [E: codex-rs/config/src/config_toml.rs:242] |
| `project_doc_max_bytes` | `Option<usize>` | `#[serde(default = "default_project_doc_max_bytes")]` | Project-doc byte limit field. | [E: codex-rs/config/src/config_toml.rs:289][E: codex-rs/config/src/config_toml.rs:290] |
| `project_doc_fallback_filenames` | `Option<Vec<String>>` | `#[serde(default = "default_project_doc_fallback_filenames")]` | Project-doc fallback filename list. | [E: codex-rs/config/src/config_toml.rs:293][E: codex-rs/config/src/config_toml.rs:294] |
| `profile` | `Option<String>` | none | Selected profile name. | [E: codex-rs/config/src/config_toml.rs:312] |
| `profiles` | `HashMap<String, ConfigProfile>` | `#[serde(default)]` | Named profile map. | [E: codex-rs/config/src/config_toml.rs:315][E: codex-rs/config/src/config_toml.rs:316] |
| `agents` | `Option<AgentsToml>` | none | Agent-related settings section. | [E: codex-rs/config/src/config_toml.rs:435] |
| `memories` | `Option<MemoriesToml>` | none | Memories subsystem settings section. | [E: codex-rs/config/src/config_toml.rs:441] |
| `projects` | `Option<HashMap<String, ProjectConfig>>` | none | Project trust/settings map. | [E: codex-rs/config/src/config_toml.rs:423] |
| `experimental_thread_config_endpoint` | `Option<String>` | none | Experimental thread-scoped config endpoint. | [E: codex-rs/config/src/config_toml.rs:414] |
| `experimental_thread_store_endpoint` | `Option<String>` | `#[schemars(skip)]` | Removed thread-store endpoint compatibility field. | [E: codex-rs/config/src/config_toml.rs:418][E: codex-rs/config/src/config_toml.rs:419] |
| `experimental_thread_store` | `Option<ThreadStoreToml>` | none | Experimental thread-store implementation selector. | [E: codex-rs/config/src/config_toml.rs:422] |
| `experimental_compact_prompt_file` | `Option<AbsolutePathBuf>` | none | Experimental compact-prompt file path. | [E: codex-rs/config/src/config_toml.rs:513] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/features/src/feature_configs.rs`
- `codex-rs/config/src/merge.rs`

## 相关

- `command.session-thread`
- `command.realtime-debug`
- `config.skills-plugins-features`
- `subsys.core.memory`
- `subsys.core.thread-store`
