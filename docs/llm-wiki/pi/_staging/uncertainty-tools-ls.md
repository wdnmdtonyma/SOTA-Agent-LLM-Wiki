# uncertainty-tools-ls

- `surface.tools.ls` 的 `executionMode=parallel` 不是 `ls.ts` 中的显式字段,而是由 `ls` tool definition 未声明 per-tool override、`ToolDefinition.executionMode` optional、`Agent.toolExecution` 默认 `"parallel"`、`agent-loop` 只在全局 sequential 或任一 tool 显式 sequential 时切到顺序执行共同推出;正文已标 `[I]`。
- `ls` 默认不 active 但进入 base tool registry 的结论来自 `AgentSession._buildRuntime()` 同时调用 `createAllToolDefinitions()` 与默认 active names `["read", "bash", "edit", "write"]`;具体哪些 mode/extension 会在运行时启用 `ls` 超出本节点源码范围,正文只概括为 active tool names、allowlist、plan/read-only mode 或 extension/runtime 流程并标 `[I]`。
- `limit <= 0` 返回 `"(empty directory)"` 是按当前循环条件和空结果分支推导的 edge case;未找到专门测试覆盖,正文标 `[I]`。
