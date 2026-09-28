---
id: subsys.core.ghost-undo
title: Ghost snapshot 与 undo
kind: subsystem
tier: T2
source: [codex-rs/config/src/config_toml.rs, codex-rs/core/src/config/mod.rs, codex-rs/features/src/lib.rs, codex-rs/protocol/src/models.rs, codex-rs/protocol/src/protocol.rs, codex-rs/core/src/session/handlers.rs, codex-rs/core/src/tasks/mod.rs, codex-rs/core/src/state/turn.rs, codex-rs/core/src/thread_rollout_truncation.rs, codex-rs/thread-store/src/store.rs, codex-rs/thread-store/src/local/revert_thread.rs, codex-rs/app-server-protocol/src/protocol/common.rs, codex-rs/app-server-protocol/src/protocol/v2/shared.rs, codex-rs/app-server/src/request_processors/thread_processor.rs]
symbols: [GhostSnapshotToml, GhostSnapshotConfig, Feature::GhostCommit, CodexErrorInfo::ThreadRollbackFailed]
related: [ref.protocol-items, ref.protocol-event-lifecycle, subsys.core.turn-engine, subsys.core.thread-store, rpc.thread-methods]
evidence: explicit
status: verified
updated: 1cc7e23612
---

> Ghost snapshot/undo 不是当前 runtime 子系统。旧 `ghost_snapshot` config 与 `undo` feature key 只为兼容保留；legacy rollout 的 `ghost_snapshot` item 反序列化为 `Other`。`Op::ThreadRollback` 已删除。磁盘安全的 paginated 撤销是 `thread/revert` / `ThreadStore::revert_thread`。错误枚举 `CodexErrorInfo::ThreadRollbackFailed` 仍在，只为反序列化旧 rollout，不是活 Op。[E: codex-rs/features/src/lib.rs:387][E: codex-rs/protocol/src/models.rs:3811][E: codex-rs/protocol/src/protocol.rs:590][E: codex-rs/protocol/src/protocol.rs:1891][E: codex-rs/app-server-protocol/src/protocol/common.rs:755]

## 能回答的问题

- 当前源码里还是否存在 legacy ghost/undo task structs?
- 旧 `ghost_snapshot` config 现在如何解析?
- `undo` feature key 当前处于什么阶段?
- legacy rollout 中的 `ghost_snapshot` item 如何处理?
- `Op::ThreadRollback` / `thread/rollback` 是否还在？当前磁盘撤销走哪条路径?

## 当前事实

`submission_loop` 分派 `Op::Interrupt`、`Op::InterruptIfNoPendingInput`、`Op::Compact` 与 `Op::RunUserShellCommand` 等，没有 `Op::Undo`，也没有 `Op::ThreadRollback`。未知 op 落入 `_ => false`。当前 `TaskKind` 只有 `Regular`、`Review`、`Compact`。[E: codex-rs/core/src/session/handlers.rs:436][E: codex-rs/core/src/session/handlers.rs:440][E: codex-rs/core/src/session/handlers.rs:603][E: codex-rs/core/src/session/handlers.rs:611][E: codex-rs/core/src/session/handlers.rs:638][E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70][E: codex-rs/core/src/state/turn.rs:71]

`ConfigToml` 仍接受 `ghost_snapshot`，字段注释写明是为了让 legacy config 继续加载。`GhostSnapshotToml` 的三个字段都是兼容 no-op。[E: codex-rs/config/src/config_toml.rs:512][E: codex-rs/config/src/config_toml.rs:775][E: codex-rs/config/src/config_toml.rs:778][E: codex-rs/config/src/config_toml.rs:781][E: codex-rs/config/src/config_toml.rs:783]

`core::config::GhostSnapshotConfig` 同样只为兼容；`Config.ghost_snapshot` 仍从 TOML 填入默认阈值。[E: codex-rs/core/src/config/mod.rs:234][E: codex-rs/core/src/config/mod.rs:1089][E: codex-rs/core/src/config/mod.rs:3915][E: codex-rs/core/src/config/mod.rs:3918]

`Feature::GhostCommit` 是 removed compatibility flag。registry 条目 key `undo`，`stage: Stage::Removed`，`default_enabled: false`；feature-source 解析也会 skip 旧 `undo` key。[E: codex-rs/features/src/lib.rs:387][E: codex-rs/features/src/lib.rs:599][E: codex-rs/features/src/lib.rs:957][E: codex-rs/features/src/lib.rs:958][E: codex-rs/features/src/lib.rs:959][E: codex-rs/features/src/lib.rs:960]

Legacy rollout 兼容是显式的：protocol 测试 `deserializes_legacy_ghost_snapshot_as_other()` 喂 `type: "ghost_snapshot"`，断言落到 `ResponseItem::Other`，而不是某个当前 `GhostSnapshot` 变体。[E: codex-rs/protocol/src/models.rs:3798][E: codex-rs/protocol/src/models.rs:3800][E: codex-rs/protocol/src/models.rs:3811]

## 当前撤销路径

