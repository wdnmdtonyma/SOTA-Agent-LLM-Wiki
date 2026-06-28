# uncertainty: surface reference rpc methods

本轮核验后 `docs/llm-wiki/pi/reference/rpc-methods.md` 已置 `status: verified`。`RpcCommand` union、`handleCommand()` switch case、节点 catalog 表格均为 29 个实例且逐项一致;节点内 `[E]` 引用均落在当前 source 的非空、非注释、非纯括号行号范围内。

- [U] `index.json` 的 `group.rpc-methods.instance_count` 写作 30,但当前 `packages/coding-agent/src/modes/rpc/rpc-types.ts` 的 `RpcCommand` union 与 `rpc-mode.ts` 的普通 command dispatch 覆盖 29 个 command。主节点按源码 union 计数为 29,没有把 `extension_ui_response` 或 extension UI request methods 计入 `RpcCommand` catalog。
- [U] `packages/coding-agent/docs/rpc.md` 的 `get_commands` response 示例和字段说明使用 top-level `location`/`path`,但当前 `RpcSlashCommand` 类型与 `rpc-mode.ts` dispatch 输出的是 `sourceInfo` 字段。主节点采用类型和 dispatch 口径,并把 docs/type 差异保留为不确定项。
