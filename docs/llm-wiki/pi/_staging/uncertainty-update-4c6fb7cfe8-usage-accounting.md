# uncertainty: subsys.coding-agent.usage-accounting

本轮 rewrite 未新增 `[U]`。已删除 harness session types / jsonl fork 对照。

产品 `SessionManager.forkFrom()` 复制全部 non-header entries,包括 `type: "usage"`。truncated summary 拒绝落盘由 coding-agent `getSummarizationFailure(stopReason === "length")` 证明,正文标 `[I]` 指向 compaction 节点。
