# uncertainty: 853a80d26c agent-loop / hooks / compaction

- [I] `packages/agent/CHANGELOG.md` 0.84.4 与 `packages/coding-agent/CHANGELOG.md` 都把 mid-run compaction 记为 `#6879`。任务描述里的 `#8782` 在 `853a80d26c` 的两个 CHANGELOG 里都没有出现；wiki 只跟 `#6879`。
- [I] harness `packages/agent/src/harness/compaction/compaction.ts` 没有 `getSummarizationFailure` / `stopReason === "length"` 拒绝落盘。截断 summary 不落盘是 coding-agent 产品层 `packages/coding-agent/src/core/compaction/compaction.ts` 的行为。`spine.compaction-flow` 只点了一句产品时序，没有改 harness API 描述。
- [I] `types.ts` 里 `shouldStopAfterTurn` 的 JSDoc 仍写 “runs before prepareNextTurn”。runtime 现在是：`shouldStopAfterTurn` 在 `turn_end` 后立刻跑；`prepareNextTurn` 只在还会再开一轮 assistant turn 的下一轮循环入口跑。两者仍满足 “stop 检查先于 prepare”，但 prepare 不再跟在每个 `turn_end` 后面。
- [I] mid-run threshold 用 `estimateContextTokens(context.messages)`（会跳过 all-zero usage）；post-run `_checkCompaction` 在 error / zero usage 时也走 estimate。两条路径都能在 provider 省略 streaming usage 时触发 compact，但 token 来源不完全相同。
- 本批未把 `session_compact_failed` 写进 `ref.coding-agent.session-events` / `surface.extensions.events`（任务禁止改 catalog / index）。
