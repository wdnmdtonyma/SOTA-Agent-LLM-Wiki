---
id: subsys.core.rollout-migration
title: Rollout migration
kind: subsystem
tier: T2
source: [codex-rs/thread-store/src/local/rollout_migration.rs, codex-rs/thread-store/src/local/rollout_migration/canonicalizer.rs, codex-rs/thread-store/src/local/rollout_migration/legacy_event.rs, codex-rs/thread-store/src/local/rollout_migration/line_parser.rs, codex-rs/thread-store/src/local/rollout_migration/publish.rs, codex-rs/thread-store/src/local/rollout_migration/rollback.rs, codex-rs/thread-store/src/local/rollout_migration/rollback_plan.rs, codex-rs/thread-store/src/local/rollout_migration/rollback_replay.rs, codex-rs/thread-store/src/local/rollout_migration/startup.rs, codex-rs/thread-store/src/local/rollout_migration/subagent.rs, codex-rs/thread-store/src/local/rollout_migration/telemetry.rs, codex-rs/cli/src/migrate_rollouts.rs, codex-rs/features/src/lib.rs, codex-rs/core/src/thread_manager.rs, codex-rs/history/src/lib.rs, codex-rs/rollout/src/lib.rs]
symbols: [RolloutMigrationMode, RolloutMigrationOptions, RolloutMigrationStatus, RolloutMigrationReport, LocalThreadStore::migrate_rollouts, LocalThreadStore::migrate_rollouts_on_startup, LegacyRolloutCanonicalizer, Feature::BackgroundPaginatedRolloutMigration]
related: [subsys.core.thread-store, subsys.core.rollout-persistence, subsys.core.state-db, cli.subcommands]
evidence: explicit
status: verified
updated: 9ded177ce7
---

> Rollout migration 把本地 Legacy JSONL rollout 改写成 Paginated history：先 canonicalize 到 staged 文件，投影进 SQLite，再原子发布。它不是一次性完成的后台任务；`Feature::BackgroundPaginatedRolloutMigration` 默认关闭，CLI 默认 dry-run。[E: codex-rs/thread-store/src/local/rollout_migration.rs:11][E: codex-rs/features/src/lib.rs:982][E: codex-rs/cli/src/migrate_rollouts.rs:24]

## 能回答的问题

- startup 何时会跑 background migration？
- `codex migrate-rollouts` 的 `--apply` / `--thread` / `--max-mib-per-second` 做什么？
- 含 `ThreadRolledBack` 的 legacy 文件如何重放？
- subagent rollout 为什么可能只迁移 bounded suffix？
- 失败或 crash 后 `.pending` journal 如何恢复？

## 职责边界

`LocalThreadStore` 拥有 migration 状态机：扫 sessions/archived、拿 maintenance + writer lock、canonicalize、project、publish。[E: codex-rs/thread-store/src/local/rollout_migration.rs:216][E: codex-rs/thread-store/src/local/rollout_migration.rs:270]

`codex_history` 提供 `RolloutItem` / `RolloutLine` payload 模型；migration 经 `codex_rollout` re-export 读写这些类型，不另建 payload crate。[E: codex-rs/history/src/lib.rs:93][E: codex-rs/rollout/src/lib.rs:31]

Feature `background_paginated_rollout_migration` 是 UnderDevelopment、default-off。`thread_store_from_config` 只在 Local store + 有 state DB + feature 开启时 `tokio::spawn(migrate_rollouts_on_startup)`。[E: codex-rs/features/src/lib.rs:982][E: codex-rs/features/src/lib.rs:984][E: codex-rs/features/src/lib.rs:985][E: codex-rs/core/src/thread_manager.rs:380][E: codex-rs/core/src/thread_manager.rs:386]

没有 state DB 时 startup helper 直接返回，不迁移。[E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:52]

源码没有“migration 已完成 / 全部本地 session 已是 Paginated”的断言。状态机按文件产出 `Eligible` / `Migrated` / `AlreadyPaginated` / `SkippedEmpty` / `SkippedBusy` / `Failed`。[E: codex-rs/thread-store/src/local/rollout_migration.rs:123]

## 关键 crate/文件

