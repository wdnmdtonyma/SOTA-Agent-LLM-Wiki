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
  - packages/coding-agent/src/core/compaction/branch-summarization.ts
  - packages/coding-agent/test/branch-summarization.test.ts
  - packages/coding-agent/CHANGELOG.md
  - packages/agent/src/harness/session/jsonl/fork.ts
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
updated: bbb61e34aa
---

> 会话统计现在归集 assistant、tool result、compaction 和 branch summary 的 usage；交互式 `/session` UI 可按模型与“Tools/summaries”分桶展示成本。开启 cache miss notices 时，compaction / branch-summary 还会在 transcript 里显示 billed tokens 通知。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6217] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6226] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3803] [E: packages/coding-agent/CHANGELOG.md:106]

## 归集模型

`UsageTotals` 累加 input、output、cacheRead、cacheWrite 与 total cost；`getUsageCostBreakdown()` 用 `provider/(responseModel ?? model)` 聚合 assistant，用统一的 `Tools/summaries` 聚合带 usage 的 tool result、branch summary 和 compaction，并按成本降序返回非空桶。[E: packages/coding-agent/src/core/usage-totals.ts:4] [E: packages/coding-agent/src/core/usage-totals.ts:22] [E: packages/coding-agent/src/core/usage-totals.ts:37] [E: packages/coding-agent/src/core/usage-totals.ts:43] [E: packages/coding-agent/src/core/usage-totals.ts:46] [E: packages/coding-agent/src/core/usage-totals.ts:49] [E: packages/coding-agent/src/core/usage-totals.ts:63]

usage 已进入持久化 entry contract：`CompactionEntry` 与 `BranchSummaryEntry` 都有 optional `usage?: Usage`。[E: packages/agent/src/harness/session/types.ts:39] [E: packages/agent/src/harness/session/types.ts:48]

tool usage 的 carrier chain 是 `AgentToolResult.usage` → `afterToolCall` 保留或覆盖 → `ToolResultMessage.usage` → session message entry；源码不会另行估算缺失的 tool usage。[E: packages/agent/src/types.ts:368] [E: packages/agent/src/types.ts:89] [E: packages/agent/src/agent-loop.ts:749] [E: packages/agent/src/agent-loop.ts:793] [E: packages/coding-agent/src/core/agent-session.ts:685] [E: packages/coding-agent/src/core/agent-session.ts:515]

branch summarization 的 provider usage 或 extension-supplied usage 会进入随后持久化的 summary entry。[E: packages/coding-agent/src/core/agent-session.ts:3228] [E: packages/coding-agent/src/core/agent-session.ts:3261] [E: packages/coding-agent/src/core/agent-session.ts:3253] [E: packages/coding-agent/src/core/agent-session.ts:3261]

JSONL fork 复制 session writes 时，`kind: "usage"` 一律丢弃：index 阶段不记录 usage seq，project 阶段直接 `return undefined`。因此 fork 出来的会话不会带走源会话的 usage writes。[E: packages/agent/src/harness/session/jsonl/fork.ts:106] [E: packages/agent/src/harness/session/jsonl/fork.ts:202]

coding-agent 的 branch summary 输出 cap 现为 `Math.min(4096, model.maxTokens > 0 ? model.maxTokens : Infinity)`，不再是 2048；CHANGELOG `#8845` 记的是 reasoning 吃掉旧 2048 cap 导致 summary 失败。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:345] [E: packages/coding-agent/test/branch-summarization.test.ts:64] [E: packages/coding-agent/CHANGELOG.md:84]

`getSessionStats()` 遍历 `sessionManager.getEntries()` 的完整集合，把 summary entries、tool-result messages 与 assistant messages 的 usage 累加；因此 totals 反映整个会话实际记账，包括已从 active context 压缩掉的历史，而不是只统计当前 branch context。[E: packages/coding-agent/src/core/agent-session.ts:3387] [E: packages/coding-agent/src/core/agent-session.ts:3367] [E: packages/coding-agent/src/core/agent-session.ts:3368] [E: packages/coding-agent/src/core/agent-session.ts:3378] [E: packages/coding-agent/src/core/agent-session.ts:3387]

## Transcript usage notices

`showCacheMissNotices` 默认 false；为 true 时 interactive transcript 除 cache-miss 外还会渲染 compaction / branch-summary 的 billed usage。[E: packages/coding-agent/src/core/settings-manager.ts:120] [E: packages/coding-agent/src/core/settings-manager.ts:965] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3804]

`CompactionCostNotice` 不是独立 session entry：replay 时若 `compaction` / `branch_summary` entry 带 `usage`，会在对应 summary message 后插入一条 notice；`compaction_end` 若 `event.result.usage` 存在也会当场追加。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:227] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3803] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3431] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3803]

`addCompactionCostNotice` 用 `usage.input + output + cacheRead + cacheWrite` 显示 tokens，成本 ≥ $0.01 时附加美元；label 为 `Compaction` 或 `Branch summary`。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3807] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3809]

截断 summary 不会落盘，因此也不会带 usage notice；`getSummarizationFailure` 在 `stopReason === "length"` 时拒绝 persist。细节见 `subsys.coding-agent.agent-session`。[I]

## L2 证伪与边界

- 只有 entry 实际携带 usage 才会计入；旧 session 与未报告 usage 的 extension/tool 不会被估算补齐。[E: packages/coding-agent/src/core/usage-totals.ts:46] [E: packages/coding-agent/src/core/usage-totals.ts:49] [E: packages/coding-agent/src/core/usage-totals.ts:53]
- `Tools/summaries` 是展示分桶，不能据此区分某个具体 tool、compaction 或 branch summary 的成本来源。[E: packages/coding-agent/src/core/usage-totals.ts:47] [E: packages/coding-agent/src/core/usage-totals.ts:50]
- assistant 分桶优先实际 `responseModel`，因此请求 model 与服务端响应 model 不一致时，成本会归到后者。[E: packages/coding-agent/src/core/usage-totals.ts:43] [E: packages/coding-agent/src/core/usage-totals.ts:44]
- provider 省略 streaming usage 或返回 all-zero usage 时，`_checkCompaction` 仍可用 `estimateContextTokens` 触发 threshold auto-compaction；这改变的是是否 compact，不是把估算 tokens 写入 usage totals。`getCompactionSettings(model)` 的 `reserveTokens` / `keepRecentTokens`（含 `modelOverrides`）只影响何时 compact，不改变本节点的 usage 累加口径。[E: packages/coding-agent/src/core/agent-session.ts:2231] [E: packages/coding-agent/src/core/agent-session.ts:2155] [I]
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
- packages/coding-agent/src/core/compaction/branch-summarization.ts
- packages/coding-agent/test/branch-summarization.test.ts
- packages/coding-agent/CHANGELOG.md
- packages/agent/src/harness/session/jsonl/fork.ts

## 相关

- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent JSONL 中的 compaction/branch-summary usage 字段。
- [subsys.agent-core.compaction](../agent-core/compaction.md): summary usage 的产生和 split-turn 合并。
- [subsys.agent-core.branch-summary](../agent-core/branch-summary.md): branch-summary provider usage。
- [subsys.coding-agent.agent-session](agent-session.md): mid-run compaction 与 truncated-summary 拒绝落盘。
- [surface.extensions.events](../../surface/extensions/events.md): extension 对 tool-result 与 summary usage 的注入点。
