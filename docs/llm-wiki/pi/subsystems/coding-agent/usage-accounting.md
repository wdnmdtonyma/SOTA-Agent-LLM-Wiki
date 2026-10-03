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
  - packages/coding-agent/test/session-context-edit.test.ts
  - packages/agent/src/types.ts
  - packages/agent/src/agent-loop.ts
  - packages/coding-agent/src/core/compaction/compaction.ts
  - packages/coding-agent/src/core/compaction/branch-summarization.ts
  - packages/coding-agent/src/core/cache-warmer.ts
  - packages/coding-agent/test/branch-summarization.test.ts
  - packages/coding-agent/CHANGELOG.md
symbols:
  - UsageTotals
  - getUsageCostBreakdown
  - getSessionStats
  - addCompactionCostNotice
  - estimateProjectedContextTokens
related:
  - ref.coding-agent.session-format
  - subsys.agent-core.compaction
  - subsys.agent-core.branch-summary
  - surface.extensions.events
  - subsys.coding-agent.agent-session
evidence: explicit
status: verified
updated: 4c6fb7cfe8
---

> 会话统计现在归集 assistant、tool result、compaction 和 branch summary 的 usage；交互式 `/session` UI 可按模型与“Tools/summaries”分桶展示成本。开启 cache miss notices 时，compaction / branch-summary 还会在 transcript 里显示 billed tokens 通知。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6621] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:6630] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4053] [E: packages/coding-agent/CHANGELOG.md:487]

## 归集模型

`UsageTotals` 累加 input、output、cacheRead、cacheWrite 与 total cost；`getUsageCostBreakdown()` 用 `provider/(responseModel ?? model)` 聚合 assistant，用统一的 `Tools/summaries` 聚合带 usage 的 tool result、branch summary 和 compaction，并按成本降序返回非空桶。[E: packages/coding-agent/src/core/usage-totals.ts:4] [E: packages/coding-agent/src/core/usage-totals.ts:22] [E: packages/coding-agent/src/core/usage-totals.ts:61] [E: packages/coding-agent/src/core/usage-totals.ts:67] [E: packages/coding-agent/src/core/usage-totals.ts:73] [E: packages/coding-agent/src/core/usage-totals.ts:76] [E: packages/coding-agent/src/core/usage-totals.ts:90]

usage 已进入产品 session entry contract：`CompactionEntry` 与 `BranchSummaryEntry` 都有 optional `usage?: Usage`。[E: packages/coding-agent/src/core/session-manager.ts:99] [E: packages/coding-agent/src/core/session-manager.ts:113] 独立的 `UsageEntry` (`type: "usage"`) 携带 `kind` / `provider` / `model` / `usage`，不参与 LLM context。[E: packages/coding-agent/src/core/session-manager.ts:80] [E: packages/coding-agent/src/core/session-manager.ts:1244] [E: packages/coding-agent/src/core/session-manager.ts:465]

tool usage 的 carrier chain 是 `AgentToolResult.usage` → `afterToolCall` 保留或覆盖 → `ToolResultMessage.usage` → session message entry；源码不会另行估算缺失的 tool usage。[E: packages/agent/src/types.ts:435] [E: packages/agent/src/types.ts:98] [E: packages/agent/src/agent-loop.ts:885] [E: packages/agent/src/agent-loop.ts:931] [E: packages/coding-agent/src/core/agent-session.ts:672] [E: packages/coding-agent/src/core/agent-session.ts:694]

branch summarization 的 provider usage 或 extension-supplied usage 会进入随后持久化的 summary entry。[E: packages/coding-agent/src/core/agent-session.ts:4007] [E: packages/coding-agent/src/core/agent-session.ts:4028] [E: packages/coding-agent/src/core/agent-session.ts:4036] [E: packages/coding-agent/src/core/session-manager.ts:1600] [E: packages/coding-agent/src/core/session-manager.ts:1620]

