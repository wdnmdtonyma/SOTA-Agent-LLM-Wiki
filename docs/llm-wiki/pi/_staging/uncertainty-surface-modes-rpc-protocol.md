# uncertainty-surface-modes-rpc-protocol

本轮复核 `surface.modes.rpc-protocol` 未新增 `[U]`。

本轮修正:

- `get_state.model` 不再复述 RPC docs 中的 `or null`; 当前源码类型是 `model?: Model<any>`, 运行时写入 `session.model`, 所以节点改为可选完整 `Model` object。

已标为 `[I]` 的边界:

- `surface.modes.rpc`、`ref.coding-agent.rpc-methods`、`ref.coding-agent.json-events` 与本节点的职责划分来自 index/source 关系和节点粒度约定, 不是源码中的运行时事实。
- `success()` helper 省略或携带 `data` 对 response shape 的解释, 以及 "stdout 是协议通道, 普通 UI/log output 不应混入 stdout" 属于从 `takeOverStdout()`/raw stdout 写出方式推出的设计含义。
- backpressure 只描述 RPC mode 调用点; `output-guard` 的内部实现未在本节点证实。
