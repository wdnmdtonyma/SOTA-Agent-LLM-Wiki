---
id: subsys.coding-agent.usage-accounting
title: 会话用量与成本归集
kind: subsystem
tier: T2
pkg: coding-agent
source:
  - packages/coding-agent/src/core/usage-totals.ts
  - packages/coding-agent/src/core/agent-session.ts
  - packages/coding-agent/src/core/session-manager.ts
  - packages/coding-agent/src/modes/interactive/interactive-mode.ts
  - packages/coding-agent/src/core/settings-manager.ts
  - packages/coding-agent/test/agent-session-stats.test.ts
  - packages/agent/src/types.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/harness/session/types.ts
  - packages/coding-agent/CHANGELOG.md
symbols:
  - UsageTotals
  - getUsageCostBreakdown
  - getSessionStats
  - addCompactionCostNotice
related:
  - ref.coding-agent.session-format
  - subsys.agent-core.compaction
  - subsys.agent-core.branch-summary
  - surface.extensions.events
  - subsys.coding-agent.agent-session
evidence: explicit
status: verified
updated: 853a80d26c
---

> 会话统计现在归集 assistant、tool result、compaction 和 branch summary 的 usage；交互式 `/session` UI 可按模型与“Tools/summaries”分桶展示成本。开启 cache miss notices 时，compaction / branch-summary 还会在 transcript 里显示 billed tokens 通知。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6172] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6181] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3815] [E: packages/coding-agent/CHANGELOG.md:20]

## 归集模型

`UsageTotals` 累加 input、output、cacheRead、cacheWrite 与 total cost；`getUsageCostBreakdown()` 用 `provider/(responseModel ?? model)` 聚合 assistant，用统一的 `Tools/summaries` 聚合带 usage 的 tool result、branch summary 和 compaction，并按成本降序返回非空桶。[E: packages/coding-agent/src/core/usage-totals.ts:4] [E: packages/coding-agent/src/core/usage-totals.ts:22] [E: packages/coding-agent/src/core/usage-totals.ts:37] [E: packages/coding-agent/src/core/usage-totals.ts:43] [E: packages/coding-agent/src/core/usage-totals.ts:46] [E: packages/coding-agent/src/core/usage-totals.ts:49] [E: packages/coding-agent/src/core/usage-totals.ts:63]

usage 已进入持久化 entry contract：`CompactionEntry` 与 `BranchSummaryEntry` 都有 optional `usage?: Usage`。[E: packages/agent/src/harness/session/types.ts:50] [E: packages/agent/src/harness/session/types.ts:58]

tool usage 的 carrier chain 是 `AgentToolResult.usage` → `afterToolCall` 保留或覆盖 → `ToolResultMessage.usage` → session message entry；源码不会另行估算缺失的 tool usage。[E: packages/agent/src/types.ts:368] [E: packages/agent/src/types.ts:89] [E: packages/agent/src/agent-loop.ts:740] [E: packages/agent/src/agent-loop.ts:784] [E: packages/coding-agent/src/core/agent-session.ts:674] [E: packages/coding-agent/src/core/agent-session.ts:690]

branch summarization 的 provider usage 或 extension-supplied usage 会进入随后持久化的 summary entry。[E: packages/coding-agent/src/core/agent-session.ts:3218] [E: packages/coding-agent/src/core/agent-session.ts:3226] [E: packages/coding-agent/src/core/agent-session.ts:3251] [E: packages/coding-agent/src/core/agent-session.ts:3256]

`getSessionStats()` 遍历 `sessionManager.getEntries()` 的完整集合，把 summary entries、tool-result messages 与 assistant messages 的 usage 累加；因此 totals 反映整个会话实际记账，包括已从 active context 压缩掉的历史，而不是只统计当前 branch context。[E: packages/coding-agent/src/core/agent-session.ts:3323] [E: packages/coding-agent/src/core/agent-session.ts:3331] [E: packages/coding-agent/src/core/agent-session.ts:3332] [E: packages/coding-agent/src/core/agent-session.ts:3340] [E: packages/coding-agent/src/core/agent-session.ts:3342] [E: packages/coding-agent/src/core/agent-session.ts:3351] [E: packages/coding-agent/src/core/agent-session.ts:3370]

## Transcript usage notices

`showCacheMissNotices` 默认 false；为 true 时 interactive transcript 除 cache-miss 外还会渲染 compaction / branch-summary 的 billed usage。[E: packages/coding-agent/src/core/settings-manager.ts:108] [E: packages/coding-agent/src/core/settings-manager.ts:919] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3816]

`CompactionCostNotice` 不是独立 session entry：replay 时若 `compaction` / `branch_summary` entry 带 `usage`，会在对应 summary message 后插入一条 notice；`compaction_end` 若 `event.result.usage` 存在也会当场追加。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:211] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3803] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3443] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3815]

`addCompactionCostNotice` 用 `usage.input + output + cacheRead + cacheWrite` 显示 tokens，成本 ≥ $0.01 时附加美元；label 为 `Compaction` 或 `Branch summary`。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3819] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3821]

截断 summary 不会落盘，因此也不会带 usage notice；`getSummarizationFailure` 在 `stopReason === "length"` 时拒绝 persist。细节见 `subsys.coding-agent.agent-session`。[I]

## L2 证伪与边界

- 只有 entry 实际携带 usage 才会计入；旧 session 与未报告 usage 的 extension/tool 不会被估算补齐。[E: packages/coding-agent/src/core/usage-totals.ts:46] [E: packages/coding-agent/src/core/usage-totals.ts:49] [E: packages/coding-agent/src/core/usage-totals.ts:53]
- `Tools/summaries` 是展示分桶，不能据此区分某个具体 tool、compaction 或 branch summary 的成本来源。[E: packages/coding-agent/src/core/usage-totals.ts:47] [E: packages/coding-agent/src/core/usage-totals.ts:50]
- assistant 分桶优先实际 `responseModel`，因此请求 model 与服务端响应 model 不一致时，成本会归到后者。[E: packages/coding-agent/src/core/usage-totals.ts:43] [E: packages/coding-agent/src/core/usage-totals.ts:44]
- provider 省略 streaming usage 或返回 all-zero usage 时，`_checkCompaction` 仍可用 `estimateContextTokens` 触发 threshold auto-compaction；这改变的是是否 compact，不是把估算 tokens 写入 usage totals。[E: packages/coding-agent/src/core/agent-session.ts:2203] [E: packages/coding-agent/src/core/agent-session.ts:2204] [I]
- `agent-session-stats` 测试分别锁定 tool-result usage 进入总量，以及 tool/summary usage 聚合成 `Tools/summaries` 桶。[E: packages/coding-agent/test/agent-session-stats.test.ts:211] [E: packages/coding-agent/test/agent-session-stats.test.ts:235]

## Sources

- packages/coding-agent/src/core/usage-totals.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/test/agent-session-stats.test.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/harness/session/types.ts
- packages/coding-agent/CHANGELOG.md

## 相关

- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent JSONL 中的 compaction/branch-summary usage 字段。
- [subsys.agent-core.compaction](../agent-core/compaction.md): summary usage 的产生和 split-turn 合并。
- [subsys.agent-core.branch-summary](../agent-core/branch-summary.md): branch-summary provider usage。
- [subsys.coding-agent.agent-session](agent-session.md): mid-run compaction 与 truncated-summary 拒绝落盘。
- [surface.extensions.events](../../surface/extensions/events.md): extension 对 tool-result 与 summary usage 的注入点。
