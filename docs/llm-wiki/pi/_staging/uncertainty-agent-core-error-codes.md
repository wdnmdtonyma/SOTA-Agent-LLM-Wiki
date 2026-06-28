# Uncertainty: agent-core error-codes

batch: agent-core
node: ref.agent.error-codes
updated: 5a073885

## 当前状态

- L2 verifier 已逐条证伪 `[E]` 可核性、行号精度与过度推断风险;`FileErrorCode`、`ExecutionErrorCode`、`AgentHarnessErrorCode` union 实例覆盖与 `packages/agent/src/harness/types.ts` 当前定义一致,节点已标记 `status: verified`。
- 本轮未留下需要升级为 uncertainty 条目的不确定点。
- `ref.agent.error-codes` 只覆盖 prompt 指定的 `FileErrorCode`、`ExecutionErrorCode`、`AgentHarnessErrorCode`;同文件中的 `CompactionErrorCode`、`BranchSummaryErrorCode`、`SessionErrorCode` 未纳入本节点逐实例 catalog。
