# uncertainty-spine-compaction-flow

## [U]

- 本轮未登记 `[U]`。`spine.compaction-flow` 中无法由两个 source 文件直接证明的调度/持久化边界已降级为 `[I]`,未写成确定事实。

## [I]

- `prepareCompaction` 不调用 `shouldCompact`,因此 automatic compaction 的 threshold gate 应由调用者完成。
- previous compaction summary 作为下一轮 update summary 的迭代输入。
- `compact` 返回 `CompactionResult`,但这两个 source 文件不负责把结果持久化为 session entry。
- `pi-coding-agent` 或其他产品层负责触发时机和持久化策略,本节点 source 只覆盖 `pi-agent-core` harness。
