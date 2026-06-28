# Uncertainty staging: subsys.agent-core.session-tree

- 本轮未留下 `[U]`。
- `[I]` child relation: 本节点 source 只暴露 `parentId`、`LeafEntry.targetId` 与 `SessionStorage.getPathToRoot()`, 未包含 storage backend 的 child/path 构建算法, 所以正文把 child relation 写成由 `parentId` 反向索引得到的模型判断。
- `[I]` session-state spine 边界: 本节点 source 未包含 `session.ts`, 因此 `buildSessionContext()`、entry-to-message projection、compaction read-time behavior 都只作为 `spine.session-state-model` 边界说明, 不在本节点内用 `[E]` 证明。
- `[I]` uuidv7 ordering: `uuidv7()` 的 timestamp/sequence 代码支持单进程内大体单调的描述, 但跨进程严格有序性不由这两个 source 证明。
