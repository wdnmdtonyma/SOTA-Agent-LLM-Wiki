# uncertainty: subsys.session-backends.sqlite-node (086c32e745)

- `[U]` CHANGELOG 0.84.0 声明既有 WIP 库不迁移，且 `001_initial.sql` 全部是 `CREATE TABLE IF NOT EXISTS`。打开 pre-v4 / 旧 `pi-storage-sqlite-node` 文件时，新旧表并存或同名表列不匹配的具体失败形态没有测试覆盖。
- `[U]` `readOpenOperationRows()` 把 `limit` 写成未使用的 `_options`，一条 lane 只存一个 `open_operation_id`。agent-core `SessionStorage.findOpenOperations` 注释用 `limit: 2` 探测双开/损坏；本包既不能表示两个 open op，也不实现该 limit。这是有意收窄还是契约缺口，源码未说明。
- 任务 prompt 假设「one sqlite file per session」。当前源码是 **one sqlite file per repository**（`databasePath` 共享，`sessions`/`entries` 用 `session_id` 分行）。主节点按源码写成共享文件，不把反事实写进正文。
