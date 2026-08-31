---
id: subsys.core.ghost-undo
title: Ghost snapshot 与 undo
kind: subsystem
tier: T2
source: [codex-rs/config/src/config_toml.rs, codex-rs/core/src/config/mod.rs, codex-rs/features/src/lib.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/state/turn.rs]
symbols: [GhostSnapshotToml, GhostSnapshotConfig, Feature::GhostCommit, Op::ThreadRollback, thread_rollback]
related: [ref.protocol-items, ref.protocol-event-lifecycle, subsys.core.turn-engine]
evidence: explicit
status: verified
updated: a9519cbcdd
---

> Ghost snapshot/undo is no longer an active runtime subsystem in current Codex. The old `ghost_snapshot` config and `undo` feature key are compatibility-only, legacy rollout `ghost_snapshot` items deserialize as `Other`, and current rollback semantics are represented by `Op::ThreadRollback`, which explicitly does not revert local filesystem edits.[E: codex-rs/features/src/lib.rs:315][E: codex-rs/features/src/lib.rs:887][E: codex-rs/protocol/src/models.rs:3383][E: codex-rs/protocol/src/models.rs:3627]

## 能回答的问题

- 当前源码里还是否存在 legacy ghost/undo task structs?
- 旧 `ghost_snapshot` config 现在如何解析?
- `undo` feature key 当前处于什么阶段?
- legacy rollout 中的 `ghost_snapshot` item 如何处理?
- 当前 `ThreadRollback` 与旧 undo 的边界是什么?

## 当前事实

The session dispatch loop now exposes `Op::Compact`, `Op::ThreadRollback`, and `Op::RunUserShellCommand` around this area, but no `Op::Undo` branch. 当前实际 `TaskKind` variants 只有 `Regular`、`Review`、`Compact`。[E: codex-rs/core/src/session/handlers.rs:676][E: codex-rs/core/src/session/handlers.rs:680][E: codex-rs/core/src/session/handlers.rs:688][E: codex-rs/core/src/state/turn.rs:63][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70][E: codex-rs/core/src/state/turn.rs:71]

`ConfigToml` still accepts `ghost_snapshot`, but the comment says it is retained so legacy config still loads. `GhostSnapshotToml` fields are all documented as legacy no-op settings.[E: codex-rs/config/src/config_toml.rs:453][E: codex-rs/config/src/config_toml.rs:473][E: codex-rs/config/src/config_toml.rs:727][E: codex-rs/config/src/config_toml.rs:744][E: codex-rs/config/src/config_toml.rs:747][E: codex-rs/config/src/config_toml.rs:750][E: codex-rs/config/src/config_toml.rs:755]

`core::config::GhostSnapshotConfig` is also compatibility-only; its comment says legacy settings continue to load even though snapshots are no longer produced. The loaded config field remains present on `Config` and is populated from the legacy TOML fields with default thresholds.[E: codex-rs/core/src/config/mod.rs:210][E: codex-rs/core/src/config/mod.rs:214][E: codex-rs/core/src/config/mod.rs:217][E: codex-rs/core/src/config/mod.rs:218][E: codex-rs/core/src/config/mod.rs:1093][E: codex-rs/core/src/config/mod.rs:3853][E: codex-rs/core/src/config/mod.rs:3856][E: codex-rs/core/src/config/mod.rs:3865][E: codex-rs/core/src/config/mod.rs:3870]

`Feature::GhostCommit` is retained as a removed compatibility flag. The registry entry has key `undo`, stage `Removed`, and `default_enabled: false`; feature-source parsing also skips the old `undo` key.[E: codex-rs/features/src/lib.rs:315][E: codex-rs/features/src/lib.rs:537][E: codex-rs/features/src/lib.rs:538][E: codex-rs/features/src/lib.rs:887][E: codex-rs/features/src/lib.rs:887][E: codex-rs/features/src/lib.rs:870][E: codex-rs/features/src/lib.rs:914]

Legacy rollout compatibility is explicit: the protocol tests include `deserializes_legacy_ghost_snapshot_as_other()`, feeding a `type: "ghost_snapshot"` item and asserting it lands in the fallback path rather than a current `ResponseItem::GhostSnapshot` variant.[E: codex-rs/protocol/src/models.rs:3614][E: codex-rs/protocol/src/models.rs:3614][E: codex-rs/protocol/src/models.rs:3389][E: codex-rs/protocol/src/models.rs:3617][E: codex-rs/protocol/src/models.rs:3383][E: codex-rs/protocol/src/models.rs:3627]

## Current rollback path

`Op::ThreadRollback { num_turns }` is the current protocol operation for dropping the last N user turns from in-memory context, and its comment explicitly states that it does not attempt to revert local filesystem changes; clients are responsible for undoing edits on disk.[E: codex-rs/protocol/src/protocol.rs:717]

The session dispatch loop routes `Op::ThreadRollback` to `thread_rollback()`, not to an undo task. `thread_rollback()` rejects `num_turns == 0`, rejects rollback while a turn is active, requires persisted thread history, flushes and reloads that history, then emits `ThreadRolledBack` when replay can proceed。[E: codex-rs/core/src/session/handlers.rs:680][E: codex-rs/core/src/session/handlers.rs:681][E: codex-rs/core/src/session/handlers.rs:254]

## Gotchas

- Do not document legacy ghost/undo task structs or git ghost-commit helper functions as current runtime symbols for HEAD `a9519cbcdd`; current `TaskKind` exposes only regular/review/compact task classes, and `Feature::GhostCommit` is only a removed compatibility feature flag.[E: codex-rs/core/src/tasks/mod.rs:179][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70][E: codex-rs/core/src/state/turn.rs:71]
- The `undo` feature key still parsing does not mean undo is active; the feature registry marks `Feature::GhostCommit` as `Stage::Removed` and disabled by default.[E: codex-rs/features/src/lib.rs:887][E: codex-rs/features/src/lib.rs:870][E: codex-rs/features/src/lib.rs:914]
- `ThreadRollback` loads persisted history, appends a rollback event, reconstructs session state, and persists that marker。[E: codex-rs/core/src/session/handlers.rs:254][E: codex-rs/core/src/session/handlers.rs:268][E: codex-rs/core/src/session/handlers.rs:680] 该路径没有执行 filesystem rollback；需要磁盘撤销的 UI 必须另行实现。[I]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/state/turn.rs`

## 相关

- [ref.protocol-items](../../reference/protocol-items.md)
- [ref.protocol-event-lifecycle](../../reference/protocol-event-lifecycle.md)
- [subsys.core.turn-engine](turn-engine.md)
