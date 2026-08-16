# uncertainty-update-086c32e745-session-v4

batch: 086c32e745 session v4 rewrite
nodes: subsys.agent-core.session-storage, subsys.agent-core.jsonl-storage, subsys.agent-core.memory-storage, subsys.agent-core.tree-navigation, subsys.agent-core.session-tree, ref.agent.session-entry-types
updated: 086c32e745
status: draft

本轮把 6 个 session 节点从已删除的 `SessionRepository` / `ArraySessionIndex` / `KeyedOperationQueue` / `jsonl-repo.ts` / `memory-repo.ts` 面完整改写到 v4 `Session` / `SessionStorage` / `SessionRepo` + lane/record/fact。下列 `[U]` 是当前 source 无法在本批节点内闭合的点。

## [U] SessionRepo.open 的 writer claim

- 节点: `subsys.agent-core.session-storage`
- `SessionRepo.open` 的 JSDoc 写 “acquires any backend writer claim”。[E: packages/agent/src/harness/session/types.ts:368]
- `JsonlSessionRepo.open` 与 `InMemorySessionRepo.open` 都只是 `new Session(storage)`，没有文件锁、lease 或跨进程互斥。
- 不知道是否另有 backend（例如 session-backends SQLite）实现了 claim，还是注释超前于实现。

## [U] harness.md 设计面 vs types.ts

- 节点: `subsys.agent-core.session-storage`
- `packages/agent/docs/harness.md` 描述 `storageVersion`、`commit(tx)`、registers 等。
- 当前 `SessionMetadata` / `Session` / `SessionRepo` 在 `types.ts` 里没有这些符号。
- 本批不以 harness.md 为 ground truth。若后续代码补上这些 API，节点需要再填。

## [U] `sourceFormat: 3 | 4` 但从不见 3

- 节点: `subsys.agent-core.jsonl-storage`
- `JsonlSessionMetadata.sourceFormat` 类型是 `3 | 4`。[E: packages/agent/src/harness/session/jsonl/types.ts:31]
- `metadataFromHeader()` 写死 `sourceFormat: 4`。[E: packages/agent/src/harness/session/jsonl/codec.ts:122]
- 本包 `packages/agent/src/harness/session/**` 没有把 v3 文件转成 v4 或写出 `sourceFormat: 3` 的路径。
- 不知道 `3` 是预留给 coding-agent 迁移层、外部 importer，还是未完成的类型残留。

## [U] `legacyParentSessionPath` 的写入者

- 节点: `subsys.agent-core.jsonl-storage`
- header 允许 `legacyParentSessionPath`，且与 `parentSessionId` 互斥。[E: packages/agent/src/harness/session/jsonl/types.ts:55] [E: packages/agent/src/harness/session/jsonl/codec.ts:82]
- `JsonlSessionRepo.prepareCreate` 只写 `parentSessionId`。[E: packages/agent/src/harness/session/jsonl/repo.ts:215]
- 谁在什么时候把无法解析的 v3 parent path 写进该字段，本批 source 看不到。

## [U] InMemorySessionStorage 并发

- 节点: `subsys.agent-core.memory-storage`
- 内存 backend 没有 JSONL 的 `enqueue` tail。`appendEntry` / `appendRecord` 直接读 `nextSequence` 再 `applyMutation`。[E: packages/agent/src/harness/session/memory.ts:59]
- 同一 storage 上未串行化的并发 await 是否允许交错、是否算契约违规，conformance 测试没有覆盖。