产品 `SessionManager.forkFrom()` 复制源会话全部 non-header entries，包括 `type: "usage"`；它不会在 fork 时丢弃 usage writes。[E: packages/coding-agent/src/core/session-manager.ts:1859] [E: packages/coding-agent/src/core/session-manager.ts:1860] [E: packages/coding-agent/src/core/session-manager.ts:1861]

coding-agent 的 branch summary 输出 cap 现为 `Math.min(4096, model.maxTokens > 0 ? model.maxTokens : Number.POSITIVE_INFINITY)`；CHANGELOG `#8845` 记的是 reasoning 吃掉旧 2048 cap 导致 summary 失败。[E: packages/coding-agent/src/core/compaction/branch-summarization.ts:345] [E: packages/coding-agent/test/branch-summarization.test.ts:64] [E: packages/coding-agent/CHANGELOG.md:465]

`getSessionStats()` 遍历 `sessionManager.getEntries()` 的完整集合，把 `usage` entries、summary entries、tool-result messages 与 assistant messages 的 usage 累加；因此 totals 反映整个会话实际记账，包括已从 active context 压缩掉或被 `context_edit` 省略的历史，而不是只统计当前 branch 投影。[E: packages/coding-agent/src/core/agent-session.ts:4134] [E: packages/coding-agent/src/core/agent-session.ts:4142] [E: packages/coding-agent/src/core/agent-session.ts:4143] [E: packages/coding-agent/src/core/agent-session.ts:4145] [E: packages/coding-agent/src/core/agent-session.ts:4155] [E: packages/coding-agent/src/core/agent-session.ts:4164] cache warming 成功后 `appendUsage("cache_warm", ...)` 写入的 `type:"usage"` entry 也走这条累加,不进入 LLM context。[E: packages/coding-agent/src/core/session-manager.ts:1244] [E: packages/coding-agent/src/core/cache-warmer.ts:342] [E: packages/coding-agent/src/core/usage-totals.ts:70]

## Transcript usage notices

`showCacheMissNotices` 默认 false；为 true 时 interactive transcript 除 cache-miss 外还会渲染 compaction / branch-summary 的 billed usage。[E: packages/coding-agent/src/core/settings-manager.ts:147] [E: packages/coding-agent/src/core/settings-manager.ts:1050] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4054]

`CompactionCostNotice` 不是独立 session entry：replay 时若 `compaction` / `branch_summary` entry 带 `usage`，会在对应 summary message 后插入一条 notice；`compaction_end` 若 `event.result.usage` 存在也会当场追加。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:270] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4034] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:3666] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4053]

`addCompactionCostNotice` 用 `usage.input + output + cacheRead + cacheWrite` 显示 tokens，成本 ≥ $0.01 时附加美元；label 为 `Compaction` 或 `Branch summary`。[E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4057] [E: packages/coding-agent/src/modes/interactive/interactive-mode.ts:4059]

截断 summary 不会落盘，因此也不会带 usage notice；`getSummarizationFailure` 在 `stopReason === "length"` 时拒绝 persist。[E: packages/coding-agent/src/core/compaction/compaction.ts:585] [E: packages/coding-agent/src/core/compaction/compaction.ts:589] [I]

## L2 证伪与边界

