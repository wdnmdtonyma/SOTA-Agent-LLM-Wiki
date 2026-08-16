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
  - packages/coding-agent/test/agent-session-stats.test.ts
  - packages/agent/src/types.ts
  - packages/agent/src/agent-loop.ts
  - packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/types.ts
  - packages/agent/src/harness/session/types.ts
symbols:
  - UsageTotals
  - getUsageCostBreakdown
  - getSessionStats
related:
  - ref.coding-agent.session-format
  - subsys.agent-core.compaction
  - subsys.agent-core.branch-summary
  - surface.extensions.events
evidence: explicit
status: verified
updated: 086c32e745
---

> 会话统计现在归集 assistant、tool result、compaction 和 branch summary 的 usage；交互式 `/session` UI 可按模型与“Tools/summaries”分桶展示成本。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6045] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6054] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6085] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6088]

## 归集模型

`UsageTotals` 累加 input、output、cacheRead、cacheWrite 与 total cost；`getUsageCostBreakdown()` 用 `provider/(responseModel ?? model)` 聚合 assistant，用统一的 `Tools/summaries` 聚合带 usage 的 tool result、branch summary 和 compaction，并按成本降序返回非空桶。[E: packages/coding-agent/src/core/usage-totals.ts:4] [E: packages/coding-agent/src/core/usage-totals.ts:22] [E: packages/coding-agent/src/core/usage-totals.ts:37] [E: packages/coding-agent/src/core/usage-totals.ts:43] [E: packages/coding-agent/src/core/usage-totals.ts:46] [E: packages/coding-agent/src/core/usage-totals.ts:49] [E: packages/coding-agent/src/core/usage-totals.ts:63]

usage 已进入持久化 entry contract：`CompactionEntry` 与 `BranchSummaryEntry` 都有 optional `usage?: Usage`。[E: packages/agent/src/harness/session/types.ts:50] [E: packages/agent/src/harness/session/types.ts:58]

tool usage 的 carrier chain 是 `AgentToolResult.usage` → `afterToolCall` 保留或覆盖 → `ToolResultMessage.usage` → session message entry；源码不会另行估算缺失的 tool usage。[E: packages/agent/src/types.ts:361] [E: packages/agent/src/types.ts:367] [E: packages/agent/src/agent-loop.ts:724] [E: packages/agent/src/agent-loop.ts:742] [E: packages/agent/src/agent-loop.ts:777] [E: packages/agent/src/agent-loop.ts:786] [E: packages/coding-agent/src/core/agent-session.ts:640] [E: packages/coding-agent/src/core/agent-session.ts:656]

branch summarization 的 provider usage 或 extension-supplied usage 会进入随后持久化的 summary entry。[E: packages/coding-agent/src/core/agent-session.ts:3016] [E: packages/coding-agent/src/core/agent-session.ts:3017] [E: packages/coding-agent/src/core/agent-session.ts:3022] [E: packages/coding-agent/src/core/agent-session.ts:3025] [E: packages/coding-agent/src/core/agent-session.ts:3050] [E: packages/coding-agent/src/core/agent-session.ts:3055]

`getSessionStats()` 遍历 `sessionManager.getEntries()` 的完整集合，把 summary entries、tool-result messages 与 assistant messages 的 usage 累加；因此 totals 反映整个会话实际记账，包括已从 active context 压缩掉的历史，而不是只统计当前 branch context。[E: packages/coding-agent/src/core/agent-session.ts:3122] [E: packages/coding-agent/src/core/agent-session.ts:3130] [E: packages/coding-agent/src/core/agent-session.ts:3131] [E: packages/coding-agent/src/core/agent-session.ts:3139] [E: packages/coding-agent/src/core/agent-session.ts:3141] [E: packages/coding-agent/src/core/agent-session.ts:3144] [E: packages/coding-agent/src/core/agent-session.ts:3150] [E: packages/coding-agent/src/core/agent-session.ts:3154] [E: packages/coding-agent/src/core/agent-session.ts:3169]

## L2 证伪与边界

- 只有 entry 实际携带 usage 才会计入；旧 session 与未报告 usage 的 extension/tool 不会被估算补齐。[E: packages/coding-agent/src/core/usage-totals.ts:46] [E: packages/coding-agent/src/core/usage-totals.ts:49] [E: packages/coding-agent/src/core/usage-totals.ts:53]
- `Tools/summaries` 是展示分桶，不能据此区分某个具体 tool、compaction 或 branch summary 的成本来源。[E: packages/coding-agent/src/core/usage-totals.ts:47] [E: packages/coding-agent/src/core/usage-totals.ts:50]
- assistant 分桶优先实际 `responseModel`，因此请求 model 与服务端响应 model 不一致时，成本会归到后者。[E: packages/coding-agent/src/core/usage-totals.ts:43] [E: packages/coding-agent/src/core/usage-totals.ts:44]
- `agent-session-stats` 测试分别锁定 tool-result usage 进入总量，以及 tool/summary usage 聚合成 `Tools/summaries` 桶。[E: packages/coding-agent/test/agent-session-stats.test.ts:211] [E: packages/coding-agent/test/agent-session-stats.test.ts:227] [E: packages/coding-agent/test/agent-session-stats.test.ts:235] [E: packages/coding-agent/test/agent-session-stats.test.ts:254]

## Sources

- packages/coding-agent/src/core/usage-totals.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/test/agent-session-stats.test.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/agent/src/harness/types.ts
- packages/agent/src/harness/session/types.ts

## 相关

- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent JSONL 中的 compaction/branch-summary usage 字段。
- [subsys.agent-core.compaction](../agent-core/compaction.md): summary usage 的产生和 split-turn 合并。
- [subsys.agent-core.branch-summary](../agent-core/branch-summary.md): branch-summary provider usage。
- [surface.extensions.events](../../surface/extensions/events.md): extension 对 tool-result 与 summary usage 的注入点。