`Op` 共 **29** 个变体，从 `Interrupt` 起含 `InterruptIfNoPendingInput { turn_id, reply }`，到 `RunUserShellCommand`，没有 `ThreadRollback`。[E: codex-rs/protocol/src/protocol.rs:590][E: codex-rs/protocol/src/protocol.rs:593][E: codex-rs/protocol/src/protocol.rs:597][E: codex-rs/protocol/src/protocol.rs:760] `InterruptIfNoPendingInput` 仅在该 turn 无 queued input 时中断，`reply: oneshot::Sender<bool>` 在 cancellation 完成前 ack。[E: codex-rs/protocol/src/protocol.rs:597][E: codex-rs/protocol/src/protocol.rs:599][E: codex-rs/core/src/session/handlers.rs:441] app-server `client_request_definitions!` 也没有 `thread/rollback`；paginated 磁盘撤销的 wire 是稳定方法 `thread/revert`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:755]

`thread/revert` 只服务 Paginated thread：processor 拒绝非 paginated，先 shutdown/unload live thread，再调 `ThreadStore::revert_thread`，然后内部 reload 同一 thread id。[E: codex-rs/app-server/src/request_processors/thread_processor.rs:2156][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2186][E: codex-rs/app-server/src/request_processors/thread_processor.rs:2237] store 侧写新 immutable rollout，CAS 替换 SQLite path；旧 JSONL 保留。该路径不回滚 workspace 文件改动。[E: codex-rs/thread-store/src/store.rs:227][E: codex-rs/thread-store/src/local/revert_thread.rs:19][E: codex-rs/thread-store/src/local/revert_thread.rs:134][I]

`EventMsg::ThreadRolledBack` 仍在 EQ enum 中，供 replay 已写入 rollout 的 marker。`user_message_positions_in_rollout` 遇到该 event 会从 user-turn 索引里丢掉最后 N 个 turn。这不是活 SQ 操作。[E: codex-rs/protocol/src/protocol.rs:1404][E: codex-rs/core/src/thread_rollout_truncation.rs:57]

`CodexErrorInfo::ThreadRollbackFailed` 仍在 core protocol 与 app-server-protocol 错误枚举里，用于反序列化旧 rollout 错误；`affects_turn_status()` 把它视为不影响 turn failure。它不是活 Op，也不是 `thread/rollback` RPC。[E: codex-rs/protocol/src/protocol.rs:1891][E: codex-rs/protocol/src/protocol.rs:1899][E: codex-rs/app-server-protocol/src/protocol/v2/shared.rs:101][E: codex-rs/app-server-protocol/src/protocol/v2/shared.rs:150]

## Gotchas

- 不要把 legacy ghost/undo task structs 或 git ghost-commit helper 写成 HEAD 的 runtime 符号：当前 `TaskKind` 只有 regular/review/compact，`Feature::GhostCommit` 只是 removed compatibility flag。[E: codex-rs/core/src/state/turn.rs:68][E: codex-rs/core/src/state/turn.rs:69][E: codex-rs/core/src/state/turn.rs:70][E: codex-rs/core/src/state/turn.rs:71][E: codex-rs/features/src/lib.rs:387][E: codex-rs/features/src/lib.rs:959]
- `undo` feature key 仍能被解析并 skip，并不表示 undo 可用；registry 标记 `Stage::Removed` 且默认关闭。[E: codex-rs/features/src/lib.rs:599][E: codex-rs/features/src/lib.rs:959][E: codex-rs/features/src/lib.rs:960]
- 不要写 `thread/rollback` 仍随 deprecation notice 出货。该方法与 `Op::ThreadRollback` 都已删除；需要磁盘撤销的客户端走 `thread/revert`。[E: codex-rs/app-server-protocol/src/protocol/common.rs:755][E: codex-rs/core/src/session/handlers.rs:638]
- `ThreadRollbackFailed` 仍出现在错误枚举里，不等于 rollback Op 还活着。[E: codex-rs/protocol/src/protocol.rs:1891]

## Sources

- `codex-rs/config/src/config_toml.rs`
- `codex-rs/core/src/config/mod.rs`
- `codex-rs/features/src/lib.rs`
- `codex-rs/protocol/src/models.rs`
- `codex-rs/protocol/src/protocol.rs`
- `codex-rs/core/src/session/handlers.rs`
- `codex-rs/core/src/tasks/mod.rs`
- `codex-rs/core/src/state/turn.rs`
- `codex-rs/core/src/thread_rollout_truncation.rs`
- `codex-rs/thread-store/src/store.rs`
- `codex-rs/thread-store/src/local/revert_thread.rs`
- `codex-rs/app-server-protocol/src/protocol/common.rs`
- `codex-rs/app-server-protocol/src/protocol/v2/shared.rs`
- `codex-rs/app-server/src/request_processors/thread_processor.rs`

## 相关

- [ref.protocol-items](../../reference/protocol-items.md)
- [ref.protocol-event-lifecycle](../../reference/protocol-event-lifecycle.md)
- [subsys.core.turn-engine](turn-engine.md)
- [subsys.core.thread-store](thread-store.md)
- [rpc.thread-methods](../../surface/app-server/thread-methods.md)
