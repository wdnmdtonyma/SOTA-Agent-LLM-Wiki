# uncertainty: ref.orchestrator.instance-status

L3 后本节点的权威范围已收窄到 `packages/orchestrator/src/types.ts` 与 `packages/orchestrator/src/config.ts`: `InstanceStatus` union、`InstanceRecord` interface 字段、以及 orchestrator 本地路径 helper。L2 中“153 条因不在 source 列而降为 unknown”的逐项噪音已移除;对应 storage/supervisor/README 行为不再在本 reference 节点重复证明。

## 仍保留的不确定项

- `InstanceRecord` 是否构成 `instances.json` 的完整 runtime schema、是否有 migration/locking/validation 语义,不能仅由 `types.ts` 与 `config.ts` 证明;需要在 `subsys.orchestrator.storage` 或 storage 源码范围内复核。[U]
- `starting`、`online`、`stopping`、`stopped`、`error` 的写入点、状态迁移和 restart recovery 行为,不能仅由 `InstanceStatus` union 证明;需要在 supervisor/storage 行为节点复核。[U]
