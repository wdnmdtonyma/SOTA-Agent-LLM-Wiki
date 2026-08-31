# uncertainty-update · spine-core

target: `a9519cbcdd`

这些 `[U]` 仍留在本批次节点里，不要写进 `reference/uncertainty.md`（本轮禁止改该文件）。

## thread-store

- 多 segment lineage 的 page/materialization 仍有严格边界：不能把“可分页读取继承 history”推广成任意 incremental item replay 都受支持。节点：`subsystems/core/thread-store.md`
- 第一方 app-server / TUI 路径当前没有调用 `reserve_thread_id` + `stage_pending_thread_metadata`；可见用法在 core 集成测试。节点：`subsystems/core/thread-store.md`

本批次其它节点未新增 `[U]`。
