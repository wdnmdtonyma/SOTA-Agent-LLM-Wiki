# uncertainty: subsys.agent-core.message-conversion

本轮填充 `subsys.agent-core.message-conversion` 未新增 `[U]`。节点证据限定在 `packages/agent/src/harness/messages.ts`;关于 compaction / branch summary 的生成与持久化边界只写到本文件可证明的 conversion 层,超出本文件的流程归属用 `[I]` 标注并留给 `subsys.agent-core.compaction` / `subsys.agent-core.branch-summary`。

L2 verifier 已逐条证伪 `[E]` 的可核性、行号精度与过度推断风险;未发现需修正或降级的证据标。
