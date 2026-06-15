---
id: config.agents-memory
title: agents 与 memory 设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/profile_toml.rs, codex-rs/core/src/config/mod.rs]
symbols: [ConfigToml, ConfigProfile, AgentsToml, AgentRoleToml, MemoriesToml, MemoriesConfig, ProjectConfig]
related: [command.session-thread, command.realtime-debug, config.skills-plugins-features, config.storage-telemetry-misc]
evidence: explicit
status: verified
updated: 37aadeaa13
---

> agents 与 memory 设置 catalog 覆盖 `ConfigToml` 中系统/开发者指令、instruction include flags、compaction prompt、project doc budgets、profiles、agent concurrency、memory behavior 和 project trust 的顶层键。

## 能回答的问题

- `profile` 与 `[profiles]` 如何选择 effective config profile?
- `agents.max_threads`、`agents.max_depth`、`agents.job_max_runtime_seconds` 的默认值和校验是什么?
- `memories` nested config 有哪些字段，默认值如何 clamp?
- `project_doc_max_bytes` 与 fallback filenames 如何影响 AGENTS.md project docs?
- 哪些 include flags 控制 permissions/apps/environment context developer/user blocks?

## Catalog

| key | TOML 类型 | TOML 默认 | 有效配置默认 | 含义与为什么 | 源 |
|---|---|---|---|---|---|
| `instructions` | `Option<String>` | unset | `ConfigToml` schema 接受该字段；本节点只证明 schema 定义。[E: codex-rs/config/src/config_toml.rs:125] | 表示 system instructions 文本；当前 catalog 不把该字段扩展成 prompt lifecycle 事实，因为 inspected `core/src/config/mod.rs` 中未出现 `cfg.instructions` direct assignment。[I] | `codex-rs/config/src/config_toml.rs:125` |
| `developer_instructions` | `Option<String>` | unset | CLI/config override 优先，global `developer_instructions` 作为 fallback。[E: codex-rs/core/src/config/mod.rs:2010] | 作为 `developer` role message 注入的 developer instructions。[E: codex-rs/config/src/config_toml.rs:127] | `codex-rs/config/src/config_toml.rs:129` |
| `include_permissions_instructions` | `Option<bool>` | unset | profile 覆盖 global；默认 `true`。[E: codex-rs/core/src/config/mod.rs:2012][E: codex-rs/core/src/config/mod.rs:2013][E: codex-rs/core/src/config/mod.rs:2014] | 控制是否注入 `<permissions instructions>` developer block。[E: codex-rs/config/src/config_toml.rs:131] | `codex-rs/config/src/config_toml.rs:132` |
| `include_apps_instructions` | `Option<bool>` | unset | profile 覆盖 global；默认 `true`。[E: codex-rs/core/src/config/mod.rs:2016][E: codex-rs/core/src/config/mod.rs:2017][E: codex-rs/core/src/config/mod.rs:2018] | 控制是否注入 `<apps_instructions>` developer block。[E: codex-rs/config/src/config_toml.rs:134] | `codex-rs/config/src/config_toml.rs:135` |
| `include_environment_context` | `Option<bool>` | unset | profile 覆盖 global；默认 `true`。[E: codex-rs/core/src/config/mod.rs:2025][E: codex-rs/core/src/config/mod.rs:2026][E: codex-rs/core/src/config/mod.rs:2027] | 控制是否注入 `<environment_context>` user block。[E: codex-rs/config/src/config_toml.rs:137] | `codex-rs/config/src/config_toml.rs:138` |
| `model_instructions_file` | `Option<AbsolutePathBuf>` | unset | profile 覆盖 global；读取文件后会 trim，空文件报错，非空内容作为 base instructions override。[E: codex-rs/core/src/config/mod.rs:2000][E: codex-rs/core/src/config/mod.rs:2002][E: codex-rs/core/src/config/mod.rs:2009][E: codex-rs/core/src/config/mod.rs:2430][E: codex-rs/core/src/config/mod.rs:2432][E: codex-rs/core/src/config/mod.rs:2434][E: codex-rs/core/src/config/mod.rs:2437] | 从文件加载 model instructions override；源码注释强烈不建议偏离 Codex sanctioned instructions。[E: codex-rs/config/src/config_toml.rs:140][E: codex-rs/config/src/config_toml.rs:143] | `codex-rs/config/src/config_toml.rs:144` |
| `compact_prompt` | `Option<String>` | unset | CLI/config override 优先，然后 global；trim 后空字符串变成 `None`。[E: codex-rs/core/src/config/mod.rs:1985][E: codex-rs/core/src/config/mod.rs:1987][E: codex-rs/core/src/config/mod.rs:1988][E: codex-rs/core/src/config/mod.rs:1990] | 设置 history compaction prompt。[E: codex-rs/config/src/config_toml.rs:146] | `codex-rs/config/src/config_toml.rs:147` |
| `project_doc_max_bytes` | `Option<usize>` | unset | 默认 `32 * 1024` bytes。[E: codex-rs/core/src/config/mod.rs:127][E: codex-rs/core/src/config/mod.rs:2256] | 限制 AGENTS.md project doc 进入上下文的最大字节数；超过该值会 silently truncated。[E: codex-rs/core/src/config/mod.rs:124][E: codex-rs/core/src/config/mod.rs:125] | `codex-rs/config/src/config_toml.rs:199` |
| `project_doc_fallback_filenames` | `Option<Vec<String>>` | unset | 默认 empty vec；加载时 trim 每个 filename 并丢弃空字符串。[E: codex-rs/core/src/config/mod.rs:2259][E: codex-rs/core/src/config/mod.rs:2262][E: codex-rs/core/src/config/mod.rs:2264] | 当 `AGENTS.md` 缺失时，按顺序查找 fallback filenames。[E: codex-rs/config/src/config_toml.rs:201] | `codex-rs/config/src/config_toml.rs:202` |
| `profile` | `Option<String>` | unset | CLI override 优先于 global `profile`；如果 profile key 不存在则 config load 报 `NotFound`。[E: codex-rs/core/src/config/mod.rs:1619][E: codex-rs/core/src/config/mod.rs:1621][E: codex-rs/core/src/config/mod.rs:1629] | 从 `[profiles]` map 选择 active profile。[E: codex-rs/config/src/config_toml.rs:220] | `codex-rs/config/src/config_toml.rs:221` |
| `profiles` | `HashMap<String, ConfigProfile>` | `{}` | 未选择 profile 时使用 `ConfigProfile::default()`。[E: codex-rs/core/src/config/mod.rs:1633][E: codex-rs/core/src/config/mod.rs:1634] | 定义可切换的 named configuration units；`ConfigProfile` 包含 model、provider、approval、sandbox、reasoning、tools、web_search、features 等字段。[E: codex-rs/config/src/profile_toml.rs:25][E: codex-rs/config/src/profile_toml.rs:29][E: codex-rs/config/src/profile_toml.rs:30][E: codex-rs/config/src/profile_toml.rs:32][E: codex-rs/config/src/profile_toml.rs:33][E: codex-rs/config/src/profile_toml.rs:59][E: codex-rs/config/src/profile_toml.rs:60][E: codex-rs/config/src/profile_toml.rs:68] | `codex-rs/config/src/config_toml.rs:225` |
| `agents` | `Option<AgentsToml>` | unset | `max_threads=Some(6)`、`max_depth=1`、`job_max_runtime_seconds=None`。[E: codex-rs/core/src/config/mod.rs:128][E: codex-rs/core/src/config/mod.rs:129][E: codex-rs/core/src/config/mod.rs:130][E: codex-rs/core/src/config/mod.rs:1888][E: codex-rs/core/src/config/mod.rs:1903][E: codex-rs/core/src/config/mod.rs:1914] | 配置 agent thread 并发、嵌套深度、job runtime 和 user-defined roles。[E: codex-rs/config/src/config_toml.rs:539][E: codex-rs/config/src/config_toml.rs:543][E: codex-rs/config/src/config_toml.rs:547][E: codex-rs/config/src/config_toml.rs:550][E: codex-rs/config/src/config_toml.rs:562] | `codex-rs/config/src/config_toml.rs:323` |
| `memories` | `Option<MemoriesToml>` | unset | `MemoriesConfig::default()`：disable external context false、generate/use true、raw consolidation 256、unused days 30、rollout age 30、rollouts 16、idle hours 6。[E: codex-rs/config/src/types.rs:229][E: codex-rs/config/src/types.rs:230][E: codex-rs/config/src/types.rs:231][E: codex-rs/config/src/types.rs:232][E: codex-rs/config/src/types.rs:233][E: codex-rs/config/src/types.rs:234][E: codex-rs/config/src/types.rs:235][E: codex-rs/config/src/types.rs:236] | 配置 memories subsystem；nested fields 包括 external context disable、generate/use toggles、retention/rollout limits 和 extraction/consolidation models。[E: codex-rs/config/src/types.rs:185][E: codex-rs/config/src/types.rs:188][E: codex-rs/config/src/types.rs:190][E: codex-rs/config/src/types.rs:192][E: codex-rs/config/src/types.rs:195][E: codex-rs/config/src/types.rs:197][E: codex-rs/config/src/types.rs:199][E: codex-rs/config/src/types.rs:202][E: codex-rs/config/src/types.rs:204][E: codex-rs/config/src/types.rs:206][E: codex-rs/config/src/types.rs:208] | `codex-rs/config/src/config_toml.rs:326` |
| `projects` | `Option<HashMap<String, ProjectConfig>>` | unset | `get_active_project` 对 cwd/repo root lookup，未命中时 fallback 到 `trust_level: None`。[E: codex-rs/core/src/config/mod.rs:1686][E: codex-rs/core/src/config/mod.rs:1691][E: codex-rs/config/src/config_toml.rs:685][E: codex-rs/config/src/config_toml.rs:695][E: codex-rs/config/src/config_toml.rs:701] | 按 project path 配置 trust decision；`ProjectConfig` 目前包含 `trust_level`，并提供 trusted/untrusted 判定 helper。[E: codex-rs/config/src/config_toml.rs:431][E: codex-rs/config/src/config_toml.rs:437][E: codex-rs/config/src/config_toml.rs:441] | `codex-rs/config/src/config_toml.rs:311` |

