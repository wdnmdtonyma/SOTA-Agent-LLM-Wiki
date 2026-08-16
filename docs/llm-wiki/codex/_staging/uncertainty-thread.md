# Thread batch uncertainty — `9ded177ce7`

- [U] Paginated thread 的 multi-segment lineage 当前不支持 incremental item replay；跨该边界的未来兼容策略尚未由目标源码定义。
- [U] 第一方 app-server / TUI 生产路径没有调用 `ThreadManager::reserve_thread_id` + `stage_pending_thread_metadata`。可见用法只在 core 集成测试；不能从 trait 存在推出 UI 已经在 start 前预留 thread id。
- [U] `background_paginated_rollout_migration` 是 UnderDevelopment / default-off。源码没有“本地 Legacy rollout 已全部迁完”的断言；`Eligible` / `SkippedBusy` / `.pending` journal 仍是正式状态。
- [U] migration canonicalizer 的 contextual-fragment matcher 是冻结副本，与 core 运行时动态 fragment registry 可能分叉；不能把 migration 重放边界等同于 live `Op::ThreadRollback` 边界。