| 文件 | 角色 |
|---|---|
| `rollout_migration.rs` | dry-run/apply 编排、rate limit、per-path migrate/recover。[E: codex-rs/thread-store/src/local/rollout_migration.rs:90][E: codex-rs/thread-store/src/local/rollout_migration.rs:467] |
| `canonicalizer.rs` | SessionMeta 置 ordinal 0 并改成 Paginated；把 legacy 记录写成 canonical JSONL。[E: codex-rs/thread-store/src/local/rollout_migration/canonicalizer.rs:81][E: codex-rs/thread-store/src/local/rollout_migration/canonicalizer.rs:93] |
| `legacy_event.rs` / `line_parser.rs` | 旧 completion event 与旧 JSON 形状的解析适配。 |
| `rollback.rs` / `rollback_plan.rs` / `rollback_replay.rs` | `ThreadRolledBack { num_turns }` 按 user-turn 边界裁剪，不是丢最后 N 行。[E: codex-rs/thread-store/src/local/rollout_migration/rollback.rs:11] |
| `startup.rs` | SQLite cursor `legacy_to_paginated_v1` + skip fingerprint。[E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:33] |
| `subagent.rs` | reverse-scan 选 bounded model context；证不了安全则回退全量 replay。[E: codex-rs/thread-store/src/local/rollout_migration/subagent.rs:29] |
| `publish.rs` | staged 路径、`.pending` journal、压缩/解压、目录 sync。[E: codex-rs/thread-store/src/local/rollout_migration/publish.rs:38] |
| `cli/src/migrate_rollouts.rs` | 手动 CLI。[E: codex-rs/cli/src/migrate_rollouts.rs:22] |

## 数据模型

| 实体 | 含义 |
|---|---|
| `RolloutMigrationMode::DryRun` / `Apply` | DryRun 只报告 Eligible；Apply 才改文件与 SQLite。[E: codex-rs/thread-store/src/local/rollout_migration.rs:92][E: codex-rs/thread-store/src/local/rollout_migration.rs:97] |
| `RolloutMigrationOptions` | `mode`, `thread_ids`（空=全部）, `max_mib_per_second`。[E: codex-rs/thread-store/src/local/rollout_migration.rs:102] |
| `RolloutMigrationStatus` | `Eligible` / `Migrated` / `AlreadyPaginated` / `SkippedEmpty` / `SkippedBusy` / `Failed`。[E: codex-rs/thread-store/src/local/rollout_migration.rs:123] |
| journal `{codex_home}/rollout-migrations/{thread_id}.pending` | 发布 JSONL 与完成 SQLite 之间的 crash 恢复标记。[E: codex-rs/thread-store/src/local/rollout_migration/publish.rs:36][E: codex-rs/thread-store/src/local/rollout_migration/publish.rs:38] |

CLI 无 `--apply` 时是 DryRun；`--thread` 可重复；`--max-mib-per-second` 必须 ≥1；`--json` 打印完整 report；任一 `Failed` 以非零退出。[E: codex-rs/cli/src/migrate_rollouts.rs:24][E: codex-rs/cli/src/migrate_rollouts.rs:28][E: codex-rs/cli/src/migrate_rollouts.rs:35][E: codex-rs/cli/src/migrate_rollouts.rs:132]

## 控制流：startup

1. 若 `rollout-migrations/` 里已有 `.pending`，或还没有 cursor，或 skip fingerprint 失效，则对全部路径跑 Apply（trigger=`Startup`）。[E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:60][E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:73]
2. 否则只检查 cursor 前 48 小时 lookback 内的新文件；发现 Legacy 才全量 migrate。[E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:36][E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:103]
3. 空文件或 malformed SessionMeta 记 skip（reason `empty` / `malformed_session_meta`），避免 cursor 永久卡住。[E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:34][E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:204]
4. 只有本轮全部 terminal（无 `SkippedBusy` / 未解释的 `Failed`）才 `advance_rollout_migration_state`；更新 cursor 只用迁移前的 path snapshot。[E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:160][E: codex-rs/thread-store/src/local/rollout_migration/startup.rs:169]

## 控制流：Apply 一个 rollout

1. Apply 先 `try_acquire_rollout_maintenance_lock`；已有 compression/migration 则 `Conflict`。[E: codex-rs/thread-store/src/local/rollout_migration.rs:273]
2. 扫描 `SESSIONS_SUBDIR` 与 `ARCHIVED_SESSIONS_SUBDIR`；Apply 时带 journal 的 thread 优先。[E: codex-rs/thread-store/src/local/rollout_migration.rs:282][E: codex-rs/thread-store/src/local/rollout_migration.rs:294]
3. 已是 Paginated：若存在 journal 则 `recover_published_migration`，否则 `AlreadyPaginated`。[E: codex-rs/thread-store/src/local/rollout_migration.rs:378]
4. Legacy Apply：拿 live-writer + 跨进程 writer lock；busy 记 `SkippedBusy`。[E: codex-rs/thread-store/src/local/rollout_migration.rs:422]
5. `migrate_one_rollout` 要求 SQLite metadata 行存在；先 `delete_thread` 旧 projection，再写 journal。[E: codex-rs/thread-store/src/local/rollout_migration.rs:476][E: codex-rs/thread-store/src/local/rollout_migration.rs:492]
6. 压缩源先解压。找到第一条 `SessionMeta` 后，普通 thread `write_rollout_with_rollback_plan`；subagent 先试 `select_bounded_context`。[E: codex-rs/thread-store/src/local/rollout_migration.rs:528][E: codex-rs/thread-store/src/local/rollout_migration.rs:541]
7. 见到 `ThreadRolledBack` 且尚无 plan：丢掉 staged 文件，扫描源建 `RollbackPlan`，再 replay；plan 后再遇到 rollback marker 是错误。[E: codex-rs/thread-store/src/local/rollout_migration.rs:755][E: codex-rs/thread-store/src/local/rollout_migration.rs:661][E: codex-rs/thread-store/src/local/rollout_migration/canonicalizer.rs:138]
8. staged 文件 `sync_all` 后才分批投影；`next_byte_offset` / `next_ordinal` 必须等于 staged 长度。[E: codex-rs/thread-store/src/local/rollout_migration.rs:575][E: codex-rs/thread-store/src/local/rollout_migration.rs:586]
9. 源文件在 staging 期间 length/mtime 变了则 `Conflict`，不替换 live path。[E: codex-rs/thread-store/src/local/rollout_migration.rs:608]
10. rename staged→live，sync parent dir，再 `finish_published_migration` 清 journal。[E: codex-rs/thread-store/src/local/rollout_migration.rs:625][E: codex-rs/thread-store/src/local/rollout_migration.rs:630]

