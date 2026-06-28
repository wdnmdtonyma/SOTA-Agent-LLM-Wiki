# uncertainty: surface.modes.rpc

本轮按 `docs/llm-wiki/pi/index.json` 的 `surface.modes.rpc` source 重新核验,未保留 `[U]`。

## L3 lint 锚点修复

- 已按 `rpc-mode.ts` 当前源码修复主节点中指向文件头注释、函数注释、pending request 注释、extension response 注释和 command 分段分隔线的 `[E]` 锚点。
- 保留 `status: verified`;本轮未新增 `[U]`。

## L2 核验结果

- 已将主节点 `source` 和 Sources 列表收回到 index source: `packages/coding-agent/src/modes/rpc/rpc-mode.ts`、`packages/coding-agent/src/rpc-entry.ts`、`packages/coding-agent/docs/rpc.md`。
- 已逐条核对主节点 `[E]` 行号,所有保留的 `[E]` 均落在上述三份 index source 内。
- 已将节点状态置为 `status: verified`。

## 降级为 `[I]` 的推断或边界

- `rpc-entry` 是普通 `main()` 的 thin wrapper:源码证明它调用 `main(["--mode", "rpc", ...])`,但 wrapper 定性是实现形态归纳。
- `main.ts` 的 mode 解析、CLI `--mode` 枚举和 RPC mode 禁用 `@file` 参数都不在本节点 index source 内;主节点不再把这些作为本节点 `[E]` 展开。
- `runRpcMode` 在 `new_session`、`switch_session`、`fork`、`clone` 后 rebind 的原因来自控制流和 `runtimeHost.session` 重新读取方式,源码能证明调用关系,设计原因标为 `[I]`。
- host 用 response `id` 关联 command 接受/失败、用 event stream 观察 agent 生命周期,来自文档中的 response/event 区分和 event 无 `id` 语义归纳。
- `surface.modes.rpc-protocol`、`ref.coding-agent.rpc-methods`、`subsys.orchestrator.rpc-spawner` 的职责分工来自 index related/source/symbols 和节点粒度,不是 RPC runtime 源码内声明。

## 未展开范围

- 未逐项列出全部 `RpcCommand` 字段和每个 `RpcResponse` payload;该内容应由 `ref.coding-agent.rpc-methods` 覆盖。
- 未逐字段解释 `RpcExtensionUIRequest`、`RpcSessionState`、JSONL reader 的边界条件或 typed client;该内容应由 `surface.modes.rpc-protocol` 覆盖。
- 未核验 orchestrator 的 spawn/pending-response 实现;该内容不在本节点 index source 内,应由 `subsys.orchestrator.rpc-spawner` 覆盖。
