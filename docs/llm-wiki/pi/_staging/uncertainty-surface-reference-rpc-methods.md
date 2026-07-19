# uncertainty: surface reference rpc methods

本轮核验后 `RpcCommand` union、`handleCommand()` switch case、节点 catalog 表格与 index 均为 31 个普通 command 实例；`extension_ui_response` 仍按独立 UI sub-protocol 排除。

- [U] `packages/coding-agent/docs/rpc.md` 的 `get_commands` response 示例和字段说明使用 top-level `location`/`path`,但当前 `RpcSlashCommand` 类型与 `rpc-mode.ts` dispatch 输出的是 `sourceInfo` 字段。主节点采用类型和 dispatch 口径,并把 docs/type 差异保留为不确定项。