- 只有 entry 实际携带 usage 才会计入；旧 session 与未报告 usage 的 extension/tool 不会被估算补齐。[E: packages/coding-agent/src/core/usage-totals.ts:73] [E: packages/coding-agent/src/core/usage-totals.ts:76] [E: packages/coding-agent/src/core/usage-totals.ts:80]
- `Tools/summaries` 是展示分桶，不能据此区分某个具体 tool、compaction 或 branch summary 的成本来源。[E: packages/coding-agent/src/core/usage-totals.ts:74] [E: packages/coding-agent/src/core/usage-totals.ts:77]
- assistant 分桶优先实际 `responseModel`，因此请求 model 与服务端响应 model 不一致时，成本会归到后者。[E: packages/coding-agent/src/core/usage-totals.ts:67] [E: packages/coding-agent/src/core/usage-totals.ts:68]
- provider 省略 streaming usage 或返回 all-zero usage 时，`_checkCompaction` 仍可用 `estimateContextTokens` 触发 threshold auto-compaction；这改变的是是否 compact，不是把估算 tokens 写入 usage totals。[E: packages/coding-agent/src/core/agent-session.ts:3009] [E: packages/coding-agent/src/core/agent-session.ts:3012] [I]
- context-edit 后有两条口径。session totals 仍读 raw entries,省略一条 assistant 不会把它的 billed usage 从 `/session` 里拿掉。[E: packages/coding-agent/src/core/agent-session.ts:4142] [E: packages/coding-agent/src/core/usage-totals.ts:64] 投影侧 `estimateProjectedContextTokens()` 若 usage 来源 entry 不在最新 `context_edit`/`compaction` 之后,就丢弃那份 usage 改走 message-size estimate;因此 threshold compaction 不会复用 edit 前的 usage,也不会在稍后 compaction 后把那份 usage 再当成当前 context。[E: packages/coding-agent/src/core/compaction/compaction.ts:227] [E: packages/coding-agent/src/core/compaction/compaction.ts:248] [E: packages/coding-agent/src/core/compaction/compaction.ts:253] [E: packages/coding-agent/src/core/agent-session.ts:3008] [E: packages/coding-agent/src/core/agent-session.ts:3011] [E: packages/coding-agent/test/session-context-edit.test.ts:215] [E: packages/coding-agent/test/session-context-edit.test.ts:230] `_checkCompaction` 在投影含 `context_edit` 时直接用这份 estimate,不再信任 assistant.usage。[E: packages/coding-agent/src/core/agent-session.ts:3008] [E: packages/coding-agent/src/core/agent-session.ts:3010]
- `agent-session-stats` 测试分别锁定 tool-result usage 进入总量，以及 tool/summary usage 聚合成 `Tools/summaries` 桶。[E: packages/coding-agent/test/agent-session-stats.test.ts:244] [E: packages/coding-agent/test/agent-session-stats.test.ts:268]
- 不存在 `packages/agent/src/harness/session/types.ts` 或 jsonl fork 丢弃 `kind: "usage"` 的路径。产品 fork 复制全部 non-header entries。[E: packages/coding-agent/src/core/session-manager.ts:1860] [I]

## Sources

- packages/coding-agent/src/core/usage-totals.ts
- packages/coding-agent/src/core/agent-session.ts
- packages/coding-agent/src/core/session-manager.ts
- packages/coding-agent/src/modes/interactive/interactive-mode.ts
- packages/coding-agent/src/core/settings-manager.ts
- packages/coding-agent/test/agent-session-stats.test.ts
- packages/coding-agent/test/session-context-edit.test.ts
- packages/agent/src/types.ts
- packages/agent/src/agent-loop.ts
- packages/coding-agent/src/core/compaction/compaction.ts
- packages/coding-agent/src/core/compaction/branch-summarization.ts
- packages/coding-agent/src/core/cache-warmer.ts
- packages/coding-agent/test/branch-summarization.test.ts
- packages/coding-agent/CHANGELOG.md

## 相关

- [ref.coding-agent.session-format](../../reference/session-format.md): coding-agent JSONL 中的 compaction/branch-summary/`usage` 字段。
- [subsys.agent-core.compaction](../agent-core/compaction.md): summary usage 的产生和 split-turn 合并。
- [subsys.agent-core.branch-summary](../agent-core/branch-summary.md): branch-summary provider usage。
- [subsys.coding-agent.agent-session](agent-session.md): mid-run compaction、truncated-summary 拒绝落盘,以及 context-edit 后的 threshold 估算。
- [surface.extensions.events](../../surface/extensions/events.md): extension 对 tool-result 与 summary usage 的注入点。
