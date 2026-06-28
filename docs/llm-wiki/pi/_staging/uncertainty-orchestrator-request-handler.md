# uncertainty-orchestrator-request-handler

本轮没有留下需要上升为 `[U]` 的源码不确定项。

## 降级为 [I] 的推断

- request handler 与 IPC transport 的拆分动机来自 `serve()` 只传 handler object、`ipc/server.ts` 负责 JSONL/socket、`handler.ts` 只处理 typed request 的结构;源码没有设计说明,所以主节点标 `[I]`。
- `rpc_stream` 两步握手的动机来自 `handleIpcRequest()` 先回 `rpc_ready`、`ipc/server.ts` 再打开 stream 的控制流;源码没有注释说明,所以主节点标 `[I]`。
- 同一 stream 内 UI response 与 RPC command 分流的设计意图来自 `openRpcStream()` 的 branch 行为;源码没有注释说明,所以主节点标 `[I]`。
- experimental 稳定性可由 `packages/orchestrator/package.json` 的 description 核到;“不要假设 wire/API 已稳定”是文档层风险提示,所以主节点保留 `[I]`。