## 嵌套结构与边界

`AgentRoleToml` 的 nested role declaration 包含 `description`、`config_file` 和 `nickname_candidates`；`agents.roles` 使用 flatten map，因此 role names 是 `[agents.<role>]` 级别的 dynamic keys。[E: codex-rs/config/src/config_toml.rs:561][E: codex-rs/config/src/config_toml.rs:562][E: codex-rs/config/src/config_toml.rs:567][E: codex-rs/config/src/config_toml.rs:570][E: codex-rs/config/src/config_toml.rs:574][E: codex-rs/config/src/config_toml.rs:577]

`MemoriesToml` 进入 effective config 时会 clamp limits：raw memories clamp 到 1..4096，unused days clamp 到 0..365，rollout age clamp 到 0..90，rollouts per startup clamp 到 1..128，idle hours clamp 到 1..48。[E: codex-rs/config/src/types.rs:35][E: codex-rs/config/src/types.rs:36][E: codex-rs/config/src/types.rs:37][E: codex-rs/config/src/types.rs:38][E: codex-rs/config/src/types.rs:255][E: codex-rs/config/src/types.rs:256][E: codex-rs/config/src/types.rs:257][E: codex-rs/config/src/types.rs:262][E: codex-rs/config/src/types.rs:266][E: codex-rs/config/src/types.rs:270][E: codex-rs/config/src/types.rs:271][E: codex-rs/config/src/types.rs:272][E: codex-rs/config/src/types.rs:277]

`skills.include_instructions` 是 `[skills]` nested key，而不是本 catalog 统计的 `ConfigToml` 顶层 key。[I] Effective `include_skill_instructions` 从 `cfg.skills.include_instructions` 读取，默认 `true`。[E: codex-rs/core/src/config/mod.rs:2019][E: codex-rs/core/src/config/mod.rs:2022][E: codex-rs/core/src/config/mod.rs:2023]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/profile_toml.rs`
- `codex-rs/core/src/config/mod.rs`

## 相关

- [会话与线程 slash command](../slash-commands/session-thread.md) — 覆盖 `/new`、`/resume`、`/fork`、`/compact` 等 session/thread commands。
- [实时与调试 slash command](../slash-commands/realtime-debug.md) — 覆盖 `/debug-m-drop`、`/debug-m-update` 和 memory debug commands。
- [skills/plugins/features 设置](skills-plugins-features.md) — 覆盖 `skills.include_instructions` nested config 与 feature gate。
