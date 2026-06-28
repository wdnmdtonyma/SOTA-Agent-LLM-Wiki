# uncertainty-orchestrator-ipc-messages

本轮未留下需要上收 `reference/uncertainty.md` 的 `[U]` 项。

- `[I]` `status` 的具体取值未在 `ref.orchestrator.ipc-messages` 展开:当前节点只引用 `protocol.ts` 中 `InstanceStatus` 的导入与 `InstanceSummary.status` 字段,实例状态生命周期应由 orchestrator 实例/transport/supervisor 相关节点覆盖。
- `[I]` `parseRequestLine()` / `parseResponseLine()` 不做 runtime validation:源码显示仅 `JSON.parse` 后类型断言,但是否有调用方前置校验不属于本节点 source 列表。
- `[I]` `subsys.orchestrator.message-protocol` 的分工说明来自 index related 与本节点 catalog 定位,不是 `protocol.ts` 内部注释。
