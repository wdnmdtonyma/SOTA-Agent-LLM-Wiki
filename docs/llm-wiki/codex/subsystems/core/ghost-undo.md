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
updated: db887d03e1
---

> Ghost snapshot/undo is no longer an active runtime subsystem in current Codex. The old `ghost_snapshot` config and `undo` feature key are compatibility-only, legacy rollout `ghost_snapshot` items deserialize as `Other`, and current rollback semantics are represented by `Op::ThreadRollback`, which explicitly does not revert local filesystem edits.[E: codex-rs/config/src/config_toml.rs:468][E: codex-rs/core/src/config/mod.rs:181][E: codex-rs/features/src/lib.rs:249][E: codex-rs/features/src/lib.rs:796][E: codex-rs/protocol/src/models.rs:3153][E: codex-rs/protocol/src/protocol.rs:648][E: codex-rs/protocol/src/protocol.rs:650]

## 能回答的问题

- 当前源码里还是否存在 legacy ghost/undo task structs?
- 旧 `ghost_snapshot` config 现在如何解析?
- `undo` feature key 当前处于什么阶段?
- legacy rollout 中的 `ghost_snapshot` item 如何处理?
- 当前 `ThreadRollback` 与旧 undo 的边界是什么?

## 当前事实

The session dispatch loop now exposes `Op::Compact`, `Op::ThreadRollback`, and `Op::RunUserShellCommand` around this area, but no `Op::Undo` branch. `SessionTask` 注释仍举例提到 ghost snapshots；当前实际 `TaskKind` variants 只有 `Regular`、`Review`、`Compact`。[E: codex-rs/core/src/session/handlers.rs:802][E: codex-rs/core/src/session/handlers.rs:806][E: codex-rs/core/src/session/handlers.rs:814][E: codex-rs/core/src/tasks/mod.rs:206][E: codex-rs/core/src/tasks/mod.rs:208][E: codex-rs/core/src/state/turn.rs:65][E: codex-rs/core/src/state/turn.rs:66][E: codex-rs/core/src/state/turn.rs:67][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69]

`ConfigToml` still accepts `ghost_snapshot`, but the comment says it is retained so legacy config still loads. `GhostSnapshotToml` fields are all documented as legacy no-op settings.[E: codex-rs/config/src/config_toml.rs:468][E: codex-rs/config/src/config_toml.rs:469][E: codex-rs/config/src/config_toml.rs:452][E: codex-rs/config/src/config_toml.rs:471][E: codex-rs/config/src/config_toml.rs:712][E: codex-rs/config/src/config_toml.rs:729][E: codex-rs/config/src/config_toml.rs:732][E: codex-rs/config/src/config_toml.rs:735][E: codex-rs/config/src/config_toml.rs:737]

`core::config::GhostSnapshotConfig` is also compatibility-only; its comment says legacy settings continue to load even though snapshots are no longer produced. The loaded config field remains present on `Config` and is populated from the legacy TOML fields with default thresholds.[E: codex-rs/core/src/config/mod.rs:181][E: codex-rs/core/src/config/mod.rs:182][E: codex-rs/core/src/config/mod.rs:184][E: codex-rs/core/src/config/mod.rs:190][E: codex-rs/core/src/config/mod.rs:193][E: codex-rs/core/src/config/mod.rs:194][E: codex-rs/core/src/config/mod.rs:1028][E: codex-rs/core/src/config/mod.rs:1030][E: codex-rs/core/src/config/mod.rs:3507][E: codex-rs/core/src/config/mod.rs:3509][E: codex-rs/core/src/config/mod.rs:3518][E: codex-rs/core/src/config/mod.rs:3524]

`Feature::GhostCommit` is retained as a removed compatibility flag. The registry entry has key `undo`, stage `Removed`, and `default_enabled: false`; feature-source parsing also skips the old `undo` key.[E: codex-rs/features/src/lib.rs:246][E: codex-rs/features/src/lib.rs:247][E: codex-rs/features/src/lib.rs:248][E: codex-rs/features/src/lib.rs:249][E: codex-rs/features/src/lib.rs:460][E: codex-rs/features/src/lib.rs:461][E: codex-rs/features/src/lib.rs:796][E: codex-rs/features/src/lib.rs:797][E: codex-rs/features/src/lib.rs:798][E: codex-rs/features/src/lib.rs:799]

Legacy rollout compatibility is explicit: the protocol tests include `deserializes_legacy_ghost_snapshot_as_other()`, feeding a `type: "ghost_snapshot"` item and asserting it lands in the fallback path rather than a current `ResponseItem::GhostSnapshot` variant.[E: codex-rs/protocol/src/models.rs:3152][E: codex-rs/protocol/src/models.rs:3153][E: codex-rs/protocol/src/models.rs:3154][E: codex-rs/protocol/src/models.rs:3155][E: codex-rs/protocol/src/models.rs:3156]

## Current rollback path

`Op::ThreadRollback { num_turns }` is the current protocol operation for dropping the last N user turns from in-memory context, and its comment explicitly states that it does not attempt to revert local filesystem changes; clients are responsible for undoing edits on disk.[E: codex-rs/protocol/src/protocol.rs:648][E: codex-rs/protocol/src/protocol.rs:649][E: codex-rs/protocol/src/protocol.rs:650][E: codex-rs/protocol/src/protocol.rs:651][E: codex-rs/protocol/src/protocol.rs:652]

The session dispatch loop routes `Op::ThreadRollback` to `thread_rollback()`, not to an undo task. `thread_rollback()` rejects `num_turns == 0`, rejects rollback while a turn is active, requires persisted thread history, flushes and reloads that history, then emits `ThreadRolledBack` when replay can proceed.[E: codex-rs/core/src/session/handlers.rs:806][E: codex-rs/core/src/session/handlers.rs:807][E: codex-rs/core/src/session/handlers.rs:451][E: codex-rs/core/src/session/handlers.rs:452][E: codex-rs/core/src/session/handlers.rs:464][E: codex-rs/core/src/session/handlers.rs:477][E: codex-rs/core/src/session/handlers.rs:478][E: codex-rs/core/src/session/handlers.rs:492][E: codex-rs/core/src/session/handlers.rs:504][E: codex-rs/core/src/session/handlers.rs:519]

## Gotchas

- Do not document legacy ghost/undo task structs or git ghost-commit helper functions as current runtime symbols for HEAD `db887d03e1`; current `TaskKind` exposes only regular/review/compact task classes, and `Feature::GhostCommit` is only a removed compatibility feature flag.[E: codex-rs/core/src/tasks/mod.rs:214][E: codex-rs/core/src/state/turn.rs:66][E: codex-rs/core/src/state/turn.rs:67][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/features/src/lib.rs:246]
- The `undo` feature key still parsing does not mean undo is active; the feature registry marks `Feature::GhostCommit` as `Stage::Removed` and disabled by default.[E: codex-rs/features/src/lib.rs:796][E: codex-rs/features/src/lib.rs:798][E: codex-rs/features/src/lib.rs:799]
- `ThreadRollback` is history-context rollback only; any UI that wants disk undo must implement or invoke disk-level undo outside this protocol op.[E: codex-rs/protocol/src/protocol.rs:648][E: codex-rs/protocol/src/protocol.rs:650][E: codex-rs/protocol/src/protocol.rs:651]

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
