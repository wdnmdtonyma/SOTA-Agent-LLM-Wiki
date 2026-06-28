# uncertainty: spine.agent-loop

- [I] `pi-coding-agent` 产品层如何装配 `Agent` runtime 未在本轮要求的 source 文件 `packages/agent/src/agent-loop.ts`、`packages/agent/src/agent.ts` 中直接出现；主节点只从 agent-core 注入点推断产品层应通过 state/tools/model/hooks/stream options 装配 runtime，未引用 coding-agent 具体文件。
