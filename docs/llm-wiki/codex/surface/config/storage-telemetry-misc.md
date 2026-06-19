---
id: config.storage-telemetry-misc
title: 存储/遥测/杂项设置
kind: config
tier: T1
source: [codex-rs/config/src/config_toml.rs, codex-rs/config/src/types.rs, codex-rs/config/src/project_root_markers.rs]
symbols: [ConfigToml, History, DebugToml, UriBasedFileOpener, GhostSnapshotToml, AnalyticsConfigToml, FeedbackConfigToml, AppsConfigToml, OtelConfigToml, WindowsToml, Notice]
related: [command.config-system, config.ui-tui, config.approval-sandbox, subsys.platform.telemetry-otel, subsys.core.ghost-undo]
evidence: explicit
status: verified
updated: 5670360009
---

> 存储/遥测/杂项设置 catalog 覆盖 ConfigToml 中 notifications, deprecated js_repl placeholders, history/state/log/debug, file opener, ghost snapshot, project root markers, update checks, analytics/feedback, apps, desktop, OTEL, Windows and notice state。

## 能回答的问题

- history/sqlite/log/debug/file opener 的 top-level fields 是什么？
- 哪些 deprecated js_repl placeholders 仍保留为 schemars skip？
- analytics、feedback、apps、desktop、otel、windows、notice 当前如何声明？
- project_root_markers、ghost_snapshot、update check 和 notify 落在哪个 catalog？

## Catalog 边界

当前 `ConfigToml` 有 96 个顶层 `pub` 字段；本节点覆盖其中 18 个。8 个 surface/config catalog 节点合计覆盖全部 96 个字段且不重复。[E: codex-rs/config/src/config_toml.rs:136][E: codex-rs/config/src/config_toml.rs:139]

`js_repl_node_path` and `js_repl_node_module_dirs` remain only as deprecated ignored fields with `schemars(skip)`, which keeps config loading explicit without exposing them in schema.[E: codex-rs/config/src/config_toml.rs:290][E: codex-rs/config/src/config_toml.rs:291][E: codex-rs/config/src/config_toml.rs:294][E: codex-rs/config/src/config_toml.rs:295]

## 字段 catalog