Canonicalizer 把 `history_mode` 写成 `Paginated`，并清空 `history_base` 与 `subagent_history_start_ordinal`。[E: codex-rs/thread-store/src/local/rollout_migration/canonicalizer.rs:93][E: codex-rs/thread-store/src/local/rollout_migration/canonicalizer.rs:94][E: codex-rs/thread-store/src/local/rollout_migration/canonicalizer.rs:95]

`counts_as_boundary` 把 `AgentMessage`、非 contextual user `Message`、以及 inter-agent assistant message 算作用户 turn；compaction replacement 用同一套冻结 matcher，因为 thread-store 不能依赖 core 的动态 fragment registry。[E: codex-rs/thread-store/src/local/rollout_migration/rollback.rs:22][E: codex-rs/thread-store/src/local/rollout_migration/rollback.rs:44]

## Telemetry

`RolloutMigrationTelemetry` 在 manual/startup 结束时写 `codex.rollout_migration.run`、`run.duration_ms`、`run.io_bytes`、`codex.rollout_migration.thread`。run `result` 是 `success` / `partial_failure` / `error`：report 里任意 `Failed` 就是 `partial_failure`。[E: codex-rs/thread-store/src/local/rollout_migration/telemetry.rs:14][E: codex-rs/thread-store/src/local/rollout_migration/telemetry.rs:69]

## 设计动机与权衡

目标是留下“原 legacy 文件或可恢复 paginated 文件”之一。`.pending` journal 必须足够让后续 run 完成 SQLite recovery。[E: codex-rs/thread-store/src/local/rollout_migration.rs:11]

Legacy subagent 曾复制父 rollout；verbatim migrate 会留下巨量重复 history，所以先 reverse-scan bounded context，证不了再全量容忍 replay。[E: codex-rs/thread-store/src/local/rollout_migration/subagent.rs:12]

## Gotcha

- 不要把 feature 默认关闭写成“仓库里已经没有 Legacy rollout”。CLI dry-run 与 `Eligible` 状态仍是正式路径。[E: codex-rs/features/src/lib.rs:985][E: codex-rs/thread-store/src/local/rollout_migration.rs:124]
- Apply 与 rollout compression 互斥：同一 `codex_home` 上只能有一个 maintenance lock。[E: codex-rs/thread-store/src/local/rollout_migration.rs:276]
- 缺 SQLite metadata 的 thread 会 `Failed`，不会只改 JSONL。[E: codex-rs/thread-store/src/local/rollout_migration.rs:482]
- Memory-consolidation session 按 Ordinary 而不是 Subagent 迁移。[E: codex-rs/thread-store/src/local/rollout_migration.rs:354]

## Sources

- `codex-rs/thread-store/src/local/rollout_migration.rs`
- `codex-rs/thread-store/src/local/rollout_migration/canonicalizer.rs`
- `codex-rs/thread-store/src/local/rollout_migration/legacy_event.rs`
- `codex-rs/thread-store/src/local/rollout_migration/line_parser.rs`
- `codex-rs/thread-store/src/local/rollout_migration/publish.rs`
- `codex-rs/thread-store/src/local/rollout_migration/rollback.rs`
- `codex-rs/thread-store/src/local/rollout_migration/rollback_plan.rs`
- `codex-rs/thread-store/src/local/rollout_migration/rollback_replay.rs`
- `codex-rs/thread-store/src/local/rollout_migration/startup.rs`
- `codex-rs/thread-store/src/local/rollout_migration/subagent.rs`
- `codex-rs/thread-store/src/local/rollout_migration/telemetry.rs`
- `codex-rs/cli/src/migrate_rollouts.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/core/src/thread_manager.rs`
- `codex-rs/history/src/lib.rs`
- `codex-rs/rollout/src/lib.rs`

## 相关

- [Thread store](thread-store.md)
- [Rollout persistence](rollout-persistence.md)
- [State DB](state-db.md)
- 索引 id：`cli.subcommands`
