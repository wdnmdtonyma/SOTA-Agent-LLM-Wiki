# Uncertainty staging: subsys.agent-core.branch-summary

- 本轮未留下 `[U]`。
- 本节点按指令只使用 `packages/agent/src/harness/compaction/branch-summarization.ts` 作为 `source`。branch navigation 何时调用 `generateBranchSummary()`、summary entry 如何持久化、以及 hook 如何注入 summary 属于 `agent-harness.ts` / `session.ts` 的调度与写入边界,未在本节点正文中写成由本 source 直接证明的事实。
- `GenerateBranchSummaryOptions` 在 `branch-summarization.ts` 内定义的形状以 `models`/`model`/`signal` 为准;其它文件中的同名 interface 不作为本节点证据来源。
- L2 verifier 结论:已逐条核验节点内 `[E]` 的可核性、行号精度和过度推断风险;将摘要、options 边界、empty entries 解释、非 message entry 分类、成功返回对象和跨包边界表述收紧到 `branch-summarization.ts` 可直接支撑的范围后,节点标记为 `status: verified`。