| key | Rust type | serde/schema attrs | 源码注释摘要 | Evidence |
|---|---|---|---|---|
| `notify` | `Option<Vec<String>>` | `#[serde(default)]` | Optional external command to spawn for end-user notifications. | [E: codex-rs/config/src/config_toml.rs:199][E: codex-rs/config/src/config_toml.rs:200][E: codex-rs/config/src/config_toml.rs:201] |
| `js_repl_node_path` | `Option<AbsolutePathBuf>` | `#[schemars(skip)]` | Deprecated: ignored. | [E: codex-rs/config/src/config_toml.rs:290][E: codex-rs/config/src/config_toml.rs:291][E: codex-rs/config/src/config_toml.rs:292] |
| `js_repl_node_module_dirs` | `Option<Vec<AbsolutePathBuf>>` | `#[schemars(skip)]` | Deprecated: ignored. | [E: codex-rs/config/src/config_toml.rs:294][E: codex-rs/config/src/config_toml.rs:295][E: codex-rs/config/src/config_toml.rs:296] |
| `history` | `Option<History>` | `#[serde(default = "default_history")]` | Settings that govern if and what will be written to `~/.codex/history.jsonl`. | [E: codex-rs/config/src/config_toml.rs:305][E: codex-rs/config/src/config_toml.rs:306][E: codex-rs/config/src/config_toml.rs:307] |
| `sqlite_home` | `Option<AbsolutePathBuf>` | none | Directory where Codex stores the SQLite state DB. Defaults to `$CODEX_SQLITE_HOME` when set. Otherwise uses `$CODEX_HOME`. | [E: codex-rs/config/src/config_toml.rs:309][E: codex-rs/config/src/config_toml.rs:311] |
| `log_dir` | `Option<AbsolutePathBuf>` | none | Directory where Codex writes log files. Setting this value explicitly also enables the TUI text log in this directory. Defaults to `$CODEX_HOME/log`. | [E: codex-rs/config/src/config_toml.rs:313][E: codex-rs/config/src/config_toml.rs:316] |
| `debug` | `Option<DebugToml>` | none | Debugging and reproducibility settings. | [E: codex-rs/config/src/config_toml.rs:318][E: codex-rs/config/src/config_toml.rs:319] |
| `file_opener` | `Option<UriBasedFileOpener>` | none | Optional URI-based file opener. If set, citations to files in the model output will be hyperlinked using the specified URI scheme. | [E: codex-rs/config/src/config_toml.rs:321][E: codex-rs/config/src/config_toml.rs:323] |
| `ghost_snapshot` | `Option<GhostSnapshotToml>` | `#[serde(default)]` | Compatibility-only settings retained so legacy `ghost_snapshot` config still loads. | [E: codex-rs/config/src/config_toml.rs:450][E: codex-rs/config/src/config_toml.rs:452][E: codex-rs/config/src/config_toml.rs:453] |
| `project_root_markers` | `Option<Vec<String>>` | `#[serde(default)]` | Markers used to detect the project root when searching parent directories for `.codex` folders. Defaults to [".git"] when unset. | [E: codex-rs/config/src/config_toml.rs:455][E: codex-rs/config/src/config_toml.rs:457][E: codex-rs/config/src/config_toml.rs:458] |
| `check_for_update_on_startup` | `Option<bool>` | none | When `true`, checks for Codex updates on startup and surfaces update prompts. Set to `false` only if your Codex updates are centrally managed. Defaults to `true`. | [E: codex-rs/config/src/config_toml.rs:460][E: codex-rs/config/src/config_toml.rs:463] |
| `analytics` | `Option<AnalyticsConfigToml>` | none | When `false`, disables analytics across Codex product surfaces in this machine. Defaults to `true`. | [E: codex-rs/config/src/config_toml.rs:470][E: codex-rs/config/src/config_toml.rs:472] |
| `feedback` | `Option<FeedbackConfigToml>` | none | When `false`, disables feedback collection across Codex product surfaces. Defaults to `true`. | [E: codex-rs/config/src/config_toml.rs:474][E: codex-rs/config/src/config_toml.rs:476] |
| `apps` | `Option<AppsConfigToml>` | `#[serde(default)]` | Settings for app-specific controls. | [E: codex-rs/config/src/config_toml.rs:478][E: codex-rs/config/src/config_toml.rs:479][E: codex-rs/config/src/config_toml.rs:480] |
| `desktop` | `Option<HashMap<String, JsonValue>>` | `#[serde(default)]` | Opaque desktop settings stored alongside the rest of config.toml. | [E: codex-rs/config/src/config_toml.rs:482][E: codex-rs/config/src/config_toml.rs:483][E: codex-rs/config/src/config_toml.rs:484] |
| `otel` | `Option<OtelConfigToml>` | none | OTEL configuration. | [E: codex-rs/config/src/config_toml.rs:486][E: codex-rs/config/src/config_toml.rs:487] |
| `windows` | `Option<WindowsToml>` | `#[serde(default)]` | Windows-specific configuration. | [E: codex-rs/config/src/config_toml.rs:489][E: codex-rs/config/src/config_toml.rs:490][E: codex-rs/config/src/config_toml.rs:491] |
| `notice` | `Option<Notice>` | none | Collection of in-product notices (different from notifications) See [`crate::types::Notice`] for more details | [E: codex-rs/config/src/config_toml.rs:493][E: codex-rs/config/src/config_toml.rs:495] |

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/config/src/types.rs`
- `codex-rs/config/src/project_root_markers.rs`

## 相关

- `command.config-system`
- `config.ui-tui`
- `config.approval-sandbox`
- `subsys.platform.telemetry-otel`
- `subsys.core.ghost-undo`
